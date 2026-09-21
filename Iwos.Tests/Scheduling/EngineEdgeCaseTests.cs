using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Business.Scheduling.Optimizer;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Edge-case tests generated from a QA engineering audit of the scheduling engine.
/// Each section documents a specific bug or weakness found and the expected correct behaviour.
///
/// BUGS confirmed at audit time (2026-04-27):
///   BUG-1  ConsecutiveHoursConstraint — gap-insertion not forward-scanned (FIXED)
///   BUG-2  SmartScheduleOptimizer.BuildShiftDateCount — locked assignments excluded from min-staff guard
///   BUG-3  UnderUtilizedFiller — only first (Position, ShiftId) pair is attempted per run
///
/// WEAKNESSES documented:
///   W-1    Single-pass greedy engine — no backtracking
///   W-2    Rotation stagger is alphabetically sorted — first name always gets cycle position 0
///   W-3    ComputeRotationAnchors excludes persisted-anchor employees from stagger count n
///   W-4    OvertimeConstraint is strictly per-week; cross-week accumulation affects priority only
/// </summary>
public sealed class EngineEdgeCaseTests
{
    private static ShiftSchedulingEngine Engine() => SchedulingTestBuilder.BuildEngine();
    private static SchedulingState EmptyState() => new();

    private static SchedAssignment Morning(Guid empId, DateOnly date)
        => new(empId, TestIds.MorningShiftId, date);

    private static SchedAssignment Afternoon(Guid empId, DateOnly date)
        => new(empId, TestIds.AfternoonShiftId, date);

    // ════════════════════════════════════════════════════════════════════════
    // BUG-1  ConsecutiveHoursConstraint — gap-insertion (forward-looking scan)
    //
    // Before the fix, only the backward streak was checked. Inserting a day
    // into the MIDDLE of an already-scheduled run (e.g. Tuesday into an
    // existing Mon + Wed–Sun block) would only count Mon backwards and miss
    // the forward run (Wed–Sun), incorrectly allowing the assignment.
    //
    // The fix added SumConsecutiveHoursAfterDate which walks forward from the
    // proposed date, stopping at the first unassigned day.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class ConsecutiveHoursGapInsertionTests
    {
        private readonly ConsecutiveHoursConstraint _sut = new();

        private static readonly SchedEmployee Alice =
            SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);

        /// <summary>Builds a 7-day context (weekendsWorking=true) with the given prior assignments.</summary>
        private static SchedulingContext Ctx(
            IEnumerable<SchedAssignment>? prior = null,
            IEnumerable<SchedAssignment>? state = null,
            IEnumerable<SchedAssignment>? locked = null)
        {
            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(true)
                .AddEmployee(Alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));

            foreach (var dow in new[] {
                DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0));

            if (prior  != null) foreach (var a in prior)  b.AddPriorAssignment(a);
            if (locked != null) foreach (var a in locked) b.AddLockedAssignment(a);
            return b.Build();
        }

        private static SchedulingState StateWith(params SchedAssignment[] assignments)
        {
            var s = new SchedulingState();
            s.Proposed.AddRange(assignments);
            return s;
        }

        [Fact]
        public void InsertTuesdayIntoMonWedThurFri_NotExceeding48h_IsAllowed()
        {
            // Mon + Wed + Thu + Fri already assigned (4 × 8h = 32h).
            // Insert Tue: backward streak = Mon = 8h; forward streak = Wed+Thu+Fri = 24h.
            // Total = 8 + 8 + 24 = 40h ≤ 48h → allowed.
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri));

            var result = _sut.Evaluate(Ctx(), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Tue, TestIds.MorningShiftId, null, 8.0));

            Assert.False(result.Violated,
                "40h projected streak should be within the 48h limit");
        }

        [Fact]
        public void InsertTuesdayIntoMon_WedThroughSun_Exceeds48h_IsBlocked()
        {
            // Mon + Wed + Thu + Fri + Sat + Sun (6 days) already assigned.
            // Insert Tue: backward = Mon = 8h; forward = Wed+Thu+Fri+Sat+Sun = 40h.
            // Total = 8 + 8 + 40 = 56h > 48h → BLOCKED.
            // Without the fix (backward-only), only 8+8=16h would be seen → wrongly allowed.
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sun));

            var result = _sut.Evaluate(Ctx(), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Tue, TestIds.MorningShiftId, null, 8.0));

            Assert.True(result.Violated,
                "Inserting Tue into Mon+Wed–Sun would produce a 56h streak and must be blocked");
            Assert.Contains("56", result.Reason);
        }

        [Fact]
        public void InsertWednesdayIntoThuFriSatSun_WithPriorMonTue_Exceeds48h_IsBlocked()
        {
            // Prior: Mon + Tue (cross-week, via PriorAssignments).
            // State: Thu + Fri + Sat + Sun.
            // Insert Wed: backward from Wed = Tue(8) + Mon(8) = 16h; forward = Thu+Fri+Sat+Sun = 32h.
            // Total = 16 + 8 + 32 = 56h > 48h → BLOCKED.
            var prior = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
            };
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sun));

            var result = _sut.Evaluate(Ctx(prior: prior), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Wed, TestIds.MorningShiftId, null, 8.0));

            Assert.True(result.Violated,
                "Cross-source streak: prior Mon+Tue + state Thu–Sun bridge over proposed Wed = 56h, must be blocked");
        }

        [Fact]
        public void InsertMiddleDay_ForwardRunFromLockedAssignments_IsDetected()
        {
            // Wed–Sun locked (5 × 8h = 40h). Mon assigned in state.
            // Insert Tue: backward = Mon = 8h; forward = locked Wed+Thu+Fri+Sat+Sun = 40h.
            // Total = 8 + 8 + 40 = 56h → BLOCKED (locked assignments must be visible to forward scan).
            var locked = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sun),
            };
            var state = StateWith(Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon));

            var result = _sut.Evaluate(Ctx(locked: locked), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Tue, TestIds.MorningShiftId, null, 8.0));

            Assert.True(result.Violated,
                "Forward run across locked assignments must be detected; total streak = 56h");
        }

        [Fact]
        public void InsertMiddleDay_ForwardRunExactly48h_IsAllowed()
        {
            // Wed–Fri in state (3 × 8h = 24h). No backward run.
            // Insert Wed... let's do: nothing before, Wed–Fri–Sat–Sun forward (4×8h=32h).
            // Total = 0 + 8 + 32 = 40h ≤ 48h → allowed.
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sun));

            var result = _sut.Evaluate(Ctx(), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Wed, TestIds.MorningShiftId, null, 8.0));

            Assert.False(result.Violated,
                "0 + 8 + 32 = 40h ≤ 48h: should be allowed");
        }

        [Fact]
        public void FiveDayBackwardStreak_SixthDayExactly48h_IsAllowed()
        {
            // Mon–Fri in state (5 × 8h = 40h). Add Saturday.
            // backward from Sat: Fri(8)+Thu(8)+Wed(8)+Tue(8)+Mon(8) = 40h; forward: Sun not assigned → 0h.
            // Total = 40 + 8 + 0 = 48h → exactly at cap, NOT > 48h → allowed.
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri));

            var result = _sut.Evaluate(Ctx(), state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Sat, TestIds.MorningShiftId, null, 8.0));

            Assert.False(result.Violated,
                "40h backward + 8h slot + 0h forward = 48h exactly; not > 48h, so allowed");
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Cross-week continuous scheduling — regression battery
    //
    // These tests verify that the engine treats weeks as a continuous timeline,
    // not as isolated date ranges. Consecutive-hours, rest-period, and rotation
    // constraints must all be evaluated across the week boundary.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class CrossWeekContinuityTests
    {
        [Fact]
        public void Engine_PriorWeekSixDays_FirstDayNewWeek_LeftUnfilled_WeekendsWorking()
        {
            // Alice worked Tue–Sun of Week0 (6 consecutive days = 48h).
            // Week1.Mon would push streak to 56h → blocked by ConsecutiveHoursConstraint.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);

            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(true)
                .AddEmployee(alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));

            foreach (var dow in new[] {
                DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0));
            b.AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1));

            foreach (var d in new[] {
                SchedulingTestBuilder.Week0.Tue, SchedulingTestBuilder.Week0.Wed,
                SchedulingTestBuilder.Week0.Thu, SchedulingTestBuilder.Week0.Fri,
                SchedulingTestBuilder.Week0.Sat, SchedulingTestBuilder.Week0.Sun })
                b.AddPriorAssignment(Morning(alice.Id, d));

            var result = Engine().Generate(b.Build());

            Assert.True(
                result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Mon),
                "Monday must be unfilled: prior Tue–Sun streak already hit 48h cap");

            Assert.True(
                result.ProposedAssignments.Any(a => a.Date == SchedulingTestBuilder.Week1.Tue),
                "Tuesday (streak resets after Monday day-off) should be filled");
        }

        [Fact]
        public void Engine_WeekendsOff_PriorFiveDays_NewWeekFullyFilled()
        {
            // With weekendsWorking=false, Sat+Sun break the streak.
            // Prior Mon–Fri (40h). New week Mon–Fri: streak resets each day → all filled.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(false)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Mon))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Tue))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Wed))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Thu))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Fri))
                .Build();

            var result = Engine().Generate(ctx);

            Assert.Equal(5, result.FilledSlots);
            Assert.Empty(result.UnfilledSlots);
        }

        [Fact]
        public void Engine_TwoPositions_OneCoveredByLock_OtherFilled_BothMeetMinimum()
        {
            // Morning shift requires 1×PositionA + 1×PositionB per day.
            // Alice (PositionA) is locked on Monday.
            // Bob (PositionB) should be proposed for Monday by the engine.
            // Result: all position slots for Monday filled.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", positionId: TestIds.PositionA);
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",   positionId: TestIds.PositionB);

            var monday = SchedulingTestBuilder.Week1.Mon;

            var ctx = new SchedulingTestBuilder()
                .WithWeek(monday)
                .AddEmployee(alice).AddEmployee(bob)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
                .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Monday, 8.0, 6.0))
                .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Tuesday,   8.0, 6.0))
                .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Wednesday, 8.0, 6.0))
                .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Thursday,  8.0, 6.0))
                .AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, DayOfWeek.Friday,    8.0, 6.0))
                .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1))
                .AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionB, 1))
                .AddLockedAssignment(new SchedAssignment(alice.Id, TestIds.MorningShiftId, monday))
                .Build();

            var result = Engine().Generate(ctx);

            Assert.True(
                result.ProposedAssignments.Any(a => a.EmployeeId == bob.Id && a.Date == monday),
                "Bob (PositionB) must fill the PositionB slot on Monday");

            // PositionA Monday is covered by the locked Alice assignment — engine must not add a duplicate proposal for the same date.
            Assert.False(
                result.ProposedAssignments.Any(a => a.EmployeeId == alice.Id && a.Date == monday),
                "Alice is locked on Monday — engine must not double-propose her on that date");
        }

        [Fact]
        public void ConsecutiveHours_CrossWeekInsertion_ThreeParts_Blocked()
        {
            // Week0 Thu+Fri in prior (16h).
            // Week1 Mon+Tue in state.Proposed (16h).
            // Now try to insert Week0.Sat (weekend, weekendsWorking=true).
            //   backward from Sat: Fri(8)+Thu(8) = 16h
            //   forward from Sat: Sun?= no assignment. → forward = 0h.
            //   total = 16 + 8 + 0 = 24h ≤ 48 → allowed (Sat insertion is fine here).
            //
            // Harder case: prior Thu+Fri+Sat+Sun (32h). State Mon+Tue (16h). Insert Wed of Week1.
            //   backward from Wed: Tue(8)+Mon(8) = 16h; then Sun is last prior → 8h; Sat=8h; Fri=8h; Thu=8h → total backward=48h
            //   forward from Wed: Thu? not assigned → 0h.
            //   total = 48 + 8 + 0 = 56h > 48h → BLOCKED.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);

            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(true)
                .AddEmployee(alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));
            foreach (var dow in new[] {
                DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0));

            // Prior: Thu+Fri+Sat+Sun of Week0 = 4 consecutive days = 32h
            b.AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Thu));
            b.AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Fri));
            b.AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Sat));
            b.AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Sun));

            var ctx = b.Build();
            var sut  = new ConsecutiveHoursConstraint();

            // State: Mon+Tue proposed
            var state = new SchedulingState();
            state.Proposed.Add(Morning(alice.Id, SchedulingTestBuilder.Week1.Mon));
            state.Proposed.Add(Morning(alice.Id, SchedulingTestBuilder.Week1.Tue));

            // Insert Wed: backward = Tue(8)+Mon(8)+Sun(8)+Sat(8)+Fri(8)+Thu(8) = 48h; forward = 0h.
            // total = 48 + 8 + 0 = 56h > 48h → BLOCKED.
            var result = sut.Evaluate(ctx, state, alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Wed, TestIds.MorningShiftId, null, 8.0));

            Assert.True(result.Violated,
                "6-day cross-week streak (Thu–Sun prior + Mon–Wed current) = 56h must be blocked");
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // W-2  Rotation stagger alphabetical bias (weakness documentation)
    //
    // ComputeRotationAnchors sorts employees by FullName before assigning cycle
    // phases. This means "Aaron" always gets phase 0 (the first position in the
    // on-block) and "Zoe" always gets the last phase. Over time, employees early
    // in the alphabet accumulate the same off-days each cycle.
    //
    // This is a weakness test — it documents that the constraint produces
    // deterministic results based on sort order, not randomness.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class RotationStaggerAlphabeticalBiasTests
    {
        private readonly RotationPatternConstraint _sut = new();

        [Fact]
        public void TwoEmployees_DifferentNames_SamePattern_ReceiveDifferentPhases()
        {
            // "Aaron" and "Zoe" with 5on/2off pattern, staggered so their off-days differ.
            // Off-days cycle length = 7. With 2 employees: phase step = 7/2 ≈ 3.
            // Aaron: anchor = Week1.Mon (phase 0); Zoe: anchor ≈ 3 working days later.
            var aaron = SchedulingTestBuilder.Employee(TestIds.Employee1, "Aaron",
                rotationPatternId: TestIds.PatternId5on2off);
            var zoe   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Zoe",
                rotationPatternId: TestIds.PatternId5on2off);

            // Aaron: anchor=Week1.Mon → Week2.Mon is off (pos 5 → off-block)
            // Zoe:   anchor=Week1.Thu → Week2.Mon: working day count from Thu to Mon = 3 → pos 3 → on-block
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddEmployee(aaron).AddEmployee(zoe)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(aaron.Id, SchedulingTestBuilder.Week1.Mon)
                .WithRotationAnchor(zoe.Id,   SchedulingTestBuilder.Week1.Thu)
                .Build();

            var aaronMon = _sut.Evaluate(ctx, EmptyState(), aaron,
                new ScheduleSlot(SchedulingTestBuilder.Week2.Mon, TestIds.MorningShiftId, null, 8.0));
            var zoeMon = _sut.Evaluate(ctx, EmptyState(), zoe,
                new ScheduleSlot(SchedulingTestBuilder.Week2.Mon, TestIds.MorningShiftId, null, 8.0));

            // Aaron is in off-block on Week2.Mon (anchor Week1.Mon → 5 working days later = off)
            Assert.True(aaronMon.Violated, "Aaron should be in off-block on Week2.Mon");
            // Zoe is in on-block (her anchor is 3 working days later, so she's at position 2 = on)
            Assert.False(zoeMon.Violated, "Zoe should be in on-block on Week2.Mon");
        }

        [Fact]
        public void SameName_DifferentAnchors_ProduceDifferentOffDays()
        {
            // When two employees have identical names but different anchors
            // (e.g., manually set by manager), they should still have independent schedules.
            var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alex",
                rotationPatternId: TestIds.PatternId5on2off);
            var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Alex",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddEmployee(emp1).AddEmployee(emp2)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp1.Id, SchedulingTestBuilder.Week1.Mon) // off-block on Week2.Mon
                .WithRotationAnchor(emp2.Id, SchedulingTestBuilder.Week1.Wed) // different anchor
                .Build();

            var r1 = _sut.Evaluate(ctx, EmptyState(), emp1,
                new ScheduleSlot(SchedulingTestBuilder.Week2.Mon, TestIds.MorningShiftId, null, 8.0));
            var r2 = _sut.Evaluate(ctx, EmptyState(), emp2,
                new ScheduleSlot(SchedulingTestBuilder.Week2.Mon, TestIds.MorningShiftId, null, 8.0));

            // emp1 and emp2 have the same name but different anchors → different constraint outcomes
            Assert.NotEqual(r1.Violated, r2.Violated);
        }
    }
}
