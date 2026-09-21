using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class TodayAvailabilityDto
	{
		public required double OverallAvailability { get; set; }
		public required List<DepartmentTodayAvailabilityDto> DepartmentsAvailabilities { get; set; }
	}

	public class DepartmentTodayAvailabilityDto
	{
		public required string DepartmentName { get; set; }
		public required int TotalCount { get; set; }
		public required int ActiveTodayCount { get; set; }
	}
}
