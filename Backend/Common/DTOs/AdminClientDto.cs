using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Client row as seen by the internal admin portal — Iwos staff view across
    /// every tenant, so it is read with <c>IgnoreQueryFilters()</c>.
    /// </summary>
    public class AdminClientDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public string? ContactPerson { get; set; }
        public ClientStatus Status { get; set; }
        public ClientPlan Plan { get; set; }
        public ClientBilling Billing { get; set; }
        public Guid? CurrentSubscriptionId { get; set; }
        public DateTime? LastActivity { get; set; }
    }

    /// <summary>
    /// Full client record for the admin portal detail/edit view — includes the
    /// fields editable via <see cref="UpdateClientDto"/> that the summary list
    /// (<see cref="AdminClientDto"/>) intentionally omits.
    /// </summary>
    public class AdminClientDetailDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public required string Country { get; set; }
        public string? Address { get; set; }
        public required string Code { get; set; }
        public required string BankAccountNumber { get; set; }
        public required string BankWith { get; set; }
        public ClientStatus Status { get; set; }
        public ClientPlan Plan { get; set; }
        public ClientBilling Billing { get; set; }
        public Guid? CurrentSubscriptionId { get; set; }
        public DateTime? LastActivity { get; set; }
    }

    public class CreateClientDto
    {
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public required string Country { get; set; }
        public string? Address { get; set; }
        public required string Code { get; set; }
        public required string BankAccountNumber { get; set; }
        public required string BankWith { get; set; }
    }

    public class UpdateClientDto
    {
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public required string Country { get; set; }
        public string? Address { get; set; }
        public required string Code { get; set; }
        public required string BankAccountNumber { get; set; }
        public required string BankWith { get; set; }
        public ClientStatus Status { get; set; }
    }
}
