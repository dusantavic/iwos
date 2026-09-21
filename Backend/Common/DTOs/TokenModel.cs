namespace Iwos.Common.DTOs
{
    public record TokenModel
    {
        public required string AccessToken { get; init; }

        public required string RefreshToken { get; init; }
    }
}
