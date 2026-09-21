using AutoMapper;
using DocumentFormat.OpenXml.Wordprocessing;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
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
	public class AbsenceRepository : GenericRepository<Absence>, IAbsenceRepository
	{
		private readonly IMapper _mapper;
		public AbsenceRepository(IwosDbContext context, IMapper mapper) : base(context)
		{
			_mapper = mapper;
		}

		public async Task<AbsenceBalance?> GetBalance(Guid employeeId, int year, CancellationToken cancellationToken = default)
			=> await _context.AbsenceBalances.FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.Year == year, cancellationToken);

		public async Task<List<Absence>> GetApprovedAbsences(Guid employeeId, int year, CancellationToken cancellationToken = default)
			=> await _context.Absences.Where(x => x.EmployeeId == employeeId && x.Year == year && x.Status == AbsenceStatus.Approved).ToListAsync(cancellationToken);

		public async Task<int> GetApprovedAbsencesCount(Guid employeeId, int year, CancellationToken cancellationToken = default)
			=> await _context.Absences.Where(x => x.EmployeeId == employeeId && x.Year == year && x.Status == AbsenceStatus.Approved).CountAsync(cancellationToken);

		public async Task<List<Absence>> GetPendingAbsences(Guid employeeId, CancellationToken cancellationToken = default)
					=> await _context.Absences.Where(x => x.EmployeeId == employeeId && x.Status == AbsenceStatus.Pending).ToListAsync(cancellationToken);

		public async Task AddAbsences(List<Absence> absences, CancellationToken cancellationToken = default)
		{
			await _context.Absences.AddRangeAsync(absences, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task AddAbsence(Absence absence, CancellationToken cancellationToken = default)
		{
			await _context.Absences.AddAsync(absence, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task AddAbsenceBalance(AbsenceBalance absenceBalance, CancellationToken cancellationToken = default)
		{
			await _context.AbsenceBalances.AddAsync(absenceBalance, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<List<Absence>> GetAbsencesByRequestGroup(Guid requestGroupId, CancellationToken cancellationToken = default)
			=> await _context.Absences.Where(a => a.RequestGroupId == requestGroupId).ToListAsync(cancellationToken);

		public async Task RemoveAbsences(List<Absence> absences, CancellationToken cancellationToken = default)
		{
			_context.Absences.RemoveRange(absences);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task SaveChangesAsync(CancellationToken cancellationToken = default) => await _context.SaveChangesAsync(cancellationToken);

		public Task<List<EmployeeAbsenceHistoryRecordDto>> GetEmployeeAbsenceHistory(Guid employeeId, CancellationToken cancellationToken = default)
		{
			var start = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));

			return _context.Absences
				.Where(a => a.EmployeeId == employeeId && a.EndDate >= start)
				.Select(a => new EmployeeAbsenceHistoryRecordDto
				{
					Start = a.StartDate,
					End = a.EndDate,
					TypeCode = (EventType)a.Type,
					Type = a.Type.GetDisplayName(),
					EmployeeId = a.EmployeeId,
					WorkingDays = a.WorkingDays,
					Status = a.Status.GetDisplayName()
				})
				.OrderByDescending(a => a.Start)
				.ToListAsync(cancellationToken);
		}

		public async Task<bool> ExistsOverlapAsync(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			return await _context.Absences
				.AnyAsync(a => a.EmployeeId == employeeId &&
						a.StartDate <= endDate &&
						a.EndDate >= startDate && (a.Status == AbsenceStatus.Approved || a.Status == AbsenceStatus.Pending), cancellationToken);
		}

		public async Task<List<AbsenceDto>> GetAllApprovedAndPendingAbsences(DateOnly start, DateOnly end, Guid? departmentId, CancellationToken cancellationToken = default)
		{
			//do not fetch rejecting, cancelled or expired absences
			var statuses = new List<AbsenceStatus> { AbsenceStatus.Pending, AbsenceStatus.Approved };
			var query = _context.Absences.Where(a => a.StartDate <= end && a.EndDate >= start && statuses.Contains(a.Status));

			if (departmentId.HasValue)
			{
				query = query.Where(a => a.Employee.Position.DepartmentId == departmentId);
			}

			return await query
			   .Select(a => new AbsenceDto
			   {
				   Id = a.Id,
				   EmployeeFullName = a.Employee.FirstName + " " + a.Employee.LastName,
				   EmployeePosition = a.Employee.Position.Title,
				   EmployeeId = a.EmployeeId,
				   Start = a.StartDate,
				   End = a.EndDate,
				   Type = a.Type.GetDisplayName(),
				   Status = a.Status.GetDisplayName(),
				   WorkingDays = a.WorkingDays,
				   WorkingHours = a.WorkingHours,
			   })
			   .ToListAsync(cancellationToken);
		}

		public async Task<AbsencesStatsDto> GetAbsencesStats(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			var today = DateOnly.FromDateTime(DateTime.UtcNow);
			var month = today.Month;

			var totalEmployees = departmentId.HasValue ? await _context.Employees.CountAsync(e => e.Active && e.Position.DepartmentId == departmentId) : await _context.Employees.CountAsync(e => e.Active);

			var availableEmployees = departmentId.HasValue ?
				await _context.Employees
				.CountAsync(e => e.Active && e.Position.DepartmentId == departmentId && !e.Absences.Any(a => a.StartDate <= today && a.EndDate >= today && a.Status == AbsenceStatus.Approved), cancellationToken)
				: await _context.Employees
					.CountAsync(e => e.Active && !e.Absences.Any(a => a.StartDate <= today && a.EndDate >= today && a.Status == AbsenceStatus.Approved), cancellationToken);

			var absenceStatsQuery = _context.Absences
				.Where(a => a.StartDate <= today && a.EndDate >= today && a.Status == AbsenceStatus.Approved);

			if (departmentId.HasValue)
			{
				absenceStatsQuery = absenceStatsQuery.Where(a => a.Employee.Position.DepartmentId == departmentId);
			}

			var absencesStats = await absenceStatsQuery.GroupBy(a => 1)
			.Select(g => new
			{
				ActiveVacationsToday = g.Count(a => a.Type == AbsenceType.Vacation),
				ActiveSickLeavesToday = g.Count(a => a.Type == AbsenceType.SickLeave)
			})
			.FirstOrDefaultAsync(cancellationToken);


			var birthdaysThisMonth = departmentId.HasValue ?
				await _context.Employees.CountAsync(e => e.Position.DepartmentId == departmentId && e.BirthDate.HasValue && e.BirthDate.Value.Month == month && e.Active, cancellationToken)
				: await _context.Employees.CountAsync(e => e.BirthDate.HasValue && e.BirthDate.Value.Month == month && e.Active, cancellationToken);

			var availability = totalEmployees == 0
				? 0
				: (decimal)availableEmployees / totalEmployees * 100;

			availability = Math.Round(availability, 2);

			return new AbsencesStatsDto
			{
				ActiveVacationsToday = absencesStats?.ActiveVacationsToday ?? 0,
				ActiveSickLeavesToday = absencesStats?.ActiveSickLeavesToday ?? 0,
				TodaysAvailability = availability,
				BirthdaysThisMonth = birthdaysThisMonth
			};
		}

		public async Task ApproveAbsence(Guid absenceId, Guid approvedById, CancellationToken cancellationToken = default)
		{
			var absence = await _context.Absences.FirstOrDefaultAsync(a => a.Id == absenceId, cancellationToken);

			if (absence == null)
			{
				return;
			}

			absence.Status = AbsenceStatus.Approved;
			absence.ApprovedDateTime = DateTime.UtcNow;
			absence.ApprovedById = approvedById;
			absence.LastModifiedTimeStamp = DateTime.UtcNow;
			absence.LastModifiedBy = approvedById;

			_context.Update(absence);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task FinalizeApproval(
			Guid absenceId, Guid approvedById,
			int chargedDays, decimal chargedHours, bool hoursEstimated, int pseudoOffDays,
			int? minChargedDays, int? maxChargedDays,
			int useFromAnnual, int useFromCarriedOver,
			CancellationToken cancellationToken = default)
		{
			var absence = await _context.Absences.FirstOrDefaultAsync(a => a.Id == absenceId, cancellationToken);
			if (absence == null) return;

			absence.WorkingDays = chargedDays;
			absence.WorkingHours = chargedHours;
			absence.IsHoursEstimated = hoursEstimated;
			absence.PseudoWeekendDaysCount = pseudoOffDays;
			absence.MinChargedWorkingDays = minChargedDays;
			absence.MaxChargedWorkingDays = maxChargedDays;
			absence.UsedFromAnnual = useFromAnnual;
			absence.UsedFromCarriedOver = useFromCarriedOver;

			absence.Status = AbsenceStatus.Approved;
			absence.ApprovedDateTime = DateTime.UtcNow;
			absence.ApprovedById = approvedById;
			absence.LastModifiedTimeStamp = DateTime.UtcNow;
			absence.LastModifiedBy = approvedById;

			_context.Update(absence);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task RejectAbsence(Guid absenceId, Guid rejectedById, CancellationToken cancellationToken = default)
		{

			var absence = await _context.Absences.FirstOrDefaultAsync(a => a.Id == absenceId, cancellationToken);

			if (absence == null)
			{
				return;
			}

			absence.Status = AbsenceStatus.Rejected;
			absence.RejectedDateTime = DateTime.UtcNow;
			absence.RejectedById = rejectedById;
			absence.LastModifiedTimeStamp = DateTime.UtcNow;
			absence.LastModifiedBy = rejectedById;

			_context.Update(absence);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task CancelAbsence(Guid absenceId, Guid userId, CancellationToken cancellationToken = default)
		{
			var absence = await _context.Absences.FirstOrDefaultAsync(a => a.Id == absenceId, cancellationToken);

			if (absence == null)
			{
				return;
			}

			absence.Status = AbsenceStatus.Cancelled;
			absence.LastModifiedTimeStamp = DateTime.UtcNow;
			absence.LastModifiedBy = userId;

			_context.Update(absence);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task WithdrawnAbsence(Guid absenceId, Guid employeeId, CancellationToken cancellationToken = default)
		{
			var absence = await _context.Absences.FirstOrDefaultAsync(a => a.Id == absenceId, cancellationToken);

			if (absence == null)
			{
				return;
			}

			absence.Status = AbsenceStatus.Withdrawn;
			absence.LastModifiedTimeStamp = DateTime.UtcNow;
			absence.LastModifiedBy = employeeId;

			_context.Update(absence);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<List<PendingAbsenceDto>> GetPendingRequests(CancellationToken cancellationToken = default)
		{
			return await _context.Absences
				.Where(a => a.Status == AbsenceStatus.Pending)
				.Select(a => new PendingAbsenceDto
				{
					Id = a.Id,
					EmployeeFullName = a.Employee.FirstName + " " + a.Employee.LastName,
					ProfilePictureSrc = a.Employee.Files != null
										? a.Employee.Files.Any(f => f.DisplayName == "profile.jpg")
											? $"uploads/thumbnails/{a.EmployeeId}.jpg"
											: null
										: null,
					EmployeeId = a.EmployeeId,
					Start = a.StartDate,
					End = a.EndDate,
					Type = a.Type.GetDisplayName(),
					RequestedDateTime = a.RequestedDateTime
				})
				.OrderBy(a => a.Start)
			   .ToListAsync(cancellationToken);
		}

		public async Task<List<AbsenceDto>> GetPendingAndApprovedAbsencesForEmployee(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			var statuses = new List<AbsenceStatus> { AbsenceStatus.Pending, AbsenceStatus.Approved };
			return await _context.Absences
				.Where(a => a.EmployeeId == employeeId &&
							a.StartDate <= endDate &&
							a.EndDate >= startDate &&
							statuses.Contains(a.Status))
				.Select(a => new AbsenceDto
				{
					Id = a.Id,
					EmployeeFullName = a.Employee.FirstName + " " + a.Employee.LastName,
					EmployeePosition = a.Employee.Position.Title,
					EmployeeId = a.EmployeeId,
					Start = a.StartDate,
					End = a.EndDate,
					Type = a.Type.GetDisplayName(),
					Status = a.Status.GetDisplayName()
				})
				.OrderByDescending(a => a.Start)
				.ToListAsync(cancellationToken);
		}

		public async Task UpdateAnnualVacationDays(Guid employeeId, int annualDays, Guid userId, int? year, CancellationToken cancellationToken = default)
		{
			if (!year.HasValue)
			{
				year = DateTime.Now.Year;
			}

			var balance = await _context.AbsenceBalances.Where(ab => ab.Year == year && ab.EmployeeId == employeeId).FirstOrDefaultAsync(cancellationToken);

			if (balance == null)
			{
				throw new Exception($"Balance missing for employee {employeeId} for year {year}");
			}

			balance.AnnualDays = annualDays;
			balance.LastModifiedTimeStamp = DateTime.UtcNow;
			balance.LastModifiedBy = userId;

			_context.Update(balance);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<List<AbsenceExcelDto>> GetAbsenceExcelRecords(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			return await _context.Absences
				.Where(a => a.StartDate <= endDate && a.EndDate >= startDate)
				.Select(a => new AbsenceExcelDto()
				{
					EmployeeFullName = a.Employee.FirstName + " " + a.Employee.LastName,
					EmployeeIdentifier = a.Employee.PersonalId,
					Department = a.Employee.Position.Department.Name,
					AbsenceType = a.Type.GetDisplayName(),
					DeductsDays = a.Type == AbsenceType.Vacation ? "Yes" : "No",
					StartDate = a.StartDate.ToDateTime(TimeOnly.MinValue),
					EndDate = a.EndDate.ToDateTime(TimeOnly.MinValue),
					TotalDays = a.WorkingDays,
					Status = a.Status.GetDisplayName(),
					RequestedAt = a.RequestedDateTime,
					ProcessedAt = a.LastModifiedTimeStamp
				})
				.OrderBy(a => a.StartDate)
				.ToListAsync(cancellationToken);
		}

		public async Task<List<AbsenceUpdateDto>> GetRecentAbsenceUpdates(CancellationToken cancellationToken = default)
		{
			return await _context.Absences
				.Where(a => a.RequestedDateTime >= DateTime.UtcNow.AddDays(-2) || a.LastModifiedTimeStamp >= DateTime.UtcNow.AddDays(-2))
				.Select(a => new AbsenceUpdateDto
				{
					EmployeeId = a.EmployeeId,
					EmployeeFullName = a.Employee.FirstName + " " + a.Employee.LastName,
					EmployeeProfilePic = a.Employee.Files != null
										? a.Employee.Files.Any(f => f.DisplayName == "profile.jpg")
											? $"uploads/thumbnails/{a.EmployeeId}.jpg"
											: null
										: null,
					Type = a.Type.GetDisplayName(),
					WorkingDays = a.WorkingDays,
					UpdatedDateTime = a.LastModifiedTimeStamp ?? a.RequestedDateTime,
					Status = a.Status.GetDisplayName(),
					Start = a.StartDate,
					End = a.EndDate
				})
				.OrderByDescending(a => a.UpdatedDateTime)
				.ToListAsync(cancellationToken);
		}

		public async Task<List<EmployeeVacationRiskDto>> GetCriticalLeaveEmployees(int year, int take = 10, CancellationToken cancellationToken = default)
		{
			var usedDaysQuery =
				from a in _context.Absences
				where a.Type == AbsenceType.Vacation && a.Status == AbsenceStatus.Approved && a.Year == year && a.Employee.Active
				group a by a.EmployeeId into g
				select new
				{
					EmployeeId = g.Key,
					UsedDays = g.Sum(x => x.UsedFromCarriedOver + x.UsedFromAnnual)
				};

			var query =
				from b in _context.AbsenceBalances
				where b.Year == year && b.Employee.Active
				select new
				{
					b.EmployeeId,
					FirstName = b.Employee.FirstName,
					LastName = b.Employee.LastName,

					TotalDays = b.AnnualDays + b.CarriedOverDays,

					UsedDays = _context.Absences
						.Where(a =>
							a.EmployeeId == b.EmployeeId &&
							a.Type == AbsenceType.Vacation &&
							a.Status == AbsenceStatus.Approved &&
							a.Year == year)
						.Sum(a => (int?)a.UsedFromAnnual + a.UsedFromCarriedOver) ?? 0,

					HasProfile = b.Employee.Files
						.Any(f => f.DisplayName == "profile.jpg")
				};

			return await query
			.Select(x => new EmployeeVacationRiskDto
			{
				EmployeeId = x.EmployeeId,
				EmployeeFullName = x.FirstName + " " + x.LastName,

				EmployeeProfilePic = x.HasProfile
					? "uploads/thumbnails/" + x.EmployeeId + ".jpg"
					: null,

				RemainingDays = x.TotalDays - x.UsedDays,

				RiskPercentage = x.TotalDays == 0
					? 0
					: ((double)(x.TotalDays - x.UsedDays) / x.TotalDays) * 100
			})
			.OrderByDescending(x => x.RiskPercentage)
			.Take(take)
			.ToListAsync(cancellationToken);
		}
	
	}
}