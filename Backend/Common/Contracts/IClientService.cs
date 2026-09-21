using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.DTOs;

namespace Iwos.Common.Contracts
{
    public interface IClientService
    {
        /// <summary>
        /// Loads the overview for the current tenant: identity, current
        /// subscription period, and the client's application users.
        /// </summary>
        Task<ClientOverviewDto?> GetOverviewAsync(CancellationToken ct = default);
    }
}
