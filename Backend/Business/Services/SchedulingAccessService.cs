using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Authoritative gate for the scheduling engine. Loads the current subscription
    /// for the request's tenant and delegates the decision to
    /// <see cref="SchedulingPolicyEvaluator"/>.
    /// </summary>
    public sealed class SchedulingAccessService : ISchedulingAccessService
    {
        private readonly IwosDbContext _context;
        private readonly ITenantProvider _tenantProvider;

        public SchedulingAccessService(IwosDbContext context, ITenantProvider tenantProvider)
        {
            _context = context;
            _tenantProvider = tenantProvider;
        }

        public async Task<SchedulingPolicyDto> GetPolicyAsync(CancellationToken ct = default)
        {
            var snapshot = await LoadSubscriptionAsync(ct);
            return SchedulingPolicyEvaluator.BuildPolicy(
                snapshot.PlanCode,
                snapshot.StartDate,
                snapshot.EndDate,
                snapshot.PlanningWindowMonths,
                snapshot.PlanName);
        }

        public async Task EnsureCanScheduleAsync(DateOnly date, CancellationToken ct = default)
        {
            var policy = await GetPolicyAsync(ct);
            SchedulingPolicyEvaluator.EnsureCanSchedule(policy, date);
        }

        public async Task EnsureCanScheduleRangeAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
        {
            var policy = await GetPolicyAsync(ct);
            SchedulingPolicyEvaluator.EnsureCanScheduleRange(policy, from, to);
        }

        private async Task<SubscriptionSnapshot> LoadSubscriptionAsync(CancellationToken ct)
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (tenantId == Guid.Empty)
            {
                throw new SchedulingAccessException(
                    SchedulingAccessException.CodeTenantUnknown,
                    "Unable to resolve tenant for the current request.");
            }

            var clientExists = await _context.Clients
                .AsNoTracking()
                .AnyAsync(c => c.Id == tenantId, ct);

            if (!clientExists)
            {
                throw new SchedulingAccessException(
                    SchedulingAccessException.CodeTenantUnknown,
                    "Client record not found for the current tenant.");
            }

            // Resolve the active period directly by date rather than relying on
            // Client.CurrentSubscriptionId. The pointer is a maintenance hint and
            // can lag (e.g. a subscription expires overnight); the truth is in
            // the history rows themselves: StartDate <= today AND
            // (EndDate IS NULL OR EndDate > today).
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var current = await _context.ClientSubscriptionPlanHistories
                .AsNoTracking()
                .Where(h => h.ClientId == tenantId
                            && h.StartDate <= today
                            && (h.EndDate == null || h.EndDate > today))
                .OrderByDescending(h => h.StartDate)
                .Select(h => new
                {
                    h.StartDate,
                    h.EndDate,
                    PlanCode = h.SubscriptionPlanType.Code,
                    PlanName = h.SubscriptionPlanType.Name,
                    PlanningWindowMonths = h.SubscriptionPlanType.PlanningWindowMonths,
                })
                .FirstOrDefaultAsync(ct);

            if (current == null)
            {
                return new SubscriptionSnapshot(null, null, null, null, null);
            }

            return new SubscriptionSnapshot(
                current.PlanCode,
                current.PlanName,
                current.StartDate,
                current.EndDate,
                current.PlanningWindowMonths);
        }

        private readonly record struct SubscriptionSnapshot(
            string? PlanCode,
            string? PlanName,
            DateOnly? StartDate,
            DateOnly? EndDate,
            int? PlanningWindowMonths);
    }
}
