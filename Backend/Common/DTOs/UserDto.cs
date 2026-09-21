using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
    public class UserDto
    {
        public required string Id { get; init; }
        public required string Username { get; init; }
        public required UserType Type { get; init; }
        public Guid ClientId { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
	}
}
