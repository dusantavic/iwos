namespace Iwos.Common.DTOs.DashboardStatsDtos
{
	public class LargestDepartmentDto
	{
		public required string Name { get; set; }
		public string? Head { get; set; }
		public required int EmployeesCount { get; set; }
	}
}
