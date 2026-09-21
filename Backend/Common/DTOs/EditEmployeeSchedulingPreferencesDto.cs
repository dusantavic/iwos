using System;

namespace Iwos.Common.DTOs
{
	public class EditEmployeeSchedulingPreferencesDto
	{
		public required Guid EmployeeId { get; set; }
		public int WeeklyHours { get; set; }
		public int WeeklyDays { get; set; } = 5;
		public Guid? RotationPatternId { get; set; }
		public Guid? PinnedShiftId { get; set; }
		/// <summary>"yyyy-MM-dd" — first calendar day of the employee's current rotation on-block. Null clears the anchor.</summary>
		public string? RotationAnchorDate { get; set; }
	}
}
