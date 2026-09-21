using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Configures the default schedule for a shift on a specific day of the week.
    /// One row per (Shift, DayOfWeek) pair.
    /// These are the repeating weekly defaults; per-date exceptions live in ShiftDateOverride.
    /// </summary>
    public class ShiftDaySchedule
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }

        /// <summary>0 = Sunday, 1 = Monday, … 6 = Saturday (matches .NET DayOfWeek enum).</summary>
        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public virtual required Shift Shift { get; set; }
    }
}
