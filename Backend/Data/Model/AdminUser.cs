using Iwos.Common.Contracts;
using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Iwos staff account for the internal admin portal. Fully isolated from
    /// <see cref="ApplicationUser"/> (managers) and <see cref="EmployeeAccount"/>
    /// (employee portal) — admins are not tenant-scoped, so this entity
    /// intentionally has NO <c>ClientId</c>.
    /// </summary>
    public class AdminUser : IActiveEntity
    {
        public Guid Id { get; set; }
        public required string Username { get; set; }
        public required string PasswordHash { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public bool Active { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<AdminAuditLog>? AuditLogs { get; set; }
    }
}
