using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    // ── Config DTOs ────────────────────────────────────────────────────────────

    public class ShiftDto
    {
        public Guid Id { get; set; }
        public required string Label { get; set; }
        /// <summary>"HH:mm" format</summary>
        public required string DefaultStartTime { get; set; }
        /// <summary>"HH:mm" format</summary>
        public required string DefaultEndTime { get; set; }
        /// <summary>Duration in decimal hours (DefaultEndTime − DefaultStartTime). Handles overnight shifts.</summary>
        public double DefaultHours { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
    }

    public class ShiftDayScheduleDto
    {
        public Guid ShiftId { get; set; }
        /// <summary>0 = Sunday … 6 = Saturday</summary>
        public int DayOfWeek { get; set; }
        /// <summary>"HH:mm" format</summary>
        public required string StartTime { get; set; }
        /// <summary>"HH:mm" format</summary>
        public required string EndTime { get; set; }
        /// <summary>Duration in decimal hours (EndTime − StartTime). Handles overnight shifts.</summary>
        public double Hours { get; set; }
    }

    public class ShiftPositionRequirementDto
    {
        public Guid ShiftId { get; set; }
        public Guid PositionId { get; set; }
        public required string PositionTitle { get; set; }
        public int RequiredCount { get; set; }
    }

    public class ShiftRotationPatternDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public int DaysOn { get; set; }
        public int DaysOff { get; set; }
        public bool IsGlobal { get; set; }
    }

    public class SaveRotationPatternDto
    {
        public Guid? Id { get; set; }
        public required string Name { get; set; }
        public int DaysOn { get; set; }
        public int DaysOff { get; set; }
        /// <summary>When true on a create request, assigns this pattern to all active employees without one.</summary>
        public bool IsGlobal { get; set; }
    }

    public class SaveRotationPatternResultDto
    {
        public required ShiftRotationPatternDto Pattern { get; set; }
        /// <summary>Number of employees whose rotation was updated (only non-zero when IsGlobal was true).</summary>
        public int EmployeesUpdated { get; set; }
    }

    public class ShiftDayPositionRequirementOverrideDto
    {
        public Guid ShiftId { get; set; }
        /// <summary>0 = Sunday … 6 = Saturday</summary>
        public int DayOfWeek { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
    }

    public class SaveShiftDayPositionRequirementOverrideDto
    {
        public Guid ShiftId { get; set; }
        public int DayOfWeek { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
    }

    public class ShiftConfigDto
    {
        public bool WeekEndsWorking { get; set; }
        public bool ConsiderWeeklyHours { get; set; }
        public required List<ShiftDto> Shifts { get; set; }
        public required List<ShiftDayScheduleDto> DaySchedules { get; set; }
        public required List<ShiftPositionRequirementDto> PositionRequirements { get; set; }
        public required List<ShiftDayPositionRequirementOverrideDto> DayPositionRequirementOverrides { get; set; }
        public required List<ShiftRotationPatternDto> RotationPatterns { get; set; }
    }

    public class PositionForShiftDto
    {
        public Guid Id { get; set; }
        public required string Title { get; set; }
    }

    public class SaveShiftItemDto
    {
        public Guid Id { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveShiftPositionRequirementDto
    {
        public Guid ShiftId { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
    }

    public class SaveShiftConfigDto
    {
        public bool WeekEndsWorking { get; set; }
        public bool ConsiderWeeklyHours { get; set; }
        public required List<SaveShiftItemDto> Shifts { get; set; }
        public required List<ShiftDayScheduleDto> DaySchedules { get; set; }
        public required List<SaveShiftPositionRequirementDto> PositionRequirements { get; set; }
        public List<SaveShiftDayPositionRequirementOverrideDto> DayPositionRequirementOverrides { get; set; } = [];
    }

    // ── Weekly Schedule DTOs ───────────────────────────────────────────────────

    public class WeeklyScheduleAssignmentDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public required EmployeeShiftDto Employee { get; set; }

        /// <summary>True when this assignment was produced by an accepted voluntary swap.</summary>
        public bool IsSwapped { get; set; }
    }

    public class WeeklyScheduleUnavailabilityDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }
        public required string FullName { get; set; }
        public DateTime ReportedAt { get; set; }
    }

    public class WeeklyScheduleDto
    {
        public required string WeekStart { get; set; }
        public bool IsPublished { get; set; }
        public required List<WeeklyScheduleAssignmentDto> Assignments { get; set; }
        public required List<WeeklyScheduleUnavailabilityDto> Unavailabilities { get; set; }
        public required List<PositionRequirementOverrideDto> PositionRequirementOverrides { get; set; }
    }

    // ── Mutation DTOs ──────────────────────────────────────────────────────────

    public class AssignEmployeeDto
    {
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateOnly Date { get; set; }
        /// <summary>
        /// When true, overridable hard constraints (Overtime, Rotation, PinnedShift) are skipped.
        /// Blocking constraints (RestPeriod, ConsecutiveHours, Absence) are always enforced.
        /// </summary>
        public bool ForceOverride { get; set; }
    }

    public class ConstraintInfoDto
    {
        public required string Name { get; init; }
        public required string Severity { get; init; }
        public int Priority { get; init; }
        public bool IsUserOverridable { get; init; }
    }

    public class SetPositionRequirementOverrideDto
    {
        public Guid ShiftId { get; set; }
        public DateOnly Date { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
    }

    public class PositionRequirementOverrideDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public Guid PositionId { get; set; }
        public int RequiredCount { get; set; }
    }

    public class ReportUnavailabilityDto
    {
        public Guid ShiftId { get; set; }
        public DateOnly Date { get; set; }
    }

    // ── Smart scheduling DTOs ──────────────────────────────────────────────────

    public class ProposedAssignmentDto
    {
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
    }

    public class UnfilledSlotDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public Guid? RequiredPositionId { get; set; }
        public required string Reason { get; set; }
    }

    public class ScheduleSoftViolationDto
    {
        public Guid EmployeeId { get; set; }
        public Guid ShiftId { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public required string ConstraintName { get; set; }
        public int Priority { get; set; }
        public required string Reason { get; set; }
    }

    public class GenerateScheduleRangeRequestDto
    {
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        /// <summary>When true, persist proposed assignments immediately. When false, return them for preview.</summary>
        public bool Persist { get; set; }
    }

    public class ReoptimizeScheduleRequestDto
    {
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        /// <summary>Solver wall-clock budget in seconds. Defaults server-side when omitted.</summary>
        public int? TimeBudgetSeconds { get; set; }
        /// <summary>When true, replace existing assignments in [StartDate, EndDate] with the new solution. When false, return as preview.</summary>
        public bool Persist { get; set; }
        /// <summary>
        /// Names of hard constraints the manager has explicitly disabled for this run.
        /// The server SILENTLY DROPS any name that does not correspond to a hard constraint
        /// whose <c>IsUserOverridable</c> flag is true — non-overridable constraints can
        /// never be bypassed, regardless of what the client requests.
        /// </summary>
        public List<string>? DisabledConstraints { get; set; }
    }

    public class ReoptimizeScheduleResponseDto
    {
        public required string StartDate { get; set; }
        public required string EndDate { get; set; }
        public required string SolverStatus { get; set; }
        public bool Applied { get; set; }
        public bool ValidationPassed { get; set; }
        public int TotalSlots { get; set; }
        public int FilledSlotsBefore { get; set; }
        public int FilledSlotsAfter { get; set; }
        public long SolverDurationMs { get; set; }
        public required List<ProposedAssignmentDto> ProposedAssignments { get; set; }
        public required List<UnfilledSlotDto> UnfilledSlots { get; set; }
        public required List<HardConstraintViolationDto> Violations { get; set; }
    }

    public class HardConstraintViolationDto
    {
        public Guid EmployeeId { get; set; }
        public Guid ShiftId { get; set; }
        public required string Date { get; set; }
        public required string ConstraintName { get; set; }
        public required string Reason { get; set; }
    }

    public class OptimizerChangeDto
    {
        public required string Type { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid? FromShiftId { get; set; }
        /// <summary>"YYYY-MM-DD" — origin date for cross-day reassignments.</summary>
        public string? FromDate { get; set; }
        public required string Description { get; set; }
    }

    public class OptimizationSummaryDto
    {
        public int Iterations { get; set; }
        public int SlotsFilledByOptimizer { get; set; }
        public int RemainingUnfilled { get; set; }
        /// <summary>Wall-clock duration of the optimizer pass in milliseconds (summed across weeks).</summary>
        public long DurationMs { get; set; }
        public required List<OptimizerChangeDto> Changes { get; set; }
    }

    // ── Working Time Overview DTOs ─────────────────────────────────────────────

    public class WorkingTimeMonthDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        /// <summary>"January 2026"</summary>
        public required string Label { get; set; }
        /// <summary>Key used to index into MonthStats: "YYYY-M" e.g. "2026-5"</summary>
        public required string Key { get; set; }
    }

    public class WorkingTimeMonthStatsDto
    {
        public double Hours { get; set; }
        public int Days { get; set; }
    }

    public class WorkingTimeEmployeeRowDto
    {
        public Guid EmployeeId { get; set; }
        public required string FullName { get; set; }
        public string? ProfilePictureSrc { get; set; }
        public required string Position { get; set; }
        public int WeeklyHours { get; set; }
        /// <summary>Key: "YYYY-M" (matches WorkingTimeMonthDto.Key)</summary>
        public required Dictionary<string, WorkingTimeMonthStatsDto> MonthStats { get; set; }
    }

    public class WorkingTimeOverviewDto
    {
        public int Year { get; set; }
        /// <summary>Published months in the requested year, in chronological order.</summary>
        public required List<WorkingTimeMonthDto> Months { get; set; }
        /// <summary>One row per employee who appeared in at least one published week.</summary>
        public required List<WorkingTimeEmployeeRowDto> Employees { get; set; }
    }

    // ── Payroll Export DTOs ─────────────────────────────────────────────────────

    /// <summary>
    /// One employee's regular/overtime hour split for a single pay period (month).
    /// Overtime is split out of weekly totals using the same Monday-anchored ISO week
    /// and WeeklyHours cap as <see cref="Business.Scheduling.Constraints.OvertimeConstraint"/>,
    /// so the export matches whatever the scheduling engine already enforced.
    /// </summary>
    public class PayrollExportRowDto
    {
        public Guid EmployeeId { get; set; }
        /// <summary>External/personal identifier, used by payroll systems to match employees. May be empty.</summary>
        public string EmployeeCode { get; set; } = string.Empty;
        public required string FullName { get; set; }
        public required string Position { get; set; }
        public int WeeklyHours { get; set; }
        public double RegularHours { get; set; }
        public double OvertimeHours { get; set; }
        public double TotalHours { get; set; }
        public int DaysWorked { get; set; }
    }

    public class WeekCoverageBreakdownDto
    {
        /// <summary>"YYYY-MM-DD" — Monday of the week.</summary>
        public required string WeekStart { get; set; }
        public int TotalSlots { get; set; }
        public int FilledSlots { get; set; }
    }

    public class EmployeeMonthSummaryDto
    {
        public Guid EmployeeId { get; set; }
        public required string FullName { get; set; }
        public int DaysWorked { get; set; }
        public double HoursWorked { get; set; }
    }

    public class GenerateScheduleRangeResponseDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string StartDate { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string EndDate { get; set; }
        public int TotalSlots { get; set; }
        public int FilledSlots { get; set; }
        public bool Persisted { get; set; }
        public required List<WeekCoverageBreakdownDto> WeekBreakdown { get; set; }
        public required List<ProposedAssignmentDto> ProposedAssignments { get; set; }
        public required List<UnfilledSlotDto> UnfilledSlots { get; set; }
        public required List<ScheduleSoftViolationDto> AcceptedSoftViolations { get; set; }
        /// <summary>Per-employee summary of proposed days and hours across the month.</summary>
        public required List<EmployeeMonthSummaryDto> EmployeeSummaries { get; set; }
        public OptimizationSummaryDto? Optimization { get; set; }
    }

    // ── Onboarding / Prior-week provisioning DTOs ──────────────────────────────

    /// <summary>
    /// One employee row in a prior-week import. DailyShiftIds[0] = Monday … [6] = Sunday.
    /// Null entry means the employee was off that day.
    /// AnchorDate (yyyy-MM-dd) is the first calendar day of the employee's current on-block,
    /// used to seed RotationAnchorDate when a rotation pattern is assigned.
    /// </summary>
    public class PriorWeekEmployeeEntryDto
    {
        public Guid EmployeeId { get; set; }
        /// <summary>7 elements; null = day off.</summary>
        public required List<Guid?> DailyShiftIds { get; set; }
        /// <summary>"yyyy-MM-dd" — first day of the current on-block. Required when employee has a rotation pattern.</summary>
        public string? AnchorDate { get; set; }
    }

    /// <summary>Payload for POST Shift/ProvisionPriorWeek.</summary>
    public class ProvisionPriorWeekDto
    {
        /// <summary>"yyyy-MM-dd" — must be a Monday.</summary>
        public required string WeekStart { get; set; }
        public required List<PriorWeekEmployeeEntryDto> Employees { get; set; }
    }

    public class ProvisionPriorWeekResultDto
    {
        public int AssignmentsInserted { get; set; }
        public int AnchorDatesSet { get; set; }
    }

    public class SetRotationAnchorDto
    {
        public Guid EmployeeId { get; set; }
        /// <summary>"yyyy-MM-dd" — null clears the persisted anchor (reverts to epoch staggering).</summary>
        public string? AnchorDate { get; set; }
    }
}
