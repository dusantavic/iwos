using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Defines how many employees of a specific position are required for a shift.
    /// Scoped per shift (not per day). Unique per (ShiftId, PositionId).
    /// </summary>
    public class ShiftPositionRequirement
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public virtual required Shift Shift { get; set; }
        public Guid PositionId { get; set; }
        public virtual required Position Position { get; set; }

        /// <summary>Minimum number of employees with this position required for the shift.</summary>
        public int RequiredCount { get; set; }
    }
}
