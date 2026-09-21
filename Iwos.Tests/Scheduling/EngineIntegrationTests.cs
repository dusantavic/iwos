using Iwos.Business.Scheduling;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Integration tests that run the full <see cref="ShiftSchedulingEngine"/> against
/// a variety of scenarios covering all constraint interactions.
/// Tests verify proposals, unfilled slots, and soft violations at the engine output level.
/// </summary>
public sealed class EngineIntegrationTests
{
    private static ShiftSchedulingEngine Engine() => SchedulingTestBuilder.BuildEngine();

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static bool HasAssignment(SchedulingResult result, Guid employeeId, DateOnly date)
        => result.ProposedAssignments.Any(a => a.EmployeeId == employeeId && a.Date == date);

    private static bool HasAssignment(SchedulingResult result, Guid employeeId, Guid shiftId, DateOnly date)
        => result.ProposedAssignments.Any(a => a.EmployeeId == employeeId && a.ShiftId == shiftId && a.Date == date);

    private static int AssignmentsForEmployee(SchedulingResult result, Guid employeeId)
        => result.ProposedAssignments.Count(a => a.EmployeeId == employeeId);

    // ════════════════════════════════════════════════════════════════════════
    // Basic coverage
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void NoEmployees_AllSlotsUnfilled()
    {
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 2)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(0, result.FilledSlots);
        Assert.Equal(result.TotalSlots, result.UnfilledSlots.Count);
    }

    [Fact]
    public void SingleEmployee_SingleShift_OneSlotPerDay_FillsAllWeekdays()
    {
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(5, result.FilledSlots);   // Mon–Fri
        Assert.Equal(0, result.UnfilledSlots.Count);
        Assert.All(result.ProposedAssignments, a => Assert.Equal(emp.Id, a.EmployeeId));
    }

    [Fact]
    public void MinStaff2_OneEmployee_LeavesOneSlotUnfilledEachDay()
    {
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 2)
            .AddEmployee(emp)
            .Build();

        var result = Engine().Generate(ctx);

        // 5 days × 2 slots = 10 total; employee fills one per day (blocked by EmployeeDateTaken)
        Assert.Equal(10, result.TotalSlots);
        Assert.Equal(5, result.FilledSlots);
        Assert.Equal(5, result.UnfilledSlots.Count);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Absence (vacation)
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void Employee_OnFullWeekVacation_NeverAssigned()
    {
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Sun))
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(0, result.FilledSlots);
        Assert.Equal(0, result.ProposedAssignments.Count(a => a.EmployeeId == emp.Id));
    }

    [Fact]
    public void Employee_OnMidWeekVacation_OnlyAssignedOutsideVacation()
    {
        // Vacation Wed–Fri; Mon and Tue should be filled
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Fri))
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(2, result.FilledSlots);
        Assert.True(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week1.Mon));
        Assert.True(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week1.Tue));
        Assert.Equal(3, result.UnfilledSlots.Count); // Wed, Thu, Fri unfilled
    }

    [Fact]
    public void VacationEmployee_CoveredByOtherEmployee()
    {
        // Alice on vacation all week — Bob should cover every slot
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .AddAbsence(new SchedAbsence(alice.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Sun))
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(5, result.FilledSlots);
        Assert.Equal(0, result.ProposedAssignments.Count(a => a.EmployeeId == alice.Id));
        Assert.Equal(5, result.ProposedAssignments.Count(a => a.EmployeeId == bob.Id));
    }

    [Fact]
    public void Vacation_OneEmployeeCoversOtherVacation_ButSlotUnfilledIfBothAbsent()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            // Both on vacation on Wednesday
            .AddAbsence(new SchedAbsence(alice.Id, SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Wed))
            .AddAbsence(new SchedAbsence(bob.Id,   SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Wed))
            .Build();

        var result = Engine().Generate(ctx);

        // Wed should be unfilled; all other days should be filled (4 days × 1 slot)
        Assert.Equal(4, result.FilledSlots);
        Assert.Equal(1, result.UnfilledSlots.Count);
        Assert.Equal(SchedulingTestBuilder.Week1.Wed, result.UnfilledSlots[0].Date);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Pinned shift
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void PinnedEmployee_OnlyAppearsOnPinnedShift()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            pinnedShiftId: TestIds.MorningShiftId);
        var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob"); // unpinned

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithStandardShifts(minStaff: 1) // Morning + Afternoon
            .AddEmployee(alice)
            .AddEmployee(bob)
            .Build();

        var result = Engine().Generate(ctx);

        // Alice should never appear in afternoon assignments
        Assert.Empty(result.ProposedAssignments.Where(
            a => a.EmployeeId == alice.Id && a.ShiftId == TestIds.AfternoonShiftId));

        // Bob fills afternoon (and possibly morning too when Alice is not the pick)
        Assert.True(result.ProposedAssignments.Any(
            a => a.EmployeeId == bob.Id && a.ShiftId == TestIds.AfternoonShiftId));
    }

    [Fact]
    public void TwoPinnedEmployees_EachToOwnShift_CoversAllShifts()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            pinnedShiftId: TestIds.MorningShiftId);
        var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
            pinnedShiftId: TestIds.AfternoonShiftId);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithStandardShifts(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(10, result.FilledSlots); // 5 days × 2 shifts

        Assert.All(result.ProposedAssignments.Where(a => a.ShiftId == TestIds.MorningShiftId),
            a => Assert.Equal(TestIds.Employee1, a.EmployeeId));
        Assert.All(result.ProposedAssignments.Where(a => a.ShiftId == TestIds.AfternoonShiftId),
            a => Assert.Equal(TestIds.Employee2, a.EmployeeId));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Overtime / weekly hour cap
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void OvertimeCap_PreventsBeyondWeeklyHours()
    {
        // Alice 16 h cap + 8h morning shift fills 2 slots, then capped
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 16);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .WithConsiderWeeklyHours(true)
            .Build();

        var result = Engine().Generate(ctx);

        // 16 h / 8 h per shift = 2 shifts max
        Assert.Equal(2, AssignmentsForEmployee(result, alice.Id));
        Assert.Equal(3, result.UnfilledSlots.Count); // remaining 3 days unfilled
    }

    [Fact]
    public void ConsiderWeeklyHours_False_IgnoresOvertimeCap()
    {
        // Alice has 8h cap but ConsiderWeeklyHours=false → fills all 5 days
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 8);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .WithConsiderWeeklyHours(false)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(5, AssignmentsForEmployee(result, alice.Id));
    }

    [Fact]
    public void OvertimeCap_SecondEmployeePicksUpRemainingSlots()
    {
        // Alice capped at 16h (fills Mon+Tue); Bob fills Wed–Fri
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 16);
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",   weeklyHours: 40);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .WithConsiderWeeklyHours(true)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(5, result.FilledSlots);
        Assert.Equal(2, AssignmentsForEmployee(result, alice.Id));
        Assert.Equal(3, AssignmentsForEmployee(result, bob.Id));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Soft constraint — self-reported unavailability
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void UnavailableEmployee_PreferredToBeSkipped_WhenAlternativeExists()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            // Alice reports unavailable on Monday morning
            .AddUnavailability(new SchedUnavailability(alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
            .Build();

        var result = Engine().Generate(ctx);

        // Bob should be chosen on Monday (lower penalty)
        Assert.True(HasAssignment(result, bob.Id, SchedulingTestBuilder.Week1.Mon),
            "Engine should prefer Bob (no soft violation) over Alice (soft violation)");
        Assert.False(HasAssignment(result, alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon),
            "Alice should not be assigned Monday morning when Bob is available");
    }

    [Fact]
    public void UnavailableEmployee_StillAssigned_WhenNoOtherOption()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddUnavailability(new SchedUnavailability(alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
            .Build();

        var result = Engine().Generate(ctx);

        // Slot must be filled even with soft violation — unavailability is SOFT
        Assert.Equal(5, result.FilledSlots);
        Assert.True(HasAssignment(result, alice.Id, SchedulingTestBuilder.Week1.Mon));
        Assert.NotEmpty(result.AcceptedSoftViolations);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Locked assignments
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void LockedAssignment_CountsTowardHourCap()
    {
        // Alice locked for Mon (8h) + 40h cap → can only fill 4 more days (32h)
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddLockedAssignment(new SchedAssignment(alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
            .WithConsiderWeeklyHours(true)
            .Build();

        var result = Engine().Generate(ctx);

        // Locked Mon is not re-proposed; engine proposes Tue–Fri
        Assert.Equal(4, result.ProposedAssignments.Count);
        Assert.DoesNotContain(result.ProposedAssignments,
            a => a.EmployeeId == alice.Id && a.Date == SchedulingTestBuilder.Week1.Mon);
    }

    [Fact]
    public void LockedAssignment_PreventsDoubleBookingOnSameDay()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithStandardShifts(minStaff: 1) // Morning + Afternoon
            .AddEmployee(alice)
            .AddLockedAssignment(new SchedAssignment(alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
            .Build();

        var result = Engine().Generate(ctx);

        // Alice cannot also be in Afternoon on Monday
        Assert.DoesNotContain(result.ProposedAssignments,
            a => a.EmployeeId == alice.Id && a.ShiftId == TestIds.AfternoonShiftId && a.Date == SchedulingTestBuilder.Week1.Mon);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Position requirements
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void PositionRequirement_FilledByMatchingPositionOnly()
    {
        var seniorEmp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Senior", positionId: TestIds.PositionA);
        var juniorEmp = SchedulingTestBuilder.Employee(TestIds.Employee2, "Junior", positionId: TestIds.PositionB);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
            .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Monday, 8.0))
            .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1))
            .AddEmployee(seniorEmp)
            .AddEmployee(juniorEmp)
            .Build();

        var result = Engine().Generate(ctx);

        // Only the PositionA employee (Senior) should fill the Monday morning slot
        Assert.Equal(1, result.FilledSlots);
        Assert.True(HasAssignment(result, seniorEmp.Id, SchedulingTestBuilder.Week1.Mon));
        Assert.False(HasAssignment(result, juniorEmp.Id, SchedulingTestBuilder.Week1.Mon));
    }

    // ════════════════════════════════════════════════════════════════════════
    // Date overrides
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void DateOverride_IncreasesPositionRequirement_ForSpecificDay()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            // Override Monday to need 2 for PositionA (default is 1)
            .AddPositionRequirementOverride(new SchedPositionRequirementOverride(
                TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon, TestIds.PositionA, 2))
            .Build();

        var result = Engine().Generate(ctx);

        var mondayAssignments = result.ProposedAssignments
            .Where(a => a.Date == SchedulingTestBuilder.Week1.Mon && a.ShiftId == TestIds.MorningShiftId)
            .ToList();

        Assert.Equal(2, mondayAssignments.Count);
    }

    [Fact]
    public void DateOverride_ZeroesPositionRequirement_SkipsThatDay()
    {
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            // Override Monday to 0 for PositionA — no slot should be generated
            .AddPositionRequirementOverride(new SchedPositionRequirementOverride(
                TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon, TestIds.PositionA, 0))
            .Build();

        var result = Engine().Generate(ctx);

        // Monday slot not created; only Tue–Fri filled (4 days)
        Assert.Equal(4, result.FilledSlots);
        Assert.DoesNotContain(result.ProposedAssignments,
            a => a.Date == SchedulingTestBuilder.Week1.Mon);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Fair distribution
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void FairDistribution_TwoEmployees_TwoSlots_EachGetsOne()
    {
        // minStaff=2: both employees fill both slots on each day
        // With only 2 employees for 2 slots, each gets exactly one per day
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 2)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .Build();

        var result = Engine().Generate(ctx);

        Assert.Equal(10, result.FilledSlots); // 5 days × 2 slots
        // Each employee works every day (different "slots" for same shift/day)
        Assert.Equal(5, AssignmentsForEmployee(result, alice.Id));
        Assert.Equal(5, AssignmentsForEmployee(result, bob.Id));
    }

    [Fact]
    public void FairDistribution_AccumulatedHours_PrefersEmployeeWithLessHistory()
    {
        // Alice accumulated 30 h in prior weeks; Bob has 0 h accumulated.
        // Both have 40h cap this week. Bob should be preferred first.
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
        var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .WithAccumulatedHours(alice.Id, 30)
            .WithAccumulatedHours(bob.Id, 0)
            .Build();

        var result = Engine().Generate(ctx);

        // Bob should get more assignments since he has fewer accumulated hours
        var aliceCount = AssignmentsForEmployee(result, alice.Id);
        var bobCount   = AssignmentsForEmployee(result, bob.Id);
        Assert.True(bobCount >= aliceCount, $"Bob ({bobCount}) should get at least as many shifts as Alice ({aliceCount})");
    }

    // ════════════════════════════════════════════════════════════════════════
    // Rotation pattern within the engine
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void Rotation_Employee_NotAssigned_OnOffDays()
    {
        // Anchor = Mon 05-04 → Off Mon+Tue of week 2
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week2.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
            .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
            .Build();

        var result = Engine().Generate(ctx);

        // Mon and Tue of week 2 are off-days → unfilled (no alternative employee)
        Assert.False(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Mon));
        Assert.False(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Tue));
        // Wed–Fri are on-days → should be assigned
        Assert.True(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Wed));
        Assert.True(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Thu));
        Assert.True(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Fri));
    }

    [Fact]
    public void Rotation_StaggeredAnchors_EnsureCoverage_WhenOneIsOff()
    {
        // Emp1: anchor 05-04 → OFF Mon+Tue week 2
        // Emp2: anchor 04-28 → ON Mon+Tue week 2 (covers the gap)
        var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);
        var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
            rotationPatternId: TestIds.PatternId5on2off);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week2.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp1)
            .AddEmployee(emp2)
            .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
            .WithRotationAnchor(emp1.Id, SchedulingTestBuilder.Week1.Mon)
            .WithRotationAnchor(emp2.Id, new DateOnly(2026, 4, 28))
            .Build();

        var result = Engine().Generate(ctx);

        // Both Mon and Tue should be filled by emp2 (emp1 is off)
        Assert.Equal(5, result.FilledSlots);
        Assert.True(HasAssignment(result, emp2.Id, SchedulingTestBuilder.Week2.Mon));
        Assert.True(HasAssignment(result, emp2.Id, SchedulingTestBuilder.Week2.Tue));
    }

    [Fact]
    public void Rotation_ConsiderWeeklyHours_False_RotationStillEnforced()
    {
        // Even without the overtime cap, rotation hard-blocks off-days
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week2.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
            .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
            .WithConsiderWeeklyHours(false) // disable overtime
            .Build();

        var result = Engine().Generate(ctx);

        // Off-days still blocked despite ConsiderWeeklyHours=false
        Assert.False(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Mon));
        Assert.False(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Tue));
        Assert.Equal(3, result.FilledSlots); // only Wed+Thu+Fri
    }

    // ════════════════════════════════════════════════════════════════════════
    // Combined constraint interaction
    // ════════════════════════════════════════════════════════════════════════

    [Fact]
    public void VacationAndRotation_BothApply_SlotUnfilledWhenNoOtherEmployee()
    {
        // Employee has rotation off-day AND a vacation on the same day
        var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            rotationPatternId: TestIds.PatternId5on2off);

        // Monday week 2: rotation off-day (pos 5) AND vacation
        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week2.Mon)
            .WithMorningShiftOnly(minStaff: 1)
            .AddEmployee(emp)
            .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
            .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
            .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week2.Mon, SchedulingTestBuilder.Week2.Mon))
            .Build();

        var result = Engine().Generate(ctx);

        Assert.False(HasAssignment(result, emp.Id, SchedulingTestBuilder.Week2.Mon));
    }

    [Fact]
    public void PinnedShift_AndOvertimeCap_BothEnforced()
    {
        // Alice pinned to Morning, 16h cap (fits 2 days max)
        var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
            pinnedShiftId: TestIds.MorningShiftId, weeklyHours: 16);
        var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob", weeklyHours: 40);

        var ctx = new SchedulingTestBuilder()
            .WithWeek(SchedulingTestBuilder.Week1.Mon)
            .WithStandardShifts(minStaff: 1)
            .AddEmployee(alice)
            .AddEmployee(bob)
            .WithConsiderWeeklyHours(true)
            .Build();

        var result = Engine().Generate(ctx);

        // Alice: only morning, max 2 days
        var aliceMornings = result.ProposedAssignments
            .Count(a => a.EmployeeId == alice.Id && a.ShiftId == TestIds.MorningShiftId);
        var aliceAfternoons = result.ProposedAssignments
            .Count(a => a.EmployeeId == alice.Id && a.ShiftId == TestIds.AfternoonShiftId);

        Assert.True(aliceMornings <= 2, $"Alice should work at most 2 morning slots, got {aliceMornings}");
        Assert.Equal(0, aliceAfternoons);
    }
}
