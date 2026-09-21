using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Auth and self-service orchestration for the employee portal.
    ///
    /// Employee accounts live in <see cref="EmployeeAccount"/> and are intentionally
    /// separate from <see cref="ApplicationUser"/> (which represents managers only).
    /// Tokens issued here carry <c>portal_type=employee</c> so they are rejected by
    /// every manager endpoint via the default <c>ManagerOnly</c> policy.
    /// </summary>
    public sealed class EmployeePortalService : IEmployeePortalService
    {
        private readonly IEmployeeAccountRepository _employeeAccountRepository;
        private readonly ITokenService _tokenService;
        private readonly IPasswordProvider _passwordProvider;
        private readonly IAbsenceService _absenceService;
        private readonly IwosDbContext _context;

        public EmployeePortalService(
            IEmployeeAccountRepository employeeAccountRepository,
            ITokenService tokenService,
            IPasswordProvider passwordProvider,
            IAbsenceService absenceService,
            IwosDbContext context)
        {
            _employeeAccountRepository = employeeAccountRepository;
            _tokenService = tokenService;
            _passwordProvider = passwordProvider;
            _absenceService = absenceService;
            _context = context;
        }

        public async Task<TokenModel?> Login(EmployeePortalLoginDto loginDto, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(loginDto.Username) || string.IsNullOrWhiteSpace(loginDto.Password))
            {
                return null;
            }

            // Login must resolve the account before any tenant context exists, so we
            // query EmployeeAccounts directly — the entity has no tenant query filter.
            var account = await _context.EmployeeAccounts
                .Include(a => a.Employee)
                    .ThenInclude(e => e.Position)
                .Include(a => a.Client)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.Username == loginDto.Username && a.Active, cancellationToken);

            if (account == null)
            {
                return null;
            }

            if (!_passwordProvider.AreHashsEquals(account.PasswordHash, loginDto.Password))
            {
                return null;
            }

            var profilePictureSrc = ResolveProfilePicture(account.EmployeeId);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Jti, Guid.CreateVersion7().ToString()),
                new(ClaimConstants.NameIdentifierId, account.Id.ToString()),
                new(ClaimConstants.Name, account.Username),
                new(ClaimConstants.TenantId, account.ClientId.ToString()),
                new(PortalAuth.PortalTypeClaim, PortalAuth.Employee),
                new(PortalAuth.EmployeeAccountIdClaim, account.Id.ToString()),
                new(PortalAuth.EmployeeIdClaim, account.EmployeeId.ToString()),
                new("firstName", account.Employee.FirstName),
                new("lastName", account.Employee.LastName),
                new("profilePictureSrc", profilePictureSrc)
            };

            var accessToken = _tokenService.GeneratePortalAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();

            await _tokenService.AddOrUpdateRefreshToken(account.Username, refreshToken);

            account.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new TokenModel
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        public async Task<EmployeePortalMeDto?> GetMe(Guid employeeAccountId, CancellationToken cancellationToken = default)
        {
            var account = await _context.EmployeeAccounts
                .Include(a => a.Employee)
                    .ThenInclude(e => e.Position)
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == employeeAccountId && a.Active, cancellationToken);

            if (account == null)
            {
                return null;
            }

            return new EmployeePortalMeDto
            {
                EmployeeId = account.EmployeeId,
                Username = account.Username,
                FirstName = account.Employee.FirstName,
                LastName = account.Employee.LastName,
                ContactEmail = account.Employee.ContactEmail,
                ProfilePictureSrc = ResolveProfilePicture(account.EmployeeId),
                PositionName = account.Employee.Position.Title
            };
        }

        public async Task<EmployeeCredentialsDto> CreateAccountForEmployee(Employee employee, CancellationToken cancellationToken = default)
        {
            var clientCode = await _context.Clients
				.IgnoreQueryFilters()
                .Where(c => c.Id == employee.ClientId)
                .Select(c => c.Code)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new InvalidOperationException($"Client code for client id: {employee.ClientId} not found while provisioning employee portal account.");

            var username = await GenerateUniqueUsername(clientCode, employee.FirstName, employee.LastName, cancellationToken);
            var temporaryPassword = GenerateTemporaryPassword();

            var account = new EmployeeAccount
            {
                Id = Guid.CreateVersion7(),
                EmployeeId = employee.Id,
                ClientId = employee.ClientId,
                Username = username,
                PasswordHash = _passwordProvider.GetPasswordHash(temporaryPassword),
                Active = true,
                CreatedAt = DateTime.UtcNow
            };

            await _employeeAccountRepository.Add(account, cancellationToken);

            return new EmployeeCredentialsDto
            {
                EmployeeId = employee.Id,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                Username = username,
                TemporaryPassword = temporaryPassword
            };
        }

        public async Task<List<AbsenceDto>> GetMyTeamAbsences(Guid employeeId, DateOnly start, DateOnly end, CancellationToken cancellationToken = default)
        {
            // Resolve the caller's department from their position so that the employee
            // cannot pass an arbitrary departmentId and peek at other teams.
            var departmentId = await _context.Set<Employee>()
                .Where(e => e.Id == employeeId)
                .Select(e => (Guid?)e.Position.DepartmentId)
                .FirstOrDefaultAsync(cancellationToken);

            if (departmentId == null)
            {
                return new List<AbsenceDto>();
            }

            return await _absenceService.GetAllApprovedAndPendingAbsences(start, end, departmentId, cancellationToken);
        }

        public async Task<List<EmployeeCredentialsDto>> BulkProvisionExistingEmployees(CancellationToken cancellationToken = default)
        {
            // Tenant query filter on Employee scopes this to the caller's client.
            var employeesWithoutAccount = await _context.Set<Employee>()
                .Include(e => e.Client)
                .Where(e => !_context.EmployeeAccounts
                    .IgnoreQueryFilters()
                    .Any(a => a.EmployeeId == e.Id))
                .OrderBy(e => e.LastName)
                .ThenBy(e => e.FirstName)
                .ToListAsync(cancellationToken);

            var issued = new List<EmployeeCredentialsDto>(employeesWithoutAccount.Count);
            foreach (var employee in employeesWithoutAccount)
            {
                var credentials = await CreateAccountForEmployee(employee, cancellationToken);
                issued.Add(credentials);
            }

            return issued;
        }

        public async Task<EmployeeCredentialsDto?> ResetEmployeePassword(Guid employeeId, CancellationToken cancellationToken = default)
        {
            // Employee query is tenant-filtered, so an attempt to reset a password
            // for another client's employee resolves to null and is rejected.
            var employee = await _context.Set<Employee>()
                .FirstOrDefaultAsync(e => e.Id == employeeId, cancellationToken);

            if (employee == null)
            {
                return null;
            }

            var account = await _context.EmployeeAccounts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId, cancellationToken);

            if (account == null)
            {
                return null;
            }

            var temporaryPassword = GenerateTemporaryPassword();
            account.PasswordHash = _passwordProvider.GetPasswordHash(temporaryPassword);
            account.Active = true;

            await _context.SaveChangesAsync(cancellationToken);

            // Invalidate any outstanding refresh token for this username so that
            // an attacker who held a stale refresh token cannot regain access
            // after a password reset.
            var existingRefresh = await _tokenService.GetTokenForUser(account.Username);
            if (existingRefresh != null)
            {
                existingRefresh.Revoked = true;
                existingRefresh.RefreshToken = string.Empty;
                await _tokenService.Update(existingRefresh);
            }

            return new EmployeeCredentialsDto
            {
                EmployeeId = employee.Id,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                Username = account.Username,
                TemporaryPassword = temporaryPassword
            };
        }

        private async Task<string> GenerateUniqueUsername(string clientCode, string firstName, string lastName, CancellationToken cancellationToken)
        {
            var baseUsername = BuildUsernameBase(clientCode, firstName, lastName);

            var candidate = baseUsername;
            var suffix = 1;
            while (await _context.EmployeeAccounts
                .IgnoreQueryFilters()
                .AnyAsync(a => a.Username == candidate, cancellationToken))
            {
                suffix++;
                candidate = $"{baseUsername}{suffix}";
            }

            return candidate;
        }

        private static string BuildUsernameBase(string clientCode, string firstName, string lastName)
        {
            return $"{Slugify(clientCode)}.{Slugify(firstName)}.{Slugify(lastName)}";
        }

        private static string Slugify(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            // Strip diacritics so "Đorđević" -> "dordevic".
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);
            foreach (var ch in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (category == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                if (char.IsLetterOrDigit(ch))
                {
                    builder.Append(char.ToLowerInvariant(ch));
                }
            }

            return builder.ToString();
        }

        private static string GenerateTemporaryPassword()
        {
            // 12 url-safe characters from cryptographic randomness. Avoids confusable
            // characters (0/O, 1/l/I) so managers can read the password aloud.
            const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
            Span<byte> buffer = stackalloc byte[12];
            RandomNumberGenerator.Fill(buffer);

            var result = new char[12];
            for (var i = 0; i < 12; i++)
            {
                result[i] = alphabet[buffer[i] % alphabet.Length];
            }
            return new string(result);
        }

        private static string ResolveProfilePicture(Guid employeeId)
        {
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "thumbnails");
            var fileName = $"employee_{employeeId}.jpg";
            var filePath = Path.Combine(uploadsPath, fileName);
            return System.IO.File.Exists(filePath) ? $"uploads/thumbnails/employee_{employeeId}.jpg" : string.Empty;
        }
    }
}
