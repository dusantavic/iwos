using Iwos.Common.DTOs;
using Iwos.Data.Model;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using Iwos.Common.DTOs.DashboardStatsDtos;
using System.Threading;

namespace Iwos.Common.Contracts
{
    public interface IEmployeeRepository : IGenericRepository<Employee>
    {
		Task<List<EmployeeDto>> GetEmployees(Guid? departmentId, CancellationToken cancellationToken = default);
		Task<List<SelectItemDto>> GetEmployeesForSelect(Guid? departmentId, CancellationToken cancellationToken = default);
		Task<List<EmployeeShiftDto>> GetEmployeesForShift(CancellationToken cancellationToken = default);
		Task<EmployeeDetailsDto?> GetEmployeeDetails(Guid employeeId, CancellationToken cancellationToken = default); 
		Task AddFile(File file, CancellationToken cancellationToken = default);
		Task<File?> GetProfileImage(Guid employeeId, CancellationToken cancellationToken = default);
		Task<File?> GetFile(Guid employeeId, Guid fileId, CancellationToken cancellationToken = default);
		Task<File?> GetFile(Guid fileId, CancellationToken cancellationToken = default);
		Task<List<FileDto>> GetAllFiles(Guid employeeId, CancellationToken cancellationToken = default); 
		Task<List<NoteDto>> GetNotes(Guid? employeeId = null, CancellationToken cancellationToken = default);
		Task<List<ToDoDto>> GetToDos(Guid? employeeId = null, bool? all = false, int? take = null, CancellationToken cancellationToken = default); 
		Task AddNote(Note note, CancellationToken cancellationToken = default);
		Task AddToDo(ToDo toDo, CancellationToken cancellationToken = default);
		Task<Note?> GetNoteById(Guid noteId, CancellationToken cancellationToken = default);
		Task<ToDo?> GetToDoById(Guid toDoId, CancellationToken cancellationToken = default); 
		Task<List<UpcomingAnniversariesDto>> GetUpcomingAnniversaries(Guid tenantId, int count = 5, CancellationToken cancellationToken = default);
		Task<EmployeesChartDataDto> GetEmployeesChartData(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task<List<MonthlyRecentNotesDto>> GetRecentNotes(int count = 5, CancellationToken cancellationToken = default);
		Task SaveChangesAsync(CancellationToken cancellationToken = default);
		Task<List<Absence>> GetApprovedAbsences(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<List<Absence>> GetApprovedAndPendingAbsences(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<List<UpcomingAbsenceDto>> GetUpcomingAbsences(CancellationToken cancellationToken = default);
		Task<EmployeeDatesDto> GetEmployeeDates(Guid employeeId, CancellationToken cancellationToken = default);
		Task<EmployeesBasicStatsDto> GetEmployeesBasicStats(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task<List<NewEmployeeDto>> GetNewEmployeesList(int count, CancellationToken cancellationToken = default);
		Task<double> GetAttritionRate(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task<Guid?> AddWithAbsenceBalance(Employee employee, int annualVacationDays, int carriedOverVacaionDays, CancellationToken cancellationToken = default);
		Task<Guid?> FindPositionIdAsync(string departmentName, string positionTitle, CancellationToken cancellationToken = default);
	}
}
