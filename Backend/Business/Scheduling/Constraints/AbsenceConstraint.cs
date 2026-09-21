using System;
using System.Collections.Generic;
using System.Linq;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 0 — HARD. An employee cannot be assigned to any shift on a day
    /// that falls inside an approved absence interval (vacation, sick leave, …).
    /// </summary>
    public sealed class AbsenceConstraint : IScheduleConstraint
    {
        public int Priority => ConstraintPriorities.Absence;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "Absence";
        public bool IsUserOverridable => false;

        // Indexed lookup built lazily per run. Keyed by employeeId → intervals.
        // Because SchedulingContext is immutable per run, we cache on first use
        // via a ConditionalWeakTable keyed on the context instance.
        private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<
            SchedulingContext,
            Dictionary<Guid, List<(DateOnly Start, DateOnly End)>>> _indexCache = new();

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            var index = _indexCache.GetValue(context, BuildIndex);

            if (!index.TryGetValue(candidate.Id, out var intervals))
                return ConstraintEvaluation.Ok();

            foreach (var (start, end) in intervals)
            {
                if (slot.Date >= start && slot.Date <= end)
                    return ConstraintEvaluation.Violation($"Approved absence {start}–{end}");
            }

            return ConstraintEvaluation.Ok();
        }

        private static Dictionary<Guid, List<(DateOnly Start, DateOnly End)>> BuildIndex(SchedulingContext ctx)
            => ctx.Absences
                .GroupBy(a => a.EmployeeId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(a => (a.StartDate, a.EndDate)).ToList());
    }
}
