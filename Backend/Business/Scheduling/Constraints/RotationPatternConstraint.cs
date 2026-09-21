using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// Priority 0 — HARD. If the employee has a rotation pattern assigned
    /// (e.g. "5 on / 2 off"), disqualify them on days that fall inside the
    /// "off" portion of the cycle.
    ///
    /// Cycle position is measured in WORKING days (Mon–Fri when WeekendsWorking=false,
    /// all days otherwise) elapsed since the anchor date. This ensures that a "5 on / 2 off"
    /// pattern produces two actual working-day off-days per cycle — not two calendar days
    /// that might silently land on an already-excluded weekend.
    ///
    /// Employees with no pattern are unaffected.
    /// </summary>
    public sealed class RotationPatternConstraint : IScheduleConstraint
    {
        public int Priority => ConstraintPriorities.Rotation;
        public ConstraintSeverity Severity => ConstraintSeverity.Hard;
        public string Name => "Rotation";
        public bool IsUserOverridable => true;

        private static readonly ConditionalWeakTable<SchedulingContext, Dictionary<Guid, SchedRotationPattern>> _patternCache = new();

        public ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot)
        {
            if (candidate.RotationPatternId is null) return ConstraintEvaluation.Ok();
            if (!context.RotationAnchors.TryGetValue(candidate.Id, out var anchor)) return ConstraintEvaluation.Ok();

            var patterns = _patternCache.GetValue(context, BuildIndex);
            if (!patterns.TryGetValue(candidate.RotationPatternId.Value, out var pattern))
                return ConstraintEvaluation.Ok();

            var cycle = pattern.DaysOn + pattern.DaysOff;
            if (cycle <= 0) return ConstraintEvaluation.Ok();

            var workingDaysSince = CountWorkingDays(anchor, slot.Date, context.WeekendsWorking);
            var mod = ((workingDaysSince % cycle) + cycle) % cycle;

            if (mod >= pattern.DaysOn)
                return ConstraintEvaluation.Violation($"Rotation off-day ({pattern.Name})");

            return ConstraintEvaluation.Ok();
        }

        /// <summary>
        /// Counts working days strictly between <paramref name="from"/> (inclusive anchor,
        /// = working day 0) and <paramref name="to"/> (exclusive), respecting the weekend policy.
        /// </summary>
        private static int CountWorkingDays(DateOnly from, DateOnly to, bool weekendsWorking)
        {
            var totalDays = to.DayNumber - from.DayNumber;
            if (totalDays <= 0) return 0;
            if (weekendsWorking) return totalDays;

            var fullWeeks = totalDays / 7;
            var remainder = totalDays % 7;
            var weekendDays = fullWeeks * 2;

            var startDow = (int)from.DayOfWeek; // 0=Sun … 6=Sat
            for (var i = 0; i < remainder; i++)
            {
                var dow = (startDow + i) % 7;
                if (dow == 0 || dow == 6) weekendDays++;
            }

            return totalDays - weekendDays;
        }

        private static Dictionary<Guid, SchedRotationPattern> BuildIndex(SchedulingContext ctx)
            => ctx.RotationPatterns.ToDictionary(p => p.Id);
    }
}
