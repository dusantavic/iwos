namespace Iwos.Common.DTOs
{
    public record AdminLoginDto
    {
        public required string Username { get; init; }
        public required string Password { get; init; }
    }
}
