using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Append-only history of subscription periods for a client.
    ///
    /// EndDate is treated as <em>exclusive</em>: a period is active for
    /// <c>[StartDate, EndDate)</c>. Concretely, "current/active" means
    /// <c>StartDate &lt;= today</c> AND
    /// (<see cref="EndDate"/> IS NULL OR <see cref="EndDate"/> &gt; today).
    /// At most one row per client should match that predicate at any moment.
    ///
    /// <see cref="EndDate"/> is derived at assignment time from the plan
    /// type's <c>DurationMonths</c> (e.g. 1 month for Trial, null for
    /// open-ended Active). Callers do NOT set it directly — subscription
    /// length is governed by the plan type so the rule cannot be bypassed.
    ///
    /// <see cref="Client.CurrentSubscriptionId"/> is a denormalized pointer to
    /// the period that was current at the time it was last written. It is a
    /// hint, not a source of truth: read paths re-validate against the date
    /// predicate above.
    /// </summary>
    public class ClientSubscriptionPlanHistory
    {
        public Guid Id { get; set; }

        public Guid ClientId { get; set; }

        public Guid SubscriptionPlanTypeId { get; set; }

        /// <summary>Inclusive start date of this subscription period.</summary>
        public DateOnly StartDate { get; set; }

        /// <summary>
        /// Exclusive end date. The period is active for <c>[StartDate, EndDate)</c>:
        /// active up to but NOT including this date (i.e. <c>EndDate IS NULL</c>
        /// OR <c>EndDate &gt; today</c>). Null means open-ended.
        ///
        /// Derived from the plan type's <c>DurationMonths</c> at assignment time.
        /// When a new period is opened for the same client, any overlapping period
        /// is closed by setting <see cref="EndDate"/> to the new period's
        /// <see cref="StartDate"/>.
        /// </summary>
        public DateOnly? EndDate { get; set; }

        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid? CreatedById { get; set; }

        public virtual Client Client { get; set; } = null!;
        public virtual SubscriptionPlanType SubscriptionPlanType { get; set; } = null!;
    }
}
