using System;

namespace Iwos.Common.DTOs
{
	public class AbsenceDto
	{
		public required Guid Id { get; set; }
		public required string EmployeeFullName { get; set; }
		public required string EmployeePosition { get; set; }
		public required Guid EmployeeId { get; set; }
		public required DateOnly Start { get; set; }
		public required DateOnly End { get; set; }
		public required string Type { get; set; }
		public required string Status { get; set; }
		public int WorkingDays { get; set; }
		public decimal WorkingHours { get; set; }
	}
}
