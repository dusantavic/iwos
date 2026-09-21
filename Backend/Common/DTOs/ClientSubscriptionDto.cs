using System;

namespace Iwos.Common.DTOs
{
    public class ClientSubscriptionDto
    {
        public Guid Id { get; set; }
        public Guid ClientId { get; set; }
        public Guid SubscriptionPlanTypeId { get; set; }
        public required string SubscriptionPlanTypeCode { get; set; }
        public required string SubscriptionPlanTypeName { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Internal command to assign a subscription. EndDate is intentionally
    /// NOT exposed here — it is derived from the plan type's
    /// <c>DurationMonths</c> so that subscription length is governed centrally
    /// by ops/data, not by callers. Subscription assignment is a privileged
    /// operation and must not be reachable from any user-facing endpoint.
    /// </summary>
    public class AssignSubscriptionDto
    {
        public Guid ClientId { get; set; }
        public Guid SubscriptionPlanTypeId { get; set; }
        public DateOnly StartDate { get; set; }
        public string? Notes { get; set; }
    }
}
