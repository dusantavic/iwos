using Asp.Versioning;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Identity.Web;
using Serilog;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    /// <summary>
    /// Employee portal surface. Everything here runs on the portal JWT audience
    /// and is gated by the <see cref="PortalAuth.EmployeePortalPolicy"/> policy
    /// so manager tokens cannot reach these endpoints — and the one manager-only
    /// action (<see cref="BulkProvision"/>) opts into the explicit
    /// <see cref="PortalAuth.ManagerPolicy"/>.
    /// </summary>
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    public class EmployeePortalController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IEmployeePortalService _portalService;
        private readonly ITokenService _tokenService;
        private readonly IAbsenceService _absenceService;
        private readonly IShiftService _shiftService;
        private readonly IEmployeeService _employeeService;

        public EmployeePortalController(
            ILogger logger,
            IEmployeePortalService portalService,
            ITokenService tokenService,
            IAbsenceService absenceService,
            IShiftService shiftService,
            IEmployeeService employeeService)
        {
            _logger = logger;
            _portalService = portalService;
            _tokenService = tokenService;
            _absenceService = absenceService;
            _shiftService = shiftService;
            _employeeService = employeeService;
        }

        // ── Auth ──────────────────────────────────────────────────────────────

        [HttpPost("Login")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> Login([FromBody] EmployeePortalLoginDto loginDto, CancellationToken cancellationToken)
        {
            try
            {
                var tokens = await _portalService.Login(loginDto, cancellationToken);
                if (tokens == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Invalid username or password.");
                }
                return Ok(tokens);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal login failed");
                return Problem(title: "Error 5001");
            }
        }

        [HttpPost("RefreshToken")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> RefreshToken([FromBody] TokenModel tokenModel)
        {
            try
            {
                var principal = _tokenService.GetPrincipalFromExpiredToken(tokenModel.AccessToken);
                if (principal.Identity == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Expired token invalid.");
                }

                // Only portal tokens are refreshable on this endpoint — reject a
                // manager token that happens to be presented here.
                var portalType = principal.FindFirst(PortalAuth.PortalTypeClaim)?.Value;
                if (portalType != PortalAuth.Employee)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Token is not an employee portal token.");
                }

                var username = principal.Identity.Name;
                var tokenInfo = await _tokenService.GetTokenForUser(username);
                if (_tokenService.ShouldRejectToken(tokenInfo, tokenModel.RefreshToken))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Refresh token invalid, please sign in again.");
                }

                var newAccessToken = _tokenService.GeneratePortalAccessToken(principal.Claims);
                var newRefreshToken = _tokenService.GenerateRefreshToken();

                tokenInfo!.RefreshToken = newRefreshToken;
                await _tokenService.Update(tokenInfo);

                return Ok(new TokenModel
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal refresh token failed");
                return Problem(title: "Error 5002");
            }
        }

        [HttpGet("ValidateToken")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public ValueTask<bool> ValidateToken() => ValueTask.FromResult(true);

        // ── Self-service ──────────────────────────────────────────────────────

        [HttpGet("Me")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> Me(CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetAccountId(out var accountId))
                {
                    return Unauthorized();
                }

                var me = await _portalService.GetMe(accountId, cancellationToken);
                return me == null ? NotFound() : Ok(me);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal Me failed");
                return Problem(title: "Error 5003");
            }
        }

        [HttpGet("MyAbsences")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> MyAbsences(DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                var result = await _absenceService.GetPendingAndApprovedAbsencesForEmployee(employeeId, startDate, endDate, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal MyAbsences failed");
                return Problem(title: "Error 5004");
            }
        }

        [HttpGet("MyTeamAbsences")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> MyTeamAbsences(DateOnly start, DateOnly end, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                var result = await _portalService.GetMyTeamAbsences(employeeId, start, end, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal MyTeamAbsences failed");
                return Problem(title: "Error 5010");
            }
        }

        [HttpGet("MyAbsenceStats")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> MyAbsenceStats(int? year, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                var result = await _absenceService.GetEmployeeAbsenceStats(employeeId, year, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal MyAbsenceStats failed");
                return Problem(title: "Error 5005");
            }
        }

        [HttpGet("ShiftConfig")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> ShiftConfig(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _shiftService.GetConfigAsync(cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal ShiftConfig failed");
                return Problem(title: "Error 5011");
            }
        }

        [HttpGet("MyWeeklySchedule")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> MyWeeklySchedule([FromQuery] DateOnly weekStart, CancellationToken cancellationToken)
        {
            try
            {
                // The weekly schedule query already scopes by the tenant claim which
                // the portal token carries — so employees get only their own client's
                // roster. Filtering down to this employee is a concern of the caller.
                var result = await _shiftService.GetWeeklyScheduleAsync(weekStart, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal MyWeeklySchedule failed");
                return Problem(title: "Error 5006");
            }
        }

        [HttpPost("ReportUnavailability")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> ReportUnavailability([FromBody] ReportUnavailabilityDto dto, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                await _shiftService.ReportUnavailabilityAsync(dto.ShiftId, employeeId, dto.Date, cancellationToken);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal ReportUnavailability failed");
                return Problem(title: "Error 5007");
            }
        }

        [HttpDelete("CancelUnavailability")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> CancelUnavailability([FromQuery] Guid shiftId, [FromQuery] DateOnly date, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                await _shiftService.CancelUnavailabilityAsync(shiftId, employeeId, date, cancellationToken);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal CancelUnavailability failed");
                return Problem(title: "Error 5008");
            }
        }

        // ── Shift swap ────────────────────────────────────────────────────────

        [HttpPost("RequestShiftSwap")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> RequestShiftSwap([FromBody] RequestShiftSwapDto dto, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                var id = await _shiftService.RequestShiftSwapAsync(employeeId, dto, cancellationToken);
                return Ok(new { id });
            }
            catch (Exception ex) when (ex.Message.StartsWith("Error 3"))
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal RequestShiftSwap failed");
                return Problem(title: "Error 5013");
            }
        }

        [HttpGet("MySwapRequests")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> MySwapRequests(CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                var result = await _shiftService.GetMySwapRequestsAsync(employeeId, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal MySwapRequests failed");
                return Problem(title: "Error 5014");
            }
        }

        [HttpPost("RespondToSwapRequest/{id:guid}")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> RespondToSwapRequest(Guid id, [FromBody] RespondToShiftSwapDto dto, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                await _shiftService.RespondToSwapRequestAsync(id, employeeId, dto.Accept, cancellationToken);
                return Ok();
            }
            catch (Exception ex) when (ex.Message.StartsWith("Error 3"))
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal RespondToSwapRequest failed");
                return Problem(title: "Error 5015");
            }
        }

        [HttpPost("CancelSwapRequest/{id:guid}")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> CancelSwapRequest(Guid id, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                {
                    return Unauthorized();
                }

                await _shiftService.CancelSwapRequestAsync(id, employeeId, cancellationToken);
                return Ok();
            }
            catch (Exception ex) when (ex.Message.StartsWith("Error 3"))
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal CancelSwapRequest failed");
                return Problem(title: "Error 5016");
            }
        }

        // ── Absence self-service ──────────────────────────────────────────────

        [HttpGet("GetAbsenceTypesForSelect")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public IActionResult GetAbsenceTypesForSelect()
        {
            try
            {
                return Ok(_employeeService.GetAbsenceTypes());
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal GetAbsenceTypesForSelect failed");
                return Problem(title: "Error 5020");
            }
        }

        [HttpPost("CreateAbsence")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> CreateAbsence([FromBody] CreateAbsenceDto createAbsence, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                    return Unauthorized();

                // Enforce that the portal user can only submit absences for themselves.
                if (createAbsence.EmployeeId != employeeId)
                    return Forbid();

                await _absenceService.CreateAbsence(createAbsence, cancellationToken);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal CreateAbsence failed");
                return Problem(title: "Error 5021", detail: ex.Message);
            }
        }

        [HttpGet("PreviewAbsenceImpact")]
        [Authorize(Policy = PortalAuth.EmployeePortalPolicy)]
        public async Task<IActionResult> PreviewAbsenceImpact(DateOnly startDate, DateOnly endDate, Common.Contracts.Enums.AbsenceType type, CancellationToken cancellationToken)
        {
            try
            {
                if (!TryGetEmployeeId(out var employeeId))
                    return Unauthorized();

                var result = await _absenceService.PreviewImpact(employeeId, startDate, endDate, type, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal PreviewAbsenceImpact failed");
                return Problem(title: "Error 5022", detail: ex.Message);
            }
        }

        // ── Manager-only provisioning ─────────────────────────────────────────

        /// <summary>
        /// One-time bulk provisioning of portal accounts for employees that existed
        /// before the portal was launched. Returns the generated credentials so the
        /// manager can distribute them — the plaintext passwords are never stored
        /// and this response is the only moment they can be retrieved.
        /// </summary>
        [HttpPost("BulkProvision")]
        [Authorize(Policy = PortalAuth.ManagerPolicy)]
        public async Task<IActionResult> BulkProvision(CancellationToken cancellationToken)
        {
            try
            {
                var issued = await _portalService.BulkProvisionExistingEmployees(cancellationToken);
                return Ok(new
                {
                    Provisioned = issued.Count,
                    Credentials = issued
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal BulkProvision failed");
                return Problem(title: "Error 5009");
            }
        }

        /// <summary>
        /// Generates a fresh temporary password for an employee's portal account,
        /// invalidates any outstanding refresh token, and returns the one-time
        /// plaintext credentials. Scoped to the current tenant.
        /// </summary>
        [HttpPost("ResetEmployeePassword/{employeeId:guid}")]
        [Authorize(Policy = PortalAuth.ManagerPolicy)]
        public async Task<IActionResult> ResetEmployeePassword(Guid employeeId, CancellationToken cancellationToken)
        {
            try
            {
                var credentials = await _portalService.ResetEmployeePassword(employeeId, cancellationToken);
                if (credentials == null)
                {
                    return NotFound();
                }
                return Ok(credentials);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Employee portal ResetEmployeePassword failed");
                return Problem(title: "Error 5012");
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private bool TryGetAccountId(out Guid accountId)
        {
            var value = User.FindFirst(PortalAuth.EmployeeAccountIdClaim)?.Value
                        ?? User.FindFirst(ClaimConstants.NameIdentifierId)?.Value;
            return Guid.TryParse(value, out accountId);
        }

        private bool TryGetEmployeeId(out Guid employeeId)
        {
            var value = User.FindFirst(PortalAuth.EmployeeIdClaim)?.Value;
            return Guid.TryParse(value, out employeeId);
        }
    }
}
