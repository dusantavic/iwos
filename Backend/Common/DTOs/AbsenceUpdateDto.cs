using System;

namespace Iwos.Common.DTOs
{
	public class AbsenceUpdateDto
	{
		public required Guid EmployeeId { get; set; }
		public required string EmployeeFullName { get; set; }	
		public string? EmployeeProfilePic { get; set; }
		public required string Type { get; set; }
		public required int WorkingDays { get; set; }
		public required DateTime UpdatedDateTime { get; set; }
		public required string Status { get; set; }
		public required DateOnly Start { get; set; }
		public required DateOnly End { get; set; }
	}
}
