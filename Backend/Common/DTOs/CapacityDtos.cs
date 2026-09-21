using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    // ── Capacity / Resources DTOs ──────────────────────────────────────────────

    public class CapacityRequirementRowDto
    {
        public required List<string> ShiftLabels { get; set; }
        public int ShiftsCount { get; set; }
        public int StaffPerShift { get; set; }
        public int DaysPerWeek { get; set; }
        /// <summary>0 = Sunday … 6 = Saturday.</summary>
        public required List<int> ActiveDaysOfWeek { get; set; }
        /// <summary>StaffPerShift × ShiftsCount × DaysPerWeek.</summary>
        public int WeeklyRequiredSlots { get; set; }
    }

    public class CapacityPositionDto
    {
        public Guid PositionId { get; set; }
        public required string Title { get; set; }
        public int EmployeeCount { get; set; }
        /// <summary>EmployeeCount × 5 (each employee covers 5 shifts/week).</summary>
        public int ActualWeeklyCapacity { get; set; }
        public required List<CapacityRequirementRowDto> RequirementRows { get; set; }
        public int TotalRequiredWeeklySlots { get; set; }
        /// <summary>ActualWeeklyCapacity − TotalRequiredWeeklySlots.</summary>
        public int DeltaSlots { get; set; }
        /// <summary>Negative = employees short, positive = surplus employees, rounded toward zero shortage.</summary>
        public int DeltaEmployees { get; set; }
        /// <summary>"Understaffed" | "Balanced" | "Overstaffed".</summary>
        public required string Status { get; set; }
    }

    public class CapacityOverviewDto
    {
        public required List<CapacityPositionDto> Positions { get; set; }
        public int TotalRequiredWeeklySlots { get; set; }
        public int TotalActualWeeklyCapacity { get; set; }
        public int UnderstaffedPositionCount { get; set; }
        public int OverstaffedPositionCount { get; set; }
    }
}
