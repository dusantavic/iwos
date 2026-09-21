using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class DepartmentStatsDto
	{
		public required List<DepartmentStatsObject> DepartmentsData { get; set; }
		public required int TotalDepartments { get; set; }
		public required int Uniformity { get; set; }
	}

	public class DepartmentStatsObject
	{
		public required string Title { get; set; }
		public required int TotalEmployees { get; set; }
	}
}
