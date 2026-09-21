using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Manages the subscription lifecycle for a client: lists plan types,
    /// reads current/history, and atomically opens a new subscription period
    /// (closing any prior period that would overlap).
    ///
    /// "Current" means a period whose <c>StartDate &lt;= today</c> AND
    /// (<c>EndDate IS NULL</c> OR <c>EndDate &gt; today</c>). This lets us
    /// store a planned future expiry without making the client appear
    /// inactive before that date.
    /// </summary>
    public sealed class SubscriptionService : ISubscriptionService
    {
        private readonly IwosDbContext _context;

        public SubscriptionService(IwosDbContext context)
        {
            _context = context;
        }

        public async Task<List<SubscriptionPlanTypeDto>> GetPlanTypesAsync(CancellationToken ct = default)
        {
            return await _context.SubscriptionPlanTypes
                .AsNoTracking()
                .OrderBy(p => p.Name)
                .Select(p => new SubscriptionPlanTypeDto
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Description = p.Description,
                    IsActive = p.IsActive,
                    DurationMonths = p.DurationMonths,
                    PlanningWindowMonths = p.PlanningWindowMonths,
                })
                .ToListAsync(ct);
        }

        public async Task<ClientSubscriptionDto?> GetCurrentForClientAsync(Guid clientId, CancellationToken ct = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return await _context.ClientSubscriptionPlanHistories
                .AsNoTracking()
                .Include(h => h.SubscriptionPlanType)
                .Where(h => h.ClientId == clientId
                            && h.StartDate <= today
                            && (h.EndDate == null || h.EndDate > today))
                .OrderByDescending(h => h.StartDate)
                .Select(h => MapDto(h))
                .FirstOrDefaultAsync(ct);
        }

        public async Task<List<ClientSubscriptionDto>> GetHistoryForClientAsync(Guid clientId, CancellationToken ct = default)
        {
            return await _context.ClientSubscriptionPlanHistories
                .AsNoTracking()
                .Include(h => h.SubscriptionPlanType)
                .Where(h => h.ClientId == clientId)
                .OrderByDescending(h => h.StartDate)
                .Select(h => MapDto(h))
                .ToListAsync(ct);
        }

        public async Task<ClientSubscriptionDto> AssignPlanAsync(AssignSubscriptionDto dto, Guid? createdById, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(dto);

            var planType = await _context.SubscriptionPlanTypes
                .FirstOrDefaultAsync(p => p.Id == dto.SubscriptionPlanTypeId, ct)
                ?? throw new InvalidOperationException($"Subscription plan type {dto.SubscriptionPlanTypeId} not found.");

            if (!planType.IsActive)
                throw new InvalidOperationException($"Subscription plan type '{planType.Code}' is disabled and cannot be assigned.");

            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == dto.ClientId, ct)
                ?? throw new InvalidOperationException($"Client {dto.ClientId} not found.");

            // EndDate is exclusive: the subscription is active for [StartDate, EndDate).
            // Plan type drives the length — null DurationMonths => open-ended period.
            DateOnly? endDate = planType.DurationMonths.HasValue
                ? dto.StartDate.AddMonths(planType.DurationMonths.Value)
                : null;

            // Close any period that would overlap the new one. A period overlaps
            // when it has no end (open-ended) OR when its EndDate is on/after the
            // new start. We truncate it to the new start (exclusive end).
            var overlapping = await _context.ClientSubscriptionPlanHistories
                .Where(h => h.ClientId == dto.ClientId
                            && (h.EndDate == null || h.EndDate > dto.StartDate))
                .ToListAsync(ct);

            foreach (var period in overlapping)
            {
                if (period.StartDate >= dto.StartDate)
                    throw new InvalidOperationException("New subscription start date must be after the existing period's start date.");

                period.EndDate = dto.StartDate;
            }

            var newPeriod = new ClientSubscriptionPlanHistory
            {
                ClientId = dto.ClientId,
                SubscriptionPlanTypeId = planType.Id,
                StartDate = dto.StartDate,
                EndDate = endDate,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                CreatedById = createdById,
            };

            _context.ClientSubscriptionPlanHistories.Add(newPeriod);
            await _context.SaveChangesAsync(ct); // assigns Id

            // Update the denormalized pointer only when the new period is currently
            // in effect (StartDate <= today and not already past EndDate). A future-
            // dated assignment leaves the pointer alone — the existing period stays
            // current until its own EndDate kicks in.
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (newPeriod.StartDate <= today &&
                (!newPeriod.EndDate.HasValue || newPeriod.EndDate.Value > today))
            {
                client.CurrentSubscriptionId = newPeriod.Id;
                await _context.SaveChangesAsync(ct);
            }

            return new ClientSubscriptionDto
            {
                Id = newPeriod.Id,
                ClientId = newPeriod.ClientId,
                SubscriptionPlanTypeId = planType.Id,
                SubscriptionPlanTypeCode = planType.Code,
                SubscriptionPlanTypeName = planType.Name,
                StartDate = newPeriod.StartDate,
                EndDate = newPeriod.EndDate,
                Notes = newPeriod.Notes,
                CreatedAt = newPeriod.CreatedAt,
            };
        }

        private static ClientSubscriptionDto MapDto(ClientSubscriptionPlanHistory h) => new()
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
        };
    }
}
