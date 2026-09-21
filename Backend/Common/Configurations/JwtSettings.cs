namespace Iwos.Common.Configurations
{
    public record JwtSettings
    {
        public int ExpirationInDays { get; init; }
        public string? Issuer { get; init; }
        public string? Audience { get; init; }
        public string? PortalAudience { get; init; }
        public string? AdminAudience { get; init; }
        public string? JwtSecretKey { get; init; }
        public int AccessTokenExpirationInMinutes { get; init; }
        public int PortalAccessTokenExpirationInMinutes { get; init; }
        public int AdminAccessTokenExpirationInMinutes { get; init; }
    }
}
