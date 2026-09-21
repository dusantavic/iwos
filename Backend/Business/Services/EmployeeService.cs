using AutoMapper;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
using Iwos.Common.Extensions;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
	public sealed class EmployeeService : IEmployeeService
	{
		private readonly IEmployeeRepository _employeeRepository;
		private readonly IMapper _mapper;
		private readonly IWebHostEnvironment _env;
		private readonly ITenantProvider _tenantProvider;
		private readonly IEmployeePortalService _employeePortalService;
		private readonly IwosDbContext _context;

		public EmployeeService(
			IEmployeeRepository repository,
			IMapper mapper,
			IWebHostEnvironment env,
			ITenantProvider tenantProvider,
			IEmployeePortalService employeePortalService,
			IwosDbContext context)
		{
			_employeeRepository = repository;
			_mapper = mapper;
			_env = env;
			_tenantProvider = tenantProvider;
			_employeePortalService = employeePortalService;
			_context = context;
		}

		public async Task<EmployeeDetailsDto?> GetEmployeeDetails(Guid id, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployeeDetails(id, cancellationToken);
		}

		public async Task<IEnumerable<EmployeeDto>> GetEmployees(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployees(departmentId, cancellationToken);
		}

		public async Task<List<SelectItemDto>> GetEmployeesForSelect(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployeesForSelect(departmentId, cancellationToken);
		}

		public async Task<List<EmployeeShiftDto>> GetEmployeesForShift(CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployeesForShift(cancellationToken);
		}

		public async Task<Data.Model.File> SaveEmployeeProfileImage(IFormFile file, Guid employeeId, Guid uploadedById, CancellationToken cancellationToken = default)
		{
			if (file == null || file.Length == 0)
			{
				throw new ArgumentException("Invalid file.");
			}

			if (!file.ContentType.StartsWith("image/"))
			{
				throw new ArgumentException("Only image files are allowed");
			}

			var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "profiles");
			var thumbFolder = Path.Combine(_env.WebRootPath, "uploads", "thumbnails");

			if (!Directory.Exists(uploadsFolder))
			{
				Directory.CreateDirectory(uploadsFolder);
			}

			if (!Directory.Exists(thumbFolder))
			{
				Directory.CreateDirectory(thumbFolder);
			}

			var fileExtension = Path.GetExtension(file.FileName);
			var systemFileName = $"{employeeId}{fileExtension}";

			var filePath = Path.Combine(uploadsFolder, systemFileName);
			var thumbPath = Path.Combine(thumbFolder, systemFileName);

			await using var stream = new FileStream(filePath, FileMode.Create);
			await file.CopyToAsync(stream);

			await GenerateThumbnail(file, thumbPath);

			var relativePath = Path.Combine("uploads", "profiles", systemFileName).Replace("\\", "/");

			var entity = new Data.Model.File
			{
				DisplayName = file.FileName,
				FullSystemName = systemFileName,
				Path = relativePath,
				UploadedOn = DateTime.UtcNow,
				UploadedById = uploadedById,
				EmployeeId = employeeId
			};

			await _employeeRepository.AddFile(entity, cancellationToken);

			return entity;
		}

		public async Task<Data.Model.File> AddFile(IFormFile file, Guid employeeId, Guid uploadedById, string displayName, CancellationToken cancellationToken = default)
		{
			if (file == null || file.Length == 0)
			{
				throw new ArgumentException("Invalid file", nameof(file)); 
			}

			if (displayName.Length > 120)
			{
				throw new ArgumentException("Display name longer than 120 characters", nameof(displayName)); 
			}

			var baseFolder = Path.Combine(_env.ContentRootPath, "uploads", "employees", employeeId.ToString());

			if (!Directory.Exists(baseFolder))
			{
				Directory.CreateDirectory(baseFolder); 
			}

			var ext = Path.GetExtension(file.FileName);

			var safeDisplay = Regex.Replace(displayName, @"[^\w\-]", "_");
			var systemName = $"{safeDisplay}{ext}";

			var physicalPath = Path.Combine(baseFolder, systemName);

			await using (var stream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write, FileShare.None))
			{
				await file.CopyToAsync(stream); 
			}

			var relativePath = Path.Combine("uploads", "employees", employeeId.ToString(), systemName)
				.Replace("\\", "/");

			var entity = new Data.Model.File
			{
				DisplayName = displayName,
				FullSystemName = systemName,
				Path = relativePath,
				Active = true,
				UploadedOn = DateTime.UtcNow, UploadedById = uploadedById, EmployeeId = employeeId
			};

			await _employeeRepository.AddFile(entity, cancellationToken);

			return entity; 
		}

		public async Task<FileStreamResult> GetFileStreamResult(Guid employeeId, Guid fileId, bool download = false, CancellationToken cancellationToken = default)
		{
			var file = await _employeeRepository.GetFile(employeeId, fileId, cancellationToken); 

			if (file == null || !file.Active)
			{
				throw new FileNotFoundException(); 
			}

			var baseFolder = Path.Combine(_env.ContentRootPath, "uploads", "employees", employeeId.ToString());
			var fullPath = Path.Combine(baseFolder, file.FullSystemName); 

			if (!System.IO.File.Exists(fullPath))
			{
				throw new FileNotFoundException(); 
			}

			var provider = new FileExtensionContentTypeProvider(); 
			if (!provider.TryGetContentType(fullPath, out var contentType))
			{
				contentType = "application/octet-stream"; 
			}

			var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
			var result = new FileStreamResult(stream, contentType); 

			if (download)
			{
				var ext = Path.GetExtension(file.FullSystemName);
				result.FileDownloadName = $"{file.DisplayName}{ext}"; 
			}

			return result;
		}

		public async Task<List<FileDto>> GetAllFiles(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetAllFiles(employeeId, cancellationToken); 
		}
		private static async Task GenerateThumbnail(IFormFile file, string path, CancellationToken cancellationToken = default)
		{
			using var image = await Image.LoadAsync(file.OpenReadStream(), cancellationToken);

			image.Mutate(x => x.Resize(new ResizeOptions
			{
				Mode = ResizeMode.Max,
				Size = new Size(100, 100)
			}));

			await image.SaveAsJpegAsync(path, new JpegEncoder
			{
				Quality = 85
			}, cancellationToken);
		}

		public async Task<(FileStream?, string?)> GetProfileImage(Guid employeeId, CancellationToken cancellationToken = default)
		{
			var file = await _employeeRepository.GetProfileImage(employeeId, cancellationToken);

			if (file == null || string.IsNullOrWhiteSpace(file.FullSystemName))
			{
				return (null, null);
			}

			var absolutePath = Path.Combine(_env.WebRootPath, file.Path.Replace("/", Path.DirectorySeparatorChar.ToString()));

			if (!System.IO.File.Exists(absolutePath))
			{
				return (null, null);
			}

			var contentType = GetContentType(absolutePath);
			var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read);
			return (stream, contentType);
		}

		private static string GetContentType(string path)
		{
			var extension = Path.GetExtension(path).ToLowerInvariant();

			return extension switch
			{
				".jpg" or ".jpeg" => "image/jpeg",
				".png" => "image/png",
				".gif" => "image/gif",
				".bmp" => "image/bmp",
				".webp" => "image/webp",
				_ => "application/octet-stream"
			};
		}

		public async Task<AddEmployeeResultDto?> AddEmployee(CreateEmployeeDto employeeDto, IFormFile? profilePicture = null, Guid? uploadedBy = null, CancellationToken cancellationToken = default)
		{
			var employee = _mapper.Map<Employee>(employeeDto);

			employee.ClientId = _tenantProvider.GetTenantId();
			employee.Active = true;

			// Employee insert + portal account provisioning share a single transaction
			// so that if credential creation fails (e.g. unique username collision that
			// cannot be resolved) the employee is not left orphaned without a login.
			await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
			try
			{
				var newEmployeeId = await _employeeRepository.AddWithAbsenceBalance(
					employee,
					employeeDto.AnnualVacationDays ?? 0,
					employeeDto.CarriedOverVacationDays ?? 0,
					cancellationToken);

				if (newEmployeeId == null)
				{
					await transaction.RollbackAsync(cancellationToken);
					return null;
				}

				var credentials = await _employeePortalService.CreateAccountForEmployee(employee, cancellationToken);

				await transaction.CommitAsync(cancellationToken);

				return new AddEmployeeResultDto
				{
					EmployeeId = newEmployeeId.Value,
					Credentials = credentials
				};
			}
			catch
			{
				await transaction.RollbackAsync(cancellationToken);
				throw;
			}
		}

		public EmployeeEnumLookups GetEmployeeEnumLookups()
		{
			return new EmployeeEnumLookups()
			{
				ContractTypeSelectItems = EnumExtensions.ToSelectItemDtoList<ContractType>(),
			};
		}

		public async Task<List<NoteDto>> GetNotes(Guid? employeeId = null, CancellationToken cancellationToken = default)
		{
			if (employeeId == Guid.Empty)
			{
				return [];
			}

			return await _employeeRepository.GetNotes(employeeId, cancellationToken);
		}

		public async Task<List<ToDoDto>> GetToDos(Guid? employeeId = null, bool? all = false, int? take = null, CancellationToken cancellationToken = default)
		{
			if (employeeId == Guid.Empty)
			{
				return [];
			}

			return await _employeeRepository.GetToDos(employeeId, all, take, cancellationToken);
		}

		public async Task AddNote(CreateNoteDto noteDto, Guid createdById, CancellationToken cancellationToken = default)
		{
			var note = _mapper.Map<Note>(noteDto);

			note.CreatedById = createdById;
			note.CreatedDateTime = DateTime.UtcNow;

			await _employeeRepository.AddNote(note, cancellationToken);
		}

		public async Task AddToDo(CreateToDoDto toDoDto, Guid createdById, CancellationToken cancellationToken = default)
		{
			var toDo = _mapper.Map<ToDo>(toDoDto);

			toDo.CreatedById = createdById;
			toDo.CreatedDateTime = DateTime.UtcNow;

			await _employeeRepository.AddToDo(toDo, cancellationToken);
		}

		public List<SelectItemDto> GetAbsenceTypes()
		{
			return new List<SelectItemDto>
					{
						new SelectItemDto
						{
							Value = AbsenceType.Vacation,
							Label = AbsenceType.Vacation.GetDisplayName()
						},
						new SelectItemDto
						{
							Value = AbsenceType.SickLeave,
							Label = AbsenceType.SickLeave.GetDisplayName()
						},
						new SelectItemDto
						{
							Value = AbsenceType.JustifiedAbsence,
							Label = AbsenceType.JustifiedAbsence.GetDisplayName()
						}
					};
		}

		public async Task UpdateNoteContent(Guid noteId, string newContent, Guid updatedById, CancellationToken cancellationToken = default)
		{
			var note = await _employeeRepository.GetNoteById(noteId, cancellationToken) ?? throw new KeyNotFoundException();

			if (string.IsNullOrWhiteSpace(newContent))
			{
				throw new ArgumentException(nameof(Note.Content));
			}

			note.Content = newContent;
			note.LastModifiedAt = DateTime.UtcNow;
			note.LastModifiedById = updatedById;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task UpdateToDoContent(Guid toDoId, string newContent, Guid updatedById, CancellationToken cancellationToken = default)
		{
			var toDo = await _employeeRepository.GetToDoById(toDoId, cancellationToken) ?? throw new KeyNotFoundException();

			if (toDo.Completed)
			{
				throw new InvalidOperationException();
			}

			if (string.IsNullOrWhiteSpace(newContent))
			{
				throw new ArgumentException(nameof(ToDo.Content));
			}

			toDo.Content = newContent;
			toDo.LastModifiedAt = DateTime.UtcNow;
			toDo.LastModifiedById = updatedById;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task UpdateToDoCompletion(Guid toDoId, bool completed, Guid updatedById, CancellationToken cancellationToken = default)
		{
			var toDo = await _employeeRepository.GetToDoById(toDoId, cancellationToken) ?? throw new KeyNotFoundException();

			toDo.Completed = completed;
			toDo.LastModifiedAt = DateTime.UtcNow;
			toDo.LastModifiedById = updatedById;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task DeleteNote(Guid noteId, Guid deletedById, CancellationToken cancellationToken = default)
		{
			var note = await _employeeRepository.GetNoteById(noteId, cancellationToken) ?? throw new KeyNotFoundException();

			if (note.IsDeleted)
			{
				return;
			}

			note.IsDeleted = true;
			note.DeletedAt = DateTime.UtcNow;
			note.DeletedById = deletedById;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task DeleteToDo(Guid toDoId, Guid deletedById, CancellationToken cancellationToken = default)
		{
			var toDo = await _employeeRepository.GetToDoById(toDoId, cancellationToken) ?? throw new KeyNotFoundException();

			if (toDo.IsDeleted)
			{
				return;
			}

			toDo.IsDeleted = true;
			toDo.DeletedAt = DateTime.UtcNow;
			toDo.DeletedById = deletedById;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task DeleteFile(Guid fileId, CancellationToken cancellationToken = default)
		{
			var file = await _employeeRepository.GetFile(fileId, cancellationToken); 

			if (file == null || !file.Active)
			{
				return; 
			}

			file.Active = false;

			await _employeeRepository.SaveChangesAsync(cancellationToken); 
		}

		public async Task<List<UpcomingAnniversariesDto>> GetUpcomingAnniversaries(int count = 5, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetUpcomingAnniversaries(_tenantProvider.GetTenantId(), count, cancellationToken);
		}
		public async Task<EmployeesChartDataDto> GetEmployeesChartData(int? year, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployeesChartData(year, cancellationToken);
		}

		public async Task<List<MonthlyRecentNotesDto>> GetRecentNotes(int count = 5, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetRecentNotes(count, cancellationToken);
		}

		public async Task<IEnumerable<EventDto>> GetEvents(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			var absences = await _employeeRepository.GetApprovedAndPendingAbsences(employeeId, startDate, endDate, cancellationToken);

			var events = absences.Select(a => new EventDto
			{
				Id = a.Id, 
				Start = a.StartDate,
				End = a.EndDate,
				TypeCode = (EventType)a.Type,
				Type = a.Type.GetDisplayName(),
				EmployeeId = a.EmployeeId, 
				Status = a.Status.GetDisplayName()
			}).ToList();

			await AddEmployeeDatesToEvents(events, employeeId, startDate, endDate);

			return events;
		}
		
		public async Task<IEnumerable<UpcomingAbsenceDto>> GetUpcomingAbsences(CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetUpcomingAbsences(cancellationToken);
		}

		private async Task AddEmployeeDatesToEvents(List<EventDto> events, Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			var employeeDates = await _employeeRepository.GetEmployeeDates(employeeId, cancellationToken);

			if (employeeDates.BirthDate == null) return;

			for (int year = startDate.Year; year <= endDate.Year; year++)
			{
				var birthday = new DateOnly(year, employeeDates.BirthDate.Value.Month, employeeDates.BirthDate.Value.Day);

				if (birthday >= startDate && birthday <= endDate)
				{
					events.Add(new EventDto
					{
						Id = Guid.Empty,
						Start = birthday,
						End = birthday,
						TypeCode = EventType.Birthday,
						Type = EventType.Birthday.GetDisplayName(),
						EmployeeId = employeeId
					});
				}
			}
		}

		public async Task<IEnumerable<EventDto>> GetYearEvents(Guid employeeId, int year, CancellationToken cancellationToken = default)
		{
			var yearBegin = new DateOnly(year, 1, 1);
			var yearEnd = new DateOnly(year, 12, 31);

			var absences = await _employeeRepository.GetApprovedAbsences(employeeId, yearBegin, yearEnd, cancellationToken);

			var events = absences.Select(a => new EventDto
			{
				Id = a.Id,
				Start = a.StartDate,
				End = a.EndDate,
				TypeCode = (EventType)a.Type,
				Type = a.Type.GetDisplayName(),
				EmployeeId = a.EmployeeId, 
				Status = a.Status.GetDisplayName()
			}).ToList();

			await AddEmployeeDatesToEvents(events, employeeId, yearBegin, yearEnd);

			return events;
		}

		public async Task<IEnumerable<UpcomingEventDto>> GetUpcomingEvents(Guid employeeId, CancellationToken cancellationToken = default)
		{
			var start = DateOnly.FromDateTime(DateTime.UtcNow);
			var end = start.AddMonths(2);

			var absencesTask = await _employeeRepository.GetApprovedAbsences(employeeId, start, end, cancellationToken);

			var upcomingEvents = absencesTask.Select(a => new EventDto
			{
				Id = a.Id,
				Start = a.StartDate,
				End = a.EndDate,
				TypeCode = (EventType)a.Type,
				Type = a.Type.GetDisplayName(),
				EmployeeId = a.EmployeeId, 
				Status = a.Status.GetDisplayName()
			}).ToList();


			await AddEmployeeDatesToEvents(upcomingEvents, employeeId, start, end, cancellationToken);

			return _mapper.Map<List<UpcomingEventDto>>(upcomingEvents).OrderBy(e => e.DaysRemaining);
		}

		public async Task EditEmployeeBasicInfo(EditEmployeeBasicInfoDto basicInfoDto, CancellationToken cancellationToken = default)
		{
			var employee = await _employeeRepository.Get(basicInfoDto.EmployeeId, cancellationToken) ?? throw new KeyNotFoundException();

			employee.ContactEmail = basicInfoDto.ContactEmail;
			employee.PositionId = basicInfoDto.PositionId;
			employee.Country = basicInfoDto.Country;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task EditEmployeePersonalData(EditEmployeePersonalDataDto personalDataDto, CancellationToken cancellationToken = default)
		{
			var employee = await _employeeRepository.Get(personalDataDto.EmployeeId, cancellationToken) ?? throw new KeyNotFoundException();

			employee.FirstName = personalDataDto.FirstName;
			employee.LastName = personalDataDto.LastName;
			employee.PersonalId = personalDataDto.PersonalId;
			employee.ContractType = personalDataDto.ContractType;
			employee.BirthDate = personalDataDto.BirthDate;

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task EditEmployeeSchedulingPreferences(EditEmployeeSchedulingPreferencesDto dto, CancellationToken cancellationToken = default)
		{
			if (dto.WeeklyHours < 0 || dto.WeeklyHours > 80)
				throw new Exception("Error 3048: WeeklyHours must be between 0 and 80.");

			if (dto.WeeklyDays < 1 || dto.WeeklyDays > 7)
				throw new Exception("Error 3049: WeeklyDays must be between 1 and 7.");

			var employee = await _employeeRepository.Get(dto.EmployeeId, cancellationToken) ?? throw new KeyNotFoundException();

			employee.WeeklyHours = dto.WeeklyHours;
			employee.WeeklyDays = dto.WeeklyDays;
			employee.RotationPatternId = dto.RotationPatternId;
			employee.PinnedShiftId = dto.PinnedShiftId;

			if (dto.RotationAnchorDate != null)
			{
				if (!DateOnly.TryParse(dto.RotationAnchorDate, out var anchor))
					throw new Exception("Error 3048: Invalid RotationAnchorDate format. Expected yyyy-MM-dd.");
				employee.RotationAnchorDate = anchor;
			}
			else
			{
				employee.RotationAnchorDate = null;
			}

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task DeactivateEmployee(Guid employeeId, CancellationToken cancellationToken = default)
		{
			var employee = await _employeeRepository.Get(employeeId, cancellationToken)
				?? throw new KeyNotFoundException($"Employee {employeeId} not found.");

			employee.Active = false;
			employee.EndDate = DateOnly.FromDateTime(DateTime.Today);

			await _employeeRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task<EmployeesBasicStatsDto> GetEmployeesBasicStats(int? yearsPeriod, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetEmployeesBasicStats(yearsPeriod, cancellationToken); 
		}

		public async Task<List<NewEmployeeDto>> GetNewEmployeesList(CancellationToken cancellationToken = default)
		{
			int count = 5;
			return await _employeeRepository.GetNewEmployeesList(count, cancellationToken); 
		}

		public async Task<double> GetAttritionRate(int? yearsPeriod, CancellationToken cancellationToken = default)
		{
			return await _employeeRepository.GetAttritionRate(yearsPeriod, cancellationToken);
		}

		public List<CsvColumnDefinitionDto> GetCsvColumnDefinitions()
		{
			return
			[
				new() { Header = "FirstName", Required = true,  Example = "John" },
				new() { Header = "LastName",  Required = true,  Example = "Smith" },
				new() { Header = "Department", Required = true, Example = "Engineering", Note = "Must match an existing department name" },
				new() { Header = "Position",   Required = true, Example = "Software Engineer", Note = "Must match an existing position title within the department" },
				new() { Header = "Email",      Required = false, Example = "john.smith@example.com" },
				new() { Header = "PersonalId", Required = false, Example = "123456789" },
				new() { Header = "Country",    Required = false, Example = "Serbia" },
				new() { Header = "BirthDate",  Required = false, Example = "1990-01-15", Note = "Format: YYYY-MM-DD" },
				new() { Header = "WeeklyHours", Required = false, Example = "40", Note = "Defaults to 40 if empty" },
				new() { Header = "WeeklyDays",  Required = false, Example = "5",  Note = "Working days/week (1–7). Defaults to 5 if empty" },
				new() { Header = "AnnualVacationDays",   Required = false, Example = "20" },
				new() { Header = "CarriedOverVacationDays", Required = false, Example = "0" },
			];
		}

		public async Task<BulkImportResultDto> BulkImportEmployeesAsync(IFormFile file, CancellationToken cancellationToken = default)
		{
			var result = new BulkImportResultDto();

			using var reader = new System.IO.StreamReader(file.OpenReadStream(), System.Text.Encoding.UTF8);

			var headerLine = await reader.ReadLineAsync(cancellationToken);
			if (string.IsNullOrWhiteSpace(headerLine))
				return result;

			var headers = ParseCsvLine(headerLine)
				.Select(h => h.TrimEnd('*').Trim())
				.ToList();

			int GetIndex(string name) => headers.FindIndex(h => h.Equals(name, StringComparison.OrdinalIgnoreCase));

			int iFirstName  = GetIndex("FirstName");
			int iLastName   = GetIndex("LastName");
			int iDepartment = GetIndex("Department");
			int iPosition   = GetIndex("Position");
			int iEmail      = GetIndex("Email");
			int iPersonalId = GetIndex("PersonalId");
			int iCountry    = GetIndex("Country");
			int iBirthDate  = GetIndex("BirthDate");
			int iWeeklyHours           = GetIndex("WeeklyHours");
			int iWeeklyDays            = GetIndex("WeeklyDays");
			int iAnnualVacationDays    = GetIndex("AnnualVacationDays");
			int iCarriedOverVacationDays = GetIndex("CarriedOverVacationDays");

			var tenantId = _tenantProvider.GetTenantId();
			int rowNumber = 1;

			string? line;
			while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
			{
				rowNumber++;
				if (string.IsNullOrWhiteSpace(line)) continue;

				var fields = ParseCsvLine(line);
				string? Cell(int idx) => idx >= 0 && idx < fields.Count ? fields[idx].Trim() : null;

				var firstName  = Cell(iFirstName);
				var lastName   = Cell(iLastName);
				var department = Cell(iDepartment);
				var position   = Cell(iPosition);
				var employeeName = $"{firstName} {lastName}".Trim();

				if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = "FirstName and LastName are required." });
					continue;
				}

				if (string.IsNullOrWhiteSpace(department) || string.IsNullOrWhiteSpace(position))
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = "Department and Position are required." });
					continue;
				}

				var positionId = await _employeeRepository.FindPositionIdAsync(department, position, cancellationToken);
				if (positionId == null)
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = $"No position '{position}' found in department '{department}'." });
					continue;
				}

				DateOnly? birthDate = null;
				var birthDateStr = Cell(iBirthDate);
				if (!string.IsNullOrWhiteSpace(birthDateStr))
				{
					if (!DateOnly.TryParseExact(birthDateStr, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var parsedDate))
					{
						result.FailureCount++;
						result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = $"Invalid BirthDate '{birthDateStr}'. Expected format: YYYY-MM-DD." });
						continue;
					}
					birthDate = parsedDate;
				}

				var weeklyHoursStr = Cell(iWeeklyHours);
				int weeklyHours = 40;
				if (!string.IsNullOrWhiteSpace(weeklyHoursStr) && (!int.TryParse(weeklyHoursStr, out weeklyHours) || weeklyHours < 1 || weeklyHours > 80))
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = $"Invalid WeeklyHours '{weeklyHoursStr}'. Must be a number between 1 and 80." });
					continue;
				}

				var weeklyDaysStr = Cell(iWeeklyDays);
				int weeklyDays = 5;
				if (!string.IsNullOrWhiteSpace(weeklyDaysStr) && (!int.TryParse(weeklyDaysStr, out weeklyDays) || weeklyDays < 1 || weeklyDays > 7))
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = $"Invalid WeeklyDays '{weeklyDaysStr}'. Must be a number between 1 and 7." });
					continue;
				}

				int annualDays = int.TryParse(Cell(iAnnualVacationDays), out var ad) ? ad : 0;
				int carriedDays = int.TryParse(Cell(iCarriedOverVacationDays), out var cd) ? cd : 0;

				static string? ne(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;

				var employee = new Employee
				{
					FirstName    = firstName,
					LastName     = lastName,
					ContactEmail = ne(Cell(iEmail)),
					PersonalId   = ne(Cell(iPersonalId)),
					Country      = ne(Cell(iCountry)),
					BirthDate    = birthDate,
					WeeklyHours  = weeklyHours,
					WeeklyDays   = weeklyDays,
					PositionId   = positionId.Value,
					ClientId     = tenantId,
					Active       = true,
				};

				try
				{
					await _employeeRepository.AddWithAbsenceBalance(employee, annualDays, carriedDays, cancellationToken);
					result.SuccessCount++;
				}
				catch (Exception ex)
				{
					result.FailureCount++;
					result.Errors.Add(new BulkImportRowErrorDto { Row = rowNumber, EmployeeName = employeeName, Message = $"Failed to save employee: {ex.Message}" });
				}
			}

			return result;
		}

		private static List<string> ParseCsvLine(string line)
		{
			var fields = new List<string>();
			var current = new System.Text.StringBuilder();
			bool inQuotes = false;

			for (int i = 0; i < line.Length; i++)
			{
				char c = line[i];

				if (inQuotes)
				{
					if (c == '"' && i + 1 < line.Length && line[i + 1] == '"')
					{
						current.Append('"');
						i++;
					}
					else if (c == '"')
					{
						inQuotes = false;
					}
					else
					{
						current.Append(c);
					}
				}
				else
				{
					if (c == '"')
					{
						inQuotes = true;
					}
					else if (c == ',')
					{
						fields.Add(current.ToString());
						current.Clear();
					}
					else
					{
						current.Append(c);
					}
				}
			}

			fields.Add(current.ToString());
			return fields;
		}
	}
}
