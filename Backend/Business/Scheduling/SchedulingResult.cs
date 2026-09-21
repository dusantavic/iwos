using Iwos.Business.Scheduling.Optimizer;
using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling
{
    public sealed record ScheduleViolation(
        Guid EmployeeId,
        Guid ShiftId,
        DateOnly Date,
        string ConstraintName,
        int Priority,
        string Reason
    );

    public sealed record UnfilledSlotInfo(
        DateOnly Date,
        Guid ShiftId,
        Guid? RequiredPositionId,
        string Reason
    );

    /// <summary>
    /// Engine output. Contains the proposed assignments plus diagnostics the
    /// caller can surface to the UI. The engine always runs the greedy pass
    /// followed by the post-pass local-search optimizer, so <see cref="Optimization"/>
    /// is always populated.
    /// </summary>
    public sealed class SchedulingResult
    {
        public required IReadOnlyList<SchedAssignment> ProposedAssignments { get; init; }
        public required IReadOnlyList<UnfilledSlotInfo> UnfilledSlots { get; init; }
        public required IReadOnlyList<ScheduleViolation> AcceptedSoftViolations { get; init; }

        public int TotalSlots { get; init; }
        public int FilledSlots { get; init; }

        /// <summary>Diagnostics from the post-greedy local-search optimizer.</summary>
        public OptimizationSummary? Optimization { get; init; }
    }
}
