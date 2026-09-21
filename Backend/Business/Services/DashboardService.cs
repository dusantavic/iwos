using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    public sealed class DashboardService : IDashboardService
    {
        private const int WeeksHorizon = 12;
        private const int MonthsHorizon = 6;

        private readonly IDashboardRepository _dashboardRepository;
        private readonly IShiftRepository _shiftRepository;
        private readonly IServiceScopeFactory _scopeFactory;

        public DashboardService(IDashboardRepository dashboardRepository, IShiftRepository shiftRepository, IServiceScopeFactory scopeFactory)
        {
            _dashboardRepository = dashboardRepository;
            _shiftRepository = shiftRepository;
            _scopeFactory = scopeFactory;
        }

        // Each branch needs its own DbContext (EF Core is not thread-safe). A fresh DI scope
        // gives us one — IHttpContextAccessor still resolves the same HttpContext via AsyncLocal,
        // so TenantProvider keeps the correct tenant inside parallel branches.
        private async Task<T> InScope<T>(Func<IServiceProvider, Task<T>> fn)
        {
            using var scope = _scopeFactory.CreateScope();
            return await fn(scope.ServiceProvider);
        }

        public async Task<DashboardOverviewKpisDto> GetOverviewKpisAsync(CancellationToken ct = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var weekStart = AlignToMonday(today);
            var weekEnd = weekStart.AddDays(6);

            // clientConfig must complete first — weekCoverageBreakdown depends on WeekEndsWorking.
            var clientConfig = await _shiftRepository.GetClientConfigAsync(ct);
            var weekendsWorking = clientConfig?.WeekEndsWorking ?? false;

            // Eight independent queries run in parallel on isolated DbContexts.
            var activeEmployeesT       = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetActiveEmployeesCountAsync(ct));
            var todayCoverageT         = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetTodayShiftCoverageAsync(today, ct));
            var pendingAbsencesT       = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetPendingAbsenceApprovalsCountAsync(ct));
            var pendingSwapsT          = InScope(sp => sp.GetRequiredService<IShiftRepository>().GetAllPendingSwapRequestsAsync(ct));
            var hoursT                 = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetWorkingHoursSummaryAsync(weekStart, weekEnd, ct));
            var coverageT              = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetWeekCoverageBreakdownAsync(weekStart, weekEnd, weekendsWorking, ct));
            var firstUnscheduledWeekT  = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetFirstUnscheduledWeekStartAsync(today, WeeksHorizon, ct));
            var firstUnscheduledMonthT = InScope(sp => sp.GetRequiredService<IDashboardRepository>().GetFirstUnscheduledMonthStartAsync(today, MonthsHorizon, ct));

            await Task.WhenAll(activeEmployeesT, todayCoverageT, pendingAbsencesT, pendingSwapsT, hoursT, coverageT, firstUnscheduledWeekT, firstUnscheduledMonthT);

            var activeEmployees = activeEmployeesT.Result;
            var todayCoverage = todayCoverageT.Result;
            var todayRequired = todayCoverage.Sum(c => c.RequiredCount);
            var todayFilled = todayCoverage.Sum(c => Math.Min(c.AssignedCount, c.RequiredCount));
            var todayPercent = todayRequired > 0 ? (int)Math.Round(100.0 * todayFilled / todayRequired) : 0;

            var pendingAbsences = pendingAbsencesT.Result;
            var pendingSwaps = pendingSwapsT.Result.Count;

            var hours = hoursT.Result;
            // averageDeviation across all rows in distribution: derive from over+under-utilized totals.
            // Repository returns top-5 lists, but distribution buckets cover everyone — use those for averages.
            var totalEmployees = hours.Distribution.Sum();
            var weightedSum = hours.Distribution[0] * -12.0
                            + hours.Distribution[1] * -8.0
                            + hours.Distribution[2] * -4.5
                            + hours.Distribution[3] * -1.5
                            + hours.Distribution[4] * 1.5
                            + hours.Distribution[5] * 4.5
                            + hours.Distribution[6] * 8.0
                            + hours.Distribution[7] * 12.0;
            var avgDeviation = totalEmployees > 0 ? Math.Round(weightedSum / totalEmployees, 1) : 0;
            var overUtilizedCount = hours.Distribution[5] + hours.Distribution[6] + hours.Distribution[7];
            var underUtilizedCount = hours.Distribution[0] + hours.Distribution[1] + hours.Distribution[2];

            var coverage = coverageT.Result;
            var isPublished = coverage.UnfilledSlots.Count == 0
                              && coverage.Days.Any(d => d.RequiredSlots > 0);

            var firstUnscheduledWeek = firstUnscheduledWeekT.Result;
            var firstUnscheduledMonth = firstUnscheduledMonthT.Result;

            return new DashboardOverviewKpisDto
            {
                ActiveEmployees = activeEmployees,
                TodayCoverage = new TodayCoverageStatsDto
                {
                    Filled = todayFilled,
                    Required = todayRequired,
                    Percent = todayPercent,
                },
                PendingAbsenceApprovals = pendingAbsences,
                PendingSwapApprovals = pendingSwaps,
                WeekHoursVariance = new WeekHoursVarianceDto
                {
                    AverageDeviationHours = avgDeviation,
                    OverUtilizedCount = overUtilizedCount,
                    UnderUtilizedCount = underUtilizedCount,
                },
                CurrentWeek = new CurrentWeekDto
                {
                    WeekStart = weekStart.ToString("yyyy-MM-dd"),
                    WeekEnd = weekEnd.ToString("yyyy-MM-dd"),
                    IsPublished = isPublished,
                },
                FirstUnscheduledWeekStart = firstUnscheduledWeek?.ToString("yyyy-MM-dd"),
                FirstUnscheduledMonthStart = firstUnscheduledMonth?.ToString("yyyy-MM-dd"),
            };
        }

        public Task<List<TodayShiftCoverageDto>> GetTodayShiftCoverageAsync(CancellationToken ct = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            return _dashboardRepository.GetTodayShiftCoverageAsync(today, ct);
        }

        public async Task<DashboardWeekCoverageDto> GetWeekCoverageBreakdownAsync(DateOnly? weekStart, CancellationToken ct = default)
        {
            var monday = weekStart.HasValue ? AlignToMonday(weekStart.Value) : AlignToMonday(DateOnly.FromDateTime(DateTime.UtcNow));
            var sunday = monday.AddDays(6);
            var clientConfig = await _shiftRepository.GetClientConfigAsync(ct);
            var weekendsWorking = clientConfig?.WeekEndsWorking ?? false;
            return await _dashboardRepository.GetWeekCoverageBreakdownAsync(monday, sunday, weekendsWorking, ct);
        }

        public Task<WorkingHoursSummaryDto> GetWorkingHoursSummaryAsync(DateOnly? weekStart, CancellationToken ct = default)
        {
            var monday = weekStart.HasValue ? AlignToMonday(weekStart.Value) : AlignToMonday(DateOnly.FromDateTime(DateTime.UtcNow));
            var sunday = monday.AddDays(6);
            return _dashboardRepository.GetWorkingHoursSummaryAsync(monday, sunday, ct);
        }

        public async Task<ConfigurationSnapshotDto> GetConfigurationSnapshotAsync(CancellationToken ct = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var weekStart = AlignToMonday(today);
            var weekEnd = weekStart.AddDays(6);
            var clientConfig = await _shiftRepository.GetClientConfigAsync(ct);
            var weekendsWorking = clientConfig?.WeekEndsWorking ?? false;
            return await _dashboardRepository.GetConfigurationSnapshotAsync(weekStart, weekEnd, weekendsWorking, ct);
        }

        private static DateOnly AlignToMonday(DateOnly date)
        {
            var daysFromMonday = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return date.AddDays(-daysFromMonday);
        }
    }
}
