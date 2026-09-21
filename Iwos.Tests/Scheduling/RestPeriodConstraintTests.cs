using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Tests for the legal minimum-rest-period constraint.
/// Rule: at least 12 consecutive hours of rest must separate the end of one shift
/// from the start of the next shift on the following calendar day.
///
/// Reference shift times (8 h each):
///   Morning   06:00–14:00
///   Afternoon 14:00–22:00
///   Night     22:00–06:00 (overnight → ends 06:00 next day)
///
/// Gap formula (previous day → today):
///   gap = 24 + proposedStartHour − prevStartHour − prevHours
/// </summary>
public sealed class RestPeriodConstraintTests
{
    private readonly RestPeriodConstraint _sut = new();
    private static readonly SchedEmployee Alice =
        SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);

    private static SchedulingState EmptyState() => new();

    private static SchedulingState StateWith(params SchedAssignment[] assignments)
    {
        var s = new SchedulingState();
        s.Proposed.AddRange(assignments);
        return s;
    }

    // ── Minimal context builders ──────────────────────────────────────────────

    /// <summary>
    /// Builds a context with Morning (06h), Afternoon (14h) and Night (22h) shifts,
    /// all 8 h, covering Mon–Sun.
    /// Optional prior/locked assignments are injected for cross-day checks.
    /// </summary>
    private static SchedulingContext ThreeShiftCtx(
        IEnumerable<SchedAssignment>? prior  = null,
        IEnumerable<SchedAssignment>? locked = null)
    {
        var b = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithWeekendsWorking(true)
            .WithThreeShifts(minStaff: 1)
            .AddEmployee(Alice);

        if (prior  is not null) foreach (var a in prior)  b.AddPriorAssignment(a);
        if (locked is not null) foreach (var a in locked) b.AddLockedAssignment(a);

        return b.Build();
    }

    private static SchedAssignment Morning(DateOnly date)   => new(Alice.Id, TestIds.MorningShiftId,   date);
    private static SchedAssignment Afternoon(DateOnly date) => new(Alice.Id, TestIds.AfternoonShiftId, date);
    private static SchedAssignment Night(DateOnly date)     => new(Alice.Id, TestIds.NightShiftId,     date);

    // ── Slot helpers ──────────────────────────────────────────────────────────

    private static ScheduleSlot MorningSlot(DateOnly date)   => new(date, TestIds.MorningShiftId,   null, 8.0);
    private static ScheduleSlot AfternoonSlot(DateOnly date) => new(date, TestIds.AfternoonShiftId, null, 8.0);
    private static ScheduleSlot NightSlot(DateOnly date)     => new(date, TestIds.NightShiftId,     null, 8.0);

    // ════════════════════════════════════════════════════════════════════════
    // No prior assignment — always allowed
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void NoPriorAssignment_IsAllowed()
    {
        var result = _sut.Evaluate(ThreeShiftCtx(), EmptyState(), Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Night shift (22:00–06:00) → next day
    //   gap = 24 + nextStart - 22 - 8  =  nextStart - 6
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void NightShift_FollowedByMorning_NextDay_Blocked()
    {
        // gap = 24 + 6 - 22 - 8 = 0 h  →  blocked
        var state = StateWith(Night(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.True(result.Violated);
        Assert.Contains("0.0h", result.Reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NightShift_FollowedByAfternoon_NextDay_Blocked()
    {
        // gap = 24 + 14 - 22 - 8 = 8 h  < 12 h  →  blocked
        var state = StateWith(Night(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            AfternoonSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.True(result.Violated);
        Assert.Contains("8.0h", result.Reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NightShift_FollowedByNight_NextDay_Allowed()
    {
        // gap = 24 + 22 - 22 - 8 = 16 h  ≥ 12 h  →  allowed
        var state = StateWith(Night(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            NightSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Afternoon shift (14:00–22:00) → next day
    //   gap = 24 + nextStart - 14 - 8  =  nextStart + 2
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void AfternoonShift_FollowedByMorning_NextDay_Blocked()
    {
        // gap = 24 + 6 - 14 - 8 = 8 h  < 12 h  →  blocked
        var state = StateWith(Afternoon(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.True(result.Violated);
        Assert.Contains("8.0h", result.Reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AfternoonShift_FollowedByAfternoon_NextDay_Allowed()
    {
        // gap = 24 + 14 - 14 - 8 = 16 h  →  allowed
        var state = StateWith(Afternoon(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            AfternoonSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    [Fact]
    public void AfternoonShift_FollowedByNight_NextDay_Allowed()
    {
        // gap = 24 + 22 - 14 - 8 = 24 h  →  allowed
        var state = StateWith(Afternoon(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            NightSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Morning shift (06:00–14:00) → next day
    //   gap = 24 + nextStart - 6 - 8  =  nextStart + 10
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void MorningShift_FollowedByMorning_NextDay_Allowed()
    {
        // gap = 24 + 6 - 6 - 8 = 16 h  →  allowed
        var state = StateWith(Morning(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    [Fact]
    public void MorningShift_FollowedByAfternoon_NextDay_Allowed()
    {
        // gap = 24 + 14 - 6 - 8 = 24 h  →  allowed
        var state = StateWith(Morning(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            AfternoonSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    [Fact]
    public void MorningShift_FollowedByNight_NextDay_Allowed()
    {
        // gap = 24 + 22 - 6 - 8 = 32 h  →  allowed
        var state = StateWith(Morning(SchedulingTestBuilder.Week1.Mon));
        var result = _sut.Evaluate(ThreeShiftCtx(), state, Alice,
            NightSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.False(result.Violated);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Cross-week (PriorAssignments) and LockedAssignments
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void PriorAssignment_NightShift_SundayBeforeWeekStart_MorningMondayBlocked()
    {
        // Night shift on Week0.Sun (prior assignment) → Morning on Week1.Mon blocked (gap=0h)
        var prior = new[] { Night(SchedulingTestBuilder.Week0.Sun) };
        var result = _sut.Evaluate(ThreeShiftCtx(prior: prior), EmptyState(), Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Mon));
        Assert.True(result.Violated);
    }

    [Fact]
    public void PriorAssignment_NightShift_SundayBeforeWeekStart_AfternoonMondayBlocked()
    {
        // Night shift on Week0.Sun → Afternoon on Week1.Mon blocked (gap=8h < 12h)
        var prior = new[] { Night(SchedulingTestBuilder.Week0.Sun) };
        var result = _sut.Evaluate(ThreeShiftCtx(prior: prior), EmptyState(), Alice,
            AfternoonSlot(SchedulingTestBuilder.Week1.Mon));
        Assert.True(result.Violated);
    }

    [Fact]
    public void PriorAssignment_NightShift_SundayBeforeWeekStart_NightMondayAllowed()
    {
        // Night → Night: gap = 16h → allowed
        var prior = new[] { Night(SchedulingTestBuilder.Week0.Sun) };
        var result = _sut.Evaluate(ThreeShiftCtx(prior: prior), EmptyState(), Alice,
            NightSlot(SchedulingTestBuilder.Week1.Mon));
        Assert.False(result.Violated);
    }

    [Fact]
    public void LockedAssignment_NightShift_MorningNextDay_Blocked()
    {
        // Locked night Monday → proposed morning Tuesday: blocked
        var locked = new[] { Night(SchedulingTestBuilder.Week1.Mon) };
        var result = _sut.Evaluate(ThreeShiftCtx(locked: locked), EmptyState(), Alice,
            MorningSlot(SchedulingTestBuilder.Week1.Tue));
        Assert.True(result.Violated);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Engine integration — RestPeriodConstraint enforced end-to-end
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void Engine_NightShiftLockedMonday_MorningTuesdayUnfilled()
    {
        // Alice locked on Night Monday. Only Alice available. Morning Tuesday slot must be unfilled.
        var alice  = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithWeekendsWorking(true)
            .WithThreeShifts(minStaff: 1)
            .AddEmployee(alice)
            .AddLockedAssignment(new SchedAssignment(alice.Id, TestIds.NightShiftId,
                SchedulingTestBuilder.Week1.Mon))
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);

        Assert.True(result.UnfilledSlots.Any(s =>
            s.Date == SchedulingTestBuilder.Week1.Tue && s.ShiftId == TestIds.MorningShiftId),
            "Morning Tuesday must be unfilled — rest period after Monday night shift.");
        Assert.True(result.UnfilledSlots.Any(s =>
            s.Date == SchedulingTestBuilder.Week1.Tue && s.ShiftId == TestIds.AfternoonShiftId),
            "Afternoon Tuesday must also be unfilled — only 8h rest after Monday night shift.");
    }

    [Fact]
    public void Engine_ThreeEmployees_OnePerShiftType_AllSlotsFilled()
    {
        // 3 employees, 3 shifts, minStaff=1 per shift, Mon–Fri (5 days × 3 shifts = 15 slots).
        // Each employee can cover one shift type every day — rest-period constraint is satisfied
        // for same-type consecutive days (Morning→Morning gap=16h, etc.).
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",   weeklyHours: 80);
        var carol = SchedulingTestBuilder.Employee(TestIds.Employee3, "Carol", weeklyHours: 80);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithWeekendsWorking(false)
            .WithThreeShifts(minStaff: 1)
            .AddEmployee(alice).AddEmployee(bob).AddEmployee(carol)
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);

        Assert.Equal(15, result.FilledSlots);
        Assert.Empty(result.UnfilledSlots);
    }

    [Fact]
    public void Engine_PriorNightShift_CrossWeekBoundary_MorningBlockedMonday()
    {
        // Night shift on Week0.Sun (in PriorAssignments). Only Alice.
        // Week1.Mon: Morning and Afternoon slots blocked → unfilled.
        // Week1.Mon: Night slot allowed (gap=16h).
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithWeekendsWorking(false)
            .WithThreeShifts(minStaff: 1)
            .AddEmployee(alice)
            .AddPriorAssignment(new SchedAssignment(alice.Id, TestIds.NightShiftId,
                SchedulingTestBuilder.Week0.Sun))
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);

        var monUnfilled = result.UnfilledSlots.Where(s => s.Date == SchedulingTestBuilder.Week1.Mon).ToList();
        Assert.True(monUnfilled.Any(s => s.ShiftId == TestIds.MorningShiftId),
            "Monday morning must be unfilled after Sunday night shift.");
        Assert.True(monUnfilled.Any(s => s.ShiftId == TestIds.AfternoonShiftId),
            "Monday afternoon must be unfilled after Sunday night shift.");
        Assert.False(result.UnfilledSlots.Any(s =>
            s.Date == SchedulingTestBuilder.Week1.Mon && s.ShiftId == TestIds.NightShiftId),
            "Monday night is allowed (16h gap) — must be filled.");
    }
}
