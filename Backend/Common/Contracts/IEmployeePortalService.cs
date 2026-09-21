using Iwos.Common.DTOs;
using Iwos.Data.Model;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IEmployeePortalService
    {
        Task<TokenModel?> Login(EmployeePortalLoginDto loginDto, CancellationToken cancellationToken = default);
        Task<EmployeePortalMeDto?> GetMe(Guid employeeAccountId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Creates an <see cref="EmployeeAccount"/> for the given employee and returns
        /// the one-time credentials. The caller is responsible for wrapping this in the
        /// same transaction as the employee insert so that a failure here rolls back the
        /// employee. Does NOT persist a plaintext password anywhere.
        /// </summary>
        Task<EmployeeCredentialsDto> CreateAccountForEmployee(Employee employee, CancellationToken cancellationToken = default);

        /// <summary>
        /// Provisions portal accounts for every employee in the current tenant
        /// that does not yet have one, and returns the plaintext credentials for
        /// each newly created account. This is the only moment the passwords are
        /// readable — the caller is responsible for surfacing or storing them
        /// before the response is discarded.
        /// </summary>
        Task<List<EmployeeCredentialsDto>> BulkProvisionExistingEmployees(CancellationToken cancellationToken = default);

        /// <summary>
        /// Generates a fresh temporary password for the given employee's portal
        /// account, updates the hash, and returns the one-time plaintext. The
        /// username is preserved. Returns null if the employee does not belong
        /// to the current tenant or has no portal account.
        /// </summary>
        Task<EmployeeCredentialsDto?> ResetEmployeePassword(Guid employeeId, CancellationToken cancellationToken = default);

        Task<List<AbsenceDto>> GetMyTeamAbsences(Guid employeeId, DateOnly start, DateOnly end, CancellationToken cancellationToken = default);
    }
}
