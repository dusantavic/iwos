using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class EditEmployeePersonalDataDto
	{
		public required Guid EmployeeId { get; set; }
		public required string FirstName { get; set; }
		public required string LastName { get; set; }
		public string? PersonalId { get; set; }
		public ContractType? ContractType { get; set; }
		public DateOnly? BirthDate { get; set; }
	}
}
