using Iwos.Common.Configurations;
using Iwos.Common.Contracts;
using Iwos.Data.Model;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Discriminates which audience/expiry a token should be issued for.
    /// Manager and Portal preserve the original boolean's behavior exactly;
    /// Admin is the new internal-admin-portal audience.
    /// </summary>
    internal enum TokenAudienceKind
    {
        Manager,
        Portal,
        Admin
    }

    public sealed class TokenService : ITokenService
    {
        private readonly ITokenRepository _tokenRepository;

        public TokenService(ITokenRepository tokenRepository)
        {
            _tokenRepository = tokenRepository;
        }

        public string GenerateAccessToken(IEnumerable<Claim> claims)
        {
            return GenerateAccessTokenInternal(claims, TokenAudienceKind.Manager);
        }

        public string GeneratePortalAccessToken(IEnumerable<Claim> claims)
        {
            return GenerateAccessTokenInternal(claims, TokenAudienceKind.Portal);
        }

        public string GenerateAdminAccessToken(IEnumerable<Claim> claims)
        {
            return GenerateAccessTokenInternal(claims, TokenAudienceKind.Admin);
        }

        private static string GenerateAccessTokenInternal(IEnumerable<Claim> claims, TokenAudienceKind audienceKind)
        {
            var jwtConfiguration = (ApplicationSettings.Instance?.JwtSettings) ?? throw new KeyNotFoundException("JwtSettings");
            var tokenHandler = new JwtSecurityTokenHandler();

            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfiguration.JwtSecretKey ?? string.Empty));

            var expirationMinutes = audienceKind switch
            {
                TokenAudienceKind.Manager => jwtConfiguration.AccessTokenExpirationInMinutes,
                TokenAudienceKind.Portal => jwtConfiguration.PortalAccessTokenExpirationInMinutes > 0
                    ? jwtConfiguration.PortalAccessTokenExpirationInMinutes
                    : jwtConfiguration.AccessTokenExpirationInMinutes,
                TokenAudienceKind.Admin => jwtConfiguration.AdminAccessTokenExpirationInMinutes > 0
                    ? jwtConfiguration.AdminAccessTokenExpirationInMinutes
                    : 30,
                _ => jwtConfiguration.AccessTokenExpirationInMinutes
            };

            var audience = audienceKind switch
            {
                TokenAudienceKind.Manager => jwtConfiguration.Audience,
                TokenAudienceKind.Portal => jwtConfiguration.PortalAudience ?? jwtConfiguration.Audience,
                TokenAudienceKind.Admin => jwtConfiguration.AdminAudience ?? jwtConfiguration.Audience,
                _ => jwtConfiguration.Audience
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Issuer = jwtConfiguration.Issuer,
                Audience = audience,
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.Now.AddMinutes(expirationMinutes),
                SigningCredentials = new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];

            using var randomNumberGenerator = RandomNumberGenerator.Create();
            randomNumberGenerator.GetBytes(randomNumber);

            return Convert.ToBase64String(randomNumber);
        }

        public ClaimsPrincipal GetPrincipalFromExpiredToken(string accessToken)
        {
            var jwtConfiguration = ApplicationSettings.Instance?.JwtSettings ?? throw new KeyNotFoundException("JwtSettings");

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidAudience = jwtConfiguration.Audience,
                ValidIssuer = jwtConfiguration.Issuer,
                ValidateLifetime = false,
                ClockSkew = TimeSpan.Zero,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfiguration.JwtSecretKey ?? string.Empty))
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            // Validate the token and extract the claims principal and the security token.
            var principal = tokenHandler.ValidateToken(accessToken, tokenValidationParameters, out var securityToken);

            // Ensure the token is a valid JWT and uses the HmacSha256 signing algorithm.
            // If no throw new SecurityTokenException
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                throw new SecurityTokenException("Invalid token");
            }

            return principal;
        }

        public async Task AddOrUpdateRefreshToken(string userName, string refreshToken)
        {
            var entity = await _tokenRepository.GetToken(t => t.Username == userName);
            var jwtConfiguration = ApplicationSettings.Instance?.JwtSettings ?? throw new KeyNotFoundException("JwtSettings");

            if (entity == null)
            {
                var tokenInfo = new TokenInfo
                {
                    Username = userName,
                    RefreshToken = refreshToken,
                    ExpiredAt = DateTime.UtcNow.AddDays(jwtConfiguration.ExpirationInDays),
                    Revoked = false
                };

                await _tokenRepository.Add(tokenInfo);
            }
            else
            {
                entity.RefreshToken = refreshToken;
                entity.ExpiredAt = DateTime.UtcNow.AddDays(jwtConfiguration.ExpirationInDays);
                entity.Revoked = false;
                await _tokenRepository.Update(entity);
            }
        }

        public async Task Update(TokenInfo tokenInfo)
        {
            await _tokenRepository.Update(tokenInfo);
        }

        // Method semantics: returns TRUE when the token should be REJECTED.
        // Reject when: row missing, token mismatch, expired, or server-side revoked.
        public bool ShouldRejectToken(TokenInfo? tokenInfo, string refreshToken)
        {
            return tokenInfo == null ||
                tokenInfo.Revoked ||
                tokenInfo.RefreshToken != refreshToken ||
                tokenInfo.ExpiredAt <= DateTime.UtcNow;
        }

        public async Task<TokenInfo?> GetTokenForUser(string? username)
        {
            return await _tokenRepository.GetToken(u => u.Username == username);
        }
    }
}
