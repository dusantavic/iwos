using Iwos.Common.Contracts;
using Iwos.Data.Context;
using Iwos.Data.Model;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Providers
{
    public sealed class AdminAuditLogger : IAdminAuditLogger
    {
        private readonly IwosDbContext _context;

        public AdminAuditLogger(IwosDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(Guid adminUserId, string action, string? entityType, Guid? entityId, string? details, CancellationToken ct = default)
        {
            _context.AdminAuditLogs.Add(new AdminAuditLog
            {
                Id = Guid.CreateVersion7(),
                AdminUserId = adminUserId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync(ct);
        }
    }
}
