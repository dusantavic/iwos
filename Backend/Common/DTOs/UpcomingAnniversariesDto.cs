using System;

namespace Iwos.Common.DTOs
{
	public class UpcomingAnniversariesDto
	{
		public Guid EmployeeId { get; set; }
		public required string FullName { get; set; }
		public required DateOnly AnniversaryDate { get; set; }
		public required string Type { get; set; }
		public required Guid ClientId { get; set; }
		public string? ProfilePictureSrc { get; set; }

	}
}
