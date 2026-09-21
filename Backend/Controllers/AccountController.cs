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
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    public class AccountController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;

        public AccountController(ILogger logger, IUserService userService, ITokenService tokenService)
        {
            _logger = logger;
            _userService = userService;
            _tokenService = tokenService;
        }

        [HttpGet]
        [Route("GetTokenForUser")]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Get(string username, string password)
        {
            try
            {
                var user = await _userService.GetActiveUser(username, password);
                if (user == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Login failed (invalid username and/or password).");
                }

                string profilePictureSrc = string.Empty; 
				var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "thumbnails");
				var fileName = $"user_{user.Id}.jpg"; 
				var filePath = Path.Combine(uploadsPath, fileName);

				if (System.IO.File.Exists(filePath))
				{
                    profilePictureSrc = $"uploads/thumbnails/user_{user.Id}.jpg";
				}


				List<Claim> authClaims = [
                    // Unique identifier to prevent replay-attack, where an attacker attempt to use previously issued token to access the unauthorized resources
                    new (JwtRegisteredClaimNames.Jti, Guid.CreateVersion7().ToString()),
                    new (ClaimConstants.NameIdentifierId, user.Id),
                    new (ClaimConstants.Name, user.Username),
                    new (ClaimConstants.Role, user.Type.ToString()),
                    new (ClaimConstants.TenantId, user.ClientId.ToString()),
                    new (PortalAuth.PortalTypeClaim, PortalAuth.Manager),
                    new ("firstName", user.FirstName),
                    new ("lastName", user.LastName),
                    new ("profilePictureSrc", profilePictureSrc)
                ];

                var token = _tokenService.GenerateAccessToken(authClaims);
                var refreshToken = _tokenService.GenerateRefreshToken();

                await _tokenService.AddOrUpdateRefreshToken(username, refreshToken);

                return Ok(new TokenModel
                {
                    AccessToken = token,
                    RefreshToken = refreshToken
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Get Token failed");
                return Problem(title: "Error 1001");
            }
        }

        [HttpGet]
        [Authorize]
        [Route("IsActive/{userId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> IsActive(Guid userId)
        {
            try
            {
                var status = await _userService.IsActive(userId);
                return status
                    ? Ok(new ActiveUserDto
                    {
                        Status = true
                    })
                    : Ok(new ActiveUserDto
                    {
                        Status = false
                    });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "User active check failed");
                return Problem(title: "Error 1002");
            }
        }

        [HttpPost]
        [Route("RefreshToken")]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Refresh(TokenModel tokenModel)
        {
            try
            {
                var principal = _tokenService.GetPrincipalFromExpiredToken(tokenModel.AccessToken);
                if (principal.Identity == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Expired Token invalid.");
                }

                var username = principal.Identity.Name;

                var tokenInfo = await _tokenService.GetTokenForUser(username);
                if (_tokenService.ShouldRejectToken(tokenInfo, tokenModel.RefreshToken))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Expired Token invalid, please retrieve a token again.");
                }

                var newAccessToken = _tokenService.GenerateAccessToken(principal.Claims);
                var newRefreshToken = _tokenService.GenerateRefreshToken();

                tokenInfo.RefreshToken = newRefreshToken; // Rotating the refresh token
                await _tokenService.Update(tokenInfo);

                return CreatedAtAction(nameof(Refresh), new TokenModel
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Refresh Token failed");
                return Problem(title: "Error 1003");
            }
        }

        [HttpPost]
        [Route("RevokeToken")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Revoke()
        {
            try
            {
                var username = User.Identity?.Name;
                if (string.IsNullOrWhiteSpace(username))
                {
                    return Problem(statusCode: StatusCodes.Status401Unauthorized, detail: "Unauthorized request.");
                }

                var tokenInfo = await _tokenService.GetTokenForUser(username);
                if (tokenInfo == null)
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Invalid User or Token.");
                }

                tokenInfo.Revoked = true;
                tokenInfo.RefreshToken = string.Empty;
                await _tokenService.Update(tokenInfo);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Revoke Token failed");
                return Problem(title: "Error 1004");
            }
        }

        [HttpPost]
        [Route("RegisterUser")]
        [Authorize]
        [EnableRateLimiting("auth")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Register([FromBody] UserModelDto user)
        {
            try
            {
                if (user == null || !_userService.IsDtoValid(user))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Invalid user data.");
                }

                if (await _userService.Exist(user.Username))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: $"User {user.Username} already exists.");
                }

                var userAdded = await _userService.AddUser(user);

                return userAdded
                    ? CreatedAtAction(nameof(Register), null)
                    : Problem(statusCode: StatusCodes.Status500InternalServerError, detail: "User insert failed.");
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Register User failed");
                return Problem(title: "Error 1005");
            }
        }

		[HttpPost]
		[Route("ChangePassword")]
		[Authorize]
		[EnableRateLimiting("auth")]
		[ProducesResponseType(StatusCodes.Status201Created)]
		[ProducesResponseType(StatusCodes.Status400BadRequest)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
		{
			try
			{
				var passwordChanged = await _userService.ChangePassword(changePasswordDto); 

				return passwordChanged
					? CreatedAtAction(nameof(ChangePassword), null)
					: Problem(statusCode: StatusCodes.Status500InternalServerError, detail: "Password updated.");
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Change password failed");
				return Problem(title: "Error 1005");
			}
		}

		[HttpGet]
        [Route("ValidateToken")]
        [Authorize]
        public async ValueTask<bool> ValidateToken()
        {
            return await Task.FromResult(true);
        }
    }
}
