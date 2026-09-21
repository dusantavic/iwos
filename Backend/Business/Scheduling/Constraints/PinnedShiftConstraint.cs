namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 0 — HARD. If the employee is pinned to a specific shift
    /// (<see cref="SchedEmployee.PinnedShiftId"/> is set), they can only be
    /// assigned to that shift. Employees with no pinned shift rotate freely.
    /// </summary>
    public sealed class PinnedShiftConstraint : IScheduleConstraint
    {
        public int Priority => ConstraintPriorities.PinnedShift;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "PinnedShift";
        public bool IsUserOverridable => true;

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            if (candidate.PinnedShiftId is null)
                return ConstraintEvaluation.Ok();

            if (candidate.PinnedShiftId.Value != slot.ShiftId)
                return ConstraintEvaluation.Violation("Employee is pinned to a different shift");

            return ConstraintEvaluation.Ok();
        }
    }
}
