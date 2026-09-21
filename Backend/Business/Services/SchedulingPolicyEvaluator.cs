using System;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Pure policy evaluator for scheduling access. Kept free of any I/O so it
    /// can be unit-tested directly. <see cref="SchedulingAccessService"/> loads
    /// the current subscription from the database and delegates here.
    ///
    /// Two distinct concerns are evaluated:
    /// <list type="bullet">
    ///   <item><description><b>Subscription period</b> — whether the client has any active subscription at all. Resolved by the data layer (only currently-active rows are passed in); a missing snapshot here is an immediate block.</description></item>
    ///   <item><description><b>Planning window</b> — how far ahead the engine may reach. Driven by the plan type's <c>PlanningWindowMonths</c>; null means unrestricted.</description></item>
    /// </list>
    /// </summary>
    public static class SchedulingPolicyEvaluator
    {
        public const string TrialWindowMessage = "You can plan only next two months with current subscription";
        public const string BlockedMessage = "Scheduling is not available with the current subscription.";
        public const string TrialMissingStartMessage = "Trial subscription is missing a start date.";

        /// <summary>
        /// Builds a <see cref="SchedulingPolicyDto"/> from the current subscription
        /// snapshot. Pass <c>null</c> for <paramref name="planCode"/> when the client
        /// has no active subscription — the result will be a fully-blocked policy.
        /// <paramref name="planningWindowMonths"/> caps how far ahead the user may
        /// schedule (null = unrestricted).
        /// </summary>
        public static SchedulingPolicyDto BuildPolicy(
            string? planCode,
            DateOnly? subscriptionStartDate,
            DateOnly? subscriptionEndDate = null,
            int? planningWindowMonths = null,
            string? planName = null)
        {
            var policy = new SchedulingPolicyDto
            {
                SubscriptionPlanCode = planCode,
                SubscriptionPlanName = planName,
                SubscriptionStartDate = subscriptionStartDate,
                SubscriptionEndDate = subscriptionEndDate,
            };

            if (string.IsNullOrEmpty(planCode))
            {
                policy.IsBlocked = true;
                policy.BlockedReasonCode = SchedulingAccessException.CodeStatusBlocked;
                return policy;
            }

            if (planCode != SubscriptionPlanTypeCodes.Active &&
                planCode != SubscriptionPlanTypeCodes.Trial)
            {
                // Unknown plan code → fail closed.
                policy.IsBlocked = true;
                policy.BlockedReasonCode = SchedulingAccessException.CodeStatusBlocked;
                return policy;
            }

            policy.IsBlocked = false;
            policy.IsTrial = planCode == SubscriptionPlanTypeCodes.Trial;
            policy.MaxPlannableDate = (planningWindowMonths.HasValue && subscriptionStartDate.HasValue)
                ? subscriptionStartDate.Value.AddMonths(planningWindowMonths.Value)
                : null;

            return policy;
        }

        public static void EnsureCanSchedule(SchedulingPolicyDto policy, DateOnly date)
        {
            EnsureNotBlocked(policy);
            EnsureWithinWindow(policy, date);
        }

        public static void EnsureCanScheduleRange(SchedulingPolicyDto policy, DateOnly from, DateOnly to)
        {
            EnsureNotBlocked(policy);
            var latest = to >= from ? to : from;
            EnsureWithinWindow(policy, latest);
        }

        private static void EnsureNotBlocked(SchedulingPolicyDto policy)
        {
            if (!policy.IsBlocked) return;

            throw new SchedulingAccessException(
                SchedulingAccessException.CodeStatusBlocked,
                BlockedMessage);
        }

        private static void EnsureWithinWindow(SchedulingPolicyDto policy, DateOnly date)
        {
            // A trial plan with no StartDate is a misconfiguration: we know a
            // window applies but can't compute it. Block — checked BEFORE the
            // "no cap" short-circuit below, otherwise the missing window would
            // be silently treated as unrestricted access.
            if (policy.IsTrial && !policy.SubscriptionStartDate.HasValue)
            {
                throw new SchedulingAccessException(
                    SchedulingAccessException.CodeStatusBlocked,
                    TrialMissingStartMessage);
            }

            // No cap configured for this plan → no enforcement here.
            if (!policy.MaxPlannableDate.HasValue) return;

            if (date > policy.MaxPlannableDate.Value)
            {
                throw new SchedulingAccessException(
                    SchedulingAccessException.CodeWindowExceeded,
                    TrialWindowMessage,
                    policy.MaxPlannableDate);
            }
        }
    }
}
