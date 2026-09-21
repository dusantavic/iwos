using System;

namespace Iwos.Common.DTOs
{
    public class SchedulingPolicyDto
    {
        /// <summary>True when the engine is fully blocked for this client (no current subscription, or unknown plan code).</summary>
        public bool IsBlocked { get; set; }

        /// <summary>True when the client is on a trial plan and is subject to the rolling window from <see cref="SubscriptionStartDate"/>.</summary>
        public bool IsTrial { get; set; }

        /// <summary>Code of the current subscription plan type (e.g. "ACTIVE", "TRIAL"); null when no current subscription.</summary>
        public string? SubscriptionPlanCode { get; set; }

        /// <summary>Name of the current subscription plan type for display.</summary>
        public string? SubscriptionPlanName { get; set; }

        /// <summary>Start date of the current subscription period (null when no current subscription).</summary>
        public DateOnly? SubscriptionStartDate { get; set; }

        /// <summary>End date of the current subscription period (typically null while the period is open).</summary>
        public DateOnly? SubscriptionEndDate { get; set; }

        /// <summary>
        /// Latest date the client may schedule for. Null for active/full-access plans (no cap).
        /// For trial plans this is <see cref="SubscriptionStartDate"/> + 2 months.
        /// </summary>
        public DateOnly? MaxPlannableDate { get; set; }

        /// <summary>Stable error code matching the controller response when access is denied.</summary>
        public string? BlockedReasonCode { get; set; }
    }
}
