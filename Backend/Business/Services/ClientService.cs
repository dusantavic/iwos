using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Iwos.Business.Services
{
    public sealed class ClientService : IClientService
    {
        private readonly IwosDbContext _context;
        private readonly ITenantProvider _tenantProvider;

        public ClientService(IwosDbContext context, ITenantProvider tenantProvider)
        {
            _context = context;
            _tenantProvider = tenantProvider;
        }

        public async Task<ClientOverviewDto?> GetOverviewAsync(CancellationToken ct = default)
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (tenantId == Guid.Empty) return null;

            var client = await _context.Clients
                .AsNoTracking()
                .Where(c => c.Id == tenantId)
                .Select(c => new ClientSummaryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    ContactEmail = c.ContactEmail,
                    ContactPerson = c.ContactPerson,
                    ContactPhone = c.ContactPhone,
                    Country = c.Country,
                    Address = c.Address,
                    Code = c.Code,
                    Status = c.Status,
                    Plan = c.Plan,
                    LastActivity = c.LastActivity,
                })
                .FirstOrDefaultAsync(ct);

            if (client == null) return null;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var current = await _context.ClientSubscriptionPlanHistories
                .AsNoTracking()
                .Where(h => h.ClientId == tenantId
                            && h.StartDate <= today
                            && (h.EndDate == null || h.EndDate > today))
                .OrderByDescending(h => h.StartDate)
                .Select(h => new
                {
                    Subscription = new ClientSubscriptionDto
                    {
                        Id = h.Id,
                        ClientId = h.ClientId,
                        SubscriptionPlanTypeId = h.SubscriptionPlanTypeId,
                        SubscriptionPlanTypeCode = h.SubscriptionPlanType.Code,
                        SubscriptionPlanTypeName = h.SubscriptionPlanType.Name,
                        StartDate = h.StartDate,
                        EndDate = h.EndDate,
                        Notes = h.Notes,
                        CreatedAt = h.CreatedAt,
                    },
                    PlanningWindowMonths = h.SubscriptionPlanType.PlanningWindowMonths,
                })
                .FirstOrDefaultAsync(ct);

            // Planning window is plan-driven: PlanningWindowMonths is null →
            // unrestricted (no cap); otherwise cap = StartDate + that many months.
            DateOnly? maxPlannableDate = current?.PlanningWindowMonths.HasValue == true
                ? current.Subscription.StartDate.AddMonths(current.PlanningWindowMonths.Value)
                : null;

            var subscription = current?.Subscription;

            var users = await _context.ApplicationUsers
                .AsNoTracking()
                .Where(u => u.ClientId == tenantId)
                .OrderByDescending(u => u.Active)
                .ThenBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new ApplicationUserSummaryDto
                {
                    Id = u.Id,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Username = u.UserName!,
                    Email = u.Email,
                    Type = u.Type,
                    Active = u.Active,
                    LastLogin = u.LastLogin,
                    CreatedOn = u.CreatedOn,
                })
                .ToListAsync(ct);

            return new ClientOverviewDto
            {
                Client = client,
                CurrentSubscription = subscription,
                MaxPlannableDate = maxPlannableDate,
                Users = users,
            };
        }
    }
}
