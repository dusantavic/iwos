using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Tests.Scheduling.Helpers;
using System;
using System.Collections.Generic;
using Xunit;

namespace Iwos.Tests.Scheduling;

/// <summary>
/// Pure unit tests for each scheduling constraint in isolation.
/// Each test creates a minimal context and calls Evaluate() directly —
/// no engine, no database, no DI.
/// </summary>
public sealed class ConstraintTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static SchedulingState EmptyState() => new();

    private static ScheduleSlot MorningSlot(DateOnly date, double hours = 8.0)
        => new(date, TestIds.MorningShiftId, null, hours);

    private static ScheduleSlot AfternoonSlot(DateOnly date, double hours = 8.0)
        => new(date, TestIds.AfternoonShiftId, null, hours);

    // ════════════════════════════════════════════════════════════════════════
    // AbsenceConstraint — Priority 0, HARD
    // An employee must not be assigned on any day inside an approved absence.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class AbsenceConstraintTests
    {
        private readonly AbsenceConstraint _sut = new();

        [Fact]
        public void Employee_WithNoAbsences_IsAllowed()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void Employee_OnExactAbsenceDay_IsBlocked()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Wed))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Wed));

            Assert.True(result.Violated);
            Assert.Contains("absence", result.Reason, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void Employee_OnDayBeforeAbsenceStart_IsAllowed()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Fri))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Tue));

            Assert.False(result.Violated);
        }

        [Fact]
        public void Employee_OnDayAfterAbsenceEnd_IsAllowed()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Thu))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Fri));

            Assert.False(result.Violated);
        }

        [Fact]
        public void FullWeekAbsence_BlocksAllWorkdays()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Sun))
                .Build();

            foreach (var day in new[]
            {
                SchedulingTestBuilder.Week1.Mon,
                SchedulingTestBuilder.Week1.Tue,
                SchedulingTestBuilder.Week1.Wed,
                SchedulingTestBuilder.Week1.Thu,
                SchedulingTestBuilder.Week1.Fri,
            })
            {
                var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(day));
                Assert.True(result.Violated, $"Expected blocked on {day}");
            }
        }

        [Fact]
        public void AbsenceForOneEmployee_DoesNotBlockOther()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(alice.Id, SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Fri))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), bob, MorningSlot(SchedulingTestBuilder.Week1.Wed));

            Assert.False(result.Violated);
        }

        [Fact]
        public void MultiDayAbsence_AllDaysInsideRangeAreBlocked()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddAbsence(new SchedAbsence(emp.Id, SchedulingTestBuilder.Week1.Tue, SchedulingTestBuilder.Week1.Thu))
                .Build();

            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon)).Violated);
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Tue)).Violated);
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Wed)).Violated);
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Thu)).Violated);
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Fri)).Violated);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // OvertimeConstraint — Priority 2, HARD
    // An employee cannot be scheduled beyond their contracted WeeklyHours.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class OvertimeConstraintTests
    {
        private readonly OvertimeConstraint _sut = new();

        private static SchedulingContext StdContext(bool considerWeeklyHours = true)
            => new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithConsiderWeeklyHours(considerWeeklyHours)
                .Build();

        [Fact]
        public void Employee_AtZeroHours_IsAllowed()
        {
            var emp   = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
            var ctx   = StdContext();
            var state = EmptyState(); // 0 h scheduled

            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void Employee_WouldExceedCap_IsBlocked()
        {
            var emp   = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
            var ctx   = StdContext();
            var state = EmptyState();
            state.AddHours(emp.Id, 36); // 36 + 8 = 44 > 40

            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Mon, hours: 8));

            Assert.True(result.Violated);
            Assert.Contains("44", result.Reason); // projected hours in message
        }

        [Fact]
        public void Employee_ExactlyAtCap_IsBlocked()
        {
            // 40 h already scheduled + 8 h slot = 48 > 40 → blocked
            var emp   = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
            var ctx   = StdContext();
            var state = EmptyState();
            state.AddHours(emp.Id, 40);

            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Mon, hours: 8));

            Assert.True(result.Violated);
        }

        [Fact]
        public void Employee_WouldFitExactly_IsAllowed()
        {
            // 32 h already + 8 h slot = 40 == 40 → allowed
            var emp   = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
            var ctx   = StdContext();
            var state = EmptyState();
            state.AddHours(emp.Id, 32);

            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Mon, hours: 8));

            Assert.False(result.Violated);
        }

        [Fact]
        public void ConsiderWeeklyHours_False_NeverBlocks()
        {
            var emp   = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", weeklyHours: 40);
            var ctx   = StdContext(considerWeeklyHours: false);
            var state = EmptyState();
            state.AddHours(emp.Id, 1000); // far over cap

            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Mon, hours: 8));

            Assert.False(result.Violated);
        }

        [Fact]
        public void PartTimeEmployee_BlockedEarlier_ThanFullTime()
        {
            var partTime  = SchedulingTestBuilder.Employee(TestIds.Employee1, "PartTimer", weeklyHours: 20);
            var fullTime  = SchedulingTestBuilder.Employee(TestIds.Employee2, "FullTimer",  weeklyHours: 40);
            var ctx       = StdContext();
            var statePart = EmptyState();
            var stateFull = EmptyState();
            statePart.AddHours(partTime.Id, 16); // 16 + 8 = 24 > 20 → blocked
            stateFull.AddHours(fullTime.Id, 16); // 16 + 8 = 24 < 40 → allowed

            Assert.True (_sut.Evaluate(ctx, statePart, partTime, MorningSlot(SchedulingTestBuilder.Week1.Mon)).Violated);
            Assert.False(_sut.Evaluate(ctx, stateFull, fullTime, MorningSlot(SchedulingTestBuilder.Week1.Mon)).Violated);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PinnedShiftConstraint — Priority 0, HARD
    // Employees pinned to a shift can only be assigned to that shift.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class PinnedShiftConstraintTests
    {
        private readonly PinnedShiftConstraint _sut = new();

        private static SchedulingContext EmptyContext()
            => new SchedulingTestBuilder().WithWeek(SchedulingTestBuilder.Week1.Mon).Build();

        [Fact]
        public void UnpinnedEmployee_CanWorkAnyShift()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", pinnedShiftId: null);
            var ctx = EmptyContext();

            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot   (SchedulingTestBuilder.Week1.Mon)).Violated);
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, AfternoonSlot (SchedulingTestBuilder.Week1.Mon)).Violated);
        }

        [Fact]
        public void PinnedEmployee_BlockedFromOtherShift()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", pinnedShiftId: TestIds.MorningShiftId);
            var ctx = EmptyContext();

            var afternoonSlot = AfternoonSlot(SchedulingTestBuilder.Week1.Mon);
            var result = _sut.Evaluate(ctx, EmptyState(), emp, afternoonSlot);

            Assert.True(result.Violated);
            Assert.Contains("pinned", result.Reason, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void PinnedEmployee_AllowedOnPinnedShift()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", pinnedShiftId: TestIds.MorningShiftId);
            var ctx = EmptyContext();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void PinnedEmployee_ChecksAllDaysOfWeek()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", pinnedShiftId: TestIds.AfternoonShiftId);
            var ctx = EmptyContext();

            foreach (var day in new[]
            {
                SchedulingTestBuilder.Week1.Mon, SchedulingTestBuilder.Week1.Tue,
                SchedulingTestBuilder.Week1.Wed, SchedulingTestBuilder.Week1.Thu,
                SchedulingTestBuilder.Week1.Fri,
            })
            {
                Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot   (day)).Violated, $"Should be blocked morning on {day}");
                Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, AfternoonSlot (day)).Violated, $"Should be allowed afternoon on {day}");
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // AvailabilityConstraint — Priority 1, SOFT
    // Employees who self-reported unavailable should not be assigned but
    // the engine will still pick them if no other option exists.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class AvailabilityConstraintTests
    {
        private readonly AvailabilityConstraint _sut = new();

        [Fact]
        public void Employee_NotReportedUnavailable_IsAllowed()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void Employee_ReportedUnavailable_IsAViolation_NotHardBlock()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddUnavailability(new SchedUnavailability(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            // Violated = true but Severity is Soft so engine won't hard-block
            Assert.True(result.Violated);
            Assert.Equal(ConstraintSeverity.Soft, _sut.Severity);
        }

        [Fact]
        public void Unavailability_SpecificShiftOnly_DoesNotSpillToOtherShift()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddUnavailability(new SchedUnavailability(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
                .Build();

            // Unavailability is for Morning, so Afternoon should be fine
            var result = _sut.Evaluate(ctx, EmptyState(), emp, AfternoonSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void Unavailability_SpecificDate_DoesNotSpillToOtherDate()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddUnavailability(new SchedUnavailability(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
                .Build();

            // Tuesday should be fine even for the same shift
            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Tue));

            Assert.False(result.Violated);
        }

        [Fact]
        public void UnavailabilityForOtherEmployee_DoesNotAffectCandidate()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddUnavailability(new SchedUnavailability(alice.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), bob, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // RotationPatternConstraint — Priority 0, HARD
    // Enforces "N on / M off" rotation cycles using working-day counting
    // from a dynamically-computed anchor stored in RotationAnchors.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class RotationPatternConstraintTests
    {
        private readonly RotationPatternConstraint _sut = new();

        // Anchor = 2026-05-04 (Mon), pattern 5on/2off (cycle=7)
        // Working day positions this week (weekendsWorking=false):
        //   Mon 05-04 → pos 0 (ON)
        //   Tue 05-05 → pos 1 (ON)
        //   Wed 05-06 → pos 2 (ON)
        //   Thu 05-07 → pos 3 (ON)
        //   Fri 05-08 → pos 4 (ON)
        // Next week positions:
        //   Mon 05-11 → pos 5 (OFF)
        //   Tue 05-12 → pos 6 (OFF)
        //   Wed 05-13 → pos 0 (ON — new cycle)

        [Fact]
        public void NoRotationPattern_IsAllowed()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice", rotationPatternId: null);
            var ctx = new SchedulingTestBuilder().WithWeek(SchedulingTestBuilder.Week1.Mon).Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Fact]
        public void PatternAssigned_ButNoAnchorInContext_IsAllowed()
        {
            // Pattern ID set on employee but no entry in RotationAnchors → skip constraint
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .Build(); // no WithRotationAnchor call → dict is empty

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));

            Assert.False(result.Violated);
        }

        [Theory]
        [InlineData(0)] // Mon — position 0 → ON
        [InlineData(1)] // Tue — position 1 → ON
        [InlineData(2)] // Wed — position 2 → ON
        [InlineData(3)] // Thu — position 3 → ON
        [InlineData(4)] // Fri — position 4 → ON
        public void Employee_OnWorkingDays_Within_OnBlock_IsAllowed(int offsetDays)
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var anchor = SchedulingTestBuilder.Week1.Mon; // anchor = 2026-05-04
            var slotDate = anchor.AddDays(offsetDays);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, anchor)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(slotDate));
            Assert.False(result.Violated, $"Expected ON at offset +{offsetDays} days (pos {offsetDays})");
        }

        [Fact]
        public void Employee_OnFirstOffDay_IsBlocked()
        {
            // After 5 working days from anchor, employee enters off-block
            // Mon 05-04 anchor → Mon 05-11 is working day 5 → pos 5 >= daysOn(5) → OFF
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Mon));

            Assert.True(result.Violated);
            Assert.Contains("off-day", result.Reason, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void Employee_OnSecondOffDay_IsBlocked()
        {
            // Tue 05-12: working day 6 from anchor 05-04 → pos 6 >= 5 → OFF
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Tue));

            Assert.True(result.Violated);
        }

        [Fact]
        public void Employee_AfterOffBlock_ResumesOnDays()
        {
            // Wed 05-13: working day 7 from anchor 05-04 → 7 % 7 = 0 → ON (new cycle)
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Wed));

            Assert.False(result.Violated);
        }

        [Fact]
        public void WeekendsNotCounted_WhenWeekendsWorking_False()
        {
            // With weekendsWorking=false, Sat and Sun are not counted.
            // Anchor = Mon 2026-05-04, pattern 5/2.
            // Mon 05-11: exactly 5 working days later → pos 5 → OFF.
            // If weekends WERE counted: Mon 05-11 = calendar day 7 → pos 0 (ON).
            // This test verifies working-day counting is used, not calendar days.
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build(); // weekendsWorking defaults to false

            // Mon 05-11 = working day 5 → OFF (proves weekends are excluded)
            Assert.True(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Mon)).Violated);
            // Wed 05-13 = working day 7 → cycle wraps → ON
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Wed)).Violated);
        }

        [Fact]
        public void TwoEmployees_SamePattern_StaggeredAnchors_HaveOffDaysOnDifferentDays()
        {
            // Employee 1: anchor = Mon 05-04 → off on Mon+Tue 05-11/12
            // Employee 2: anchor = Tue 04-28 → phase shifted; off on Thu+Fri 05-14/15
            // This simulates the stagger that ComputeRotationAnchors produces.
            var emp1 = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId5on2off);
            var emp2 = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob",
                rotationPatternId: TestIds.PatternId5on2off);

            // Anchor for emp2 = 2026-04-28 (Tue), i.e. phase 4 working days before 05-04
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern5on2off())
                .WithRotationAnchor(emp1.Id, SchedulingTestBuilder.Week1.Mon)    // anchor 05-04
                .WithRotationAnchor(emp2.Id, new DateOnly(2026, 4, 28)) // anchor 04-28 (Tue)
                .Build();

            // Emp1 off on Mon+Tue of week 2
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp1, MorningSlot(SchedulingTestBuilder.Week2.Mon)).Violated);
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp1, MorningSlot(SchedulingTestBuilder.Week2.Tue)).Violated);
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp1, MorningSlot(SchedulingTestBuilder.Week2.Wed)).Violated);

            // Emp2 should be ON on Mon+Tue of week 2 (anchor 04-28 → pos 9%7=2 on Mon 05-11)
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp2, MorningSlot(SchedulingTestBuilder.Week2.Mon)).Violated);
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp2, MorningSlot(SchedulingTestBuilder.Week2.Tue)).Violated);
        }

        [Fact]
        public void Pattern3on2off_CyclesCorrectly()
        {
            // 3on/2off (cycle=5), anchor = Mon 05-04 (weekendsWorking=false)
            // Mon: pos 0 → ON, Tue: pos 1 → ON, Wed: pos 2 → ON
            // Thu: pos 3 → OFF (3 >= daysOn=3), Fri: pos 4 → OFF
            // Next Mon 05-11: pos 5%5=0 → ON
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice",
                rotationPatternId: TestIds.PatternId3on2off);

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern3on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon)).Violated); // pos 0 ON
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Tue)).Violated); // pos 1 ON
            Assert.False(_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Wed)).Violated); // pos 2 ON
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Thu)).Violated); // pos 3 OFF
            Assert.True (_sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Fri)).Violated); // pos 4 OFF

            // Verify next week cycle wraps
            var ctxWeek2 = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .AddRotationPattern(SchedulingTestBuilder.Pattern3on2off())
                .WithRotationAnchor(emp.Id, SchedulingTestBuilder.Week1.Mon)
                .Build();

            Assert.False(_sut.Evaluate(ctxWeek2, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week2.Mon)).Violated); // pos 5%5=0 ON
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ShiftVarietyConstraint — Priority 5, SOFT
    // Penalises assigning the same shift for 3+ consecutive working days.
    // The first two same-shift days are free.
    // ════════════════════════════════════════════════════════════════════════

    public sealed class ShiftVarietyConstraintTests
    {
        private readonly ShiftVarietyConstraint _sut = new();

        private static ScheduleSlot MorningSlot(DateOnly date) =>
            new(date, TestIds.MorningShiftId, null, 8.0);
        private static ScheduleSlot AfternoonSlot(DateOnly date) =>
            new(date, TestIds.AfternoonShiftId, null, 8.0);

        private static SchedulingContext DefaultCtx() =>
            new SchedulingTestBuilder().WithWeek(SchedulingTestBuilder.Week1.Mon).Build();

        private static SchedulingState StateWith(params SchedAssignment[] assignments)
        {
            var state = new SchedulingState();
            foreach (var a in assignments) state.Proposed.Add(a);
            return state;
        }

        private static SchedAssignment Assign(Guid empId, Guid shiftId, DateOnly date) =>
            new(empId, shiftId, date);

        [Fact]
        public void NoHistory_NoViolation()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var result = _sut.Evaluate(DefaultCtx(), EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Mon));
            Assert.False(result.Violated);
        }

        [Fact]
        public void OnePriorSameShift_NoViolation()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var state = StateWith(Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon));

            var result = _sut.Evaluate(DefaultCtx(), state, emp, MorningSlot(SchedulingTestBuilder.Week1.Tue));
            Assert.False(result.Violated);
        }

        [Fact]
        public void TwoPriorSameShift_ThirdDayIsViolation()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var state = StateWith(
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon),
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Tue));

            // Wednesday would be 3rd consecutive morning → violation
            var result = _sut.Evaluate(DefaultCtx(), state, emp, MorningSlot(SchedulingTestBuilder.Week1.Wed));
            Assert.True(result.Violated);
        }

        [Fact]
        public void TwoPriorSameShift_DifferentShiftOnThirdDay_NoViolation()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var state = StateWith(
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon),
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Tue));

            // Afternoon on Wednesday — streak for morning resets, no violation
            var result = _sut.Evaluate(DefaultCtx(), state, emp, AfternoonSlot(SchedulingTestBuilder.Week1.Wed));
            Assert.False(result.Violated);
        }

        [Fact]
        public void StreakBrokenByDifferentShift_StreakResets()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            // Mon=Morning, Tue=Afternoon (break), Wed=Morning, Thu=Morning → Thu is only 2nd consecutive morning
            var state = StateWith(
                Assign(emp.Id, TestIds.MorningShiftId,   SchedulingTestBuilder.Week1.Mon),
                Assign(emp.Id, TestIds.AfternoonShiftId,  SchedulingTestBuilder.Week1.Tue),
                Assign(emp.Id, TestIds.MorningShiftId,   SchedulingTestBuilder.Week1.Wed),
                Assign(emp.Id, TestIds.MorningShiftId,   SchedulingTestBuilder.Week1.Thu));

            // Fri would be 3rd consecutive morning after Wed-Thu → violation
            var result = _sut.Evaluate(DefaultCtx(), state, emp, MorningSlot(SchedulingTestBuilder.Week1.Fri));
            Assert.True(result.Violated);
        }

        [Fact]
        public void WeekendSkipped_CountsConsecutiveWorkingDays()
        {
            // weekendsWorking=false (default). Fri → Mon is only 1 working day apart.
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            // Assign Thu+Fri morning, then check Monday (would be 3rd working day)
            var state = StateWith(
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Thu),
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Fri));

            var ctxWeek2 = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week2.Mon)
                .Build();

            // Mon week2 follows Fri week1 with no weekend interruption in working-day count → 3rd → violation
            var result = _sut.Evaluate(ctxWeek2, state, emp, MorningSlot(SchedulingTestBuilder.Week2.Mon));
            Assert.True(result.Violated);
        }

        [Fact]
        public void WeekendsWorking_SaturdayCountsAsConsecutive()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var state = StateWith(
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Thu),
                Assign(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Fri));

            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .WithWeekendsWorking(true)
                .Build();

            // Saturday is consecutive working day → 3rd → violation
            var result = _sut.Evaluate(ctx, state, emp, MorningSlot(SchedulingTestBuilder.Week1.Sat));
            Assert.True(result.Violated);
        }

        [Fact]
        public void LockedAssignment_CountsTowardStreak()
        {
            var emp = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var ctx = new SchedulingTestBuilder()
                .WithWeek(SchedulingTestBuilder.Week1.Mon)
                .AddLockedAssignment(new SchedAssignment(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon))
                .AddLockedAssignment(new SchedAssignment(emp.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Tue))
                .Build();

            // Wednesday would be 3rd → violation, even though the prior two are locked
            var result = _sut.Evaluate(ctx, EmptyState(), emp, MorningSlot(SchedulingTestBuilder.Week1.Wed));
            Assert.True(result.Violated);
        }

        [Fact]
        public void CrossEmployeeIsolation_OtherEmployeeStreakDoesNotAffectAlice()
        {
            var alice = SchedulingTestBuilder.Employee(TestIds.Employee1, "Alice");
            var bob   = SchedulingTestBuilder.Employee(TestIds.Employee2, "Bob");

            var state = StateWith(
                Assign(bob.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Mon),
                Assign(bob.Id, TestIds.MorningShiftId, SchedulingTestBuilder.Week1.Tue));

            // Alice has no morning history → no violation
            var result = _sut.Evaluate(DefaultCtx(), state, alice, MorningSlot(SchedulingTestBuilder.Week1.Wed));
            Assert.False(result.Violated);
        }

        [Fact]
        public void IsSoft_NotHardBlock()
        {
            Assert.Equal(ConstraintSeverity.Soft, _sut.Severity);
        }

        [Fact]
        public void Priority_IsShiftVariety()
        {
            Assert.Equal(ConstraintPriorities.ShiftVariety, _sut.Priority);
        }
    }
}
