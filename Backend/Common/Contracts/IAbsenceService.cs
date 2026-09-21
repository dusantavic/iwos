using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
	public interface IAbsenceService
	{
		Task CreateAbsence(CreateAbsenceDto createAbsenceDto, CancellationToken cancellationToken = default);
		Task<AbsenceImpactDto> PreviewImpact(Guid employeeId, DateOnly startDate, DateOnly endDate, AbsenceType type, CancellationToken cancellationToken = default);
		Task<AbsenceImpactDto> PreviewExistingImpact(Guid absenceId, CancellationToken cancellationToken = default);
		Task ProvisionNewYearBalances(int newYear, CancellationToken cancellationToken = default);
		Task<List<EmployeeAbsenceHistoryRecordDto>> GetEmployeeAbsenceHistory(Guid employeeId, CancellationToken cancellationToken = default);
		Task<List<AbsenceDto>> GetAllApprovedAndPendingAbsences(DateOnly start, DateOnly end, Guid? departmentId, CancellationToken cancellationToken = default);
		Task<AbsencesStatsDto> GetAbsencesStats(Guid? departmentId, CancellationToken cancellationToken = default);
		Task<AbsenceApprovalResultDto> ApproveAbsence(Guid absenceId, Guid approvedById, CancellationToken cancellationToken = default);
		Task RejectAbsence(Guid absenceId, Guid rejectedById, CancellationToken cancellationToken = default);
		Task CancelAbsence(Guid requestGroupId, Guid userId, CancellationToken cancellationToken = default);
		Task WithdrawnAbsence(Guid absenceId, Guid employeeId, CancellationToken cancellationToken = default);
		Task<List<PendingAbsenceDto>> GetPendingRequests(CancellationToken cancellationToken = default);
		Task<EmployeeAbsenceStatsDto> GetEmployeeAbsenceStats(Guid employeeId, int? year, CancellationToken cancellationToken = default);
		Task<List<AbsenceDto>> GetPendingAndApprovedAbsencesForEmployee(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task UpdateAnnualVacationDays(Guid employeeId, int annualDays, Guid userId, int? year, CancellationToken cancellationToken = default);
		Task<byte[]> GetExcelData(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<List<AbsenceUpdateDto>> GetRecentAbsenceUpdates(CancellationToken cancellationToken = default);
		Task<List<EmployeeVacationRiskDto>> GetCriticalLeaveEmployees(int take, CancellationToken cancellationToken = default);
	}
}
