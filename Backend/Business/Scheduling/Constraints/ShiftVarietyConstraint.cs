using System;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 5 — SOFT. Adds a penalty when an employee would be assigned to the
    /// same shift for 3 or more consecutive working days. The first two same-shift
    /// days are free; the penalty grows with each additional consecutive day.
    /// </summary>
    public sealed class ShiftVarietyConstraint : IScheduleConstraint
    {
        public int Priority => ConstraintPriorities.ShiftVariety;
        public ConstraintSeverity Severity => ConstraintSeverity.Soft;
        public string Name => "ShiftVariety";
        public bool IsUserOverridable => false;

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            var streak = CountConsecutiveSameShift(context, state, candidate.Id, slot.ShiftId, slot.Date);

            // streak == 2 means 2 prior days → assigning today would make it 3 in a row → penalise
            if (streak < 2)
                return ConstraintEvaluation.Ok();

            return ConstraintEvaluation.Violation($"{streak + 1} consecutive days on the same shift");
        }

        private static int CountConsecutiveSameShift(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            Guid shiftId,
            DateOnly upTo)
        {
            var count = 0;
            var date  = upTo.AddDays(-1);
            var limit = upTo.AddDays(-30);   // no realistic streak exceeds 30 days

            while (date > limit)
            {
                var dow = date.DayOfWeek;
                if (!ctx.WeekendsWorking && (dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday))
                {
                    date = date.AddDays(-1);
                    continue;
                }

                if (!IsAssignedToShift(ctx, state, employeeId, shiftId, date))
                    break;

                count++;
                date = date.AddDays(-1);
            }

            return count;
        }

        private static bool IsAssignedToShift(
            SchedulingContext ctx,
            SchedulingState state,
            Guid employeeId,
            Guid shiftId,
            DateOnly date)
        {
            foreach (var a in state.Proposed)
                if (a.EmployeeId == employeeId && a.ShiftId == shiftId && a.Date == date)
                    return true;

            foreach (var a in ctx.LockedAssignments)
                if (a.EmployeeId == employeeId && a.ShiftId == shiftId && a.Date == date)
                    return true;

            foreach (var a in ctx.PriorAssignments)
                if (a.EmployeeId == employeeId && a.ShiftId == shiftId && a.Date == date)
                    return true;

            return false;
        }
    }
}
