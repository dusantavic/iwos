using System;

namespace Iwos.Common.DTOs
{
    public record EmployeePortalMeDto
    {
        public required Guid EmployeeId { get; init; }
        public required string Username { get; init; }
        public required string FirstName { get; init; }
        public required string LastName { get; init; }
        public required string ContactEmail { get; init; }
        public string? ProfilePictureSrc { get; init; }
        public required string PositionName { get; init; }
    }
}
