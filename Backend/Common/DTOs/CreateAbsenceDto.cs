using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class CreateAbsenceDto
	{
		public Guid EmployeeId { get; set; }
		public required AbsenceType Type { get; set; }
		public DateOnly StartDate { get; set; }
		public DateOnly EndDate { get; set; }

	}
}
