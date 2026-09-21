using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    /// <summary>
    /// Computes the full forward-looking impact of an absence request: charged days/hours,
    /// pseudo-weekend breakdown, schedule conflicts, coverage warnings, and balance projection.
    /// Powers both the employee-portal preview (before submitting) and the manager pending-list
    /// view (before approving). Single source of truth for "what does this absence cost?".
    /// </summary>
    public interface IAbsencePlanningService
    {
        Task<AbsenceImpactDto> EvaluateAsync(
            Guid employeeId,
            DateOnly startDate,
            DateOnly endDate,
            AbsenceType type,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Same as EvaluateAsync but uses an existing absence's identity so the conflict
        /// list reflects post-approval reconciliation needs.
        /// </summary>
        Task<AbsenceImpactDto> EvaluateExistingAsync(
            Guid absenceId,
            CancellationToken cancellationToken = default);
    }
}
