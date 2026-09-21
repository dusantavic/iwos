using Iwos.Common.Contracts.Enums;
using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Forward-looking projection for an absence request. Computed by AbsencePlanningService
    /// for both pre-submit previews (employee portal) and pending-approval views (manager).
    /// Drives every absence UI in the system.
    /// </summary>
    public sealed class AbsenceImpactDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeFullName { get; set; } = string.Empty;
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public AbsenceType Type { get; set; }
        public string TypeLabel { get; set; } = string.Empty;
        public int CalendarDays { get; set; }

        /// <summary>PreSchedule | PostSchedule | Mixed — does an active schedule cover the range?</summary>
        public string Mode { get; set; } = "PreSchedule";

        /// <summary>StandardWeek | Scheduled | Approximated — how charged days were resolved.</summary>
        public string Regime { get; set; } = "StandardWeek";

        /// <summary>True when at least one charged day's hours are estimated (no real assignment).</summary>
        public bool HoursEstimated { get; set; }

        public int ChargedWorkingDays { get; set; }
        public decimal ChargedWorkingHours { get; set; }

        /// <summary>Reserved for future use; always null in the current charging model.</summary>
        public int? MinChargedWorkingDays { get; set; }
        public int? MaxChargedWorkingDays { get; set; }

        public int PseudoWeekendDays { get; set; }
        public int CalendarWeekendDays { get; set; }
        public int HolidayDays { get; set; }

        public List<AbsenceImpactDayDto> Days { get; set; } = new();
        public List<AbsenceImpactConflictDto> Conflicts { get; set; } = new();
        public List<AbsenceImpactCoverageDto> CoverageWarnings { get; set; } = new();

        public AbsenceImpactBalanceDto Balance { get; set; } = new();
        public List<string> Notices { get; set; } = new();
        public bool Sufficient { get; set; }
    }

    public sealed class AbsenceImpactDayDto
    {
        public DateOnly Date { get; set; }
        /// <summary>Working | PseudoWeekendOff | CalendarWeekendOff | Holiday</summary>
        public string Kind { get; set; } = string.Empty;
        public decimal Hours { get; set; }
        public bool HoursEstimated { get; set; }
        public Guid? AssignedShiftId { get; set; }
        public string? AssignedShiftLabel { get; set; }
    }

    public sealed class AbsenceImpactConflictDto
    {
        public Guid AssignmentId { get; set; }
        public Guid ShiftId { get; set; }
        public string ShiftLabel { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public decimal Hours { get; set; }
    }

    public sealed class AbsenceImpactCoverageDto
    {
        public DateOnly Date { get; set; }
        public Guid ShiftId { get; set; }
        public string ShiftLabel { get; set; } = string.Empty;
        public Guid? PositionId { get; set; }
        public string? PositionTitle { get; set; }
        public int Required { get; set; }
        public int AssignedBefore { get; set; }
        public int AssignedAfter { get; set; }
        /// <summary>Info | Warning | Critical</summary>
        public string Severity { get; set; } = "Info";
    }

    public sealed class AbsenceImpactBalanceDto
    {
        public int CurrentRemainingAnnualDays { get; set; }
        public int CurrentRemainingCarriedOverDays { get; set; }
        public int ProjectedRemainingAnnualDays { get; set; }
        public int ProjectedRemainingCarriedOverDays { get; set; }
        public int UseFromAnnual { get; set; }
        public int UseFromCarriedOver { get; set; }
    }
}
