using System;

namespace Iwos.Common.DTOs
{
	public class CreatePositionDto
	{
		public required Guid DepartmentId { get; set; }
		public required string Title { get; set; }
		public string? Description { get; set; }
	}
}
