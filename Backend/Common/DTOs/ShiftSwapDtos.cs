using System;

namespace Iwos.Common.DTOs
{
    // ── Mutation DTOs ─────────────────────────────────────────────────────────

    public class RequestShiftSwapDto
    {
        public Guid TargetEmployeeId { get; set; }
        public Guid RequestedShiftId { get; set; }
        public DateOnly RequestedDate { get; set; }
        public Guid OfferedShiftId { get; set; }
        public DateOnly OfferedDate { get; set; }
    }

    public class RespondToShiftSwapDto
    {
        public bool Accept { get; set; }
    }

    // ── Read DTOs ─────────────────────────────────────────────────────────────

    public class ShiftSwapRequestDto
    {
        public Guid Id { get; set; }

        public Guid RequesterId { get; set; }
        public required string RequesterName { get; set; }
        public string? RequesterProfilePictureSrc { get; set; }

        public Guid TargetEmployeeId { get; set; }
        public required string TargetEmployeeName { get; set; }
        public string? TargetEmployeeProfilePictureSrc { get; set; }

        public Guid RequestedShiftId { get; set; }
        public required string RequestedShiftLabel { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string RequestedDate { get; set; }

        public Guid OfferedShiftId { get; set; }
        public required string OfferedShiftLabel { get; set; }
        /// <summary>"YYYY-MM-DD"</summary>
        public required string OfferedDate { get; set; }

        public required string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
    }
}
