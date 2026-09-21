using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Lookup table of available subscription plan types (e.g. Active, Trial).
    /// New plan types can be added without code changes; runtime checks key on <see cref="Code"/>.
    ///
    /// Two distinct durations live here so the subscription lifecycle and the
    /// scheduling-engine reach are not entangled:
    /// <list type="bullet">
    ///   <item><description><see cref="DurationMonths"/> — how long a period of this plan is valid (the subscription period).</description></item>
    ///   <item><description><see cref="PlanningWindowMonths"/> — how far ahead the user may plan / auto-schedule while the subscription is active.</description></item>
    /// </list>
    /// </summary>
    public class SubscriptionPlanType
    {
        public Guid Id { get; set; }

        /// <summary>Stable, machine-friendly identifier used by code (e.g. "ACTIVE", "TRIAL").</summary>
        public required string Code { get; set; }

        /// <summary>Human-friendly display name.</summary>
        public required string Name { get; set; }

        public string? Description { get; set; }

        /// <summary>False to soft-disable a plan type (kept for history but not assignable).</summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Length of a subscription period in calendar months. When a period of
        /// this plan is opened with <c>StartDate = S</c>, its EndDate is set to
        /// <c>S.AddMonths(DurationMonths)</c> (exclusive). Null means the plan
        /// is open-ended (e.g. paid Active subscriptions).
        /// </summary>
        public int? DurationMonths { get; set; }

        /// <summary>
        /// Maximum reach of the scheduling engine while a period of this plan
        /// is active, in calendar months from the period's <c>StartDate</c>.
        /// Null means unrestricted (no cap on the planning horizon). Independent
        /// of <see cref="DurationMonths"/> — a 1-month trial may legitimately
        /// allow planning 2 months ahead.
        /// </summary>
        public int? PlanningWindowMonths { get; set; }

        public virtual ICollection<ClientSubscriptionPlanHistory>? Histories { get; set; }
    }
}
