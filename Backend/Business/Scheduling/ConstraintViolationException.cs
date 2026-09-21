using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling
{
    /// <summary>
    /// Thrown when a manual assignment would violate one or more hard scheduling constraints.
    /// The controller maps this to HTTP 422 so the frontend can show a descriptive alert.
    ///
    /// <see cref="BlockingViolations"/> are absolute — the assignment cannot proceed.
    /// <see cref="OverridableViolations"/> can be bypassed by an explicit user decision
    /// (re-submit with <c>ForceOverride = true</c>).
    /// </summary>
    public sealed class ConstraintViolationException : Exception
    {
        /// <summary>Violations the user cannot override (RestPeriod, ConsecutiveHours, Absence).</summary>
        public IReadOnlyList<string> BlockingViolations { get; }

        /// <summary>Violations the user may consciously override (Overtime, Rotation, PinnedShift).</summary>
        public IReadOnlyList<string> OverridableViolations { get; }

        public ConstraintViolationException(
            IReadOnlyList<string> blockingViolations,
            IReadOnlyList<string> overridableViolations)
            : base($"Hard constraint violated: {string.Join("; ", blockingViolations)} | overridable: {string.Join("; ", overridableViolations)}")
        {
            BlockingViolations = blockingViolations;
            OverridableViolations = overridableViolations;
        }
    }
}
