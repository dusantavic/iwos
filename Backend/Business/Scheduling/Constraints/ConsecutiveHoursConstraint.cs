using System;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 0 — HARD, NOT user-overridable. An employee must not accumulate more than 48
    /// consecutive hours of work without a day off in between. The streak is measured by walking
    /// both backwards and forwards from the proposed slot date, summing hours on every calendar
    /// day the employee is already assigned. The first unassigned calendar day in each direction
    /// resets the streak.
    ///
    /// Horizon contract:
    /// As a continuous hard constraint, Evaluate inspects assignments in
    /// <c>[ctx.WeekStart - 7d, ctx.WeekEnd + 7d]</c> so that a streak that spills into the
    /// previous or following week is correctly accounted for, even when only one isolated
    /// week is being (re)generated. The 7-day horizon is the constant
    /// <see cref="BoundaryHorizonDays"/>.
    ///
    /// Example: for 8-hour shifts the cap allows at most 6 consecutive working days
    /// (6 × 8 h = 48 h). On day 7 the employee must have a day off.
    /// </summary>
    public sealed class ConsecutiveHoursConstraint : IScheduleConstraint
    {
        private const double MaxConsecutiveHours = 48.0;

        /// <summary>
        /// Minimum number of calendar days of visibility required on each side of the
        /// planning window. The constraint walks back/forward from the slot until either
        /// the first unassigned day OR this horizon is reached.
        /// </summary>
        public const int BoundaryHorizonDays = 7;

        public int Priority => ConstraintPriorities.ConsecutiveHours;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "ConsecutiveHours";
        public bool IsUserOverridable => false;

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            // Bound the streak walk to ±7 calendar days beyond the planning window. This is the
            // explicit horizon contract for continuous hard constraints — Evaluate does not
            // depend on any caller pre-computing the right window; it enforces the horizon here.
            var horizonStart = context.WeekStart.AddDays(-BoundaryHorizonDays);
            var horizonEnd   = context.WeekEnd.AddDays(BoundaryHorizonDays);

            var priorStreak  = SumStreakBackward(context, state, candidate.Id, slot.Date, horizonStart);
            var futureStreak = SumStreakForward(context, state, candidate.Id, slot.Date, horizonEnd);
            var projected    = priorStreak + slot.Hours + futureStreak;

            if (projected > MaxConsecutiveHours)
            {
                return ConstraintEvaluation.Violation(
                    $"Would exceed 48-hour consecutive work limit ({projected:F1}h streak)");
            }

            return ConstraintEvaluation.Ok();
        }

        /// <summary>
        /// Walks backwards from <paramref name="upTo"/> (exclusive), summing shift hours.
        /// Stops at the first day with no assignment, or when reaching <paramref name="horizonStart"/>.
        /// </summary>
        private static double SumStreakBackward(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            DateOnly upTo,
            DateOnly horizonStart)
        {
            var totalHours = 0.0;
            var date = upTo.AddDays(-1);

            while (date >= horizonStart)
            {
                var assignedShiftId = FindAssignedShift(ctx, state, employeeId, date);
                if (assignedShiftId is null)
                    break;

                totalHours += GetShiftHours(ctx, assignedShiftId.Value, date.DayOfWeek);
                date = date.AddDays(-1);
            }

            return totalHours;
        }

        /// <summary>
        /// Walks forwards from <paramref name="from"/> (exclusive), summing shift hours
        /// for already-assigned days. Stops at the first day with no assignment, or when
        /// reaching <paramref name="horizonEnd"/>.
        /// This is necessary to catch insertions into the middle of a long run, AND to
        /// detect streaks that spill into the following week when an isolated middle
        /// week is being regenerated.
        /// </summary>
        private static double SumStreakForward(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            DateOnly from,
            DateOnly horizonEnd)
        {
            var totalHours = 0.0;
            var date = from.AddDays(1);

            while (date <= horizonEnd)
            {
                var assignedShiftId = FindAssignedShift(ctx, state, employeeId, date);
                if (assignedShiftId is null)
                    break;

                totalHours += GetShiftHours(ctx, assignedShiftId.Value, date.DayOfWeek);
                date = date.AddDays(1);
            }

            return totalHours;
        }

        private static Guid? FindAssignedShift(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            DateOnly date)
        {
            foreach (var a in state.Proposed)
                if (a.EmployeeId == employeeId && a.Date == date)
                    return a.ShiftId;

            foreach (var a in ctx.LockedAssignments)
                if (a.EmployeeId == employeeId && a.Date == date)
                    return a.ShiftId;

            foreach (var a in ctx.PriorAssignments)
                if (a.EmployeeId == employeeId && a.Date == date)
                    return a.ShiftId;

            return null;
        }

        private static double GetShiftHours(SchedulingContext ctx, Guid shiftId, DayOfWeek dayOfWeek)
        {
            foreach (var ds in ctx.DaySchedules)
                if (ds.ShiftId == shiftId && ds.DayOfWeek == dayOfWeek)
                    return ds.Hours;

            return 0.0;
        }
    }
}
