using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Records that a specific employee is assigned to a shift on a specific date.
    /// Unique constraint: (ShiftId, EmployeeId, Date) — one assignment per employee per shift per day.
    /// </summary>
    public class ShiftAssignment
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public Guid EmployeeId { get; set; }

        /// <summary>The calendar date of the assignment.</summary>
        public DateOnly Date { get; set; }

        /// <summary>When the assignment was created.</summary>
        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

        /// <summary>The employee (manager) who made the assignment. Null if done by the system.</summary>
        public Guid? AssignedById { get; set; }

        /// <summary>
        /// True when this assignment was produced by an accepted voluntary employee-to-employee
        /// shift swap. Set on both legs of the swap (requester and target). Never cleared by the
        /// scheduling engine — the engine treats these as locked and does not regenerate them.
        /// </summary>
        public bool IsSwapped { get; set; }

        /// <summary>
        /// The <see cref="ShiftSwapRequest"/> that produced this assignment, when it originated
        /// from a swap. The swap row carries the full audit (who/with whom/when accepted).
        /// Intentionally not declared as a navigation property to keep swap rows independently
        /// purgeable.
        /// </summary>
        public Guid? LastSwapId { get; set; }

        public virtual required Shift Shift { get; set; }
        public virtual required Employee Employee { get; set; }
    }
}
