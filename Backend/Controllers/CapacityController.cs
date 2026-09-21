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
    public class CapacityController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly ICapacityService _capacityService;

        public CapacityController(ILogger logger, ICapacityService capacityService)
        {
            _logger = logger;
            _capacityService = capacityService;
        }

        [HttpGet("GetOverview")]
        public async Task<IActionResult> GetOverview(CancellationToken ct)
        {
            try
            {
                var result = await _capacityService.GetCapacityOverviewAsync(ct);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get capacity overview");
                return Problem(title: "Error 3090: Failed to get capacity overview", detail: ex.Message);
            }
        }
    }
}
