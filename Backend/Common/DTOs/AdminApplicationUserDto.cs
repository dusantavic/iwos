using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
    public class AdminApplicationUserDto
    {
        public Guid Id { get; set; }
        public required string UserName { get; set; }
        public required string Email { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public UserType Type { get; set; }
        public bool Active { get; set; }
        public DateTime CreatedOn { get; set; }
    }

    /// <summary>
    /// Maps 1:1 onto <see cref="UserModelDto"/> so the admin portal can reuse
    /// <see cref="Iwos.Common.Contracts.IUserService.AddUser"/> as-is rather than
    /// re-implementing user creation/hashing. <c>Type</c> is intentionally not
    /// settable here — it follows the same default (<c>UserType.Temporary</c>)
    /// that the existing registration flow produces.
    /// </summary>
    public class CreateApplicationUserDto
    {
        public required string UserName { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
    }
}
