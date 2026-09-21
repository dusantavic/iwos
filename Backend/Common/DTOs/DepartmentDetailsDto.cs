using System;
using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class DepartmentDetailsDto
	{
		public required Guid Id { get; set; }
		public required string Name { get; set; }
		public required string Description { get; set; }
		public required int TotalEmployees { get; set; }
		public required int PositionsCount { get; set; }
		public Guid? HeadId { get; set; }
		public string? HeadName { get; set; }
		public string? HeadPosition { get; set; }
		public List<PositionDto>? Positions { get; set; }

	}
}
