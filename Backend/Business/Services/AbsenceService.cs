using AutoMapper;
using ClosedXML.Excel;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Data.Model;
using Microsoft.OpenApi;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
	public class AbsenceService : IAbsenceService
	{
		private readonly IAbsenceRepository _absenceRepository;
		private readonly IMapper _mapper;
		private readonly IEmployeeRepository _employeeRepository;
		private readonly ITenantProvider _tenantProvider;
		private readonly IEmailService _emailService;
		private readonly IUserRepository _userRepository;
		private readonly IAbsencePlanningService _planning;
		private readonly IShiftRepository _shiftRepository;

		public AbsenceService(IAbsenceRepository absenceRepository, IMapper mapper, IEmployeeRepository employeeRepository, ITenantProvider tenantProvider, IEmailService emailService, IUserRepository userRepository, IAbsencePlanningService planning, IShiftRepository shiftRepository)
		{
			_absenceRepository = absenceRepository;
			_mapper = mapper;
			_employeeRepository = employeeRepository;
			_tenantProvider = tenantProvider;
			_emailService = emailService;
			_userRepository = userRepository;
			_planning = planning;
			_shiftRepository = shiftRepository;
		}

		private static DateOnly GetCarriedOverExpiryDate(int year) => new(year, 6, 30);

		/// <summary>
		/// Splits a request that crosses calendar year boundaries into per-year segments.
		/// Each segment hits its own AbsenceBalance row. Carried-over expiry handling is
		/// owned by the planning service (no longer split here).
		/// </summary>
		private static List<(DateOnly start, DateOnly end)> SplitByYear(DateOnly start, DateOnly end)
		{
			var segments = new List<(DateOnly, DateOnly)>();
			var cursor = start;
			while (cursor <= end)
			{
				var yearEnd = new DateOnly(cursor.Year, 12, 31);
				var segEnd = end <= yearEnd ? end : yearEnd;
				segments.Add((cursor, segEnd));
				cursor = segEnd.AddDays(1);
			}
			return segments;
		}

		public async Task CreateAbsence(CreateAbsenceDto createAbsenceDto, CancellationToken cancellationToken = default)
		{
			if (createAbsenceDto.EndDate < createAbsenceDto.StartDate)
				throw new ArgumentException("End date must be greater than or equal to start date.");

			if (await _absenceRepository.ExistsOverlapAsync(createAbsenceDto.EmployeeId, createAbsenceDto.StartDate, createAbsenceDto.EndDate, cancellationToken))
				throw new InvalidOperationException("Absence overlaps with existing records.");

			var requestGroupId = Guid.NewGuid();
			var segments = SplitByYear(createAbsenceDto.StartDate, createAbsenceDto.EndDate);
			var newAbsences = new List<Absence>();

			foreach (var (segStart, segEnd) in segments)
			{
				var impact = await _planning.EvaluateAsync(createAbsenceDto.EmployeeId, segStart, segEnd, createAbsenceDto.Type, cancellationToken);

				if (createAbsenceDto.Type == AbsenceType.Vacation && !impact.Sufficient)
					throw new Exception($"Not enough remaining days in {segStart.Year}.");

				var absence = new Absence
				{
					Employee = null!,
					EmployeeId = createAbsenceDto.EmployeeId,
					Status = AbsenceStatus.Pending,
					Type = createAbsenceDto.Type,
					StartDate = segStart,
					EndDate = segEnd,
					RequestedDateTime = DateTime.UtcNow,
					Year = segStart.Year,
					WorkingDays = impact.ChargedWorkingDays,
					WorkingHours = impact.ChargedWorkingHours,
					IsHoursEstimated = impact.HoursEstimated,
					PseudoWeekendDaysCount = impact.PseudoWeekendDays,
					MinChargedWorkingDays = impact.MinChargedWorkingDays,
					MaxChargedWorkingDays = impact.MaxChargedWorkingDays,
					UsedFromCarriedOver = impact.Balance.UseFromCarriedOver,
					UsedFromAnnual = impact.Balance.UseFromAnnual,
					RequestGroupId = requestGroupId
				};
				newAbsences.Add(absence);
				await NotifyHRAboutStatus(absence, impact.ChargedWorkingDays, AbsenceStatus.Pending, cancellationToken);
			}

			await _absenceRepository.AddAbsences(newAbsences, cancellationToken);
			await _absenceRepository.SaveChangesAsync(cancellationToken);
		}

		public Task<AbsenceImpactDto> PreviewImpact(Guid employeeId, DateOnly startDate, DateOnly endDate, AbsenceType type, CancellationToken cancellationToken = default)
			=> _planning.EvaluateAsync(employeeId, startDate, endDate, type, cancellationToken);

		public Task<AbsenceImpactDto> PreviewExistingImpact(Guid absenceId, CancellationToken cancellationToken = default)
			=> _planning.EvaluateExistingAsync(absenceId, cancellationToken);

		private async Task NotifyHRAboutStatus(Absence absence, int totalDays, AbsenceStatus newStatus, CancellationToken cancellationToken)
		{
			var clientId = _tenantProvider.GetTenantId();
			Expression<Func<ApplicationUser, bool>> filter = u => u.ClientId == clientId;
			var hrs = await _userRepository.GetList(filter: filter, token: cancellationToken);

			if (hrs == null || hrs.Count == 0)
			{
				return; 
			}

			var employee = await _employeeRepository.Get(absence.EmployeeId, cancellationToken);
			var hrEmails = hrs.Select(hr => hr.Email); 

			var employeeFullName = employee.FirstName + " " + employee.LastName;
			var type = absence.Type.GetDisplayName();
			string duration;

			if (absence.StartDate.Year == absence.EndDate.Year)
			{
				// same year
				duration = $"{absence.StartDate:MMM dd} — {absence.EndDate:MMM dd}, {absence.EndDate:yyyy}";
			}
			else
			{
				// different year
				duration = $"{absence.StartDate:MMM dd, yyyy} — {absence.EndDate:MMM dd, yyyy}";
			}


			string htmlName;

			if (newStatus == AbsenceStatus.Pending)
			{
				htmlName = "absence-request.html";
			}
			else if (newStatus == AbsenceStatus.Withdrawn)
			{
				htmlName = "absence-withdrawn.html";
			}
			else
			{
				return;
			}

			var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", htmlName); 
			var template = await System.IO.File.ReadAllTextAsync(templatePath);

			template = template.Replace("{{employeeFullName}}", employeeFullName)
				.Replace("{{type}}", type)
				.Replace("{{duration}}", duration)
				.Replace("{{totalDays}}", totalDays.ToString());

			string subject;

			if (newStatus == AbsenceStatus.Pending)
			{
				subject = "New Absence Request";
			}
			else if (newStatus == AbsenceStatus.Withdrawn)
			{
				subject = "Absence Request Withdrawn";
			}
			else
			{
				return;
			}

			foreach (var hrEmail in hrEmails)
			{
				await _emailService.SendEmail(hrEmail, subject, template);
			}
		}

		private async Task NotifyEmployeeAboutStatus(Absence absence, AbsenceStatus newStatus, CancellationToken cancellationToken)
		{
			var employee = await _employeeRepository.Get(absence.EmployeeId, cancellationToken);

			if (employee == null)
			{
				return; 
			}

			var email = employee.ContactEmail; 

			if (string.IsNullOrWhiteSpace(email))
			{
				return; 
			}

			var type = absence.Type.GetDisplayName();
			string duration;

			if (absence.StartDate.Year == absence.EndDate.Year)
			{
				duration = $"{absence.StartDate:MMM dd} — {absence.EndDate:MMM dd}, {absence.EndDate:yyyy}";
			}
			else
			{
				duration = $"{absence.StartDate:MMM dd, yyyy} — {absence.EndDate:MMM dd, yyyy}";
			}

			string htmlName; 

			if (newStatus == AbsenceStatus.Approved)
			{
				htmlName = "absence-approved.html";
			}
			else if (newStatus == AbsenceStatus.Rejected)
			{
				htmlName = "absence-rejected.html";
			}
			else if (newStatus == AbsenceStatus.Cancelled)
			{
				htmlName = "absence-cancelled.html";
			}
			else
			{
				return; 
			}

			var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", htmlName);
			var template = await System.IO.File.ReadAllTextAsync(templatePath);

			template = template.Replace("{{type}}", type)
				.Replace("{{duration}}", duration)
				.Replace("{{totalDays}}", absence.WorkingDays.ToString());

			await _emailService.SendEmail(email, "Absence Request Status Update", template);
		}


		//This logic should be called on 01.01. each year

		public async Task ProvisionNewYearBalances(int newYear, CancellationToken cancellationToken = default)
		{
			var employees = await _employeeRepository.GetEmployees(departmentId: null, cancellationToken);

			foreach (var employee in employees)
			{
				if (await _absenceRepository.Exist(a => a.EmployeeId == employee.Id && a.Year == newYear, cancellationToken))
				{
					continue; // Balance already exists for this year
				}

				var previousBalance = await _absenceRepository.GetBalance(employee.Id, newYear - 1, cancellationToken);

				int carriedOver = 0;

				if (previousBalance != null)
				{
					var absences = await _absenceRepository.GetApprovedAbsences(employee.Id, newYear - 1, cancellationToken);
					var usedAnnual = absences.Sum(a => a.UsedFromAnnual);
					var remainingAnnual = previousBalance.AnnualDays - usedAnnual;
					carriedOver = Math.Max(0, remainingAnnual);
				}

				var newBalance = new AbsenceBalance
				{
					EmployeeId = employee.Id,
					Year = newYear,
					AnnualDays = 20, // moze se kasnije uzeti iz policy/config
					CarriedOverDays = carriedOver
				};

				await _absenceRepository.AddAbsenceBalance(newBalance, cancellationToken);
			}

			await _absenceRepository.SaveChangesAsync(cancellationToken);
		}

		public async Task<List<EmployeeAbsenceHistoryRecordDto>> GetEmployeeAbsenceHistory(Guid employeeId, CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetEmployeeAbsenceHistory(employeeId, cancellationToken);
		}

		public async Task<List<AbsenceDto>> GetAllApprovedAndPendingAbsences(DateOnly start, DateOnly end, Guid? departmentId, CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetAllApprovedAndPendingAbsences(start, end, departmentId, cancellationToken);
		}

		public async Task<AbsencesStatsDto> GetAbsencesStats(Guid? departmentId, CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetAbsencesStats(departmentId, cancellationToken);
		}

		public async Task<AbsenceApprovalResultDto> ApproveAbsence(Guid absenceId, Guid approvedById, CancellationToken cancellationToken = default)
		{
			// Re-evaluate against current schedule so released shifts and actual hours reflect today's reality.
			var impact = await _planning.EvaluateExistingAsync(absenceId, cancellationToken);

			// Release every conflicting assignment. The slot becomes empty on the planner and surfaces as unfilled.
			foreach (var conflict in impact.Conflicts)
				await _shiftRepository.RemoveAssignmentAsync(conflict.ShiftId, impact.EmployeeId, conflict.Date, cancellationToken);

			// Persist the recomputed actuals + balance allocation, then mark approved.
			await _absenceRepository.FinalizeApproval(
				absenceId,
				approvedById,
				impact.ChargedWorkingDays,
				impact.ChargedWorkingHours,
				impact.HoursEstimated,
				impact.PseudoWeekendDays,
				impact.MinChargedWorkingDays,
				impact.MaxChargedWorkingDays,
				impact.Balance.UseFromAnnual,
				impact.Balance.UseFromCarriedOver,
				cancellationToken);

			var absence = await _absenceRepository.Get(absenceId, cancellationToken);
			await NotifyEmployeeAboutStatus(absence, AbsenceStatus.Approved, cancellationToken);

			return new AbsenceApprovalResultDto
			{
				AbsenceId = absenceId,
				ReleasedAssignments = impact.Conflicts,
				ChargedWorkingDays = impact.ChargedWorkingDays,
				ChargedWorkingHours = impact.ChargedWorkingHours
			};
		}
		public async Task RejectAbsence(Guid absenceId, Guid rejectedById, CancellationToken cancellationToken = default)
		{
			await _absenceRepository.RejectAbsence(absenceId, rejectedById, cancellationToken);
			var absence = await _absenceRepository.Get(absenceId, cancellationToken);
			await NotifyEmployeeAboutStatus(absence, AbsenceStatus.Rejected, cancellationToken);
		}
		public async Task CancelAbsence(Guid absenceId, Guid userId, CancellationToken cancellationToken = default)
		{
			await _absenceRepository.CancelAbsence(absenceId, userId, cancellationToken);
			var absence = await _absenceRepository.Get(absenceId, cancellationToken);
			await NotifyEmployeeAboutStatus(absence, AbsenceStatus.Cancelled, cancellationToken);
		}

		public async Task WithdrawnAbsence(Guid absenceId, Guid employeeId, CancellationToken cancellationToken = default) 
		{
			await _absenceRepository.WithdrawnAbsence(absenceId, employeeId, cancellationToken);
			var absence = await _absenceRepository.Get(absenceId, cancellationToken);
			await NotifyHRAboutStatus(absence, absence.WorkingDays, AbsenceStatus.Withdrawn, cancellationToken);
		}

		public async Task<List<PendingAbsenceDto>> GetPendingRequests(CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetPendingRequests(cancellationToken);
		}

		public async Task<EmployeeAbsenceStatsDto> GetEmployeeAbsenceStats(Guid employeeId, int? year, CancellationToken cancellationToken = default)
		{
			var now = DateTime.Now; 

			if (!year.HasValue)
			{
				year = now.Year;
			}

			var carriedExpired = DateOnly.FromDateTime(now) >= GetCarriedOverExpiryDate(year.Value); 

			var balance = await _absenceRepository.GetBalance(employeeId, year.Value, cancellationToken)
				?? throw new Exception($"Vacation balance not found for employee {employeeId} in {year}");
			var approvedAbsences = await _absenceRepository.GetApprovedAbsences(employeeId, year.Value, cancellationToken);
			var usedCarriedApproved = carriedExpired ? 0 : approvedAbsences.Sum(a => a.UsedFromCarriedOver);
			var usedAnnualApproved = approvedAbsences.Sum(a => a.UsedFromAnnual);

			var approvedAbsencesCount = await _absenceRepository.GetApprovedAbsencesCount(employeeId, year.Value, cancellationToken);
			var pendingAbsences = await _absenceRepository.GetPendingAbsences(employeeId, cancellationToken);
			var usedCarriedPending = pendingAbsences.Sum(a => a.UsedFromCarriedOver);
			var usedAnnualPending = pendingAbsences.Sum(a => a.UsedFromAnnual);


			return new EmployeeAbsenceStatsDto()
			{
				RemainingVacationDays = balance.AnnualDays - usedAnnualApproved - usedAnnualPending,
				RemainingCarriedOverDays = carriedExpired ? 0 : balance.CarriedOverDays - usedCarriedApproved - usedCarriedPending,
				RemainingVacationDaysPending = usedAnnualPending,
				RemainingCarriedOverDaysPending = usedCarriedPending,
				PendingRequestsNumber = pendingAbsences.Count,
				ApprovedRequestsNumber = approvedAbsencesCount, 
				AnnualTotalAllowance = balance.AnnualDays, 
				CarriedOverTotalAllowance = carriedExpired ? 0 : balance.CarriedOverDays
			};
		}


		public async Task<List<AbsenceDto>> GetPendingAndApprovedAbsencesForEmployee(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetPendingAndApprovedAbsencesForEmployee(employeeId, startDate, endDate, cancellationToken);	
		}

		public async Task UpdateAnnualVacationDays(Guid employeeId, int annualDays, Guid userId, int? year, CancellationToken cancellationToken = default)
		{
			if (annualDays < 20)
			{
				throw new Exception("At least minimum annual vacation days (20) required.");
			}
			await _absenceRepository.UpdateAnnualVacationDays(employeeId, annualDays, userId, year, cancellationToken); 
		}

		public async Task<byte[]> GetExcelData(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default)
		{
			var records = await _absenceRepository.GetAbsenceExcelRecords(startDate, endDate, cancellationToken);

			using var workbook = new XLWorkbook(); 
			var worksheet = workbook.Worksheets.Add("Absences");

			worksheet.Cell(1,1).Value = "Employee Full Name";
			worksheet.Cell(1,2).Value = "Employee Identifier";
			worksheet.Cell(1,3).Value = "Department";
			worksheet.Cell(1,4).Value = "Absence Type";
			worksheet.Cell(1,5).Value = "Deducts Days";
			worksheet.Cell(1,6).Value = "Start Date";
			worksheet.Cell(1,7).Value = "End Date";
			worksheet.Cell(1,8).Value = "Total Days";
			worksheet.Cell(1,9).Value = "Status";
			worksheet.Cell(1,10).Value = "Requested At";
			worksheet.Cell(1,11).Value = "Processed At";

			worksheet.Column(6).Style.DateFormat.Format = "dd.MM.yyyy."; 
			worksheet.Column(7).Style.DateFormat.Format = "dd.MM.yyyy.";
			worksheet.Column(10).Style.DateFormat.Format = "dd.MM.yyyy. HH:mm";
			worksheet.Column(11).Style.DateFormat.Format = "dd.MM.yyyy. HH:mm";
			worksheet.Cell(2, 1).InsertData(records);

			int lastColumn = worksheet.LastColumnUsed().ColumnNumber();
			for (int col = 1; col <= lastColumn; col++)
			{
				worksheet.Column(col).AdjustToContents();
			}

			using var stream = new MemoryStream();
			workbook.SaveAs(stream);

			return stream.ToArray(); 
		}

		public async Task<List<AbsenceUpdateDto>> GetRecentAbsenceUpdates(CancellationToken cancellationToken = default)
		{
			return await _absenceRepository.GetRecentAbsenceUpdates(cancellationToken);
		}
		
		public async Task<List<EmployeeVacationRiskDto>> GetCriticalLeaveEmployees(int take, CancellationToken cancellationToken = default)
		{
			int year = DateTime.UtcNow.Year;
			return await _absenceRepository.GetCriticalLeaveEmployees(year, take, cancellationToken);
		}
	
	}
}