using System;
using System.Collections.Generic;
using Iwos.Common.Contracts.Enums;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Aggregated read model for the Client Overview page.
    /// Bundles the client identity, current subscription, and application
    /// users into a single round-trip so the UI doesn't have to fan out.
    /// </summary>
    public class ClientOverviewDto
    {
        public required ClientSummaryDto Client { get; set; }
        public ClientSubscriptionDto? CurrentSubscription { get; set; }
        public DateOnly? MaxPlannableDate { get; set; }
        public required List<ApplicationUserSummaryDto> Users { get; set; }
    }

    public class ClientSummaryDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public required string Country { get; set; }
        public string? Address { get; set; }
        public required string Code { get; set; }
        public ClientStatus Status { get; set; }
        public ClientPlan Plan { get; set; }
        public DateTime? LastActivity { get; set; }
    }

    public class ApplicationUserSummaryDto
    {
        public Guid Id { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Username { get; set; }
        public string? Email { get; set; }
        public UserType Type { get; set; }
        public bool Active { get; set; }
        public DateTime? LastLogin { get; set; }
        public DateTime CreatedOn { get; set; }
    }
}
