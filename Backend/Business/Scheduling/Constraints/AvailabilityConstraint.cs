using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 1 — SOFT. An employee who reported themselves unavailable for a
    /// specific (shift, date) should not be assigned. This is a soft constraint:
    /// the engine will prefer anyone else, but may still fall back to an
    /// unavailable candidate if no other option exists, rather than leave the
    /// slot empty. Flip <see cref="Severity"/> to Hard if policy requires strict
    /// honoring of self-reported unavailability.
    /// </summary>
    public sealed class AvailabilityConstraint : IScheduleConstraint
    {
        public int Priority => ConstraintPriorities.Availability;
        public ConstraintSeverity Severity => ConstraintSeverity.Soft;
        public bool IsUserOverridable => false;
        public string Name => "Availability";

        private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<
            SchedulingContext,
            HashSet<(Guid EmployeeId, Guid ShiftId, DateOnly Date)>> _indexCache = new();

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            var index = _indexCache.GetValue(context, BuildIndex);

            if (index.Contains((candidate.Id, slot.ShiftId, slot.Date)))
                return ConstraintEvaluation.Violation("Reported unavailable for this shift/date");

            return ConstraintEvaluation.Ok();
        }

        private static HashSet<(Guid, Guid, DateOnly)> BuildIndex(SchedulingContext ctx)
        {
            var set = new HashSet<(Guid, Guid, DateOnly)>();
            foreach (var u in ctx.Unavailabilities)
                set.Add((u.EmployeeId, u.ShiftId, u.Date));
            return set;
        }
    }
}
