using System;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 0 — HARD, NOT user-overridable. Enforces the legal minimum of 12 consecutive
    /// hours of rest between any two shifts.
    ///
    /// Horizon contract:
    /// As a continuous hard constraint, Evaluate inspects assignments in
    /// <c>[ctx.WeekStart - 7d, ctx.WeekEnd + 7d]</c> so that rest gaps spanning the boundaries
    /// of the current planning window are evaluated against the real adjacent assignments
    /// (e.g. a Sunday tail of week N feeding into a Monday head of week N+1, or vice-versa
    /// when an isolated middle week is regenerated). The 7-day horizon is the constant
    /// <see cref="BoundaryHorizonDays"/>.
    ///
    /// The required gap is a 12-hour rest, so for any shift duration ≤ 24h the gap is fully
    /// determined by the previous-day and next-day neighbour assignments. The constraint
    /// therefore looks at slot.Date − 1 and slot.Date + 1 — both of which are guaranteed to
    /// fall within the ±7-day horizon for any slot inside the planning window.
    ///
    /// End time is computed as: <c>prevStartHour + prevHours</c> (may exceed 24 for overnight
    /// shifts, e.g. Night 22:00 + 8h = 30h ≡ 06:00 next day).
    ///
    /// Gap formula (for a proposed shift on day D following an assignment on day D-1):
    ///   <c>gap = 24 + proposedStartHour - prevStartHour - prevHours</c>
    /// </summary>
    public sealed class RestPeriodConstraint : IScheduleConstraint
    {
        private const double MinRestHours = 12.0;

        /// <summary>
        /// Minimum number of calendar days of visibility on each side of the planning window
        /// that this constraint requires. Both <c>SchedulingContext.PriorAssignments</c> and
        /// the running state's proposals must collectively cover this horizon — the data
        /// loaders honour the same constant.
        /// </summary>
        public const int BoundaryHorizonDays = 7;

        public int Priority => ConstraintPriorities.RestPeriod;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "RestPeriod";
        public bool IsUserOverridable => false;

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            // Materialise the ±7-day horizon explicitly so the contract is enforced here, in
            // the constraint, regardless of how callers populate the context.
            var horizonStart = context.WeekStart.AddDays(-BoundaryHorizonDays);
            var horizonEnd   = context.WeekEnd.AddDays(BoundaryHorizonDays);

            var proposedStart = GetStartHour(context, slot.ShiftId, slot.Date.DayOfWeek);
            var proposedHours = GetHours(context, slot.ShiftId, slot.Date.DayOfWeek);

            // Backward neighbour: gap from D-1 shift end to proposed start.
            var prevDate = slot.Date.AddDays(-1);
            if (prevDate >= horizonStart)
            {
                var prevShiftId = FindAssignedShiftWithinHorizon(
                    context, state, candidate.Id, prevDate, horizonStart, horizonEnd);
                if (prevShiftId is not null)
                {
                    var prevStart = GetStartHour(context, prevShiftId.Value, prevDate.DayOfWeek);
                    var prevHours = GetHours(context, prevShiftId.Value, prevDate.DayOfWeek);
                    var gap = 24.0 + proposedStart - prevStart - prevHours;
                    if (gap < MinRestHours)
                    {
                        return ConstraintEvaluation.Violation(
                            $"Insufficient rest period ({gap:F1}h between shifts, {MinRestHours}h required)");
                    }
                }
            }

            // Forward neighbour: gap from proposed end to D+1 shift start.
            // Required when a manual edit inserts a shift before an already-assigned next day,
            // or when an isolated week is regenerated next to an already-persisted adjacent week.
            var nextDate = slot.Date.AddDays(1);
            if (nextDate <= horizonEnd)
            {
                var nextShiftId = FindAssignedShiftWithinHorizon(
                    context, state, candidate.Id, nextDate, horizonStart, horizonEnd);
                if (nextShiftId is not null)
                {
                    var nextStart = GetStartHour(context, nextShiftId.Value, nextDate.DayOfWeek);
                    var gap = 24.0 + nextStart - proposedStart - proposedHours;
                    if (gap < MinRestHours)
                    {
                        return ConstraintEvaluation.Violation(
                            $"Insufficient rest period ({gap:F1}h between shifts, {MinRestHours}h required)");
                    }
                }
            }

            return ConstraintEvaluation.Ok();
        }

        /// <summary>
        /// Searches the three assignment sources (in-flight proposals, locked in-window assignments,
        /// and out-of-window prior/next-window assignments) for an assignment on <paramref name="date"/>
        /// belonging to <paramref name="employeeId"/>. The lookup is bounded to the ±7-day horizon
        /// to enforce the constraint's contract independently of caller behaviour.
        /// </summary>
        private static Guid? FindAssignedShiftWithinHorizon(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            DateOnly date,
            DateOnly horizonStart,
            DateOnly horizonEnd)
        {
            if (date < horizonStart || date > horizonEnd) return null;

            foreach (var a in state.Proposed)
                if (a.EmployeeId == employeeId && a.Date == date) return a.ShiftId;

            foreach (var a in ctx.LockedAssignments)
                if (a.EmployeeId == employeeId && a.Date == date) return a.ShiftId;

            foreach (var a in ctx.PriorAssignments)
                if (a.EmployeeId == employeeId && a.Date == date) return a.ShiftId;

            return null;
        }

        /// <summary>
        /// Returns the start hour for the given shift/day. Falls back to any day-of-week entry for
        /// the same shift when the specific day is absent from DaySchedules (e.g. a non-working weekend
        /// that still had a prior assignment imported from an onboarding import).
        /// </summary>
        private static double GetStartHour(SchedulingContext ctx, Guid shiftId, DayOfWeek dow)
        {
            double? fallback = null;
            foreach (var ds in ctx.DaySchedules)
            {
                if (ds.ShiftId != shiftId) continue;
                if (ds.DayOfWeek == dow) return ds.StartHour;
                fallback ??= ds.StartHour;
            }
            return fallback ?? 0.0;
        }

        private static double GetHours(SchedulingContext ctx, Guid shiftId, DayOfWeek dow)
        {
            double? fallback = null;
            foreach (var ds in ctx.DaySchedules)
            {
                if (ds.ShiftId != shiftId) continue;
                if (ds.DayOfWeek == dow) return ds.Hours;
                fallback ??= ds.Hours;
            }
            return fallback ?? 0.0;
        }
    }
}
