using System.Collections.Generic;
using System;

namespace Iwos.Common.DTOs
{
	public class CreateEmployeeDto
	{
		public Guid Id { get; set; }
		public string? ContactEmail { get; set; }
		public required string FirstName { get; set; }
		public required string LastName { get; set; }
		public string? PersonalId { get; set; }
		public byte? ContractType { get; set; }
		public string? Country { get; set; }
		public DateOnly? BirthDate { get; set; }
		public int? AnnualVacationDays { get; set; }
		public int? CarriedOverVacationDays { get; set; }
		public Guid PositionId { get; set; }
		public Guid? RotationPatternId { get; set; }
		public int WeeklyHours { get; set; } = 40;
		public int WeeklyDays { get; set; } = 5;
		public List<NoteDto>? Notes { get; set; }
	}
}
