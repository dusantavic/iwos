using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Overrides the weekly ShiftDaySchedule for a specific calendar date.
    /// Only the fields that differ from the weekly default need to be set;
    /// null means "use the weekly default for that field".
    /// </summary>
    public class ShiftDateOverride
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }

        /// <summary>The specific date this override applies to.</summary>
        public DateOnly Date { get; set; }

        /// <summary>Overrides ShiftDaySchedule.StartTime for this date. Null = use weekly default.</summary>
        public TimeOnly? StartTime { get; set; }

        /// <summary>Overrides ShiftDaySchedule.EndTime for this date. Null = use weekly default.</summary>
        public TimeOnly? EndTime { get; set; }

        public virtual required Shift Shift { get; set; }
    }
}
