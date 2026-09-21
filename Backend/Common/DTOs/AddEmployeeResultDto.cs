using System;

namespace Iwos.Common.DTOs
{
    public record AddEmployeeResultDto
    {
        public required Guid EmployeeId { get; init; }
        public required EmployeeCredentialsDto Credentials { get; init; }
    }
}
