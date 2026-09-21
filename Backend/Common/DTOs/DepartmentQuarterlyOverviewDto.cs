namespace Iwos.Common.DTOs
{
	public class DepartmentQuarterlyOverviewDto
	{
		public required string Title { get; set; }
		public required int TotalEmployeesPast { get; set; }
		public required int TotalEmployeesCurrent { get; set; }
	}
}
