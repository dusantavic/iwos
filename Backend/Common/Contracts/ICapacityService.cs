using Iwos.Common.DTOs;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface ICapacityService
    {
        Task<CapacityOverviewDto> GetCapacityOverviewAsync(CancellationToken ct = default);
    }
}
