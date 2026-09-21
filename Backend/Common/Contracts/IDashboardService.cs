using Iwos.Common.DTOs;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IDashboardService
    {
        Task<DashboardOverviewKpisDto> GetOverviewKpisAsync(CancellationToken ct = default);
        Task<List<TodayShiftCoverageDto>> GetTodayShiftCoverageAsync(CancellationToken ct = default);
        Task<DashboardWeekCoverageDto> GetWeekCoverageBreakdownAsync(System.DateOnly? weekStart, CancellationToken ct = default);
        Task<WorkingHoursSummaryDto> GetWorkingHoursSummaryAsync(System.DateOnly? weekStart, CancellationToken ct = default);
        Task<ConfigurationSnapshotDto> GetConfigurationSnapshotAsync(CancellationToken ct = default);
    }
}
