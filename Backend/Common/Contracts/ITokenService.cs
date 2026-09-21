using Iwos.Data.Model;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface ITokenService
    {
        string GenerateAccessToken(IEnumerable<Claim> claims);
        string GeneratePortalAccessToken(IEnumerable<Claim> claims);
        string GenerateAdminAccessToken(IEnumerable<Claim> claims);
        string GenerateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string accessToken);
        Task AddOrUpdateRefreshToken(string userName, string refreshToken);
        Task Update(TokenInfo tokenInfo);
        bool ShouldRejectToken(TokenInfo? tokenInfo, string refreshToken);
        Task<TokenInfo?> GetTokenForUser(string? username);
    }
}
