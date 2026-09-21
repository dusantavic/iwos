using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Immutable audit trail of privileged actions performed by Iwos staff
    /// through the internal admin portal (e.g. client creation, subscription
    /// assignment). Rows are append-only — never updated or deleted by the
    /// application.
    /// </summary>
    public class AdminAuditLog
    {
        public Guid Id { get; set; }
        public Guid AdminUserId { get; set; }
        public required string Action { get; set; }
        public string? EntityType { get; set; }
        public Guid? EntityId { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual AdminUser? AdminUser { get; set; }
    }
}
