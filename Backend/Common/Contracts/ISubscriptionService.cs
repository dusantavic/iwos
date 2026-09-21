using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Iwos.Common.DTOs;

namespace Iwos.Common.Contracts
{
    public interface ISubscriptionService
    {
        Task<List<SubscriptionPlanTypeDto>> GetPlanTypesAsync(CancellationToken ct = default);

        Task<ClientSubscriptionDto?> GetCurrentForClientAsync(Guid clientId, CancellationToken ct = default);

        Task<List<ClientSubscriptionDto>> GetHistoryForClientAsync(Guid clientId, CancellationToken ct = default);

        /// <summary>
        /// Opens a new subscription period for the given client, atomically closing
        /// any currently open period (its EndDate is set to <c>StartDate - 1 day</c>)
        /// and updating <see cref="Data.Model.Client.CurrentSubscriptionId"/>.
        /// </summary>
        Task<ClientSubscriptionDto> AssignPlanAsync(AssignSubscriptionDto dto, Guid? createdById, CancellationToken ct = default);
    }
}
