using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
	public class ClientDto
	{
		public Guid Id { get; set; }
		public required string Name { get; set; }
		public required string ContactEmail { get; set; }
		public bool Active { get; set; } = false;
		public ClientStatus Status { get; set; }
		public ClientPlan Plan { get; set; }
		public ClientBilling Billing { get; set; }
		public string? ContactPerson { get; set; }
		public string? ContactPhone { get; set; }
		public DateTime? LastActivity { get; set; }
		public string? Address { get; set; }
		public required string Country { get; set; }
		public string? IdentificationNumber { get; set; }
		public required string Code { get; set; }
		public required string BankAccountNumber { get; set; }
		public required string BankWith { get; set; }
	}
}
