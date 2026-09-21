using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Overrides the default ShiftPositionRequirement count for a specific calendar date.
    /// E.g. "On Fridays, Morning shift needs 2 Receptionists instead of the usual 1."
    /// Unique per (ShiftId, Date, PositionId).
    /// </summary>
    public class ShiftPositionRequirementOverride
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public DateOnly Date { get; set; }
        public Guid PositionId { get; set; }

        /// <summary>Required count for this position on this specific date.</summary>
        public int RequiredCount { get; set; }

        public virtual required Shift Shift { get; set; }
        public virtual required Position Position { get; set; }
    }
}
