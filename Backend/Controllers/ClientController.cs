using System;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using Iwos.Common.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Serilog;

namespace Iwos.Controllers
{
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    [Authorize]
    public class ClientController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IClientService _clientService;

        public ClientController(ILogger logger, IClientService clientService)
        {
            _logger = logger;
            _clientService = clientService;
        }

        [HttpGet("GetOverview")]
        public async Task<IActionResult> GetOverview(CancellationToken ct)
        {
            try
            {
                var overview = await _clientService.GetOverviewAsync(ct);
                if (overview == null)
                {
                    return NotFound();
                }
                return Ok(overview);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Failed to get client overview");
                return Problem(statusCode: StatusCodes.Status500InternalServerError, title: "Error 4001: Failed to load client overview", detail: ex.Message);
            }
        }
    }
}
