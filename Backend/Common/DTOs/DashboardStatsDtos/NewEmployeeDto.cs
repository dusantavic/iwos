using System;

namespace Iwos.Common.DTOs.DashboardStatsDtos
{
	public class NewEmployeeDto
	{
		public required Guid Id { get; set; }
		public required string FirstName { get; set; }
		public required string LastName { get; set; }
		public required string Email { get; set; }
		public required string Month { get; set; }
		public required string ProfilePictureSrc { get; set; }
	}
}
