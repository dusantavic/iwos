using Iwos.Common.DTOs;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IDashboardRepository
    {
        Task<int> GetActiveEmployeesCountAsync(CancellationToken ct = default);
        Task<int> GetPendingAbsenceApprovalsCountAsync(CancellationToken ct = default);

        Task<List<TodayShiftCoverageDto>> GetTodayShiftCoverageAsync(DateOnly today, CancellationToken ct = default);
        Task<DashboardWeekCoverageDto> GetWeekCoverageBreakdownAsync(DateOnly weekStart, DateOnly weekEnd, bool weekendsWorking, CancellationToken ct = default);
        Task<WorkingHoursSummaryDto> GetWorkingHoursSummaryAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default);
        Task<ConfigurationSnapshotDto> GetConfigurationSnapshotAsync(DateOnly currentWeekStart, DateOnly currentWeekEnd, bool weekendsWorking, CancellationToken ct = default);

        /// <summary>Returns the first Monday on/after <paramref name="today"/> that has no shift assignments. Null when every week within <paramref name="weeksHorizon"/> has assignments.</summary>
        Task<DateOnly?> GetFirstUnscheduledWeekStartAsync(DateOnly today, int weeksHorizon, CancellationToken ct = default);

        /// <summary>Returns the first day-1 of a month on/after <paramref name="today"/> that has no shift assignments. Null when every month within <paramref name="monthsHorizon"/> has assignments.</summary>
        Task<DateOnly?> GetFirstUnscheduledMonthStartAsync(DateOnly today, int monthsHorizon, CancellationToken ct = default);
    }
}
