using Iwos.Common.DTOs;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IAdminPortalService
    {
        Task<TokenModel?> Login(AdminLoginDto loginDto, CancellationToken cancellationToken = default);
        Task<bool> ChangePassword(Guid adminUserId, AdminChangePasswordDto dto, CancellationToken cancellationToken = default);
    }
}
