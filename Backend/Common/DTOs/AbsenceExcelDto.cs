using System;

namespace Iwos.Common.DTOs
{
	public class AbsenceExcelDto
	{
		public required string EmployeeFullName { get; set; }
		public required string EmployeeIdentifier { get; set;}
		public required string Department { get; set; }
		public required string AbsenceType { get; set; }
		public required string DeductsDays { get; set; }
		public required DateTime StartDate { get; set; }	
		public required DateTime EndDate { get; set; }
		public required int TotalDays { get; set; }
		public required string Status { get; set; }
		public required DateTime RequestedAt { get; set; }
		public DateTime? ProcessedAt { get; set; }

	}
}
