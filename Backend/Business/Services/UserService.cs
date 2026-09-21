using AutoMapper;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Iwos.Data.Model;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    public sealed class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;
        private readonly IPasswordProvider _passwordProvider;
        private readonly IShiftService _shiftService;
        private readonly IwosDbContext _context;

        public UserService(IUserRepository userRepository, IMapper mapper, IPasswordProvider passwordProvider, IShiftService shiftService, IwosDbContext context)
        {
            _userRepository = userRepository;
            _mapper = mapper;
            _passwordProvider = passwordProvider;
            _shiftService = shiftService;
            _context = context;
        }

        public async Task<bool> AddUser(UserModelDto user)
        {
            var userToAdd = _mapper.Map<ApplicationUser>(user);
            userToAdd.PasswordHash = _passwordProvider.GetPasswordHash(user.Password);

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await _userRepository.Add(userToAdd);
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

		public async Task<bool> ChangePassword(ChangePasswordDto changePasswordDto)
        {
            var user = await _userRepository.Get(changePasswordDto.Id);

            if (user == null)
            {
                return false; 
            }

            if (!_passwordProvider.AreHashsEquals(user.PasswordHash!, changePasswordDto.OldPassword))
            {
                return false; 
            }

            user.PasswordHash = _passwordProvider.GetPasswordHash(changePasswordDto.NewPassword);
            await _userRepository.Update(user); 
            return true;
		}

        public async Task<UserDto?> GetActiveUser(string username, string password)
        {
            var user = await _userRepository.Get(u => u.UserName == username, false);
            return IsUserValid(user, password)
                ? _mapper.Map<UserDto>(user)
                : null;
        }

        public bool IsDtoValid(UserModelDto user)
        {
            return !string.IsNullOrWhiteSpace(user.Username) && !string.IsNullOrWhiteSpace(user.Password);
        }

        public async Task<bool> Exist(string username)
        {
            return await _userRepository.Exist(u => u.UserName == username);
        }

        public async Task<bool> IsActive(Guid userId)
        {
            return await _userRepository.IsActive(u => u.Id == userId);
        }

        private bool IsUserValid(ApplicationUser? user, string password)
        {
            return user is { Active: true } && 
                _passwordProvider.AreHashsEquals(user.PasswordHash ?? string.Empty, password);
        }
    }
}
