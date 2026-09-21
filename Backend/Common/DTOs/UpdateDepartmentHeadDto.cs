using System;

namespace Iwos.Common.DTOs
{
	public class UpdateDepartmentHeadDto
	{
		public required Guid DepartmentId { get; set; }
		public required Guid HeadId { get; set; }
		public required DateOnly AssignmentDate { get; set; }
	}
}
