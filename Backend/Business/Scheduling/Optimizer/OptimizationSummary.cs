using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling.Optimizer
{
    public enum OptimizationOpType
    {
        DirectFill,
        ReassignWithReplacement,
        ShiftSwap,
    }

    public sealed record OptimizationChange(
        OptimizationOpType Type,
        DateOnly Date,
        Guid ShiftId,
        Guid EmployeeId,
        Guid? FromShiftId,
        DateOnly? FromDate,
        string Description
    );

    /// <summary>
    /// Diagnostics emitted by <see cref="ScheduleLocalSearchOptimizer"/>.
    /// Always populated when the optimizer runs (it always runs as the engine post-pass).
    /// </summary>
    public sealed class OptimizationSummary
    {
        public int Iterations { get; init; }
        public int SlotsFilledByOptimizer { get; init; }
        public int RemainingUnfilled { get; init; }
        public long DurationMs { get; init; }
        public required IReadOnlyList<OptimizationChange> Changes { get; init; }
    }
}
