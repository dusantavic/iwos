using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Optimizer;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Xunit.Abstractions;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Regression tests for <see cref="CpSatScheduleOptimizer"/>.
///
/// Centred on the bug the user reported: the previous rolling-6-day-window
/// encoding allowed unbroken 7+ day streaks because every individual 6-day
/// sub-window summed to ≤48h while the actual streak ran 56h+/64h+. The
/// streak-aware encoding (W ∈ [4, 14] all-worked → sum ≤ 48) plus the ±7-day
/// padded context should now refuse such schedules outright.
/// </summary>
public sealed class CpSatOptimizerTests
{
    private readonly ITestOutputHelper _out;
    public CpSatOptimizerTests(ITestOutputHelper output) => _out = output;

    private const double MaxConsecutiveHours = 48.0;
    private static readonly Guid Alice = TestIds.Employee1;
    private static readonly Guid Bob = TestIds.Employee2;
    private static readonly Guid Carol = TestIds.Employee3;

    /// <summary>
    /// Two-week range with one daily shift per day. Three employees, all
    /// matching the position. Each has a generous WeeklyHours cap so nothing
    /// else (besides the consecutive-hours rule) constrains them. The
    /// optimizer must refuse to put any single employee on more than 48h of
    /// unbroken consecutive 8h shifts (i.e. ≤6 in a row), regardless of how
    /// the workload happens to be distributed.
    /// </summary>
    [Fact]
    public void TwoWeekRange_NoEmployeeExceeds48hConsecutiveStreak()
    {
        // Mon → Sun × 2 = 14 daily slots. Each slot is 8h.
        var weekStart = SchedulingTestBuilder.Week1.Mon;
        var ctx = TwoWeekDailyShiftContext(
            weekStart,
            weeklyHoursPerEmployee: 80, // way more than any employee could legally use
            employees: [Alice, Bob, Carol]);

        var result = new CpSatScheduleOptimizer().Solve(ctx,
            new CpSatScheduleOptimizer.Options { TimeBudget = TimeSpan.FromSeconds(10) });

        DumpResult(result);
        Assert.True(result.Success, $"Solver returned {result.SolverStatus}");

        AssertNoStreakExceeds48Hours(result.Assignments, ctx);
    }

    /// <summary>
    /// Direct reproduction of the user-reported failure mode: an environment
    /// where a greedy / rolling-window solver would happily place one
    /// employee on 8 consecutive 8h shifts (= 64h streak). The streak-aware
    /// encoding must break the streak with at least one day off no later
    /// than the 7th consecutive day.
    /// </summary>
    [Fact]
    public void SingleEmployeeWithLargeCap_GetsAtMost6ConsecutiveDays()
    {
        var weekStart = SchedulingTestBuilder.Week1.Mon;
        // Only Alice is eligible (Bob and Carol are intentionally absent).
        // If the optimizer encoded the rule incorrectly it would assign
        // Alice every day; the correct encoding has to leave at least one
        // day off in any 7-day window.
        var ctx = TwoWeekDailyShiftContext(
            weekStart,
            weeklyHoursPerEmployee: 200,
            employees: [Alice]);

        var result = new CpSatScheduleOptimizer().Solve(ctx,
            new CpSatScheduleOptimizer.Options { TimeBudget = TimeSpan.FromSeconds(10) });

        DumpResult(result);
        Assert.True(result.Success);

        var aliceDates = result.Assignments
            .Where(a => a.EmployeeId == Alice)
            .Select(a => a.Date)
            .OrderBy(d => d)
            .ToList();

        var longestStreak = LongestConsecutiveStreak(aliceDates);
        _out.WriteLine($"Alice longest consecutive streak: {longestStreak} days");
        Assert.True(longestStreak <= 6,
            $"Alice was scheduled for {longestStreak} consecutive 8h days — that's a {longestStreak * 8}h streak, breaking the 48h cap");

        AssertNoStreakExceeds48Hours(result.Assignments, ctx);
    }

    /// <summary>
    /// Padding test: locked assignments in the week BEFORE the optimization
    /// range must extend into the streak the optimizer is planning. With Mon
    /// of the prior week already locked, the optimizer must avoid creating a
    /// run that, combined with the locked tail, would exceed 48h.
    /// </summary>
    [Fact]
    public void PriorWeekAssignments_CountTowardConsecutiveStreak()
    {
        var rangeStart = SchedulingTestBuilder.Week1.Mon;

        // Pre-lock the 5 days immediately before the range as Alice working
        // 8h shifts (Wed–Sun of the prior week). If the optimizer ignores
        // this padding it could happily start Alice with another 5 in-range
        // days, producing a 10-day / 80h streak.
        var lockedTail = new List<SchedAssignment>();
        for (int i = -5; i < 0; i++)
            lockedTail.Add(new SchedAssignment(Alice, TestIds.MorningShiftId, rangeStart.AddDays(i)));

        var ctx = OneWeekDailyShiftContext(
            rangeStart,
            weeklyHoursPerEmployee: 80,
            employees: [Alice, Bob],
            extraLockedAssignments: lockedTail);

        var result = new CpSatScheduleOptimizer().Solve(ctx,
            new CpSatScheduleOptimizer.Options { TimeBudget = TimeSpan.FromSeconds(10) });

        DumpResult(result);
        Assert.True(result.Success);

        // Combine locked + proposed for the streak check.
        var aliceDays = lockedTail
            .Where(a => a.EmployeeId == Alice).Select(a => a.Date)
            .Concat(result.Assignments.Where(a => a.EmployeeId == Alice).Select(a => a.Date))
            .OrderBy(d => d)
            .ToList();

        var longestStreak = LongestConsecutiveStreak(aliceDays);
        _out.WriteLine($"Alice combined locked+proposed streak: {longestStreak} days");
        Assert.True(longestStreak <= 6,
            $"Alice's combined run with the prior week is {longestStreak} days = {longestStreak * 8}h, > 48h cap");
    }

    /// <summary>
    /// Maximizes coverage when the constraints allow it. Two employees, one
    /// daily shift, 7-day week — the model should fill all 7 slots by
    /// alternating them, with no one exceeding 6 consecutive days.
    /// </summary>
    [Fact]
    public void TwoEmployees_FillAllSevenDailySlots()
    {
        var ctx = OneWeekDailyShiftContext(
            SchedulingTestBuilder.Week1.Mon,
            weeklyHoursPerEmployee: 56, // 7 days of 8h each, room enough
            employees: [Alice, Bob]);

        var result = new CpSatScheduleOptimizer().Solve(ctx,
            new CpSatScheduleOptimizer.Options { TimeBudget = TimeSpan.FromSeconds(10) });

        DumpResult(result);
        Assert.True(result.Success);
        Assert.Equal(7, result.FilledSlots);
        Assert.Equal(7, result.TotalSlots);
        AssertNoStreakExceeds48Hours(result.Assignments, ctx);
    }

    // ── Context builders ────────────────────────────────────────────────────

    /// <summary>Single-week context: weekendsWorking, one Morning shift per day, 8h.</summary>
    private static SchedulingContext OneWeekDailyShiftContext(
        DateOnly weekStart,
        int weeklyHoursPerEmployee,
        IEnumerable<Guid> employees,
        IEnumerable<SchedAssignment>? extraLockedAssignments = null)
    {
        var b = new SchedulingTestBuilder()
            .WithWeek(weekStart)
            .WithWeekendsWorking(true);

        var idx = 0;
        foreach (var id in employees)
            b.AddEmployee(SchedulingTestBuilder.Employee(id, $"E{idx++}", weeklyHours: weeklyHoursPerEmployee));

        b.AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));
        foreach (var dow in new[] {
            DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
            DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
            b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0, StartHour: 6.0));

        b.AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1));

        if (extraLockedAssignments != null)
            foreach (var a in extraLockedAssignments)
                b.AddLockedAssignment(a);

        return b.Build();
    }

    /// <summary>Two-week context: same shift definition, range extends two weeks.</summary>
    private static SchedulingContext TwoWeekDailyShiftContext(
        DateOnly weekStart,
        int weeklyHoursPerEmployee,
        IEnumerable<Guid> employees)
    {
        var b = new SchedulingTestBuilder()
            .WithWeek(weekStart)
            .WithWeekendsWorking(true);

        var idx = 0;
        foreach (var id in employees)
            b.AddEmployee(SchedulingTestBuilder.Employee(id, $"E{idx++}", weeklyHours: weeklyHoursPerEmployee));

        b.AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));
        foreach (var dow in new[] {
            DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
            DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
            b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0, StartHour: 6.0));
        b.AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1));

        // Hack: extend the test "week" to cover two weeks by reaching into the builder.
        // The SchedulingContext just respects WeekStart/WeekEnd, so we override after
        // build by constructing a context manually with the same fields plus a longer window.
        var built = b.Build();
        return new SchedulingContext
        {
            WeekStart = built.WeekStart,
            WeekEnd = built.WeekStart.AddDays(13),
            WeekendsWorking = built.WeekendsWorking,
            ConsiderWeeklyHours = built.ConsiderWeeklyHours,
            Employees = built.Employees,
            Shifts = built.Shifts,
            DaySchedules = built.DaySchedules,
            PositionRequirements = built.PositionRequirements,
            DayPositionRequirementOverrides = built.DayPositionRequirementOverrides,
            PositionRequirementOverrides = built.PositionRequirementOverrides,
            Absences = built.Absences,
            Unavailabilities = built.Unavailabilities,
            LockedAssignments = built.LockedAssignments,
            RotationPatterns = built.RotationPatterns,
            PriorAssignments = built.PriorAssignments,
            RotationAnchors = built.RotationAnchors,
            AccumulatedHours = built.AccumulatedHours,
        };
    }

    // ── Assertions / helpers ───────────────────────────────────────────────

    private void AssertNoStreakExceeds48Hours(IReadOnlyList<SchedAssignment> assignments, SchedulingContext ctx)
    {
        var hoursByShiftDow = ctx.DaySchedules
            .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);

        var byEmployee = assignments
            .GroupBy(a => a.EmployeeId)
            .ToDictionary(g => g.Key, g => g.OrderBy(a => a.Date).ToList());

        foreach (var (empId, days) in byEmployee)
        {
            // Walk the streaks: any contiguous run of dates is one streak.
            var streakStart = 0;
            for (int i = 0; i < days.Count; i++)
            {
                bool isStreakEnd = i == days.Count - 1 ||
                    days[i + 1].Date.DayNumber - days[i].Date.DayNumber > 1;
                if (!isStreakEnd) continue;

                var streakHours = 0.0;
                for (int j = streakStart; j <= i; j++)
                {
                    if (hoursByShiftDow.TryGetValue((days[j].ShiftId, days[j].Date.DayOfWeek), out var h))
                        streakHours += h;
                }

                _out.WriteLine($"Employee {empId.ToString()[..8]} streak {days[streakStart].Date:dd-MMM}..{days[i].Date:dd-MMM} = {streakHours}h");
                Assert.True(streakHours <= MaxConsecutiveHours,
                    $"Employee {empId} has a {streakHours}h streak {days[streakStart].Date}..{days[i].Date} (cap is {MaxConsecutiveHours}h)");

                streakStart = i + 1;
            }
        }
    }

    private static int LongestConsecutiveStreak(IList<DateOnly> sortedDates)
    {
        if (sortedDates.Count == 0) return 0;
        var longest = 1;
        var current = 1;
        for (int i = 1; i < sortedDates.Count; i++)
        {
            if (sortedDates[i].DayNumber - sortedDates[i - 1].DayNumber == 1) current++;
            else current = 1;
            if (current > longest) longest = current;
        }
        return longest;
    }

    private void DumpResult(CpSatScheduleOptimizer.CpSatResult r)
    {
        _out.WriteLine($"Status: {r.SolverStatus}, Filled: {r.FilledSlots}/{r.TotalSlots}, Took: {r.DurationMs}ms");
        foreach (var a in r.Assignments.OrderBy(a => a.Date).ThenBy(a => a.EmployeeId))
            _out.WriteLine($"  {a.Date:ddd dd-MMM} emp={a.EmployeeId.ToString()[..8]}");
    }
}
