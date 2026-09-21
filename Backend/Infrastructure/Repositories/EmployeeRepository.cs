using AutoMapper;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
using Iwos.Common.Extensions;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Repositories
{
	public sealed class EmployeeRepository : GenericRepository<Employee>, IEmployeeRepository
	{
		private readonly IMapper _mapper;
		public EmployeeRepository(IwosDbContext context, IMapper mapper) : base(context)
		{
			_mapper = mapper;
		}

		public async Task<List<EmployeeDto>> GetEmployees(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			var today = DateOnly.FromDateTime(DateTime.Today);

			var query = _context.Employees.Where(e => e.Active); 

			if (departmentId.HasValue)
			{
				query = query.Where(e => e.Position.DepartmentId == departmentId.Value); 
			}

			return await query
				.Select(e => new EmployeeDto
				{
					Id = e.Id,
					ContactEmail = e.ContactEmail,
					FirstName = e.FirstName,
					LastName = e.LastName,
					PersonalId = e.PersonalId,
					Position = e.Position.Title,
					Department = e.Position.Department.Name,
					ProfilePictureSrc = e.Files != null
										? e.Files.Any(f => f.DisplayName == "profile.jpg")
											? $"uploads/thumbnails/{e.Id}.jpg"
											: null
										: null,
					Status = e.Absences != null
								? e.Absences
									.Where(a => a.StartDate <= today && a.EndDate >= today && a.Status == AbsenceStatus.Approved)
									.Select(a => a.Type)
									.FirstOrDefault()
									.GetDisplayName()
								: AbsenceType.Active.GetDisplayName(),
				})
				.OrderBy(e => e.LastName).ThenBy(e => e.FirstName)
				.ToListAsync(cancellationToken);
		}
		
		public async Task<List<SelectItemDto>> GetEmployeesForSelect(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			var query = _context.Employees.Where(e => e.Active); 
		
			if (departmentId.HasValue)
			{
				query = query.Where(e => e.Position.DepartmentId == departmentId.Value); 
			}

			return await query
				.Select(e => new SelectItemDto
				{
					Label = e.FirstName + " " + e.LastName,
					Value = e.Id
				})
				.ToListAsync(cancellationToken); 
		}

		public async Task<List<EmployeeShiftDto>> GetEmployeesForShift(CancellationToken cancellationToken = default)
		{
			return await _context.Employees
				.Where(e => e.Active)
				.Select(e => new EmployeeShiftDto
				{
					Id = e.Id,
					FullName = e.FirstName + " " + e.LastName,
					PositionId = e.PositionId,
					Position = e.Position.Title,
					ProfilePictureSrc = e.Files != null && e.Files.Any(f => f.DisplayName == "profile.jpg")
						? $"uploads/thumbnails/{e.Id}.jpg"
						: null,
					WeeklyHours = e.WeeklyHours,
					RotationPatternId = e.RotationPatternId,
				})
				.OrderBy(e => e.FullName)
				.ToListAsync(cancellationToken);
		}

		public async Task<EmployeeDetailsDto?> GetEmployeeDetails(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _context.Employees
				.Where(e => e.Id == employeeId && e.Active)
				.Select(e => new EmployeeDetailsDto
				{
					Id = e.Id,
					ContactEmail = e.ContactEmail,
					FirstName = e.FirstName,
					LastName = e.LastName,
					PersonalId = e.PersonalId,
					ContractType = e.ContractType.HasValue ? e.ContractType.GetDisplayName() : null,
					Country = e.Country,
					BirthDate = e.BirthDate,
					Position = e.Position.Title,
					PositionId = e.PositionId,
					Department = e.Position.Department.Name,
					DepartmentId = e.Position.DepartmentId,
					Notes = e.Notes.Where(n => n != null && !n.IsDeleted).OrderByDescending(n => n.CreatedDateTime).Select(n => new NoteDto { Id = n.Id, Content = n.Content, CreatedDateTime = n.CreatedDateTime, EmployeeId = n.EmployeeId, Employee = $"{n.Employee.FirstName} {n.Employee.LastName}", Author = $"{n.CreatedByUser.FirstName} {n.CreatedByUser.LastName}" }).ToList(),
					ToDos = e.ToDos.Where(td => td != null && !td.IsDeleted).OrderByDescending(t => t.CreatedDateTime).Select(t => new ToDoDto { Id = t.Id, Content = t.Content, CreatedDateTime = t.CreatedDateTime, DueDateTime = t.DueDateTime, Completed = t.Completed, EmployeeId = t.EmployeeId, Employee = $"{t.Employee.FirstName} {t.Employee.LastName}", Author = $"{t.CreatedByUser.FirstName} {t.CreatedByUser.LastName}" }).ToList(),
					WeeklyHours = e.WeeklyHours,
					WeeklyDays = e.WeeklyDays,
					RotationPatternId = e.RotationPatternId,
					PinnedShiftId = e.PinnedShiftId,
					RotationAnchorDate = e.RotationAnchorDate.HasValue ? e.RotationAnchorDate.Value.ToString("yyyy-MM-dd") : null
				}).FirstOrDefaultAsync(cancellationToken);
		}

		public async Task AddFile(File file, CancellationToken cancellationToken = default)
		{
			_context.Files.Add(file);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<File?> GetProfileImage(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _context.Files
				.Where(f => f.EmployeeId == employeeId && f.DisplayName == "profile.jpg")
				.OrderByDescending(f => f.UploadedOn)
				.FirstOrDefaultAsync(cancellationToken);
		}

		public async Task<File?> GetFile(Guid employeeId, Guid fileId, CancellationToken cancellationToken = default)
		{
			return await _context.Files
				.Where(f => f.EmployeeId == employeeId && f.Id == fileId)
				.FirstOrDefaultAsync(cancellationToken);
		}

		public async Task<File?> GetFile(Guid fileId, CancellationToken cancellationToken = default)
		{
			return await _context.Files
					.Where(f => f.Id == fileId)
					.FirstOrDefaultAsync(cancellationToken);
		}

		public async Task<List<FileDto>> GetAllFiles(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _context.Files
				.Where(f => f.EmployeeId == employeeId && f.Active && f.DisplayName != "profile.jpg")
				.OrderByDescending(f => f.UploadedOn)
				.Select(f => new FileDto { Id = f.Id, EmployeeId = f.EmployeeId, DisplayName = f.DisplayName })
				.ToListAsync(cancellationToken);
		}

		public async Task<List<NoteDto>> GetNotes(Guid? employeeId = null, CancellationToken cancellationToken = default)
		{
			var query = _context.Notes
				.Where(n => !n.IsDeleted); 

			if (employeeId.HasValue)
			{
				query = query.Where(n => n.EmployeeId == employeeId.Value); 
			}


			return await query
				.OrderByDescending(n => n.CreatedDateTime)
				.Select(n => new NoteDto { Id = n.Id, Content = n.Content, CreatedDateTime = n.CreatedDateTime, EmployeeId = n.EmployeeId, Employee = $"{n.Employee.FirstName} {n.Employee.LastName}",  Author = $"{n.CreatedByUser.FirstName} {n.CreatedByUser.LastName}" })
				.ToListAsync(cancellationToken);
		}


		// Consider moving !isDeleted to QueryFilter? If it won't be needed to ever fetch deleted ToDos. 
		// If this is needed (e.g. See deleted notes, see deleted ToDos..) - do not use the QueryFilter. 
		public async Task<List<ToDoDto>> GetToDos(Guid? employeeId = null, bool? all = false, int? take = null, CancellationToken cancellationToken = default)
		{
			var query = _context.ToDos
				.Where(td => !td.IsDeleted); 

			if (employeeId.HasValue)
			{
				query = query.Where(td => td.EmployeeId == employeeId.Value); 
			}

			if (!all.HasValue || all.Value == false)
			{
				query = query.Where(td => !td.Completed);
			}

			var projectionQuery = query
				.OrderByDescending(td => td.CreatedDateTime)
				.Select(t => new ToDoDto { Id = t.Id, Content = t.Content, CreatedDateTime = t.CreatedDateTime, DueDateTime = t.DueDateTime, Completed = t.Completed, EmployeeId = t.EmployeeId, Employee = $"{t.Employee.FirstName} {t.Employee.LastName}", Author = t.CreatedByUser != null ? $"{t.CreatedByUser.FirstName} {t.CreatedByUser.LastName}" : string.Empty }); 

			if (take.HasValue)
			{
				projectionQuery = projectionQuery.Take(take.Value);
			}

			return await projectionQuery.ToListAsync(cancellationToken);
		}

		public async Task AddNote(Note note, CancellationToken cancellationToken = default)
		{
			await _context.Notes.AddAsync(note, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task AddToDo(ToDo toDo, CancellationToken cancellationToken = default)
		{
			await _context.ToDos.AddAsync(toDo, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<Note?> GetNoteById(Guid noteId, CancellationToken cancellationToken = default)
		{
			return await _context.Notes
				.FirstOrDefaultAsync(n => n.Id == noteId && !n.IsDeleted, cancellationToken);
		}

		public async Task<ToDo?> GetToDoById(Guid toDoId, CancellationToken cancellationToken = default)
		{
			return await _context.ToDos
				.FirstOrDefaultAsync(td => td.Id == toDoId && !td.IsDeleted, cancellationToken);
		}

		public async Task<List<UpcomingAnniversariesDto>> GetUpcomingAnniversaries(Guid tenantId, int count = 5, CancellationToken cancellationToken = default)
		{
			// TenantId must be provided directly, because raw SQL is used (no quey filter will be automatically applied)
			// Raw sql is used, due to the performance considerations 
			var sql = @"select
						EmployeeId,
						FullName,
						AnniversaryDate,
						Type,
						ClientId,
						Active,
						EndDate,
						CASE
							WHEN EXISTS (
								   SELECT 1
								   FROM hrs.""File"" f
								   WHERE f.""EmployeeId"" = e.EmployeeId AND f.""DisplayName"" = 'profile.jpg'
							 ) THEN CONCAT('uploads/thumbnails/', e.EmployeeId, '.jpg')
							 ELSE NULL
						END AS ProfilePictureSrc
						from (
							select
								""Id"" as EmployeeId,
								concat (""FirstName"", ' ', ""LastName"") as FullName,
								make_date(
									case
										when make_date(extract(year from CURRENT_DATE)::int, extract(month from ""BirthDate"")::int, extract(day from ""BirthDate"")::int) >= CURRENT_DATE
											then extract(year from CURRENT_DATE)::int
										else extract(year from CURRENT_DATE)::int + 1
									end,
									extract (month from ""BirthDate"")::int,
									extract (day from ""BirthDate"")::int
								) as AnniversaryDate,
								'Birthday' as type,
							""ClientId"" as ClientId,
							""Active"" as Active,
							""EndDate"" as EndDate
							from hrs.""Employee"" e
							where ""BirthDate"" IS NOT NULL
						)
						as e
						where ClientId ='" + tenantId + @"' and Active = true and e.EndDate is null
						order by AnniversaryDate
						limit " + count;

			return await _context.Set<UpcomingAnniversariesDto>().FromSqlRaw(sql, count).AsNoTracking().ToListAsync(cancellationToken);
		}


		public Task<EmployeesChartDataDto> GetEmployeesChartData(int? yearsPeriod, CancellationToken cancellationToken = default)
		{
			return Task.FromResult(new EmployeesChartDataDto
			{
				Categories = [],
				SeriesData = [],
				Total = 0,
				MonthlyChangePercent = 0
			});
		}

		private static decimal? GetMonthlyChangePercent(List<int> seriesData)
		{
			if (seriesData.Count < 2)
			{
				return 0;
			}

			int current = seriesData[^1];
			int previous = seriesData[^2];

			if (previous > 0)
			{
				return Math.Round(((decimal)(current - previous) / previous) * 100, 2);
			}
			else if (current > 0)
			{
				return 100;
			}

			return 0;
		}

		public async Task<List<MonthlyRecentNotesDto>> GetRecentNotes(int count = 5, CancellationToken cancellationToken = default)
		{
			var topNotes = await _context.Notes
				.Where(n => !n.IsDeleted)
				.OrderByDescending(n => n.CreatedDateTime)
				.Take(count)
				.Select(n => new RecentNoteDto
				{
					FullName = n.Employee.FirstName + " " + n.Employee.LastName,
					Content = n.Content,
					CreatedDateTime = n.CreatedDateTime,
					ProfilePictureSrc = n.Employee.Files != null
							? n.Employee.Files.Any(f => f.DisplayName == "profile.jpg") 
								? $"uploads/thumbnails/{n.Employee.Id}.jpg" 
								: null
							: null, 
					EmployeeId = n.EmployeeId, 
					Author = n.CreatedByUser != null 
							? n.CreatedByUser.FirstName + " " + n.CreatedByUser.LastName
							: string.Empty, 
					AuthorId = n.CreatedById ?? Guid.Empty
				})
				.ToListAsync(cancellationToken);

			var grouped = topNotes
				.GroupBy(n => new { n.CreatedDateTime.Year, n.CreatedDateTime.Month })
				.OrderByDescending(g => new DateTime(g.Key.Year, g.Key.Month, 1))
				.Select(g => new MonthlyRecentNotesDto
				{
					Month = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
					Notes = g.ToList()
				})
				.ToList();

			return grouped;
		}

		public async Task<List<Absence>> GetApprovedAbsences(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			return await _context.Absences
				.Where(a => a.EmployeeId == employeeId
								&& a.StartDate <= endDate
								&& a.EndDate >= startDate && a.Status == AbsenceStatus.Approved)
				.ToListAsync(cancellationToken);
		}

		public async Task<List<Absence>> GetApprovedAndPendingAbsences(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			var statuses = new List<AbsenceStatus>() { AbsenceStatus.Approved, AbsenceStatus.Pending };
			return await _context.Absences
				.Where(a => a.EmployeeId == employeeId
								&& a.StartDate <= endDate
								&& a.EndDate >= startDate && statuses.Contains(a.Status))
				.ToListAsync(cancellationToken);
		}

		public async Task<List<UpcomingAbsenceDto>> GetUpcomingAbsences(CancellationToken cancellationToken = default)
		{
			var today = DateOnly.FromDateTime(DateTime.Today);
			var nextWeek = today.AddDays(7);
			var nextMonth = today.AddDays(30);

			return await _context.Absences
				.Where(a =>
					a.Status == AbsenceStatus.Approved &&
					(
						// Current
						(a.StartDate <= today && a.EndDate >= today)

						||

						// Upcoming next week
						(a.StartDate > today && a.StartDate <= nextWeek)

						||

						// Upcoming next month (after next week)
						(a.StartDate > nextWeek && a.StartDate <= nextMonth)
					)
				)
				.OrderBy(a =>
					a.StartDate <= today && a.EndDate >= today ? 0 :
					a.StartDate <= nextWeek ? 1 : 2
				)
				.ThenBy(a => a.StartDate)
				.Select(a => new UpcomingAbsenceDto
				{
					FullName = $"{a.Employee.FirstName} {a.Employee.LastName}",
					Start = a.StartDate,
					End = a.EndDate,
					Type = a.Type.GetDisplayName(),
					EmployeeId = a.EmployeeId,

					Label =
						a.StartDate <= today && a.EndDate >= today
							? "Current"
							: a.StartDate <= nextWeek
								? "Upcoming next week"
								: "Upcoming soon",

					ProfilePictureSrc = a.Employee.Files != null
						? a.Employee.Files.Any(f => f.DisplayName == "profile.jpg")
							? $"uploads/thumbnails/{a.EmployeeId}.jpg"
							: null
						: null
				})
				.ToListAsync(cancellationToken);
		}

		public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
		{
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<EmployeeDatesDto> GetEmployeeDates(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _context.Employees
				.Where(e => e.Id == employeeId)
				.Select(e => new EmployeeDatesDto
				{
					BirthDate = e.BirthDate,
				})
				.AsNoTracking()
				.SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
		}

		public async Task<EmployeesBasicStatsDto> GetEmployeesBasicStats(int? yearsPeriod, CancellationToken cancellationToken = default)
		{
			var today = DateOnly.FromDateTime(DateTime.UtcNow);
			var totalEmployees = await _context.Employees.CountAsync(e => e.Active, cancellationToken);

			var availableEmployees = await _context.Employees.CountAsync(e => e.Active && !e.Absences.Any(a => a.StartDate <= today && a.EndDate >= today && a.Status == AbsenceStatus.Approved), cancellationToken);

			var availability = totalEmployees == 0
				? 0
				: (double)availableEmployees / totalEmployees * 100;

			availability = Math.Round(availability, 2);

			return new EmployeesBasicStatsDto
			{
				TotalEmployees = totalEmployees,
				TodaysAvailability = availability
			};
		}

		public async Task<List<NewEmployeeDto>> GetNewEmployeesList(int count, CancellationToken cancellationToken = default)
		{
			return await _context.Employees
				.Where(e => e.Active)
				.OrderBy(e => e.LastName).ThenBy(e => e.FirstName)
				.Select(e => new NewEmployeeDto
				{
					Id = e.Id,
					FirstName = e.FirstName,
					LastName = e.LastName,
					Email = e.ContactEmail,
					Month = string.Empty,
                    ProfilePictureSrc = e.Files != null
                                        ? e.Files.Any(f => f.DisplayName == "profile.jpg")
                                            ? $"uploads/thumbnails/{e.Id}.jpg"
											: string.Empty
										: string.Empty
				})
				.Take(count)
				.ToListAsync(cancellationToken);
		}

		public async Task<double> GetAttritionRate(int? yearsPeriod, CancellationToken cancellationToken = default)
		{
			int period = yearsPeriod ?? 1;
			var endDate = DateOnly.FromDateTime(DateTime.Today);
			var startDate = endDate.AddYears(-period);

			var leftPeriod = await _context.Employees
				.CountAsync(e => e.EndDate != null &&
					e.EndDate >= startDate &&
					e.EndDate <= endDate, cancellationToken);

			var activeEmployees = await _context.Employees
				.CountAsync(e => e.Active, cancellationToken);

			var averageEmployees = (activeEmployees + leftPeriod) / 2.0;

			double attritionRate = 0;

			if (averageEmployees > 0)
			{
				attritionRate = (leftPeriod / averageEmployees) * 100.0;
			}

			return Math.Round(attritionRate, 1);
		}

		public async Task<Guid?> FindPositionIdAsync(string departmentName, string positionTitle, CancellationToken cancellationToken = default)
		{
			return await _context.Positions
				.Where(p => p.Department.Name.ToLower() == departmentName.ToLower()
						 && p.Title.ToLower() == positionTitle.ToLower())
				.Select(p => (Guid?)p.Id)
				.FirstOrDefaultAsync(cancellationToken);
		}

		public async Task<Guid?> AddWithAbsenceBalance(Employee employee, int annualVacationDays, int carriedOverVacaionDays, CancellationToken cancellationToken = default)
		{
			annualVacationDays = Math.Max(0, annualVacationDays);
			carriedOverVacaionDays = Math.Max(0, carriedOverVacaionDays);


			await _context.Employees.AddAsync(employee, cancellationToken);

			//Creating for this year only
			var absenceBalance = new AbsenceBalance
			{
				EmployeeId = employee.Id,
				Year = DateTime.Today.Year,
				AnnualDays = annualVacationDays,
				CarriedOverDays = carriedOverVacaionDays
			};

			await _context.AbsenceBalances.AddAsync(absenceBalance, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
			return employee.Id;
		}
	}
}
