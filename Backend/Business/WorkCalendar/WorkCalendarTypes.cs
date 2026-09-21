using System;
using System.Collections.Generic;

namespace Iwos.Business.WorkCalendar
{
    public enum DayKind
    {
        Working,
        PseudoWeekendOff,
        CalendarWeekendOff,
        Holiday
    }

    public enum CalendarRegime
    {
        /// <summary>Tenant runs a Mon–Fri week (WeekEndsWorking = false). Off-days are Sat/Sun.</summary>
        StandardWeek,
        /// <summary>7-day operation and the schedule has been generated for the entire range. Working/off comes from real assignments.</summary>
        Scheduled,
        /// <summary>7-day operation but the schedule does not cover the entire range. Charged days are approximated from WeeklyDays / 7.</summary>
        Approximated
    }

    public sealed record WorkCalendarDay(
        DateOnly Date,
        DayOfWeek DayOfWeek,
        DayKind Kind,
        decimal Hours,
        bool HoursEstimated,
        Guid? AssignedShiftId,
        string? AssignedShiftLabel,
        Guid? AssignmentId
    );

    public sealed class EmployeeWorkCalendar
    {
        public required Guid EmployeeId { get; init; }
        public required string EmployeeFullName { get; init; }
        public required DateOnly Start { get; init; }
        public required DateOnly End { get; init; }
        public required CalendarRegime Regime { get; init; }
        public required IReadOnlyList<WorkCalendarDay> Days { get; init; }

        /// <summary>Total number of calendar days in the range.</summary>
        public int CalendarDays { get; init; }

        /// <summary>Working days the request will be charged (after rounding for Approximated regime).</summary>
        public int ChargedWorkingDays { get; init; }

        /// <summary>Hours the request will be charged (sum for Standard/Scheduled, derived for Approximated).</summary>
        public decimal ChargedWorkingHours { get; init; }

        /// <summary>True when at least one charged day's hours are estimated rather than read from a real assignment.</summary>
        public bool HoursEstimated { get; init; }

        /// <summary>Employee's contracted working days per week (1–7). Used for Approximated charging.</summary>
        public int WeeklyDays { get; init; }

        /// <summary>True if every day in the range falls within the published schedule horizon for the tenant.</summary>
        public bool ScheduleCoversRange { get; init; }
    }
}
