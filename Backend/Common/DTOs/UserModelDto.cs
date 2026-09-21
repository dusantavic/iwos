using System;

namespace Iwos.Common.DTOs
{
    public record UserModelDto
    {
        public required string Username { get; init; }
        public required string FirstName { get; init; }
        public required string LastName { get; init; }
        public required string Email { get; init; }
        public required string Password { get; init; }
        public required Guid ClientId { get; set; }
    }
}
