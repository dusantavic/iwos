using System;

namespace Iwos.Common.DTOs
{
	public class CreateToDoDto
	{
		public Guid EmployeeId { get; set; }
		public required string Content { get; set; }
		public DateTime? DueDateTime { get; set; }
	}
}
