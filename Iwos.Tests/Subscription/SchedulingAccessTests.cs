using System;
using Iwos.Business.Services;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Xunit;

namespace Iwos.Tests.Subscription;

/// <summary>
/// Unit tests for the scheduling access policy. Covers the three client states
/// the product distinguishes:
///
///   • Active   — paying client; unrestricted scheduling.
///   • Trial    — restricted to a planning window measured from the
///                subscription's StartDate (NOT from the wall clock). Window
///                length is data-driven via SubscriptionPlanType.PlanningWindowMonths.
///   • Non-active — no current subscription, or an unknown plan code; the
///                  engine is fully blocked.
///
/// Tests target <see cref="SchedulingPolicyEvaluator"/>, the pure decision
/// surface that <see cref="SchedulingAccessService"/> delegates to.
///
/// IMPORTANT: the trial subscription period (how long the trial lasts) and the
/// trial planning window (how far ahead the trial may schedule) are SEPARATE
/// concepts. The evaluator only cares about the planning window — subscription
/// expiry is filtered out at the data layer (only currently-active rows reach
/// this evaluator).
/// </summary>
public sealed class SchedulingAccessTests
{
    // Trial start + the 2-month planning window length seeded for TRIAL.
    private static readonly DateOnly TrialStart = new(2026, 5, 1);
    private const int TrialPlanningWindowMonths = 2;
    private static readonly DateOnly TrialMaxDate = new(2026, 7, 1); // TrialStart + 2 months
    private static readonly DateOnly InsideTrial = new(2026, 6, 15);
    private static readonly DateOnly OutsideTrial = new(2026, 7, 2);

    // ════════════════════════════════════════════════════════════════════════
    // BuildPolicy — derives the public policy shape from a subscription snapshot
    // ════════════════════════════════════════════════════════════════════════

    public sealed class BuildPolicyTests
    {
        [Fact]
        public void Active_plan_yields_unrestricted_policy()
        {
            // Active plan has no planning window cap.
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Active,
                subscriptionStartDate: new DateOnly(2026, 1, 1),
                planningWindowMonths: null);

            Assert.False(policy.IsBlocked);
            Assert.False(policy.IsTrial);
            Assert.Null(policy.MaxPlannableDate);
            Assert.Null(policy.BlockedReasonCode);
        }

        [Fact]
        public void Trial_plan_caps_window_at_StartDate_plus_planning_months()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Trial,
                subscriptionStartDate: TrialStart,
                planningWindowMonths: TrialPlanningWindowMonths);

            Assert.False(policy.IsBlocked);
            Assert.True(policy.IsTrial);
            Assert.Equal(TrialMaxDate, policy.MaxPlannableDate);
        }

        [Fact]
        public void Trial_window_is_anchored_to_StartDate_not_today()
        {
            // Trial that started long ago — the window should already be in the past.
            var oldStart = new DateOnly(2025, 1, 1);
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Trial,
                subscriptionStartDate: oldStart,
                planningWindowMonths: TrialPlanningWindowMonths);

            Assert.Equal(new DateOnly(2025, 3, 1), policy.MaxPlannableDate);
        }

        [Fact]
        public void Planning_window_length_is_data_driven()
        {
            // Same plan code, different window length — proves the cap comes
            // from the (DB-stored) plan type rather than a hardcoded constant.
            var oneMonthPolicy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Trial,
                subscriptionStartDate: TrialStart,
                planningWindowMonths: 1);

            var sixMonthPolicy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Trial,
                subscriptionStartDate: TrialStart,
                planningWindowMonths: 6);

            Assert.Equal(new DateOnly(2026, 6, 1), oneMonthPolicy.MaxPlannableDate);
            Assert.Equal(new DateOnly(2026, 11, 1), sixMonthPolicy.MaxPlannableDate);
        }

        [Fact]
        public void Missing_subscription_blocks_with_stable_reason_code()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: null,
                subscriptionStartDate: null);

            Assert.True(policy.IsBlocked);
            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, policy.BlockedReasonCode);
        }

        [Fact]
        public void Unknown_plan_code_fails_closed()
        {
            // Any plan code we haven't whitelisted (e.g. "ENTERPRISE") must be
            // treated as blocked rather than silently granting access.
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: "ENTERPRISE",
                subscriptionStartDate: new DateOnly(2026, 1, 1),
                planningWindowMonths: 12);

            Assert.True(policy.IsBlocked);
            Assert.False(policy.IsTrial);
            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, policy.BlockedReasonCode);
        }

        [Fact]
        public void Trial_with_null_StartDate_marks_policy_as_trial_but_no_window()
        {
            // Misconfiguration: trial plan with no start. EnsureCanSchedule
            // surfaces the error; BuildPolicy stays declarative.
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                planCode: SubscriptionPlanTypeCodes.Trial,
                subscriptionStartDate: null,
                planningWindowMonths: TrialPlanningWindowMonths);

            Assert.True(policy.IsTrial);
            Assert.Null(policy.MaxPlannableDate);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // EnsureCanSchedule — single-date access checks
    // ════════════════════════════════════════════════════════════════════════

    public sealed class EnsureCanScheduleTests
    {
        private static SchedulingPolicyDto ActivePolicy() =>
            SchedulingPolicyEvaluator.BuildPolicy(
                SubscriptionPlanTypeCodes.Active, new DateOnly(2026, 1, 1), planningWindowMonths: null);

        private static SchedulingPolicyDto TrialPolicy() =>
            SchedulingPolicyEvaluator.BuildPolicy(
                SubscriptionPlanTypeCodes.Trial, TrialStart, planningWindowMonths: TrialPlanningWindowMonths);

        private static SchedulingPolicyDto BlockedPolicy() =>
            SchedulingPolicyEvaluator.BuildPolicy(planCode: null, subscriptionStartDate: null);

        [Fact]
        public void Active_client_can_schedule_far_into_the_future()
        {
            var policy = ActivePolicy();

            SchedulingPolicyEvaluator.EnsureCanSchedule(policy, new DateOnly(2030, 12, 31));
        }

        [Fact]
        public void Trial_client_can_schedule_inside_the_two_month_window()
        {
            var policy = TrialPolicy();

            SchedulingPolicyEvaluator.EnsureCanSchedule(policy, InsideTrial);
            SchedulingPolicyEvaluator.EnsureCanSchedule(policy, TrialMaxDate); // boundary = inclusive
        }

        [Fact]
        public void Trial_client_cannot_schedule_past_the_window()
        {
            var policy = TrialPolicy();

            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanSchedule(policy, OutsideTrial));

            Assert.Equal(SchedulingAccessException.CodeWindowExceeded, ex.Code);
            Assert.Equal(TrialMaxDate, ex.MaxPlannableDate);
            Assert.Contains("two months", ex.Message);
        }

        [Fact]
        public void Trial_client_can_schedule_in_the_past_within_the_subscription()
        {
            // Past dates are not capped by the planning window — only future
            // dates beyond the cap are blocked. The subscription period itself
            // is filtered at the data layer; here the policy is purely about reach.
            var policy = TrialPolicy();

            SchedulingPolicyEvaluator.EnsureCanSchedule(policy, TrialStart.AddDays(-30));
        }

        [Fact]
        public void Non_active_client_is_blocked_outright()
        {
            var policy = BlockedPolicy();

            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanSchedule(policy, InsideTrial));

            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, ex.Code);
        }

        [Fact]
        public void Trial_with_null_StartDate_throws_with_blocked_code()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                SubscriptionPlanTypeCodes.Trial, subscriptionStartDate: null,
                planningWindowMonths: TrialPlanningWindowMonths);

            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanSchedule(policy, InsideTrial));

            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, ex.Code);
        }

        [Fact]
        public void Unknown_plan_code_blocks_every_date()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                "ENTERPRISE", TrialStart, planningWindowMonths: 12);

            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanSchedule(policy, InsideTrial));

            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, ex.Code);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // EnsureCanScheduleRange — range checks (binding edge is the latest day)
    // ════════════════════════════════════════════════════════════════════════

    public sealed class EnsureCanScheduleRangeTests
    {
        private static SchedulingPolicyDto Trial() =>
            SchedulingPolicyEvaluator.BuildPolicy(
                SubscriptionPlanTypeCodes.Trial, TrialStart, planningWindowMonths: TrialPlanningWindowMonths);

        [Fact]
        public void Trial_range_fully_inside_window_is_allowed()
        {
            SchedulingPolicyEvaluator.EnsureCanScheduleRange(Trial(),
                new DateOnly(2026, 5, 4),
                new DateOnly(2026, 5, 10));
        }

        [Fact]
        public void Trial_range_spilling_past_window_is_rejected()
        {
            // Range starts inside the window but ends one day past it. The
            // service must reject the entire range; partial scheduling is
            // not a behaviour we expose.
            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanScheduleRange(Trial(),
                    new DateOnly(2026, 6, 25),
                    OutsideTrial));

            Assert.Equal(SchedulingAccessException.CodeWindowExceeded, ex.Code);
        }

        [Fact]
        public void Trial_range_at_boundary_is_allowed()
        {
            // Inclusive boundary — the last day of the planning window is still schedulable.
            SchedulingPolicyEvaluator.EnsureCanScheduleRange(Trial(),
                TrialMaxDate.AddDays(-6),
                TrialMaxDate);
        }

        [Fact]
        public void Range_with_swapped_endpoints_uses_later_date_for_window_check()
        {
            // Defensive: callers should pass from <= to, but if they swap the
            // arguments the evaluator must still gate on the latest date.
            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanScheduleRange(Trial(),
                    from: OutsideTrial,
                    to: InsideTrial));

            Assert.Equal(SchedulingAccessException.CodeWindowExceeded, ex.Code);
        }

        [Fact]
        public void Active_range_is_unrestricted()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(
                SubscriptionPlanTypeCodes.Active, new DateOnly(2026, 1, 1), planningWindowMonths: null);

            SchedulingPolicyEvaluator.EnsureCanScheduleRange(policy,
                new DateOnly(2030, 1, 1),
                new DateOnly(2030, 12, 31));
        }

        [Fact]
        public void Blocked_client_cannot_schedule_any_range()
        {
            var policy = SchedulingPolicyEvaluator.BuildPolicy(planCode: null, subscriptionStartDate: null);

            var ex = Assert.Throws<SchedulingAccessException>(
                () => SchedulingPolicyEvaluator.EnsureCanScheduleRange(policy,
                    new DateOnly(2026, 5, 1),
                    new DateOnly(2026, 5, 7)));

            Assert.Equal(SchedulingAccessException.CodeStatusBlocked, ex.Code);
        }
    }
}
