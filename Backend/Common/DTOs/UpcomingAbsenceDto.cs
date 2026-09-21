using System;

namespace Iwos.Common.DTOs
{
	public class UpcomingAbsenceDto
	{
		public Guid EmployeeId { get; set; }
		public required string FullName { get; set; }
		public required DateOnly Start { get; set; }
		public required DateOnly End { get; set; }
		public required string Type { get; set; }
		public string? ProfilePictureSrc { get; set; }
		public required string Label { get; set; }
	}
}
