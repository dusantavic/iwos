using Iwos.Common.Contracts;
using System;

namespace Iwos.Data.Model
{
    public class EmployeeAccount : IActiveEntity
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid ClientId { get; set; }
        public required string Username { get; set; }
        public required string PasswordHash { get; set; }
        public bool Active { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }

        public virtual Employee? Employee { get; set; }
        public virtual Client? Client { get; set; }
    }
}
