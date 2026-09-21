using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class PendingAbsenceDto
	{
		public required Guid Id { get; set; }
		public required string EmployeeFullName { get; set; }
		public string? ProfilePictureSrc { get; set; }
		public required Guid EmployeeId { get; set; }
		public required DateOnly Start { get; set; }
		public required DateOnly End { get; set; }
		public required string Type { get; set; }
		public string Status { get; set; } = "Pending" ;
		public DateTime? RequestedDateTime { get; set; }

	}
}
