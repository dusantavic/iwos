using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    // ── Overview KPIs ──────────────────────────────────────────────────────────

    public class TodayCoverageStatsDto
    {
        public int Filled { get; set; }
        public int Required { get; set; }
        public int Percent { get; set; }
    }

    public class WeekHoursVarianceDto
    {
        public double AverageDeviationHours { get; set; }
        public int OverUtilizedCount { get; set; }
        public int UnderUtilizedCount { get; set; }
    }

    public class CurrentWeekDto
    {
        /// <summary>"YYYY-MM-DD" — Monday of the current ISO week.</summary>
        public required string WeekStart { get; set; }
        /// <summary>"YYYY-MM-DD" — Sunday of the current ISO week.</summary>
        public required string WeekEnd { get; set; }
        /// <summary>Whether every required slot in the current week has at least one assignment.</summary>
        public bool IsPublished { get; set; }
    }

    public class DashboardOverviewKpisDto
    {
        public int ActiveEmployees { get; set; }
        public required TodayCoverageStatsDto TodayCoverage { get; set; }
        public int PendingAbsenceApprovals { get; set; }
        public int PendingSwapApprovals { get; set; }
        public required WeekHoursVarianceDto WeekHoursVariance { get; set; }
        public required CurrentWeekDto CurrentWeek { get; set; }
        /// <summary>"YYYY-MM-DD" of the first Monday on/after today with no shift assignments. Null when all upcoming weeks (within 12 weeks) are scheduled.</summary>
        public string? FirstUnscheduledWeekStart { get; set; }
        /// <summary>"YYYY-MM-DD" of the first day of the first month on/after today with no shift assignments. Null when all months in horizon are scheduled.</summary>
        public string? FirstUnscheduledMonthStart { get; set; }
    }

    // ── Today's shift coverage ─────────────────────────────────────────────────

    public class ShiftCoverageAssigneeDto
    {
        public Guid EmployeeId { get; set; }
        public required string FullName { get; set; }
        public string? ProfilePictureSrc { get; set; }
        public required string Position { get; set; }
    }

    public class TodayShiftCoverageDto
    {
        public Guid ShiftId { get; set; }
        public required string ShiftLabel { get; set; }
        public int RequiredCount { get; set; }
        public int AssignedCount { get; set; }
        /// <summary>"Covered" | "Under" | "Over"</summary>
        public required string Status { get; set; }
        /// <summary>Top 6 assignees; UI shows "+N more" if AssignedCount exceeds the list length.</summary>
        public required List<ShiftCoverageAssigneeDto> Assignees { get; set; }
    }

    // ── Week coverage breakdown ────────────────────────────────────────────────

    public class DayCoverageDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        /// <summary>0 = Sunday … 6 = Saturday</summary>
        public int DayOfWeek { get; set; }
        public int FilledSlots { get; set; }
        public int RequiredSlots { get; set; }
        public int Percent { get; set; }
    }

    public class UnfilledSlotShortDto
    {
        /// <summary>"YYYY-MM-DD"</summary>
        public required string Date { get; set; }
        public Guid ShiftId { get; set; }
        public required string ShiftLabel { get; set; }
        public Guid? RequiredPositionId { get; set; }
        public string? RequiredPositionTitle { get; set; }
        public int MissingCount { get; set; }
    }

    public class DashboardWeekCoverageDto
    {
        public required string WeekStart { get; set; }
        public required string WeekEnd { get; set; }
        public required List<DayCoverageDto> Days { get; set; }
        public required List<UnfilledSlotShortDto> UnfilledSlots { get; set; }
    }

    // ── Working hours summary ──────────────────────────────────────────────────

    public class EmployeeHoursRowDto
    {
        public Guid EmployeeId { get; set; }
        public required string FullName { get; set; }
        public string? ProfilePictureSrc { get; set; }
        public double ScheduledHours { get; set; }
        public int ContractedHours { get; set; }
        public double Variance { get; set; }
        public double VariancePercent { get; set; }
    }

    public class WorkingHoursSummaryDto
    {
        public required string WeekStart { get; set; }
        public required string WeekEnd { get; set; }
        public required List<EmployeeHoursRowDto> TopOverUtilized { get; set; }
        public required List<EmployeeHoursRowDto> TopUnderUtilized { get; set; }
        /// <summary>
        /// Eight bucket counts of (scheduled - contracted) hours:
        /// [-∞..-10), [-10..-6), [-6..-3), [-3..0), [0..+3), [+3..+6), [+6..+10), [+10..+∞)
        /// </summary>
        public required List<int> Distribution { get; set; }
    }

    // ── Configuration snapshot ─────────────────────────────────────────────────

    public class ConfigurationCountsDto
    {
        public int ActiveShifts { get; set; }
        public int RotationPatterns { get; set; }
        public int Positions { get; set; }
        public int Departments { get; set; }
        public int EmployeesWithoutRotation { get; set; }
    }

    public class ScheduleHealthIssueDto
    {
        /// <summary>"info" | "warning" | "critical"</summary>
        public required string Severity { get; set; }
        /// <summary>Stable issue code, e.g. "ShiftMissingDaySchedule".</summary>
        public required string Code { get; set; }
        public required string Title { get; set; }
        public required string Description { get; set; }
        /// <summary>Optional client-side route the UI can link to (e.g., "/shift-config").</summary>
        public string? CtaRoute { get; set; }
    }

    public class ConfigurationSnapshotDto
    {
        public required ConfigurationCountsDto Counts { get; set; }
        public required List<ScheduleHealthIssueDto> OpenIssues { get; set; }
    }
}
