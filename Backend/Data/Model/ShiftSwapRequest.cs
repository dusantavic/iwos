using System;

namespace Iwos.Data.Model
{
    public enum ShiftSwapStatus
    {
        Pending = 0,
        Accepted = 1,
        Declined = 2,
        Cancelled = 3
    }

    /// <summary>
    /// A request from one employee to swap shifts with another.
    /// The requester offers one of their assigned shifts and asks to take one of the target's.
    /// </summary>
    public class ShiftSwapRequest
    {
        public Guid Id { get; set; }

        /// <summary>The employee who initiated the swap request.</summary>
        public Guid RequesterId { get; set; }

        /// <summary>The employee being asked to swap.</summary>
        public Guid TargetEmployeeId { get; set; }

        /// <summary>The shift the requester wants (currently assigned to the target).</summary>
        public Guid RequestedShiftId { get; set; }

        /// <summary>The date of the requested shift.</summary>
        public DateOnly RequestedDate { get; set; }

        /// <summary>The shift the requester is offering in return.</summary>
        public Guid OfferedShiftId { get; set; }

        /// <summary>The date of the offered shift.</summary>
        public DateOnly OfferedDate { get; set; }

        public ShiftSwapStatus Status { get; set; } = ShiftSwapStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>When the target employee responded (accepted/declined).</summary>
        public DateTime? RespondedAt { get; set; }

        public virtual required Employee Requester { get; set; }
        public virtual required Employee TargetEmployee { get; set; }
        public virtual required Shift RequestedShift { get; set; }
        public virtual required Shift OfferedShift { get; set; }
    }
}
