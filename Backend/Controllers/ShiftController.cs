using Asp.Versioning;
using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    [Authorize]
    public class ShiftController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IShiftService _shiftService;
        private readonly ISchedulingAccessService _schedulingAccess;

        public ShiftController(ILogger logger, IShiftService shiftService, ISchedulingAccessService schedulingAccess)
        {
            _logger = logger;
            _shiftService = shiftService;
            _schedulingAccess = schedulingAccess;
        }

        private bool TryGetUserId(out Guid userId)
            => Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out userId);

        private IActionResult SchedulingAccessForbidden(SchedulingAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                code = ex.Code,
                message = ex.Message,
                maxPlannableDate = ex.MaxPlannableDate?.ToString("yyyy-MM-dd"),
            });
        }

        // ── Config ────────────────────────────────────────────────────────────

        [HttpGet("GetPositions")]
        public async Task<IActionResult> GetPositions(CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetPositionsAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get positions for shift config");
                return Problem(title: "Error 3011: Failed to get positions", detail: ex.Message);
            }
        }

        [HttpGet("GetConfig")]
        public async Task<IActionResult> GetConfig(CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetConfigAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get shift config");
                return Problem(title: "Error 3001: Failed to get shift configuration", detail: ex.Message);
            }
        }

        [HttpGet("GetConstraints")]
        public IActionResult GetConstraints([FromServices] IEnumerable<IScheduleConstraint> constraints)
        {
            var result = constraints
                .OrderBy(c => c.Priority)
                .ThenBy(c => c.Name)
                .Select(c => new ConstraintInfoDto
                {
                    Name = c.Name,
                    Severity = c.Severity.ToString(),
                    Priority = c.Priority,
                    IsUserOverridable = c.IsUserOverridable,
                });
            return Ok(result);
        }

        [HttpPost("SaveConfig")]
        public async Task<IActionResult> SaveConfig([FromBody] SaveShiftConfigDto dto, CancellationToken ct)
        {
            try
            {
                await _shiftService.SaveConfigAsync(dto, ct);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to save shift config");
                return Problem(title: "Error 3002: Failed to save shift configuration", detail: ex.Message);
            }
        }

        //@dusan change this
		[HttpPost("CreateDefaultShift")]
		public async Task<IActionResult> CreateDefaultShift(CancellationToken ct)
		{
			try
			{
				await _shiftService.CreateDefaultShiftAsync(ct);
				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Failed to create default shift");
				return Problem(title: "Error 3002: Failed to create default shift", detail: ex.Message);
			}
		}


		// ── Scheduling policy ─────────────────────────────────────────────────

        [HttpGet("GetSchedulingPolicy")]
        public async Task<IActionResult> GetSchedulingPolicy(CancellationToken ct)
        {
            try
            {
                var result = await _schedulingAccess.GetPolicyAsync(ct);
                return Ok(result);
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get scheduling policy");
                return Problem(title: "Error 3070: Failed to get scheduling policy", detail: ex.Message);
            }
        }

		// ── Rotation Patterns ─────────────────────────────────────────────────

		[HttpGet("GetRotationPatterns")]
        public async Task<IActionResult> GetRotationPatterns(CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetRotationPatternsAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get rotation patterns");
                return Problem(title: "Error 3044: Failed to get rotation patterns", detail: ex.Message);
            }
        }

        [HttpPost("SaveRotationPattern")]
        public async Task<IActionResult> SaveRotationPattern([FromBody] SaveRotationPatternDto dto, CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.SaveRotationPatternAsync(dto, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to save rotation pattern");
                return Problem(title: "Error 3045: Failed to save rotation pattern", detail: ex.Message);
            }
        }

        [HttpDelete("DeleteRotationPattern/{id:guid}")]
        public async Task<IActionResult> DeleteRotationPattern(Guid id, CancellationToken ct)
        {
            try
            {
                await _shiftService.DeleteRotationPatternAsync(id, ct);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to delete rotation pattern");
                return Problem(title: "Error 3046: Failed to delete rotation pattern", detail: ex.Message);
            }
        }

        // ── Weekly Schedule ───────────────────────────────────────────────────

        [HttpGet("GetWeeklySchedule")]
        public async Task<IActionResult> GetWeeklySchedule([FromQuery] DateOnly weekStart, CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetWeeklyScheduleAsync(weekStart, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get weekly schedule");
                return Problem(title: "Error 3003: Failed to get weekly schedule", detail: ex.Message);
            }
        }


        // ── Shift swaps (admin) ───────────────────────────────────────────────

        [HttpGet("GetPendingSwapRequests")]
        public async Task<IActionResult> GetPendingSwapRequests(CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetPendingSwapRequestsAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get pending swap requests");
                return Problem(title: "Error 3025: Failed to get pending swap requests", detail: ex.Message);
            }
        }

        // ── Scheduling progress ───────────────────────────────────────────────

        [HttpGet("GetScheduledDays")]
        public async Task<IActionResult> GetScheduledDays(
            [FromQuery] string start,
            [FromQuery] string end,
            CancellationToken ct)
        {
            try
            {
                if (!DateOnly.TryParseExact(start, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var startDate) ||
                    !DateOnly.TryParseExact(end, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var endDate))
                    return BadRequest("Invalid date format. Expected yyyy-MM-dd.");

                var result = await _shiftService.GetScheduledDaysAsync(startDate, endDate, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get scheduled days");
                return Problem(title: "Error 3080: Failed to get scheduled days", detail: ex.Message);
            }
        }

        // ── Onboarding ────────────────────────────────────────────────────────

        [HttpGet("HasAnySchedule")]
        public async Task<IActionResult> HasAnySchedule(CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.HasAnyScheduleAsync(ct);
                return Ok(new { hasSchedule = result });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to check schedule existence");
                return Problem(title: "Error 3061: Failed to check schedule existence", detail: ex.Message);
            }
        }

        [HttpPost("ProvisionPriorWeek")]
        public async Task<IActionResult> ProvisionPriorWeek([FromBody] ProvisionPriorWeekDto dto, CancellationToken ct)
        {
            try
            {
                if (DateOnly.TryParseExact(dto.WeekStart, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var weekStart))
                {
                    await _schedulingAccess.EnsureCanScheduleRangeAsync(weekStart, weekStart.AddDays(6), ct);
                }
                else
                {
                    // Fall back to a status-only check so we still block disallowed clients on malformed input.
                    await _schedulingAccess.EnsureCanScheduleRangeAsync(DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow), ct);
                }

                TryGetUserId(out var userId);
                var result = await _shiftService.ProvisionPriorWeekAsync(dto, userId == Guid.Empty ? null : userId, ct);
                return Ok(result);
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to provision prior week");
                return Problem(title: "Error 3062: Failed to provision prior week", detail: ex.Message);
            }
        }

        [HttpPost("SetRotationAnchor")]
        public async Task<IActionResult> SetRotationAnchor([FromBody] SetRotationAnchorDto dto, CancellationToken ct)
        {
            try
            {
                // Status-only gate (anchor itself is a config date that may sit outside the window).
                var policy = await _schedulingAccess.GetPolicyAsync(ct);
                if (policy.IsBlocked)
                {
                    throw new SchedulingAccessException(
                        SchedulingAccessException.CodeStatusBlocked,
                        "Scheduling is not available with the current subscription.");
                }

                await _shiftService.SetRotationAnchorAsync(dto, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to set rotation anchor");
                return Problem(title: "Error 3063: Failed to set rotation anchor", detail: ex.Message);
            }
        }

        // ── Smart scheduling ──────────────────────────────────────────────────

        [HttpPost("GenerateScheduleRange")]
        public async Task<IActionResult> GenerateScheduleRange([FromBody] GenerateScheduleRangeRequestDto dto, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleRangeAsync(dto.StartDate, dto.EndDate, ct);

                TryGetUserId(out var userId);
                var result = await _shiftService.GenerateScheduleForRangeAsync(dto, userId == Guid.Empty ? null : userId, ct);
                return Ok(result);
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to generate schedule range");
                return Problem(title: "Error 3015: Failed to generate schedule range", detail: ex.Message);
            }
        }

        [HttpPost("ReoptimizeSchedule")]
        public async Task<IActionResult> ReoptimizeSchedule([FromBody] ReoptimizeScheduleRequestDto dto, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleRangeAsync(dto.StartDate, dto.EndDate, ct);

                TryGetUserId(out var userId);
                var result = await _shiftService.ReoptimizeScheduleAsync(dto, userId == Guid.Empty ? null : userId, ct);
                return Ok(result);
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to re-optimize schedule");
                return Problem(title: "Error 3081: Failed to re-optimize schedule", detail: ex.Message);
            }
        }

        // ── Assignments ───────────────────────────────────────────────────────

        [HttpGet("GetWorkingTimeOverview")]
        public async Task<IActionResult> GetWorkingTimeOverview([FromQuery] int year, CancellationToken ct)
        {
            try
            {
                var result = await _shiftService.GetWorkingTimeOverviewAsync(year, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get working time overview");
                return Problem(title: "Error 3016: Failed to get working time overview", detail: ex.Message);
            }
        }

        [HttpGet("ExportPayroll")]
        public async Task<IActionResult> ExportPayroll([FromQuery] int year, [FromQuery] int month, CancellationToken ct)
        {
            try
            {
                var fileBytes = await _shiftService.ExportPayrollAsync(year, month, ct);
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Payroll_{year:D4}-{month:D2}.xlsx");
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to export payroll");
                return Problem(title: "Error 3017: Failed to export payroll", detail: ex.Message);
            }
        }

        [HttpPost("AssignEmployee")]
        public async Task<IActionResult> AssignEmployee([FromBody] AssignEmployeeDto dto, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleAsync(dto.Date, ct);

                TryGetUserId(out var userId);
                await _shiftService.AssignEmployeeAsync(dto, userId, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (ConstraintViolationException ex)
            {
                return UnprocessableEntity(new
                {
                    blockingViolations = ex.BlockingViolations,
                    overridableViolations = ex.OverridableViolations,
                    canOverride = ex.BlockingViolations.Count == 0,
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to assign employee to shift");
                return Problem(title: "Error 3005: Failed to assign employee", detail: ex.Message);
            }
        }

        [HttpDelete("RemoveAssignment")]
        public async Task<IActionResult> RemoveAssignment([FromQuery] Guid shiftId, [FromQuery] Guid employeeId, [FromQuery] DateOnly date, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleAsync(date, ct);

                await _shiftService.RemoveAssignmentAsync(shiftId, employeeId, date, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to remove shift assignment");
                return Problem(title: "Error 3006: Failed to remove assignment", detail: ex.Message);
            }
        }

        [HttpDelete("ClearWeek")]
        public async Task<IActionResult> ClearWeek([FromQuery] DateOnly weekStart, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleRangeAsync(weekStart, weekStart.AddDays(6), ct);

                await _shiftService.ClearWeekAsync(weekStart, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to clear week schedule");
                return Problem(title: "Error 3010: Failed to clear week schedule", detail: ex.Message);
            }
        }

        // ── Position Requirement Overrides ────────────────────────────────────

        [HttpPost("SetPositionRequirementOverride")]
        public async Task<IActionResult> SetPositionRequirementOverride([FromBody] SetPositionRequirementOverrideDto dto, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleAsync(dto.Date, ct);

                await _shiftService.SetPositionRequirementOverrideAsync(dto, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to set position requirement override");
                return Problem(title: "Error 3007: Failed to set position requirement override", detail: ex.Message);
            }
        }

        [HttpDelete("RemovePositionRequirementOverride")]
        public async Task<IActionResult> RemovePositionRequirementOverride(
            [FromQuery] Guid shiftId, [FromQuery] DateOnly date, [FromQuery] Guid positionId, CancellationToken ct)
        {
            try
            {
                await _schedulingAccess.EnsureCanScheduleAsync(date, ct);

                await _shiftService.RemovePositionRequirementOverrideAsync(shiftId, date, positionId, ct);
                return Ok();
            }
            catch (SchedulingAccessException ex)
            {
                return SchedulingAccessForbidden(ex);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to remove position requirement override");
                return Problem(title: "Error 3008: Failed to remove position requirement override", detail: ex.Message);
            }
        }

        // ── Unavailability ────────────────────────────────────────────────────

        [HttpPost("ReportUnavailability")]
        public async Task<IActionResult> ReportUnavailability([FromBody] ReportUnavailabilityDto dto, CancellationToken ct)
        {
            try
            {
                if (!TryGetUserId(out var userId))
                    return Unauthorized("Invalid or missing user id in token.");

                await _shiftService.ReportUnavailabilityAsync(dto.ShiftId, userId, dto.Date, ct);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to report unavailability");
                return Problem(title: "Error 3009: Failed to report unavailability", detail: ex.Message);
            }
        }

        [HttpDelete("CancelUnavailability")]
        public async Task<IActionResult> CancelUnavailability([FromQuery] Guid shiftId, [FromQuery] DateOnly date, CancellationToken ct)
        {
            try
            {
                if (!TryGetUserId(out var userId))
                    return Unauthorized("Invalid or missing user id in token.");

                await _shiftService.CancelUnavailabilityAsync(shiftId, userId, date, ct);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to cancel unavailability");
                return Problem(title: "Error 3010: Failed to cancel unavailability", detail: ex.Message);
            }
        }
    }
}
