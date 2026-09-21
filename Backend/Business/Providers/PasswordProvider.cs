using Iwos.Common.Contracts;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Identity;

namespace Iwos.Business.Providers
{
    public sealed class PasswordProvider : IPasswordProvider
    {
        public string GetPasswordHash(string password)
        {
            return new PasswordHasher<ApplicationUser>().HashPassword(null, password);
        }

        public bool AreHashsEquals(string hashedPassword, string providedPassword)
        {
            var result = new PasswordHasher<ApplicationUser>().VerifyHashedPassword(null, hashedPassword, providedPassword);
            return result != PasswordVerificationResult.Failed;
        }
    }
}
