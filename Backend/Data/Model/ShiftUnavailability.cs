using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// An employee's self-reported unavailability for a specific shift on a specific date.
    /// Unique constraint: (ShiftId, EmployeeId, Date) — one report per employee per shift per day.
    /// </summary>
    public class ShiftUnavailability
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }

        /// <summary>The date the employee is unavailable for this shift.</summary>
        public DateOnly Date { get; set; }

        /// <summary>Denormalized full name for display without requiring a join.</summary>
        public required string FullName { get; set; }

        /// <summary>When the employee submitted the unavailability report.</summary>
        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

        public virtual required Shift Shift { get; set; }
        public virtual required Employee Employee { get; set; }
    }
}
