using Iwos.Common.DTOs;
using Iwos.Data.Model;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
	public interface IAbsenceRepository : IGenericRepository<Absence>
	{
		Task<AbsenceBalance> GetBalance(Guid employeeId, int year, CancellationToken cancellationToken = default);
		Task<List<Absence>> GetApprovedAbsences(Guid employeeId, int year, CancellationToken cancellationToken = default);
		Task<int> GetApprovedAbsencesCount(Guid employeeId, int year, CancellationToken cancellationToken = default); 
		Task<List<Absence>> GetPendingAbsences(Guid employeeId, CancellationToken cancellationToken = default);
		Task AddAbsences(List<Absence> absences, CancellationToken cancellationToken = default);
		Task AddAbsence(Absence absence, CancellationToken cancellationToken = default);
		Task AddAbsenceBalance(AbsenceBalance absenceBalance, CancellationToken cancellationToken = default);
		Task<List<Absence>> GetAbsencesByRequestGroup(Guid requestGroupId, CancellationToken cancellationToken = default);
		Task RemoveAbsences(List<Absence> absences, CancellationToken cancellationToken = default);
		Task SaveChangesAsync(CancellationToken cancellationToken = default);
		Task<List<EmployeeAbsenceHistoryRecordDto>> GetEmployeeAbsenceHistory(Guid employeeId, CancellationToken cancellationToken = default);
		Task<bool> ExistsOverlapAsync(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<List<AbsenceDto>> GetAllApprovedAndPendingAbsences(DateOnly start, DateOnly end, Guid? departmentId, CancellationToken cancellationToken = default);
		Task<AbsencesStatsDto> GetAbsencesStats(Guid? departmentId, CancellationToken cancellationToken = default);
		Task ApproveAbsence(Guid absenceId, Guid approvedById, CancellationToken cancellationToken = default);
		Task FinalizeApproval(Guid absenceId, Guid approvedById, int chargedDays, decimal chargedHours, bool hoursEstimated, int pseudoOffDays, int? minChargedDays, int? maxChargedDays, int useFromAnnual, int useFromCarriedOver, CancellationToken cancellationToken = default);
		Task RejectAbsence(Guid absenceId, Guid rejectedById, CancellationToken cancellationToken = default);
		Task CancelAbsence(Guid absenceId, Guid userId, CancellationToken cancellationToken = default);
		Task WithdrawnAbsence(Guid absenceId, Guid employeeId, CancellationToken cancellationToken = default);
		Task<List<PendingAbsenceDto>> GetPendingRequests(CancellationToken cancellationToken = default);
		Task<List<AbsenceDto>> GetPendingAndApprovedAbsencesForEmployee(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task UpdateAnnualVacationDays(Guid employeeId, int annualDays, Guid userId, int? year, CancellationToken cancellationToken = default);
		Task<List<AbsenceExcelDto>> GetAbsenceExcelRecords(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<List<AbsenceUpdateDto>> GetRecentAbsenceUpdates(CancellationToken cancellationToken = default);
		Task<List<EmployeeVacationRiskDto>> GetCriticalLeaveEmployees(int year, int take = 10, CancellationToken cancellationToken = default);
	}
}
