using System.Threading.Tasks;
using System;
using Iwos.Common.DTOs;

namespace Iwos.Common.Contracts
{
    public interface IUserService
    {
        Task<bool> AddUser(UserModelDto user);
        Task<UserDto?> GetActiveUser(string username, string password);
        bool IsDtoValid(UserModelDto user);
        Task<bool> Exist(string username);
        Task<bool> IsActive(Guid userId);
        Task<bool> ChangePassword(ChangePasswordDto changePasswordDto); 
	}
}
