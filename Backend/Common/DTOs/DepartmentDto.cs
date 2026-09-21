using System;

namespace Iwos.Common.DTOs
{
	public class DepartmentDto
	{
		public required Guid Id { get; set; }
		public required string Title { get; set; }
		public string? Head { get; set; }
		public required int TotalEmployees { get; set; }
		public required decimal EmployeeShare { get; set; }
	}
}
