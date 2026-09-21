using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Tests covering onboarding continuity (new-client "prior week import" flow) and
/// cross-week rotation / consecutive-hours constraint behaviour.
/// </summary>
public sealed class OnboardingAndRotationContinuityTests
{
    // ── Shared helpers (accessible by all nested test classes) ────────────────

    private static ShiftSchedulingEngine Engine() => SchedulingTestBuilder.BuildEngine();
    private static SchedulingState EmptyState() => new();

    private static ScheduleSlot Slot(DateOnly date, double hours = 8.0)
        => new(date, TestIds.MorningShiftId, null, hours);

    private static SchedulingState StateWith(params SchedAssignment[] assignments)
    {
        var s = new SchedulingState();
        s.Proposed.AddRange(assignments);
        return s;
    }

    private static SchedAssignment Morning(Guid empId, DateOnly date)
        => new(empId, TestIds.MorningShiftId, date);

    // ════════════════════════════════════════════════════════════════════════
    // ConsecutiveHoursConstraint — direct evaluation (no engine)
    // ════════════════════════════════════════════════════════════════════════

    public sealed class ConsecutiveHoursConstraintTests
    {
        private readonly ConsecutiveHoursConstraint _sut = new();
        private static readonly SchedEmployee Alice =
            SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");

        // Builds a minimal context with morning-shift day-schedules.
        private static SchedulingContext Ctx(
            bool weekends = false,
            IEnumerable<SchedAssignment>? prior = null,
            IEnumerable<SchedAssignment>? locked = null)
        {
            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(weekends)
                .AddEmployee(Alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));

            var days = weekends
                ? new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                          DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday }
                : new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                          DayOfWeek.Thursday, DayOfWeek.Friday };

            foreach (var d in days)
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, d, 8.0));

            if (prior  is not null) foreach (var a in prior)  b.AddPriorAssignment(a);
            if (locked is not null) foreach (var a in locked) b.AddLockedAssignment(a);

            return b.Build();
        }

        [Fact]
        public void NoHistory_IsAllowed()
        {
            var result = _sut.Evaluate(Ctx(), EmptyState(), Alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.False(result.Violated);
        }

        [Fact]
        public void FourConsecutiveDaysInState_FifthDay_Allowed()
        {
            // 4×8h = 32h streak; +8h = 40h ≤ 48h
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu));

            var result = _sut.Evaluate(Ctx(), state, Alice,
                Slot(SchedulingTestBuilder.Week1.Fri));
            Assert.False(result.Violated);
        }

        [Fact]
        public void FiveConsecutiveDays_SixthDay_Exact48h_Allowed()
        {
            // weekendsWorking=true: Mon–Fri (5×8h=40h) then Saturday slot → 40+8=48, NOT > 48
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri));

            var result = _sut.Evaluate(Ctx(weekends: true), state, Alice,
                Slot(SchedulingTestBuilder.Week1.Sat));
            Assert.False(result.Violated);
        }

        [Fact]
        public void SixConsecutiveDays_SeventhDay_Blocked()
        {
            // 6×8h = 48h streak; +8h = 56h > 48h → blocked
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat));

            var result = _sut.Evaluate(Ctx(weekends: true), state, Alice,
                Slot(SchedulingTestBuilder.Week1.Sun));
            Assert.True(result.Violated);
        }

        [Fact]
        public void GapInMiddle_ResetsStreak_IsAllowed()
        {
            // Mon, Tue worked; Wed is gap; Thu, Fri worked; Saturday slot.
            // Backwards from Sat: Fri(8h) + Thu(8h) → Wed = no assignment → streak = 16h; 16+8=24 ≤ 48
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri));

            var result = _sut.Evaluate(Ctx(weekends: true), state, Alice,
                Slot(SchedulingTestBuilder.Week1.Sat));
            Assert.False(result.Violated);
        }

        [Fact]
        public void CrossWeek_WeekendsOff_SundayBreaksStreak_IsAllowed()
        {
            // Prior week Mon–Fri (5×8h). No Sat/Sun assignments (weekendsWorking=false).
            // Slot: Week1.Mon. Look-back hits Sunday → no assignment → streak = 0.
            var prior = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Fri),
            };

            var result = _sut.Evaluate(Ctx(prior: prior), EmptyState(), Alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.False(result.Violated);
        }

        [Fact]
        public void CrossWeek_WeekendsWorking_SixConsecutiveDays_FirstDayOfNextWeek_Blocked()
        {
            // Prior week Tue–Sun (6 consecutive days = 48h, weekendsWorking=true).
            // Slot: Week1.Mon → streak = 48h; 48+8 = 56 > 48 → blocked.
            var prior = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Sun),
            };

            var result = _sut.Evaluate(Ctx(weekends: true, prior: prior), EmptyState(), Alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.True(result.Violated);
        }

        [Fact]
        public void PriorAssignments_CombinedWithState_Trigger_Block()
        {
            // PriorAssignments: Week0.Thu,Fri,Sat,Sun (4 days = 32h, weekendsWorking=true).
            // State.Proposed: Week1.Mon, Tue (2 days = 16h). Total streak before Wed = 48h.
            // Slot: Week1.Wed → 48+8 = 56 > 48 → blocked.
            // If PriorAssignments were ignored the streak would be 16h and the slot allowed.
            var prior = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Sat),
                Morning(Alice.Id, SchedulingTestBuilder.Week0.Sun),
            };
            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue));

            var result = _sut.Evaluate(Ctx(weekends: true, prior: prior), state, Alice,
                Slot(SchedulingTestBuilder.Week1.Wed));
            Assert.True(result.Violated);
        }

        [Fact]
        public void LockedAssignments_CountInStreak_Blocked()
        {
            // Locked Mon–Sat (6 days = 48h, weekendsWorking=true). Slot: Sun → 56h > 48 → blocked.
            var locked = new[]
            {
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Fri),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Sat),
            };

            var result = _sut.Evaluate(Ctx(weekends: true, locked: locked), EmptyState(), Alice,
                Slot(SchedulingTestBuilder.Week1.Sun));
            Assert.True(result.Violated);
        }

        [Fact]
        public void LongShifts_12h_FourDaysReachCap_FifthDayBlocked()
        {
            // 4×12h = 48h streak; 5th slot (12h) → 60h > 48 → blocked.
            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddEmployee(Alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));
            foreach (var d in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                                      DayOfWeek.Thursday, DayOfWeek.Friday })
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, d, 12.0));
            var ctx = b.Build();

            var state = StateWith(
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Mon),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Tue),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Wed),
                Morning(Alice.Id, SchedulingTestBuilder.Week1.Thu));

            var result = _sut.Evaluate(ctx, state, Alice,
                new ScheduleSlot(SchedulingTestBuilder.Week1.Fri, TestIds.MorningShiftId, null, 12.0));
            Assert.True(result.Violated);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // RotationPatternConstraint — anchor continuity (direct evaluation)
    // ════════════════════════════════════════════════════════════════════════

    public sealed class RotationAnchorContinuityTests
    {
        private readonly RotationPatternConstraint _sut = new();

        private static SchedulingContext Ctx(
            SchedEmployee emp,
            DateOnly? anchor = null,
            SchedRotationPattern? pattern = null)
        {
            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddEmployee(emp);

            if (pattern is not null) b.AddRotationPattern(pattern);
            if (anchor.HasValue)     b.WithRotationAnchor(emp.Id, anchor.Value);

            return b.Build();
        }

        // anchor=Week0.Mon, 5on/2off:
        //   Working days Apr27→May4  = 5  → mod 5%7=5  → 5 ≥ 5 daysOn → off-block
        //   Working days Apr27→May5  = 6  → mod 6%7=6  → 6 ≥ 5         → off-block
        //   Working days Apr27→May6  = 7  → mod 7%7=0  → 0 < 5         → on-block
        //   Working days Apr27→May13 = 12 → mod 12%7=5 → 5 ≥ 5         → off-block (Week2.Wed)

        [Fact]
        public void AnchorWeek0Mon_5on2off_Week1Mon_IsOffBlock()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = Ctx(alice, SchedulingTestBuilder.Week0.Mon, SchedulingTestBuilder.Pattern5on2off());
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.True(result.Violated);
        }

        [Fact]
        public void AnchorWeek0Mon_5on2off_Week1Tue_IsOffBlock()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = Ctx(alice, SchedulingTestBuilder.Week0.Mon, SchedulingTestBuilder.Pattern5on2off());
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week1.Tue));
            Assert.True(result.Violated);
        }

        [Fact]
        public void AnchorWeek0Mon_5on2off_Week1Wed_IsOnBlock()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = Ctx(alice, SchedulingTestBuilder.Week0.Mon, SchedulingTestBuilder.Pattern5on2off());
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week1.Wed));
            Assert.False(result.Violated);
        }

        [Fact]
        public void AnchorWeek0Mon_5on2off_Week2Wed_IsOffBlock()
        {
            // Rotation off-days repeat: working day 12 → mod=5 → off-block again
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = Ctx(alice, SchedulingTestBuilder.Week0.Mon, SchedulingTestBuilder.Pattern5on2off());
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week2.Wed));
            Assert.True(result.Violated);
        }

        [Fact]
        public void NoPattern_AlwaysAllowed()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice"); // no pattern
            var ctx = Ctx(alice);
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.False(result.Violated);
        }

        [Fact]
        public void PatternSet_ButNoAnchorInContext_AlwaysAllowed()
        {
            // Engine omitted this employee from RotationAnchors — no constraint applies.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = Ctx(alice, anchor: null, pattern: SchedulingTestBuilder.Pattern5on2off());
            var result = _sut.Evaluate(ctx, EmptyState(), alice,
                Slot(SchedulingTestBuilder.Week1.Mon));
            Assert.False(result.Violated);
        }

        [Fact]
        public void TwoEmployees_DifferentAnchors_IndependentOffDays()
        {
            // Alice anchor=Week0.Mon → Week1.Mon off-block; Bob anchor=Week1.Mon → Week1.Mon on-block (pos 0)
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddEmployee(alice).AddEmployee(bob)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                .WithRotationAnchor(bob.Id,   SchedulingTestBuilder.Week1.Mon)
                .Build();

            var aliceResult = _sut.Evaluate(ctx, EmptyState(), alice, Slot(SchedulingTestBuilder.Week1.Mon));
            var bobResult   = _sut.Evaluate(ctx, EmptyState(), bob,   Slot(SchedulingTestBuilder.Week1.Mon));

            Assert.True(aliceResult.Violated);   // off-block
            Assert.False(bobResult.Violated);    // on-block (position 0)
        }

        [Fact]
        public void Pattern3on2off_AnchorWeek1Mon_ThursFri_AreOffBlock()
        {
            // 3on/2off cycle=5. Anchor=Week1.Mon.
            //   Mon→Thu: 3 working days → mod=3%5=3 → 3 ≥ 3 daysOn → off
            //   Mon→Fri: 4 working days → mod=4%5=4 → 4 ≥ 3         → off
            var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
                rotationPatternId: TestIds.PatternId3on2off);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddEmployee(bob)
                .AddRotationPattern(SchedulingTestBuilder.Pattern3on2off())
                .WithRotationAnchor(bob.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            var thu = _sut.Evaluate(ctx, EmptyState(), bob, Slot(SchedulingTestBuilder.Week1.Thu));
            var fri = _sut.Evaluate(ctx, EmptyState(), bob, Slot(SchedulingTestBuilder.Week1.Fri));

            Assert.True(thu.Violated);
            Assert.True(fri.Violated);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // OnboardingWeekContinuity — full-engine integration, single week
    // ════════════════════════════════════════════════════════════════════════

    public sealed class OnboardingWeekContinuityTests
    {
        [Fact]
        public void FreshStart_NoPattern_FullWeekScheduled()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .Build();

            var result = Engine().Generate(ctx);
            Assert.Equal(5, result.FilledSlots);
        }

        [Fact]
        public void RotationAnchor_OnlyEmployee_OffDaysUnfilled()
        {
            // Alice is off-block Mon-Tue (anchor=Week0.Mon, 5on/2off).
            // With only one employee, off-block days are left unfilled (hard constraint).
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                .Build();

            var result = Engine().Generate(ctx);

            // Wed-Fri are on-block → filled; Mon-Tue are off-block → unfilled
            Assert.Equal(3, result.FilledSlots);
            Assert.Equal(2, result.UnfilledSlots.Count);
            Assert.True(result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Mon));
            Assert.True(result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Tue));
        }

        [Fact]
        public void TwoEmployees_EnginePrefers_OnBlockEmployee_ForOffDaySlots()
        {
            // Alice off Mon-Tue; Bob on all week → Bob fills Mon and Tue with no rotation violation.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice).AddEmployee(bob)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                .WithRotationAnchor(bob.Id,   SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = Engine().Generate(ctx);

            Assert.True(result.ProposedAssignments.Any(a =>
                a.EmployeeId == bob.Id && a.Date == SchedulingTestBuilder.Week1.Mon),
                "Bob should fill Monday (on-block, no rotation penalty)");
            Assert.True(result.ProposedAssignments.Any(a =>
                a.EmployeeId == bob.Id && a.Date == SchedulingTestBuilder.Week1.Tue),
                "Bob should fill Tuesday (on-block, no rotation penalty)");
            Assert.Empty(result.AcceptedSoftViolations
                .Where(v => v.ConstraintName == "Rotation" &&
                            v.Date == SchedulingTestBuilder.Week1.Mon));
        }

        [Fact]
        public void WeeklyHoursHardCap_16h_Only2SlotsAssigned()
        {
            // Alice can work only 16h (2×8h). 5 morning slots → 2 filled, 3 unfilled.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 16);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .Build();

            var result = Engine().Generate(ctx);
            Assert.Equal(2, result.FilledSlots);
            Assert.Equal(3, result.UnfilledSlots.Count);
        }

        [Fact]
        public void PriorWeek_WeekendsOff_StreakResets_AllFiveDaysFilled()
        {
            // Prior Mon-Fri (40h). Weekend breaks the streak → Week1 Mon-Fri all fillable.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
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
        }

        [Fact]
        public void PriorWeek_WeekendsWorking_SixDays_FirstDayOfNewWeekUnfilled()
        {
            // Prior Tue-Sun (6 consecutive days = 48h, weekendsWorking=true).
            // Week1.Mon: streak = 48h → blocked → slot unfilled (only employee).
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);
            var b = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(true)
                .AddEmployee(alice)
                .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));

            foreach (var d in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                                      DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
                b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, d, 8.0));
            b.AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1));

            foreach (var date in new[]
            {
                SchedulingTestBuilder.Week0.Tue, SchedulingTestBuilder.Week0.Wed,
                SchedulingTestBuilder.Week0.Thu, SchedulingTestBuilder.Week0.Fri,
                SchedulingTestBuilder.Week0.Sat, SchedulingTestBuilder.Week0.Sun,
            })
                b.AddPriorAssignment(Morning(alice.Id, date));

            var result = Engine().Generate(b.Build());

            Assert.True(result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Mon),
                "Week1.Mon must be unfilled — consecutive-hours cap hit from prior week.");
        }

        [Fact]
        public void PersistedAnchor_WithPriorWeekWorked_RotationContinuity_OffDaysUnfilled()
        {
            // Full onboarding simulation: Alice's anchor = Week0.Mon (client provided).
            // She worked Mon-Fri Week0. In Week1, Mon-Tue are off-block → hard-blocked → unfilled.
            // Wed-Fri are on-block → filled.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off,
                rotationAnchorDate: SchedulingTestBuilder.Week0.Mon);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithMorningShiftOnly(minStaff: 1)
                .AddEmployee(alice)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Mon))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Tue))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Wed))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Thu))
                .AddPriorAssignment(Morning(alice.Id, SchedulingTestBuilder.Week0.Fri))
                .Build();

            var result = Engine().Generate(ctx);

            Assert.Equal(3, result.FilledSlots);
            Assert.Equal(2, result.UnfilledSlots.Count);
            Assert.True(result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Mon));
            Assert.True(result.UnfilledSlots.Any(s => s.Date == SchedulingTestBuilder.Week1.Tue));
            Assert.True(result.ProposedAssignments.Any(a => a.Date == SchedulingTestBuilder.Week1.Wed));
            Assert.True(result.ProposedAssignments.Any(a => a.Date == SchedulingTestBuilder.Week1.Thu));
            Assert.True(result.ProposedAssignments.Any(a => a.Date == SchedulingTestBuilder.Week1.Fri));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // OnboardingMonthContinuity — multi-week integration
    // ════════════════════════════════════════════════════════════════════════

    public sealed class OnboardingMonthContinuityTests
    {
        private sealed record WeekResult(
            DateOnly WeekStart,
            IReadOnlyList<SchedAssignment> Proposed,
            IReadOnlyList<UnfilledSlotInfo> Unfilled,
            IReadOnlyList<ScheduleViolation> SoftViolations);

        private static List<WeekResult> RunMonth(
            IEnumerable<DateOnly> weeks,
            Func<DateOnly, Dictionary<Guid, double>, List<SchedAssignment>, SchedulingContext> factory)
        {
            var accumulated = new Dictionary<Guid, double>();
            var allPrior    = new List<SchedAssignment>();
            var results     = new List<WeekResult>();

            foreach (var weekStart in weeks)
            {
                var ctx    = factory(weekStart, accumulated, allPrior);
                var result = Engine().Generate(ctx);
                results.Add(new WeekResult(weekStart, result.ProposedAssignments,
                    result.UnfilledSlots, result.AcceptedSoftViolations));

                var hoursLookup = ctx.DaySchedules
                    .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
                foreach (var a in result.ProposedAssignments)
                {
                    var h = hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var hrs) ? hrs : 0.0;
                    accumulated[a.EmployeeId] =
                        (accumulated.TryGetValue(a.EmployeeId, out var prev) ? prev : 0.0) + h;
                }
                allPrior.AddRange(result.ProposedAssignments);
            }
            return results;
        }

        private static readonly DateOnly[] FourWeeks =
        [
            SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week2.Mon,
            SchedulingTestBuilder.Week3.Mon, SchedulingTestBuilder.Week4.Mon,
        ];

        [Fact]
        public void Month_FreshStart_SingleEmployee_AllFourWeeksFilled()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");

            var results = RunMonth(FourWeeks, (weekStart, acc, _) =>
                new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithMorningShiftOnly(minStaff: 1)
                    .AddEmployee(alice)
                    .WithAccumulatedHours(alice.Id, acc.TryGetValue(alice.Id, out var h) ? h : 0)
                    .Build());

            Assert.Equal(20, results.Sum(w => w.Proposed.Count));
            Assert.All(results, w => Assert.Empty(w.Unfilled));
        }

        [Fact]
        public void Month_TwoEmployees_HoursDistributedEqually()
        {
            // 2 employees, minStaff=2 per slot, equal contracts → equal assignment counts.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

            var results = RunMonth(FourWeeks, (weekStart, acc, _) =>
                new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithMorningShiftOnly(minStaff: 2)
                    .AddEmployee(alice).AddEmployee(bob)
                    .WithAccumulatedHours(alice.Id, acc.TryGetValue(alice.Id, out var ha) ? ha : 0)
                    .WithAccumulatedHours(bob.Id,   acc.TryGetValue(bob.Id,   out var hb) ? hb : 0)
                    .Build());

            var aliceCount = results.Sum(w => w.Proposed.Count(a => a.EmployeeId == alice.Id));
            var bobCount   = results.Sum(w => w.Proposed.Count(a => a.EmployeeId == bob.Id));

            Assert.Equal(aliceCount, bobCount);
            Assert.Equal(0, results.Sum(w => w.Unfilled.Count));
        }

        [Fact]
        public void Month_Absence_EmployeeNotAssigned_PartnerCoversAll()
        {
            // Alice absent all of Week2. Bob covers her slots. Weeks 1, 3, 4 split normally.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

            var results = RunMonth(FourWeeks, (weekStart, acc, _) =>
                new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithMorningShiftOnly(minStaff: 1)
                    .AddEmployee(alice).AddEmployee(bob)
                    .AddAbsence(new SchedAbsence(
                        alice.Id,
                        SchedulingTestBuilder.Week2.Mon,
                        SchedulingTestBuilder.Week2.Fri))
                    .WithAccumulatedHours(alice.Id, acc.TryGetValue(alice.Id, out var ha) ? ha : 0)
                    .WithAccumulatedHours(bob.Id,   acc.TryGetValue(bob.Id,   out var hb) ? hb : 0)
                    .Build());

            var week2 = results.First(w => w.WeekStart == SchedulingTestBuilder.Week2.Mon);
            Assert.Empty(week2.Proposed.Where(a => a.EmployeeId == alice.Id));
            Assert.Equal(5, week2.Proposed.Count(a => a.EmployeeId == bob.Id));
            Assert.Empty(week2.Unfilled);
        }

        [Fact]
        public void Month_PriorWeekImported_RotationContinuity_OffDaysUnfilled()
        {
            // Onboarding: client provides Week0. Alice has 5on/2off, anchor=Week0.Mon.
            // Rotation is a HARD constraint — off-days are left unfilled rather than generating violations.
            // Off-days over 4 weeks: Week1.Mon, Week1.Tue, Week2.Wed, Week2.Thu, Week3.Fri, Week4.Mon (6 total).
            // Expected: 14 filled, 6 unfilled, no rotation entries in AcceptedSoftViolations.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off,
                rotationAnchorDate: SchedulingTestBuilder.Week0.Mon);

            var week0Prior = new[]
            {
                Morning(alice.Id, SchedulingTestBuilder.Week0.Mon),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Tue),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Wed),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Thu),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Fri),
            };

            var results = RunMonth(FourWeeks, (weekStart, acc, prior) =>
            {
                var b = new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithMorningShiftOnly(minStaff: 1)
                    .AddEmployee(alice)
                    .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                    .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                    .WithAccumulatedHours(alice.Id, acc.TryGetValue(alice.Id, out var h) ? h : 0);

                foreach (var a in week0Prior) b.AddPriorAssignment(a);
                foreach (var a in prior)      b.AddPriorAssignment(a);
                return b.Build();
            });

            Assert.Equal(14, results.Sum(w => w.Proposed.Count));
            Assert.Equal(6,  results.Sum(w => w.Unfilled.Count));
            Assert.Empty(results.SelectMany(w => w.SoftViolations)
                .Where(v => v.ConstraintName == "Rotation"));
        }

        [Fact]
        public void Month_WeekendsWorking_ConsecutiveHours_NeverExceeds6Days()
        {
            // weekendsWorking=true, high contract so OvertimeConstraint doesn't interfere.
            // ConsecutiveHoursConstraint must prevent any run > 6 consecutive days.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 80);
            var allAssigned = new List<SchedAssignment>();
            var accumulated = new Dictionary<Guid, double>();

            foreach (var weekStart in FourWeeks)
            {
                var b = new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithWeekendsWorking(true)
                    .AddEmployee(alice)
                    .AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"))
                    .WithAccumulatedHours(alice.Id, accumulated.TryGetValue(alice.Id, out var h) ? h : 0);

                foreach (var d in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                                          DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday })
                    b.AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, d, 8.0));
                b.AddPositionRequirement(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, 1));

                foreach (var a in allAssigned) b.AddPriorAssignment(a);

                var result = Engine().Generate(b.Build());
                allAssigned.AddRange(result.ProposedAssignments);
                foreach (var a in result.ProposedAssignments)
                    accumulated[a.EmployeeId] =
                        (accumulated.TryGetValue(a.EmployeeId, out var prev) ? prev : 0) + 8.0;
            }

            // Verify no global run of 7+ consecutive days across all four weeks.
            var sortedDates = allAssigned.Select(a => a.Date).OrderBy(d => d).ToList();
            var streak = 1;
            for (var i = 1; i < sortedDates.Count; i++)
            {
                streak = sortedDates[i] == sortedDates[i - 1].AddDays(1) ? streak + 1 : 1;
                Assert.True(streak <= 6,
                    $"Consecutive streak of {streak} days detected starting {sortedDates[i - streak + 1]:yyyy-MM-dd}");
            }
        }

        [Fact]
        public void Month_FullOnboarding_TwoEmployees_DifferentAnchors_AllSlotsCovered()
        {
            // Both employees have 5on/2off but staggered anchors so their off-days differ.
            // With minStaff=1, every slot should be filled by whichever is on-block.
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off,
                rotationAnchorDate: SchedulingTestBuilder.Week0.Mon);
            var bob = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
                rotationPatternId: TestIds.PatternId5on2off,
                rotationAnchorDate: SchedulingTestBuilder.Week0.Wed); // offset anchor

            var week0Prior = new[]
            {
                Morning(alice.Id, SchedulingTestBuilder.Week0.Mon),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Tue),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Wed),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Thu),
                Morning(alice.Id, SchedulingTestBuilder.Week0.Fri),
                Morning(bob.Id,   SchedulingTestBuilder.Week0.Wed),
                Morning(bob.Id,   SchedulingTestBuilder.Week0.Thu),
                Morning(bob.Id,   SchedulingTestBuilder.Week0.Fri),
            };

            var results = RunMonth(FourWeeks, (weekStart, acc, prior) =>
            {
                var b = new SchedulingTestBuilder()
                    .WithWeek(weekStart)
                    .WithMorningShiftOnly(minStaff: 1)
                    .AddEmployee(alice).AddEmployee(bob)
                    .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                    .WithRotationAnchor(alice.Id, SchedulingTestBuilder.Week0.Mon)
                    .WithRotationAnchor(bob.Id,   SchedulingTestBuilder.Week0.Wed)
                    .WithAccumulatedHours(alice.Id, acc.TryGetValue(alice.Id, out var ha) ? ha : 0)
                    .WithAccumulatedHours(bob.Id,   acc.TryGetValue(bob.Id,   out var hb) ? hb : 0);

                foreach (var a in week0Prior) b.AddPriorAssignment(a);
                foreach (var a in prior)      b.AddPriorAssignment(a);
                return b.Build();
            });

            Assert.Equal(20, results.Sum(w => w.Proposed.Count));
            Assert.All(results, w => Assert.Empty(w.Unfilled));
        }
    }
}
