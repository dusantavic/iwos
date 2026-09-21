using System;

namespace Iwos.Common.DTOs
{
	public class EditEmployeeBasicInfoDto
	{
		public required Guid EmployeeId { get; set; }
		public string? ContactEmail { get; set; }
		public string? Country { get; set; }
		public required Guid PositionId { get; set; }
	}
}
