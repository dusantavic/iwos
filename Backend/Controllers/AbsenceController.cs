using Asp.Versioning;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
	[ApiController]
	[Route("api/v{version:apiVersion}/[controller]")]
	[ApiVersion("1.0")]
	public class AbsenceController : ControllerBase
	{
		private readonly ILogger _logger;
		private readonly IAbsenceService _absenceService;

		public AbsenceController(ILogger logger, IAbsenceService absenceService)
		{
			_logger = logger;
			_absenceService = absenceService;
		}

		[HttpPost("CreateAbsence")]
		[Authorize]
		public async Task<IActionResult> CreateAbsence([FromBody] CreateAbsenceDto createAbsence, CancellationToken cancellationToken)
		{
			try
			{
				await _absenceService.CreateAbsence(createAbsence, cancellationToken);

				return Ok();
			}
			catch (ArgumentException ex)
			{
				return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid absence request", detail: ex.Message);
			}
			catch (InvalidOperationException ex)
			{
				return Problem(statusCode: StatusCodes.Status409Conflict, title: "Absence conflict", detail: ex.Message);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Absence creation failed");
				return Problem(title: "Error 2002: Absence creation failed", detail: ex.Message);
			}
		}

		[HttpGet("GetEmployeeAbsenceHistory")]
		[Authorize]
		public async Task<IActionResult> GetEmployeeAbsenceHistory(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetEmployeeAbsenceHistory(employeeId, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve employee absence history");
				return Problem(title: "Error 2003: Failed to retrieve employee absence history");
			}
		}

		[HttpGet("GetAllAbsences")]
		[Authorize]
		public async Task<IActionResult> GetAllAbsences(DateOnly start, DateOnly end, Guid? departmentId, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetAllApprovedAndPendingAbsences(start, end, departmentId, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve absences");
				return Problem(title: "Error 2004: Failed to retrieve absences");
			}
		}

		[HttpGet("GetAbsencesStats")]
		[Authorize]
		public async Task<IActionResult> GetAbsencesStats(Guid? departmentId, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetAbsencesStats(departmentId, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve absences stats");
				return Problem(title: "Error 2004: Failed to retrieve absences stats");
			}
		}


		[HttpPatch("ApproveAbsence")]
		[Authorize]
		public async Task<IActionResult> ApproveAbsence(Guid absenceId, CancellationToken cancellationToken)
		{
			try
			{
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid approvedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				var result = await _absenceService.ApproveAbsence(absenceId, approvedById, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Absence approval failed");
				return Problem(title: "Error 2002: Absence approval failed", detail: ex.Message);
			}
		}

		[HttpGet("PreviewImpact")]
		[Authorize]
		public async Task<IActionResult> PreviewImpact(Guid employeeId, DateOnly startDate, DateOnly endDate, Common.Contracts.Enums.AbsenceType type, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.PreviewImpact(employeeId, startDate, endDate, type, cancellationToken);
				return Ok(result);
			}
			catch (ArgumentException ex)
			{
				return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid preview request", detail: ex.Message);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to compute absence impact preview");
				return Problem(title: "Error 2005: Absence impact preview failed", detail: ex.Message);
			}
		}

		[HttpGet("PreviewExistingImpact")]
		[Authorize]
		public async Task<IActionResult> PreviewExistingImpact(Guid absenceId, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.PreviewExistingImpact(absenceId, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to compute pending absence impact");
				return Problem(title: "Error 2005: Pending absence impact failed", detail: ex.Message);
			}
		}


		[HttpPatch("RejectAbsence")]
		[Authorize]
		public async Task<IActionResult> RejectAbsence(Guid absenceId, CancellationToken cancellationToken)
		{
			try
			{
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid rejectedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _absenceService.RejectAbsence(absenceId, rejectedById, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Absence rejecting failed");
				return Problem(title: "Error 2002: Absence rejecting failed", detail: ex.Message);
			}
		}


		[HttpPatch("CancelAbsence")]
		[Authorize]
		public async Task<IActionResult> CancelAbsence(Guid absenceId, CancellationToken cancellationToken)
		{
			try
			{
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid userId))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _absenceService.CancelAbsence(absenceId, userId, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Absence cancelling failed");
				return Problem(title: "Error 2002: Absence cancelling failed");
			}
		}

		[HttpPatch("WithdrawnAbsence")]
		[Authorize]
		public async Task<IActionResult> WithdrawnAbsence(Guid absenceId, Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				await _absenceService.WithdrawnAbsence(absenceId, employeeId, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Absence withdrawn failed");
				return Problem(title: "Error 2002: Absence withdrawn failed");
			}
		}

		[HttpGet("GetPendingRequests")]
		[Authorize]
		public async Task<IActionResult> GetPendingRequests(CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetPendingRequests(cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve pending absences");
				return Problem(title: "Error 2004: Failed to retrieve pending absences");
			}
		}

		[HttpGet("GetEmployeeAbsenceStats")]
		[Authorize]
		public async Task<IActionResult> GetEmployeeAbsenceStats(Guid employeeId, int? year, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetEmployeeAbsenceStats(employeeId, year, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve absence stats");
				return Problem(title: "Error 2004: Failed to retrieve absence stats");
			}
		}


		[HttpGet("GetPendingAndApprovedAbsencesForEmployee")]
		[Authorize]
		public async Task<IActionResult> GetPendingAndApprovedAbsencesForEmployee(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetPendingAndApprovedAbsencesForEmployee(employeeId, startDate, endDate, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve absences");
				return Problem(title: "Error 2004: Failed to retrieve absences");
			}
		}

		[HttpPatch("UpdateAnnualVacationDays")]
		[Authorize]
		public async Task<IActionResult> UpdateAnnualVacationDays(Guid employeeId, int annualDays, int? year, CancellationToken cancellationToken)
		{
			try
			{
				//@dusan check if manager or employee is signed in (additional authorization required) 

				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid userId))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _absenceService.UpdateAnnualVacationDays(employeeId, annualDays, userId, year, cancellationToken);
				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to update annual absence days");
				return Problem(title: "Error 2004: Failed to update annual absence days");
			}
		}

		[HttpGet("GetExcelData")]
		[Authorize]
		public async Task<IActionResult> GetExcelData(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken)
		{
			try
			{
				var fileBytes = await _absenceService.GetExcelData(startDate, endDate, cancellationToken);
				return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Absences_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}.xlsx");
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve excel data");
				return Problem(title: "Error 2004: Failed to retrieve excel data");
			}
		}

		[HttpGet("GetRecentAbsenceUpdates")]
		[Authorize]
		public async Task<IActionResult> GetRecentAbsenceUpdates(CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetRecentAbsenceUpdates(cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve recent AIS updates");
				return Problem(title: "Error 2004: Failed to retrieve recent AIS updates");
			}
		}

		[HttpGet("GetCriticalLeaveEmployees")]
		[Authorize]
		public async Task<IActionResult> GetCriticalLeaveEmployees(int take, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _absenceService.GetCriticalLeaveEmployees(take, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to retrieve critical leave employees");
				return Problem(title: "Error 2004: Failed to retrieve critical leave employees");
			}
		}

	}
	}
