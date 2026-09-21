using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Defines a recurring shift type (e.g. Morning, Afternoon, Night).
    /// Scoped per client (tenant). Day-specific schedules are stored in ShiftDaySchedule.
    /// </summary>
    public class Shift
    {
        public Guid Id { get; set; }
        public Guid ClientId { get; set; }

        /// <summary>Human-readable name, e.g. "Morning".</summary>
        public required string Label { get; set; }

        /// <summary>Fallback start time used when no ShiftDaySchedule exists for a given day.</summary>
        public TimeOnly DefaultStartTime { get; set; }

        /// <summary>Fallback end time used when no ShiftDaySchedule exists for a given day.</summary>
        public TimeOnly DefaultEndTime { get; set; }

        public bool IsActive { get; set; } = true;

        /// <summary>Controls the order in which shifts appear in the planner grid.</summary>
        public int SortOrder { get; set; }

        public virtual required Client Client { get; set; }
        public virtual ICollection<ShiftDaySchedule>? DaySchedules { get; set; }
        public virtual ICollection<ShiftAssignment>? Assignments { get; set; }
        public virtual ICollection<ShiftUnavailability>? Unavailabilities { get; set; }
        public virtual ICollection<ShiftDateOverride>? DateOverrides { get; set; }
        public virtual ICollection<ShiftPositionRequirement>? PositionRequirements { get; set; }
        public virtual ICollection<ShiftPositionRequirementOverride>? PositionRequirementOverrides { get; set; }
        public virtual ICollection<ShiftDayPositionRequirementOverride>? DayPositionRequirementOverrides { get; set; }
    }
}
