using Iwos.Business.Scheduling;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Linq;
using Xunit;
using Xunit.Abstractions;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Regression tests for the bug reported by the user:
///
/// "An employee has WeeklyHours set to 0, so they are not considered. The
///  schedule is generated and 2 shifts are unfilled. After updating WeeklyHours
///  to 20 and re-running, the engine still leaves 2 shifts unfilled — even
///  though the new employee's added capacity could cover them."
///
/// Each test reproduces a plausible interpretation of that scenario and asserts
/// the engine fills every slot it should be able to fill. Tests run on a fresh
/// state (no carry-over locked assignments) just like a re-generation after a
/// "cancel everything" + WeeklyHours update.
/// </summary>
public sealed class NewEmployeeFillsUnfilledTests
{
    private readonly ITestOutputHelper _out;
    public NewEmployeeFillsUnfilledTests(ITestOutputHelper output) => _out = output;

    private static readonly Guid Alice = TestIds.Employee1;
    private static readonly Guid Bob = TestIds.Employee2;
    private static readonly Guid Carol = TestIds.Employee3;

    /// <summary>
    /// Two cooks: A=20h (just upgraded from 0), B=16h. Five days, one Cook needed each day.
    /// Demand = 40h, supply = 36h → 4 hours of demand will go unfilled, period.
    /// But the engine SHOULD fill 4 of 5; only 1 should remain unfilled.
    /// </summary>
    [Fact]
    public void TwoCooks_Capacity36_Demand40_FillsFourOfFive()
    {
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .AddEmployee(SchedulingTestBuilder.Employee(Alice, "Alice", weeklyHours: 20))
            .AddEmployee(SchedulingTestBuilder.Employee(Bob, "Bob", weeklyHours: 16))
            .WithMorningShiftOnly()
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);
        DumpResult(result);

        Assert.Equal(4, result.FilledSlots);
        Assert.Equal(1, result.UnfilledSlots.Count);
    }

    /// <summary>
    /// Direct mirror of the user's report: 4 daily slots, A=20h, B=16h.
    /// Demand = 32h, supply = 36h. ALL 4 slots should be filled.
    /// </summary>
    [Fact]
    public void TwoCooks_Capacity36_Demand32_FillsAllFour()
    {
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .AddEmployee(SchedulingTestBuilder.Employee(Alice, "Alice", weeklyHours: 20))
            .AddEmployee(SchedulingTestBuilder.Employee(Bob, "Bob", weeklyHours: 16))
            .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
            // Mon–Thu only (4 days) so total demand is 32h.
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Monday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Tuesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Wednesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Thursday, 8.0))
            .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1))
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);
        DumpResult(result);

        Assert.Equal(4, result.FilledSlots);
        Assert.Empty(result.UnfilledSlots);
    }

    /// <summary>
    /// A starts with high accumulated hours (already worked a lot in prior weeks);
    /// B is fresh. Greedy will prefer B for the first slots, leaving A for later.
    /// Should still cover everything.
    /// </summary>
    [Fact]
    public void NewEmployeeWithDayBoundConstraint_StillCoversAll()
    {
        // B's only constraint: unavailability Wed and Thu → B can ONLY work Mon, Tue.
        // A has no constraints. After B fills Mon+Tue (16h), A must cover Wed+Thu.
        // This is the smoking-gun shape the user likely has: a constraint that
        // rules out the new employee from the slots greedy wants to give them.
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .AddEmployee(SchedulingTestBuilder.Employee(Alice, "Alice", weeklyHours: 20))
            .AddEmployee(SchedulingTestBuilder.Employee(Bob, "Bob", weeklyHours: 16))
            .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Monday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Tuesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Wednesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Thursday, 8.0))
            .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1))
            .AddUnavailability(new SchedUnavailability(Bob, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Wed))
            .AddUnavailability(new SchedUnavailability(Bob, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Thu))
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);
        DumpResult(result);

        Assert.Equal(4, result.FilledSlots);
        Assert.Empty(result.UnfilledSlots);
    }

    /// <summary>
    /// The exact user-reported flow: simulate that A previously had WeeklyHours=0
    /// (no prior assignments because the engine couldn't use A) — so AccumulatedHours
    /// for A is 0 — while B has accumulated hours from prior weeks. After A's
    /// hours are bumped to 20, the engine should still cover all four daily slots.
    /// </summary>
    [Fact]
    public void NewEmployeeAfterCapacityIncrease_FillsAllSlots()
    {
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .AddEmployee(SchedulingTestBuilder.Employee(Alice, "Alice", weeklyHours: 20))
            .AddEmployee(SchedulingTestBuilder.Employee(Bob, "Bob", weeklyHours: 16))
            // B has been carrying the load — high accumulated. A is brand new — 0 accumulated.
            .WithAccumulatedHours(Bob, 200)
            .WithAccumulatedHours(Alice, 0)
            .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Monday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Tuesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Wednesday, 8.0))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Thursday, 8.0))
            .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1))
            .Build();

        var result = SchedulingTestBuilder.BuildEngine().Generate(ctx);
        DumpResult(result);

        Assert.Equal(4, result.FilledSlots);
        Assert.Empty(result.UnfilledSlots);
    }

    private void DumpResult(SchedulingResult r)
    {
        _out.WriteLine($"Filled: {r.FilledSlots}/{r.TotalSlots}, Unfilled: {r.UnfilledSlots.Count}");
        foreach (var a in r.ProposedAssignments.OrderBy(a => a.Date).ThenBy(a => a.ShiftId))
            _out.WriteLine($"  {a.Date:ddd dd-MMM} shift={a.ShiftId.ToString()[..8]} emp={a.EmployeeId.ToString()[..8]}");
        foreach (var u in r.UnfilledSlots)
            _out.WriteLine($"  UNFILLED {u.Date:ddd dd-MMM} shift={u.ShiftId.ToString()[..8]} pos={u.RequiredPositionId?.ToString()[..8]}");
        if (r.Optimization != null)
        {
            _out.WriteLine($"Optimizer: {r.Optimization.Iterations} iter, +{r.Optimization.SlotsFilledByOptimizer} filled");
            foreach (var c in r.Optimization.Changes)
                _out.WriteLine($"  CHANGE: {c.Description}");
        }
    }
}
