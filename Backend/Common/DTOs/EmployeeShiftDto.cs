using System;

namespace Iwos.Common.DTOs
{
	public class EmployeeShiftDto
	{
		public Guid Id { get; set; }
		public required string FullName { get; set; }
		public Guid PositionId { get; set; }
		public required string Position { get; set; }
		public string? ProfilePictureSrc { get; set; }
		/// <summary>Contracted weekly working hours (default 40). Used for frontend shift-hour allocation tracking.</summary>
		public int WeeklyHours { get; set; } = 40;
		public Guid? RotationPatternId { get; set; }
	}
}
