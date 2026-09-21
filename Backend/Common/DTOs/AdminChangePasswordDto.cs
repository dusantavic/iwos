namespace Iwos.Common.DTOs
{
	public class AdminChangePasswordDto
	{
		public required string OldPassword { get; set; }
		public required string NewPassword { get; set; }
	}
}
