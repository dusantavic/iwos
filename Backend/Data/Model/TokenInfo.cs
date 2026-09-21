using System;

namespace Iwos.Data.Model
{
    public class TokenInfo
    {
        public Guid Id { get; set; }

        public required string Username { get; set; }

        public required string RefreshToken { get; set; }

        public required DateTime ExpiredAt { get; set; }

        public bool Revoked { get; set; }
    }
}
