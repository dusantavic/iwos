using Asp.Versioning;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using System;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    /// <summary>
    /// Internal admin portal surface for Iwos staff. Everything here runs on
    /// the admin JWT audience and is gated by the
    /// <see cref="PortalAuth.AdminPortalPolicy"/> policy so manager and employee
    /// portal tokens cannot reach these endpoints.
    /// </summary>
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    public class AdminPortalController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IAdminPortalService _adminPortalService;
        private readonly ITokenService _tokenService;

        public AdminPortalController(
            ILogger logger,
            IAdminPortalService adminPortalService,
            ITokenService tokenService)
        {
            _logger = logger;
            _adminPortalService = adminPortalService;
            _tokenService = tokenService;
        }

        [HttpPost("Login")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> Login([FromBody] AdminLoginDto loginDto)
        {
            try
            {
                var tokens = await _adminPortalService.Login(loginDto);
                if (tokens == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Invalid username or password.");
                }
                return Ok(tokens);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin portal login failed");
                return Problem(title: "Error 6001");
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

                // Only admin tokens are refreshable on this endpoint — reject a
                // manager or employee portal token that happens to be presented here.
                var portalType = principal.FindFirst(PortalAuth.PortalTypeClaim)?.Value;
                if (portalType != PortalAuth.Admin)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Token is not an admin portal token.");
                }

                var username = principal.Identity.Name;
                var tokenInfo = await _tokenService.GetTokenForUser(username);
                if (_tokenService.ShouldRejectToken(tokenInfo, tokenModel.RefreshToken))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Refresh token invalid, please sign in again.");
                }

                var newAccessToken = _tokenService.GenerateAdminAccessToken(principal.Claims);
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
                _logger.Error(ex, "Admin portal refresh token failed");
                return Problem(title: "Error 6002");
            }
        }

        [HttpGet("ValidateToken")]
        [Authorize(Policy = PortalAuth.AdminPortalPolicy)]
        public ValueTask<bool> ValidateToken() => ValueTask.FromResult(true);

        [HttpPost("ChangePassword")]
        [Authorize(Policy = PortalAuth.AdminPortalPolicy)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChangePassword([FromBody] AdminChangePasswordDto dto)
        {
            try
            {
                var value = User.FindFirst(PortalAuth.AdminUserIdClaim)?.Value;
                if (!Guid.TryParse(value, out var adminUserId))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Unable to resolve admin user.");
                }

                var success = await _adminPortalService.ChangePassword(adminUserId, dto);
                if (!success)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Old password is incorrect.");
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin portal change password failed");
                return Problem(title: "Error 6003");
            }
        }
    }
}
