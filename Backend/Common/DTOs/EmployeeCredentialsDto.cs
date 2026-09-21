using System;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Returned exactly once, at employee creation, bulk provisioning, or password
    /// reset. The plaintext password is never stored — only its hash lives in the
    /// database — so this DTO is the single opportunity to surface credentials to
    /// a human. <see cref="EmployeeId"/>, <see cref="FirstName"/>, and
    /// <see cref="LastName"/> are populated for bulk/reset flows so the manager
    /// can tie each row to the right person; they are optional for the
    /// single-create flow where the manager already knows who they just added.
    /// </summary>
    public record EmployeeCredentialsDto
    {
        public Guid? EmployeeId { get; init; }
        public string? FirstName { get; init; }
        public string? LastName { get; init; }
        public required string Username { get; init; }
        public required string TemporaryPassword { get; init; }
    }
}
