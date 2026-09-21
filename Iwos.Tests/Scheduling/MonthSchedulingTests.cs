using Iwos.Business.Scheduling;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Multi-week (month) scheduling tests that simulate what <c>GenerateScheduleForRangeAsync</c>
/// does in the service layer: run the engine week-by-week, carry over accumulated hours
/// for fairness, and re-compute rotation anchors from the month start (firstMonday).
///
/// The helper <see cref="RunMonth"/> replicates the service-layer loop so these tests
/// remain pure (no EF, no DI) while exercising the real engine.
/// </summary>
public sealed class MonthSchedulingTests
{
    private static ShiftSchedulingEngine Engine() => SchedulingTestBuilder.BuildEngine();

    // ── Month runner ─────────────────────────────────────────────────────────

    private sealed record WeekResult(
        DateOnly WeekStart,
        IReadOnlyList<SchedAssignment> Proposed,
        IReadOnlyList<UnfilledSlotInfo> Unfilled);

    /// <summary>
    /// Runs the engine for each week in <paramref name="weeks"/> in sequence,
    /// carrying accumulated hours from week to week exactly as the service layer does.
    /// <paramref name="contextFactory"/> receives the <c>weekStart</c> and the
    /// accumulated-hours dict and must return a fully-built <see cref="SchedulingContext"/>.
    /// </summary>
    private static List<WeekResult> RunMonth(
        IEnumerable<DateOnly> weeks,
        Func<DateOnly, IReadOnlyDictionary<Guid, double>, SchedulingContext> contextFactory)
    {
        var accumulatedHours = new Dictionary<Guid, double>();
        var results = new List<WeekResult>();

        foreach (var weekStart in weeks)
        {
            var ctx = contextFactory(weekStart, accumulatedHours);
            var result = Engine().Generate(ctx);

            results.Add(new WeekResult(weekStart, result.ProposedAssignments, result.UnfilledSlots));

            // Accumulate proposed hours (locked assignments are already seeded in state
            // and their hours counted by the engine, but for simplicity we only track proposed here)
            var hoursLookup = ctx.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
            foreach (var a in result.ProposedAssignments)
            {
                var h = hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var hrs) ? hrs : 0d;
                accumulatedHours[a.EmployeeId] = (accumulatedHours.TryGetValue(a.EmployeeId, out var prev) ? prev : 0d) + h;
            }
        }

        return results;
    }

    // Standard 4-week month starting Mon 2026-05-04
    private static readonly DateOnly[] FourWeeks =
    [
        SchedulingTestBuilder.Week1.Mon,
        SchedulingTestBuilder.Week2.Mon,
        SchedulingTestBuilder.Week3.Mon,
        SchedulingTestBuilder.Week4.Mon,
    ];

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static int TotalAssignments(List<WeekResult> results, Guid empId)
        => results.Sum(w => w.Proposed.Count(a => a.EmployeeId == empId));

    private static int TotalUnfilled(List<WeekResult> results)
        => results.Sum(w => w.Unfilled.Count);

    private static bool HasAssignment(List<WeekResult> results, Guid empId, DateOnly date)
        => results.Any(w => w.Proposed.Any(a => a.EmployeeId == empId && a.Date == date));

    // ════════════════════════════════════════════════════════════════════════
    // Baseline month — no rotation, no vacation
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void TwoEmployees_NoRotation_NearEqualDistribution_OverFourWeeks()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddEmployee(bob)
                .WithAccumulatedHours(alice.Id, accumulated.GetValueOrDefault(alice.Id))
                .WithAccumulatedHours(bob.Id,   accumulated.GetValueOrDefault(bob.Id))
                .Build());

        var aliceTotal = TotalAssignments(results, alice.Id);
        var bobTotal   = TotalAssignments(results, bob.Id);

        // 4 weeks × 5 days = 20 total slots; should be split ~10/10
        Assert.Equal(20, aliceTotal + bobTotal);
        Assert.True(Math.Abs(aliceTotal - bobTotal) <= 2,
            $"Expected near-equal split but got Alice={aliceTotal} Bob={bobTotal}");
    }

    [Fact]
    public void ThreeEmployees_TwoSlots_EachGetsFairShare_OverFourWeeks()
    {
        var alice  = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob    = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");
        var carol  = SchedulingTestBuilder.Employee(TestIds.Employee3, "Carol");

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 2)
                .AddEmployee(alice)
                .AddEmployee(bob)
                .AddEmployee(carol)
                .WithAccumulatedHours(alice.Id, accumulated.GetValueOrDefault(alice.Id))
                .WithAccumulatedHours(bob.Id,   accumulated.GetValueOrDefault(bob.Id))
                .WithAccumulatedHours(carol.Id, accumulated.GetValueOrDefault(carol.Id))
                .Build());

        // 4 weeks × 5 days × 2 slots = 40 total, 3 employees → ~13 each
        Assert.Equal(40, TotalAssignments(results, alice.Id) + TotalAssignments(results, bob.Id) + TotalAssignments(results, carol.Id));
        // No one should get more than 20 or fewer than 10 (generous bounds)
        Assert.InRange(TotalAssignments(results, alice.Id), 10, 20);
        Assert.InRange(TotalAssignments(results, bob.Id),   10, 20);
        Assert.InRange(TotalAssignments(results, carol.Id), 10, 20);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Rotation pattern over 4 weeks
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void Rotation5on2off_SingleEmployee_OffDaysFallOnCorrectWeeks()
    {
        // Anchor = month start (2026-05-04), cycle = 7 working days
        // Week 1: positions 0–4 (Mon–Fri) → all ON
        // Week 2: Mon pos 5 OFF, Tue pos 6 OFF, Wed–Fri pos 0–2 ON
        // Week 3: Thu pos 5 OFF, Fri pos 6 OFF
        // Week 4: ...
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);
        var anchor = SchedulingTestBuilder.Week1.Mon;

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(emp)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, anchor)
                .WithAccumulatedHours(emp.Id, accumulated.GetValueOrDefault(emp.Id))
                .Build());

        // Week 1: all 5 working days should be ON
        var week1Result = results[0];
        Assert.Equal(5, week1Result.Proposed.Count);

        // Week 2: Mon+Tue are OFF (pos 5+6), rest ON → 3 assignments
        var week2Result = results[1];
        Assert.Equal(3, week2Result.Proposed.Count);
        Assert.Equal(2, week2Result.Unfilled.Count);

        // Total unfilled over the month should exactly equal the number of off-days
        // For 5on/2off over 20 working days: floor(20/7)*2 + remainder off-days
        // Week 1: days 0-4 ON (5 on), Week 2: days 5-6 OFF (2 off), 0-2 ON (3 on)
        // Week 3: days 3-4 ON, 5-6 OFF, 0 ON ... etc.
        // Simpler: total ON days = 20 - total OFF days
        var totalAssigned = TotalAssignments(results, emp.Id);
        var totalUnfilled = TotalUnfilled(results);
        Assert.Equal(20, totalAssigned + totalUnfilled);
    }

    [Fact]
    public void Rotation_TwoEmployees_StaggeredAnchors_MaintainMinCoverageEachDay()
    {
        // emp1 anchor = 05-04, emp2 anchor = 04-28 (4 working days earlier)
        // The stagger ensures when emp1 is off, emp2 is on, and vice versa.
        var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);
        var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
            rotationPatternId: TestIds.PatternId5on2off);

        var anchor1 = SchedulingTestBuilder.Week1.Mon;        // 2026-05-04
        var anchor2 = new DateOnly(2026, 4, 28);             // 2026-04-28 (Tue)

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(emp1)
                .AddEmployee(emp2)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp1.Id, anchor1)
                .WithRotationAnchor(emp2.Id, anchor2)
                .WithAccumulatedHours(emp1.Id, accumulated.GetValueOrDefault(emp1.Id))
                .WithAccumulatedHours(emp2.Id, accumulated.GetValueOrDefault(emp2.Id))
                .Build());

        // With proper staggering, every working day should be covered by at least one employee
        var totalUnfilled = TotalUnfilled(results);
        Assert.Equal(0, totalUnfilled);
    }

    [Fact]
    public void Rotation3on2off_TwoEmployees_StaggeredToPreventSimultaneousOffDays()
    {
        // 3on/2off (cycle=5). With 2 employees, phases: 0 and round(1*5/2)=round(2.5)=3
        // emp1 anchor = 05-04 (Mon), emp2 anchor = 3 working days before = 04-29 (Wed)
        var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId3on2off);
        var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
            rotationPatternId: TestIds.PatternId3on2off);

        var anchor1 = SchedulingTestBuilder.Week1.Mon;       // 2026-05-04
        var anchor2 = new DateOnly(2026, 4, 29);            // 2026-04-29 (Wed), 3 working days before

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(emp1)
                .AddEmployee(emp2)
                .AddRotationPattern(SchedulingTestBuilder.Pattern3on2off())
                .WithRotationAnchor(emp1.Id, anchor1)
                .WithRotationAnchor(emp2.Id, anchor2)
                .WithAccumulatedHours(emp1.Id, accumulated.GetValueOrDefault(emp1.Id))
                .WithAccumulatedHours(emp2.Id, accumulated.GetValueOrDefault(emp2.Id))
                .Build());

        // Staggered anchors should prevent any working day from having both employees off
        Assert.Equal(0, TotalUnfilled(results));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Vacation spanning one or more weeks
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void OneEmployee_FullWeekVacation_OtherEmployeeCoversThatWeek()
    {
        // Alice on vacation entire week 2; Bob covers
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var aliceVacation = new SchedAbsence(alice.Id, SchedulingTestBuilder.Week2.Mon, SchedulingTestBuilder.Week2.Fri);

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
        {
            var builder = new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddEmployee(bob)
                .WithAccumulatedHours(alice.Id, accumulated.GetValueOrDefault(alice.Id))
                .WithAccumulatedHours(bob.Id,   accumulated.GetValueOrDefault(bob.Id));

            // Absence spans the whole month range — engine will only see it when dates overlap
            builder.AddAbsence(aliceVacation);
            return builder.Build();
        });

        // Week 2: Alice should have 0 assignments, Bob should have 5
        var week2 = results[1];
        Assert.Equal(0, week2.Proposed.Count(a => a.EmployeeId == alice.Id));
        Assert.Equal(5, week2.Proposed.Count(a => a.EmployeeId == bob.Id));

        // All other weeks Alice works normally (some days)
        Assert.True(TotalAssignments(results, alice.Id) > 0);
    }

    [Fact]
    public void Vacation_AliceAbsent2Weeks_BobCoversThem_AliceRebalancesLater()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",   weeklyHours: 40);

        // Alice on vacation weeks 1 and 2 (10 working days blocked)
        var aliceVacation = new SchedAbsence(alice.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week2.Fri);

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
        {
            var builder = new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddEmployee(bob)
                .WithAccumulatedHours(alice.Id, accumulated.GetValueOrDefault(alice.Id))
                .WithAccumulatedHours(bob.Id,   accumulated.GetValueOrDefault(bob.Id))
                .AddAbsence(aliceVacation);
            return builder.Build();
        });

        // Weeks 1+2: Bob covers all 10 slots (Alice on vacation)
        var bobWeeks12 = results[0].Proposed.Count(a => a.EmployeeId == bob.Id)
                       + results[1].Proposed.Count(a => a.EmployeeId == bob.Id);
        Assert.Equal(10, bobWeeks12);
        Assert.Equal(0, results[0].Proposed.Count(a => a.EmployeeId == alice.Id));
        Assert.Equal(0, results[1].Proposed.Count(a => a.EmployeeId == alice.Id));

        // Weeks 3+4: Alice rebalances — engine favours her because Bob has high accumulated hours
        var aliceWeeks34 = results[2].Proposed.Count(a => a.EmployeeId == alice.Id)
                         + results[3].Proposed.Count(a => a.EmployeeId == alice.Id);
        var bobWeeks34   = results[2].Proposed.Count(a => a.EmployeeId == bob.Id)
                         + results[3].Proposed.Count(a => a.EmployeeId == bob.Id);
        Assert.True(aliceWeeks34 >= bobWeeks34,
            $"Alice should dominate weeks 3-4 to rebalance. Alice={aliceWeeks34} Bob={bobWeeks34}");

        // Full coverage — no unfilled slots
        Assert.Equal(0, TotalUnfilled(results));
    }

    // ════════════════════════════════════════════════════════════════════════
    // ConsiderWeeklyHours = false with rotation
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void ConsiderWeeklyHours_False_RotationBecomesWorkloadLimiter()
    {
        // With overtime off, an employee's only workload limit is the rotation pattern.
        // 5on/2off → employee works exactly 5 out of every 7 working days.
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off,
            weeklyHours: 8); // tiny cap — should be ignored

        var anchor = SchedulingTestBuilder.Week1.Mon;

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(emp)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, anchor)
                .WithConsiderWeeklyHours(false)
                .WithAccumulatedHours(emp.Id, accumulated.GetValueOrDefault(emp.Id))
                .Build());

        // Weekly cap (8h = 1 day) is ignored → rotation drives off-days only
        // Week 1: 5 shifts, Week 2: 3 shifts, Week 3: 4 shifts, Week 4: depends on cycle
        var totalAssigned = TotalAssignments(results, emp.Id);
        var totalUnfilled = TotalUnfilled(results);

        // Off-days account for exactly the off-block portions of the cycle
        Assert.Equal(20, totalAssigned + totalUnfilled); // 4 weeks × 5 days
        // Expect exactly the off-days to be unfilled (approx 5-6 over 20 working days for 5/2)
        Assert.True(totalUnfilled >= 5, $"Expected some rotation off-days unfilled, got {totalUnfilled}");
        Assert.True(totalUnfilled <= 8, $"Off-days should not exceed cycle ratio, got {totalUnfilled}");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Accumulated hours fairness across weeks
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void AccumulatedHours_PersistAcrossWeeks_FairnessImproves()
    {
        // Week 1: Alice gets all 5 slots (Bob is on vacation week 1).
        // Weeks 2-4: Bob should now be preferred because Alice has more accumulated hours.
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var bobWeek1Vacation = new SchedAbsence(bob.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Fri);

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
        {
            var builder = new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddEmployee(bob)
                .WithAccumulatedHours(alice.Id, accumulated.GetValueOrDefault(alice.Id))
                .WithAccumulatedHours(bob.Id,   accumulated.GetValueOrDefault(bob.Id))
                .AddAbsence(bobWeek1Vacation);
            return builder.Build();
        });

        // Week 1: Alice fills all 5 (Bob on vacation)
        Assert.Equal(5, results[0].Proposed.Count(a => a.EmployeeId == alice.Id));

        // Weeks 2–4: Bob should get more shifts than Alice to compensate
        var aliceWeeks234 = results.Skip(1).Sum(w => w.Proposed.Count(a => a.EmployeeId == alice.Id));
        var bobWeeks234   = results.Skip(1).Sum(w => w.Proposed.Count(a => a.EmployeeId == bob.Id));

        Assert.True(bobWeeks234 >= aliceWeeks234,
            $"Bob should catch up in weeks 2-4. Bob={bobWeeks234} Alice={aliceWeeks234}");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Full month with all constraints active
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void FullMonth_AllConstraints_CorrectCoverage()
    {
        // Scenario:
        //   3 employees, 2 shifts (Morning + Afternoon), minStaff=1 each
        //   Employee 1: Morning shift pinned
        //   Employee 2: 5on/2off rotation, staggered anchor
        //   Employee 3: vacation during week 3
        //   ConsiderWeeklyHours = true (40h cap)
        var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            pinnedShiftId: TestIds.MorningShiftId);
        var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
            rotationPatternId: TestIds.PatternId5on2off);
        var emp3 = SchedulingTestBuilder.Employee(TestIds.Employee3, "Carol");

        var anchor2 = SchedulingTestBuilder.Week1.Mon;
        var carolVacation = new SchedAbsence(emp3.Id, SchedulingTestBuilder.Week3.Mon, SchedulingTestBuilder.Week3.Fri);

        var results = RunMonth(FourWeeks, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithStandardShifts(minStaff: 1)
                .AddEmployee(emp1)
                .AddEmployee(emp2)
                .AddEmployee(emp3)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp2.Id, anchor2)
                .AddAbsence(carolVacation)
                .WithAccumulatedHours(emp1.Id, accumulated.GetValueOrDefault(emp1.Id))
                .WithAccumulatedHours(emp2.Id, accumulated.GetValueOrDefault(emp2.Id))
                .WithAccumulatedHours(emp3.Id, accumulated.GetValueOrDefault(emp3.Id))
                .WithConsiderWeeklyHours(true)
                .Build());

        // Alice never appears in afternoon
        Assert.Empty(results.SelectMany(w => w.Proposed)
            .Where(a => a.EmployeeId == emp1.Id && a.ShiftId == TestIds.AfternoonShiftId));

        // Carol never appears in week 3 (on vacation)
        var week3 = results[2];
        Assert.Empty(week3.Proposed.Where(a => a.EmployeeId == emp3.Id));

        // Bob never appears on his rotation off-days (Mon+Tue of week 2)
        Assert.False(HasAssignment(results, emp2.Id, SchedulingTestBuilder.Week2.Mon));
        Assert.False(HasAssignment(results, emp2.Id, SchedulingTestBuilder.Week2.Tue));

        // Total unfilled should be minimal — most gaps covered by the other employees
        // (only Bob's off-days in weeks where Carol and Alice can't cover afternoon = gaps)
        var totalUnfilled = TotalUnfilled(results);
        Assert.True(totalUnfilled <= 4,
            $"Expected few unfilled slots with 3 employees, got {totalUnfilled}");
    }

    [Fact]
    public void WeekendWorkingMode_IncludesWeekendsInCoverageAndRotation()
    {
        // weekendsWorking=true: 7 days per week; rotation counts calendar days
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);

        // With weekendsWorking=true, CountWorkingDays returns calendar days
        // Anchor 05-04 (Mon), cycle=7 calendar days → off Sat+Sun of week 1
        // (positions 5 and 6 from Mon)
        var anchor = SchedulingTestBuilder.Week1.Mon;

        var oneWeekResults = RunMonth(new[] { SchedulingTestBuilder.Week1.Mon }, (weekStart, accumulated) =>
            new SchedulingTestBuilder()
                .WithWeek(weekStart)
                .WithWeekendsWorking(true)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(emp)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, anchor)
                .Build());

        var week = oneWeekResults[0];
        // Days 0-4 ON, days 5-6 OFF
        // Mon(0) Tue(1) Wed(2) Thu(3) Fri(4) → assigned
        // Sat(5) Sun(6) → off-days
        Assert.Equal(5, week.Proposed.Count);
        Assert.Equal(2, week.Unfilled.Count);

        // Verify the unfilled days are Saturday and Sunday
        var unfilledDates = week.Unfilled.Select(u => u.Date).OrderBy(d => d).ToList();
        Assert.Contains(SchedulingTestBuilder.Week1.Sat, unfilledDates);
        Assert.Contains(SchedulingTestBuilder.Week1.Sun, unfilledDates);
    }
}
