using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class EventDto
	{
		public Guid Id { get; set; }
		public Guid EmployeeId { get; set; }
		public required EventType TypeCode { get; set; }
		public required string Type { get; set; }
		public DateOnly Start { get; set; }
		public DateOnly End { get; set; }
		public string Status { get; set; }

	}
}
