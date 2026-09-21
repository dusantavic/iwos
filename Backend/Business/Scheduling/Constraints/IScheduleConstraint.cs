using System;

namespace Iwos.Business.Scheduling.Constraints
{
    /// <summary>
    /// How severely a constraint should react when an employee matches its predicate.
    /// <list type="bullet">
    ///   <item><b>Hard</b> — the employee MUST NOT be assigned. The engine drops the candidate outright.</item>
    ///   <item><b>Soft</b> — the employee should ideally not be assigned. The engine records a penalty
    ///   weighted by priority and uses it to rank candidates; it will still pick a soft-violating
    ///   candidate before leaving a slot unfilled.</item>
    /// </list>
    /// </summary>
    public enum ConstraintSeverity
    {
        Hard,
        Soft
    }

    /// <summary>
    /// Well-known priority levels for constraints in this engine.
    /// Lower numeric values = higher importance.
    /// </summary>
    public static class ConstraintPriorities
    {
        /// <summary>Absence — cannot be assigned at all.</summary>
        public const int Absence = 0;

        /// <summary>Consecutive hours — prevents exceeding 48 h of continuous work without a day off.</summary>
        public const int ConsecutiveHours = 0;

        /// <summary>Rest period — enforces the legal minimum of 12 h rest between consecutive shifts.</summary>
        public const int RestPeriod = 0;

		/// <summary>Rotation off-day — employee is outside their working block.</summary>
		public const int Rotation = 1;

        /// <summary>Self-reported unavailability — should not be assigned.</summary>
        public const int Availability = 1;

        /// <summary>Weekly hour cap — prevent exceeding the employee's contracted hours.</summary>
        public const int Overtime = 2;

		/// <summary>Pinned shift — employee is dedicated to one shift only.</summary>
		public const int PinnedShift = 4;
		
        /// <summary>Shift variety — discourages 3+ consecutive days on the same shift.</summary>
		public const int ShiftVariety = 5;

    }

    /// <summary>Result of evaluating a single constraint against a candidate assignment.</summary>
    public readonly record struct ConstraintEvaluation(bool Violated, string? Reason = null)
    {
        public static ConstraintEvaluation Ok() => new(false);
        public static ConstraintEvaluation Violation(string reason) => new(true, reason);
    }

    /// <summary>
    /// A single scheduling rule. Implementations are pure — they read from the
    /// <see cref="SchedulingContext"/> and the running <see cref="SchedulingState"/>
    /// and never mutate anything.
    /// </summary>
    public interface IScheduleConstraint
    {
        /// <summary>Lower is more critical (see <see cref="ConstraintPriorities"/>).</summary>
        int Priority { get; }

        ConstraintSeverity Severity { get; }

        /// <summary>Short identifier used in diagnostic output.</summary>
        string Name { get; }

        /// <summary>
        /// When <c>true</c>, a manager may manually override this hard constraint via the UI.
        /// When <c>false</c>, the violation is always blocking — no override is permitted.
        /// Has no effect on soft constraints or on the automatic scheduling engine.
        /// </summary>
        bool IsUserOverridable { get; }

        ConstraintEvaluation Evaluate(
            SchedulingContext context,
            SchedulingState state,
            SchedEmployee candidate,
            ScheduleSlot slot);
    }
}
