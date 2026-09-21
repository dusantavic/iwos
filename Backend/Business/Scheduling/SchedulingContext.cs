using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling
{
    // ── Read models consumed by the scheduling engine ─────────────────────────
    // These are pure DTOs — the engine has no dependency on EF or DbContext.

    public sealed record SchedEmployee(
        Guid Id,
        string FullName,
        Guid PositionId,
        int WeeklyHours,
        Guid? RotationPatternId = null,
        Guid? PinnedShiftId = null,
        DateOnly? RotationAnchorDate = null
    );

    public sealed record SchedShift(
        Guid Id,
        string Label
    );

    /// <summary>Per day-of-week schedule for a shift (start/end/hours).</summary>
    public sealed record SchedDaySchedule(
        Guid ShiftId,
        DayOfWeek DayOfWeek,
        double Hours,
        double StartHour = 0.0
    );

    public sealed record SchedPositionRequirement(
        Guid ShiftId,
        Guid PositionId,
        int RequiredCount
    );

    public sealed record SchedAbsence(
        Guid EmployeeId,
        DateOnly StartDate,
        DateOnly EndDate
    );

    public sealed record SchedUnavailability(
        Guid EmployeeId,
        Guid ShiftId,
        DateOnly Date
    );

    public sealed record SchedAssignment(
        Guid EmployeeId,
        Guid ShiftId,
        DateOnly Date
    );

    /// <summary>Per-day-of-week recurring override for a specific position's required count on a shift.</summary>
    public sealed record SchedDayPositionRequirementOverride(
        Guid ShiftId,
        DayOfWeek DayOfWeek,
        Guid PositionId,
        int RequiredCount
    );

    /// <summary>Per-date override for a specific position's required count on a shift.</summary>
    public sealed record SchedPositionRequirementOverride(
        Guid ShiftId,
        DateOnly Date,
        Guid PositionId,
        int RequiredCount
    );

    /// <summary>Rotation template (e.g. "6 on / 2 off"). Cycle length = DaysOn + DaysOff.</summary>
    public sealed record SchedRotationPattern(
        Guid Id,
        string Name,
        int DaysOn,
        int DaysOff
    );

    /// <summary>
    /// One slot that the engine needs to fill. A shift on a given date produces
    /// one slot per position requirement entry (default or per-date override).
    /// </summary>
    public sealed record ScheduleSlot(
        DateOnly Date,
        Guid ShiftId,
        Guid? RequiredPositionId,
        double Hours
    );

    /// <summary>
    /// All data needed to run the scheduling engine for a single week.
    /// Built once per run by the service layer and handed to the engine.
    /// </summary>
    public sealed class SchedulingContext
    {
        public required DateOnly WeekStart { get; init; }
        public required DateOnly WeekEnd { get; init; }
        public required bool WeekendsWorking { get; init; }

        public required IReadOnlyList<SchedEmployee> Employees { get; init; }
        public required IReadOnlyList<SchedShift> Shifts { get; init; }
        public required IReadOnlyList<SchedDaySchedule> DaySchedules { get; init; }
        public required IReadOnlyList<SchedPositionRequirement> PositionRequirements { get; init; }
        public IReadOnlyList<SchedDayPositionRequirementOverride> DayPositionRequirementOverrides { get; init; } = [];
        public IReadOnlyList<SchedPositionRequirementOverride> PositionRequirementOverrides { get; init; } = [];

        public required IReadOnlyList<SchedAbsence> Absences { get; init; }
        public required IReadOnlyList<SchedUnavailability> Unavailabilities { get; init; }

        /// <summary>Existing manager-created assignments. The engine treats these as locked and never proposes over them.</summary>
        public required IReadOnlyList<SchedAssignment> LockedAssignments { get; init; }

        /// <summary>Rotation templates available in the tenant, looked up by <see cref="SchedEmployee.RotationPatternId"/>.</summary>
        public IReadOnlyList<SchedRotationPattern> RotationPatterns { get; init; } = [];

        /// <summary>
        /// Assignments from outside [WeekStart, WeekEnd] that should be visible to constraints
        /// but NOT seeded into running state (no hours added, no date blocking).
        /// </summary>
        public IReadOnlyList<SchedAssignment> PriorAssignments { get; init; } = [];

        /// <summary>
        /// When false, the overtime constraint is skipped and equal-hours fairness drives candidate selection.
        /// Defaults to true.
        /// </summary>
        public bool ConsiderWeeklyHours { get; init; } = true;

        /// <summary>
        /// Hours accumulated by each employee in prior weeks during a range-scheduling run.
        /// Used to achieve cross-week fairness: the engine prefers employees with fewer total hours.
        /// Empty for single-week generation.
        /// </summary>
        public IReadOnlyDictionary<Guid, double> AccumulatedHours { get; init; } = new Dictionary<Guid, double>();

        /// <summary>
        /// Dynamically computed rotation anchor dates keyed by employee ID.
        /// Anchors are staggered so that employees in the same pattern group have their
        /// off-days spread across different calendar days. Computed per generation run;
        /// never stored in the database.
        /// </summary>
        public IReadOnlyDictionary<Guid, DateOnly> RotationAnchors { get; init; } = new Dictionary<Guid, DateOnly>();
    }
}
