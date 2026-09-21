using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    /// <summary>
    /// Writes append-only audit rows for privileged actions performed through
    /// the internal admin portal.
    /// </summary>
    public interface IAdminAuditLogger
    {
        Task LogAsync(Guid adminUserId, string action, string? entityType, Guid? entityId, string? details, CancellationToken ct = default);
    }
}
