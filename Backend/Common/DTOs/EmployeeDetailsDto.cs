using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class EmployeeDetailsDto
	{
		public Guid Id { get; set; }
		public string? ContactEmail { get; set; }
		public required string FirstName { get; set; }
		public required string LastName { get; set; }
		public string? PersonalId { get; set; }
		public string? ContractType { get; set; }
		public string? Country { get; set; }
		public DateOnly? BirthDate { get; set; }
		public required string Position { get; set; }
		public required Guid PositionId { get; set; }
		public required string Department { get; set; }
		public required Guid DepartmentId { get; set; }
		public List<NoteDto>? Notes { get; set; }
		public List<ToDoDto>? ToDos { get; set; }
		public int WeeklyHours { get; set; }
		public int WeeklyDays { get; set; }
		public Guid? RotationPatternId { get; set; }
		public Guid? PinnedShiftId { get; set; }
		public string? RotationAnchorDate { get; set; }
	}
}
