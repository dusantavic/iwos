using System;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 2 — HARD, user-overridable. Prevent exceeding an employee's contracted weekly
    /// hour cap.
    ///
    /// Horizon contract:
    /// As a continuous hard constraint, Evaluate inspects assignments in
    /// <c>[ctx.WeekStart - 7d, ctx.WeekEnd + 7d]</c> so that hours from already-persisted
    /// out-of-window assignments that share a calendar week with the proposed slot
    /// are correctly added to the running total before the cap is checked. This matters
    /// for partial-week regenerations and for any situation where the engine plans
    /// a window narrower than a calendar week. The 7-day horizon is the constant
    /// <see cref="BoundaryHorizonDays"/>.
    ///
    /// The running hour total inside the planning window itself is read from
    /// <see cref="SchedulingState.ScheduledHours"/>, which already covers locked + proposed.
    /// To this we add the hours of any <see cref="SchedulingContext.PriorAssignments"/>
    /// that fall in the same Monday–Sunday calendar week as the candidate slot.
    /// </summary>
    public sealed class OvertimeConstraint : IScheduleConstraint
    {
        /// <summary>
        /// Minimum number of calendar days of visibility required on each side of the
        /// planning window for the same-week roll-up. Larger than strictly necessary
        /// (a calendar week's worth would suffice), kept at 7 for symmetry with the
        /// other continuous hard constraints.
        /// </summary>
        public const int BoundaryHorizonDays = 7;

        public int Priority => ConstraintPriorities.Overtime;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "Overtime";
        public bool IsUserOverridable => true;

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            if (!context.ConsiderWeeklyHours)
                return ConstraintEvaluation.Ok();

            var horizonStart = context.WeekStart.AddDays(-BoundaryHorizonDays);
            var horizonEnd   = context.WeekEnd.AddDays(BoundaryHorizonDays);

            // Hours already accounted for in this run (locked-in-window + previously-proposed).
            var inWindowHours = state.GetHours(candidate.Id);

            // Hours from assignments that are OUTSIDE the engine's planning window but share
            // the same Monday-anchored calendar week as the candidate slot. These must count
            // toward the weekly cap.
            var outOfWindowSameWeekHours = SumSameWeekPriorHours(
                context, candidate.Id, slot.Date, horizonStart, horizonEnd);

            var projected = inWindowHours + outOfWindowSameWeekHours + slot.Hours;
            if (projected > candidate.WeeklyHours)
            {
                return ConstraintEvaluation.Violation(
                    $"Would exceed weekly cap ({projected:F1}h > {candidate.WeeklyHours}h)");
            }

            return ConstraintEvaluation.Ok();
        }

        /// <summary>
        /// Sums hours from <see cref="SchedulingContext.PriorAssignments"/> that (a) belong to
        /// <paramref name="employeeId"/>, (b) fall within the ±7-day horizon, and (c) share the
        /// same Monday-anchored calendar week as <paramref name="slotDate"/>.
        /// </summary>
        private static double SumSameWeekPriorHours(
            SchedulingContext ctx,
            Guid employeeId,
            DateOnly slotDate,
            DateOnly horizonStart,
            DateOnly horizonEnd)
        {
            var slotWeekStart = StartOfIsoWeek(slotDate);
            var slotWeekEnd   = slotWeekStart.AddDays(6);

            // Tighten the lookup to the intersection of the slot's calendar week and the horizon.
            var lookupStart = slotWeekStart < horizonStart ? horizonStart : slotWeekStart;
            var lookupEnd   = slotWeekEnd   > horizonEnd   ? horizonEnd   : slotWeekEnd;
            if (lookupStart > lookupEnd) return 0.0;

            var total = 0.0;
            foreach (var a in ctx.PriorAssignments)
            {
                if (a.EmployeeId != employeeId) continue;
                if (a.Date < lookupStart || a.Date > lookupEnd) continue;
                total += GetShiftHours(ctx, a.ShiftId, a.Date.DayOfWeek);
            }
            return total;
        }

        private static DateOnly StartOfIsoWeek(DateOnly date)
        {
            // Monday-anchored week (matches the rest of the engine, which iterates Mon..Sun).
            int dow = (int)date.DayOfWeek;            // Sunday = 0
            int offset = dow == 0 ? -6 : 1 - dow;     // pull back to Monday
            return date.AddDays(offset);
        }

        private static double GetShiftHours(SchedulingContext ctx, Guid shiftId, DayOfWeek dayOfWeek)
        {
            double? fallback = null;
            foreach (var ds in ctx.DaySchedules)
            {
                if (ds.ShiftId != shiftId) continue;
                if (ds.DayOfWeek == dayOfWeek) return ds.Hours;
                fallback ??= ds.Hours;
            }
            return fallback ?? 0.0;
        }
    }
}
