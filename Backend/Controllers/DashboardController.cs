using Asp.Versioning;
using Iwos.Common.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IDashboardService _dashboardService;

        public DashboardController(ILogger logger, IDashboardService dashboardService)
        {
            _logger = logger;
            _dashboardService = dashboardService;
        }

        [HttpGet("GetOverviewKpis")]
        public async Task<IActionResult> GetOverviewKpis(CancellationToken ct)
        {
            try
            {
                var result = await _dashboardService.GetOverviewKpisAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load dashboard overview KPIs");
                return Problem(title: "Error 4001: Failed to load dashboard overview KPIs", detail: ex.Message);
            }
        }

        [HttpGet("GetTodayShiftCoverage")]
        public async Task<IActionResult> GetTodayShiftCoverage(CancellationToken ct)
        {
            try
            {
                var result = await _dashboardService.GetTodayShiftCoverageAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load today's shift coverage");
                return Problem(title: "Error 4002: Failed to load today's shift coverage", detail: ex.Message);
            }
        }

        [HttpGet("GetWeekCoverageBreakdown")]
        public async Task<IActionResult> GetWeekCoverageBreakdown([FromQuery] DateOnly? weekStart, CancellationToken ct)
        {
            try
            {
                var result = await _dashboardService.GetWeekCoverageBreakdownAsync(weekStart, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load week coverage breakdown");
                return Problem(title: "Error 4003: Failed to load week coverage breakdown", detail: ex.Message);
            }
        }

        [HttpGet("GetWorkingHoursSummary")]
        public async Task<IActionResult> GetWorkingHoursSummary([FromQuery] DateOnly? weekStart, CancellationToken ct)
        {
            try
            {
                var result = await _dashboardService.GetWorkingHoursSummaryAsync(weekStart, ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load working hours summary");
                return Problem(title: "Error 4004: Failed to load working hours summary", detail: ex.Message);
            }
        }

        [HttpGet("GetConfigurationSnapshot")]
        public async Task<IActionResult> GetConfigurationSnapshot(CancellationToken ct)
        {
            try
            {
                var result = await _dashboardService.GetConfigurationSnapshotAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to load configuration snapshot");
                return Problem(title: "Error 4005: Failed to load configuration snapshot", detail: ex.Message);
            }
        }
    }
}
