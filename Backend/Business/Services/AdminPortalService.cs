using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Auth orchestration for the internal admin portal (Iwos staff only).
    ///
    /// Admin accounts live in <see cref="Data.Model.AdminUser"/> and are fully
    /// isolated from <see cref="Data.Model.ApplicationUser"/> (managers) and
    /// <see cref="Data.Model.EmployeeAccount"/> (employee portal) — there is no
    /// ClientId/tenant on this entity at all. Tokens issued here carry
    /// <c>portal_type=admin</c> and explicitly carry no <c>tid</c> claim, so they
    /// are rejected by every manager/employee endpoint via the default
    /// <c>ManagerOnly</c> policy and the <c>EmployeePortalOnly</c> policy.
    /// </summary>
    public sealed class AdminPortalService : IAdminPortalService
    {
        private readonly ITokenService _tokenService;
        private readonly IPasswordProvider _passwordProvider;
        private readonly IwosDbContext _context;

        public AdminPortalService(
            ITokenService tokenService,
            IPasswordProvider passwordProvider,
            IwosDbContext context)
        {
            _tokenService = tokenService;
            _passwordProvider = passwordProvider;
            _context = context;
        }

        public async Task<TokenModel?> Login(AdminLoginDto loginDto, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(loginDto.Username) || string.IsNullOrWhiteSpace(loginDto.Password))
            {
                return null;
            }

            // Login must resolve the account before any tenant context exists (and
            // admins have no tenant at all), so we query AdminUsers directly,
            // explicitly ignoring query filters for consistency with the other
            // portal login flows even though AdminUser has no filter configured.
            var admin = await _context.AdminUsers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Username == loginDto.Username && a.Active, cancellationToken);

            if (admin == null)
            {
                return null;
            }

            if (!_passwordProvider.AreHashsEquals(admin.PasswordHash, loginDto.Password))
            {
                return null;
            }

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Jti, Guid.CreateVersion7().ToString()),
                new(ClaimConstants.NameIdentifierId, admin.Id.ToString()),
                new(ClaimConstants.Name, admin.Username),
                new(PortalAuth.PortalTypeClaim, PortalAuth.Admin),
                new(PortalAuth.AdminUserIdClaim, admin.Id.ToString()),
                new("firstName", admin.FirstName),
                new("lastName", admin.LastName)
                // Intentionally NO tid/TenantId claim — admins are not tenant-scoped.
            };

            var accessToken = _tokenService.GenerateAdminAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();

            await _tokenService.AddOrUpdateRefreshToken(admin.Username, refreshToken);

            return new TokenModel
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        public async Task<bool> ChangePassword(Guid adminUserId, AdminChangePasswordDto dto, CancellationToken cancellationToken = default)
        {
            var admin = await _context.AdminUsers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Id == adminUserId && a.Active, cancellationToken);

            if (admin == null)
            {
                return false;
            }

            if (!_passwordProvider.AreHashsEquals(admin.PasswordHash, dto.OldPassword))
            {
                return false;
            }

            admin.PasswordHash = _passwordProvider.GetPasswordHash(dto.NewPassword);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
