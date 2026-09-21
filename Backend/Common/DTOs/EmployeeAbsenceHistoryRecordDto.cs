using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class EmployeeAbsenceHistoryRecordDto
	{
		public Guid EmployeeId { get; set; }
		public required EventType TypeCode { get; set; }
		public required string Type { get; set; }
		public DateOnly Start { get; set; }
		public DateOnly End { get; set; }
		public int WorkingDays { get; set; }
		public required string Status { get; set; }
	}
}
