using System;

namespace Iwos.Common.DTOs
{
	public class DepartmentHeadDto
	{
		public required Guid Id { get; set; }
		public required string FullName { get; set; }
		public required string DepartmentTitle { get; set; }
		public DateOnly? CurrentHeadAssignmentDate { get; set; }
		public string? ProfilePictureSrc { get; set; }

	}
}
