using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    public class Client : IActiveEntity
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public required string ContactEmail { get; set; }
        public bool Active { get; set; } = false;
        /// <summary>
        /// Reflects the payment state of the active subscription period only
        /// (e.g. paid, overdue). It is NOT used to gate feature access — the
        /// current subscription plan type (see <see cref="CurrentSubscription"/>)
        /// is the authoritative source for what the client may do.
        /// </summary>
        public ClientStatus Status { get; set; }

        public ClientPlan Plan { get; set; }
        public ClientBilling Billing { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactPhone { get; set; }
        public DateTime? LastActivity { get; set; }
        public string? Address { get; set; }
        public required string Country { get; set; }
        public Guid? LogoId { get; set; }
        public string? IdentificationNumber { get; set; }
        public required string Code { get; set; }
        public required string BankAccountNumber { get; set; }
        public required string BankWith { get; set; }

        /// <summary>
        /// Denormalized pointer to the row in <see cref="SubscriptionHistory"/>
        /// that was current the last time the subscription was assigned. Treat
        /// this as a hint, not as authoritative — a period can roll into expiry
        /// passively (when its <c>EndDate</c> passes) without this column being
        /// updated. Read paths should re-validate against
        /// <c>StartDate &lt;= today AND (EndDate IS NULL OR EndDate &gt; today)</c>.
        /// </summary>
        public Guid? CurrentSubscriptionId { get; set; }

        public virtual File? Logo { get; set; }
        public virtual ClientSubscriptionPlanHistory? CurrentSubscription { get; set; }
        public virtual ICollection<ClientSubscriptionPlanHistory>? SubscriptionHistory { get; set; }
        public virtual ICollection<ApplicationUser>? ApplicationUsers { get; set; }
        public virtual required ICollection<Department> Departments { get; set; }
        public virtual required ICollection<Employee> Employees { get; set; }
    }
}
