using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
	public interface IEmployeeService
	{
		Task<IEnumerable<EmployeeDto>> GetEmployees(Guid? departmentId, CancellationToken cancellationToken = default);
		Task<List<SelectItemDto>> GetEmployeesForSelect(Guid? departmentId, CancellationToken cancellationToken = default);
		Task<List<EmployeeShiftDto>> GetEmployeesForShift(CancellationToken cancellationToken = default);
		Task<EmployeeDetailsDto?> GetEmployeeDetails(Guid id, CancellationToken cancellationToken = default);
		Task<Data.Model.File> SaveEmployeeProfileImage(IFormFile file, Guid employeeId, Guid uploadedById, CancellationToken cancellationToken = default);
		Task<Data.Model.File> AddFile(IFormFile file, Guid employeeId, Guid uploadedById, string displayName, CancellationToken cancellationToken = default);
		Task<FileStreamResult> GetFileStreamResult(Guid employeeId, Guid fileId, bool download = false, CancellationToken cancellationToken = default);
		Task<List<FileDto>> GetAllFiles(Guid employeeId, CancellationToken cancellationToken = default);
		Task<(FileStream?, string?)> GetProfileImage(Guid employeeId, CancellationToken cancellationToken = default);
		Task<AddEmployeeResultDto?> AddEmployee(CreateEmployeeDto employeeDto, IFormFile? profilePicture = null, Guid? uploadedBy = null, CancellationToken cancellationToken = default);
		EmployeeEnumLookups GetEmployeeEnumLookups();
		Task<List<NoteDto>> GetNotes(Guid? employeeId = null, CancellationToken cancellationToken = default);
		Task<List<ToDoDto>> GetToDos(Guid? employeeId = null, bool? all = false, int? take = null, CancellationToken cancellationToken = default);
		Task AddNote(CreateNoteDto noteDto, Guid createdById, CancellationToken cancellationToken = default);
		Task AddToDo(CreateToDoDto toDoDto, Guid createdById, CancellationToken cancellationToken = default);
		List<SelectItemDto> GetAbsenceTypes();
		Task UpdateNoteContent(Guid noteId, string newContent, Guid updatedById, CancellationToken cancellationToken = default);
		Task UpdateToDoContent(Guid toDoId, string newContent, Guid updatedById, CancellationToken cancellationToken = default);
		Task UpdateToDoCompletion(Guid toDoId, bool completed, Guid updatedById, CancellationToken cancellationToken = default);
		Task DeleteNote(Guid noteId, Guid deletedById, CancellationToken cancellationToken = default);
		Task DeleteToDo(Guid noteId, Guid deletedById, CancellationToken cancellationToken = default);
		Task DeleteFile(Guid fileId, CancellationToken cancellationToken = default);
		Task<List<UpcomingAnniversariesDto>> GetUpcomingAnniversaries(int count = 5, CancellationToken cancellationToken = default);
		Task<EmployeesChartDataDto> GetEmployeesChartData(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task<List<MonthlyRecentNotesDto>> GetRecentNotes(int count = 5, CancellationToken cancellationToken = default);
		Task<IEnumerable<EventDto>> GetEvents(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);
		Task<IEnumerable<UpcomingAbsenceDto>> GetUpcomingAbsences(CancellationToken cancellationToken = default);
		Task<IEnumerable<EventDto>> GetYearEvents(Guid employeeId, int year, CancellationToken cancellationToken = default);
		Task<IEnumerable<UpcomingEventDto>> GetUpcomingEvents(Guid employeeId, CancellationToken cancellationToken = default);
		Task EditEmployeeBasicInfo(EditEmployeeBasicInfoDto basicInfoDto, CancellationToken cancellationToken = default);
		Task EditEmployeePersonalData(EditEmployeePersonalDataDto personalDataDto, CancellationToken cancellationToken = default);
		Task EditEmployeeSchedulingPreferences(EditEmployeeSchedulingPreferencesDto dto, CancellationToken cancellationToken = default);
		Task<EmployeesBasicStatsDto> GetEmployeesBasicStats(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task<List<NewEmployeeDto>> GetNewEmployeesList(CancellationToken cancellationToken = default);
		Task<double> GetAttritionRate(int? yearsPeriod, CancellationToken cancellationToken = default);
		Task DeactivateEmployee(Guid employeeId, CancellationToken cancellationToken = default);
		List<CsvColumnDefinitionDto> GetCsvColumnDefinitions();
		Task<BulkImportResultDto> BulkImportEmployeesAsync(IFormFile file, CancellationToken cancellationToken = default);
	}
}
