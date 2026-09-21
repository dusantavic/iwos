using System;
using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.DTOs;

namespace Iwos.Common.Contracts
{
    public interface ISchedulingAccessService
    {
        Task<SchedulingPolicyDto> GetPolicyAsync(CancellationToken ct = default);

        Task EnsureCanScheduleAsync(DateOnly date, CancellationToken ct = default);
        Task EnsureCanScheduleRangeAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    }
}
