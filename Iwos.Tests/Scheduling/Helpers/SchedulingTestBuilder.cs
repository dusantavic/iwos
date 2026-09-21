using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Business.Scheduling.Optimizer;
using System;
using System.Collections.Generic;

namespace Iwos.Tests.Scheduling.Helpers;


/// <summary>
/// Well-known fixed GUIDs shared across all test files.
/// Using fixed GUIDs (not Guid.NewGuid()) makes assertion messages readable.
/// </summary>
internal static class TestIds
{
    public static readonly Guid MorningShiftId   = new("10000000-0000-0000-0000-000000000001");
    public static readonly Guid AfternoonShiftId = new("10000000-0000-0000-0000-000000000002");
    public static readonly Guid NightShiftId     = new("10000000-0000-0000-0000-000000000003");

    public static readonly Guid PositionA = new("20000000-0000-0000-0000-000000000001");
    public static readonly Guid PositionB = new("20000000-0000-0000-0000-000000000002");

    public static readonly Guid PatternId5on2off = new("30000000-0000-0000-0000-000000000001");
    public static readonly Guid PatternId3on2off = new("30000000-0000-0000-0000-000000000002");
    public static readonly Guid PatternId4on3off = new("30000000-0000-0000-0000-000000000003");

    // Employee IDs — pre-defined so tests can reference specific employees deterministically
    public static readonly Guid Employee1 = new("40000000-0000-0000-0000-000000000001");
    public static readonly Guid Employee2 = new("40000000-0000-0000-0000-000000000002");
    public static readonly Guid Employee3 = new("40000000-0000-0000-0000-000000000003");
    public static readonly Guid Employee4 = new("40000000-0000-0000-0000-000000000004");
}

/// <summary>
/// Fluent builder for <see cref="SchedulingContext"/> used in tests.
/// All scheduling engine tests should use this builder — it keeps test fixtures
/// concise and prevents repetitive setup boilerplate.
/// </summary>
internal sealed class SchedulingTestBuilder
{
    // Default test week: Mon 2026-05-04 → Sun 2026-05-10
    private DateOnly _weekStart = new(2026, 5, 4);
    private DateOnly _weekEnd   = new(2026, 5, 10);
    private bool _weekendsWorking     = false;
    private bool _considerWeeklyHours = true;

    private readonly List<SchedEmployee>            _employees         = [];
    private readonly List<SchedShift>               _shifts            = [];
    private readonly List<SchedDaySchedule>         _daySchedules      = [];
    private readonly List<SchedPositionRequirement> _positionReqs      = [];
    private readonly List<SchedAbsence>             _absences          = [];
    private readonly List<SchedUnavailability>      _unavailabilities  = [];
    private readonly List<SchedAssignment>                    _lockedAssignments    = [];
    private readonly List<SchedAssignment>                    _priorAssignments     = [];
    private readonly List<SchedPositionRequirementOverride>   _posReqOverrides      = [];
    private readonly List<SchedRotationPattern>               _rotationPatterns     = [];
    private readonly Dictionary<Guid, DateOnly>     _rotationAnchors   = [];
    private readonly Dictionary<Guid, double>       _accumulatedHours  = [];

    // ── Fluent configuration ─────────────────────────────────────────────────

    public SchedulingTestBuilder WithWeek(DateOnly monday)
    {
        _weekStart = monday;
        _weekEnd   = monday.AddDays(6);
        return this;
    }

    public SchedulingTestBuilder WithWeekendsWorking(bool value = true)
    {
        _weekendsWorking = value;
        return this;
    }

    public SchedulingTestBuilder WithConsiderWeeklyHours(bool value)
    {
        _considerWeeklyHours = value;
        return this;
    }

    public SchedulingTestBuilder AddEmployee(SchedEmployee e)             { _employees.Add(e);          return this; }
    public SchedulingTestBuilder AddShift(SchedShift s)                   { _shifts.Add(s);             return this; }
    public SchedulingTestBuilder AddDaySchedule(SchedDaySchedule ds)      { _daySchedules.Add(ds);      return this; }
    public SchedulingTestBuilder AddAbsence(SchedAbsence a)               { _absences.Add(a);           return this; }
    public SchedulingTestBuilder AddUnavailability(SchedUnavailability u)  { _unavailabilities.Add(u);  return this; }
    public SchedulingTestBuilder AddLockedAssignment(SchedAssignment a)                    { _lockedAssignments.Add(a);  return this; }
    public SchedulingTestBuilder AddPriorAssignment(SchedAssignment a)                     { _priorAssignments.Add(a);   return this; }
    public SchedulingTestBuilder AddPositionRequirementOverride(SchedPositionRequirementOverride o) { _posReqOverrides.Add(o); return this; }
    public SchedulingTestBuilder AddRotationPattern(SchedRotationPattern p)                { _rotationPatterns.Add(p);  return this; }
    public SchedulingTestBuilder AddPositionRequirement(SchedPositionRequirement r)        { _positionReqs.Add(r);      return this; }

    public SchedulingTestBuilder WithRotationAnchor(Guid empId, DateOnly anchor)
    {
        _rotationAnchors[empId] = anchor;
        return this;
    }

    public SchedulingTestBuilder WithAccumulatedHours(Guid empId, double hours)
    {
        _accumulatedHours[empId] = hours;
        return this;
    }

    // ── Pre-canned shift configuration helpers ───────────────────────────────

    /// <summary>
    /// Adds Morning and Afternoon shifts with schedules for Mon–Fri
    /// (or all 7 days when weekendsWorking=true), 8 h per shift.
    /// </summary>
    public SchedulingTestBuilder WithStandardShifts(int minStaff = 1)
    {
        AddShift(new SchedShift(TestIds.MorningShiftId,   "Morning"));
        AddShift(new SchedShift(TestIds.AfternoonShiftId, "Afternoon"));

        var workDays = _weekendsWorking
            ? new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday }
            : new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday };

        foreach (var dow in workDays)
        {
            AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId,   dow, 8.0, StartHour: 6.0));
            AddDaySchedule(new SchedDaySchedule(TestIds.AfternoonShiftId, dow, 8.0, StartHour: 14.0));
        }
        _positionReqs.Add(new SchedPositionRequirement(TestIds.MorningShiftId,   TestIds.PositionA, minStaff));
        _positionReqs.Add(new SchedPositionRequirement(TestIds.AfternoonShiftId, TestIds.PositionA, minStaff));
        return this;
    }

    /// <summary>Adds only the Morning shift for the given days.</summary>
    public SchedulingTestBuilder WithMorningShiftOnly(int minStaff = 1)
    {
        AddShift(new SchedShift(TestIds.MorningShiftId, "Morning"));
        var workDays = _weekendsWorking
            ? new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday }
            : new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday };

        foreach (var dow in workDays)
            AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId, dow, 8.0, StartHour: 6.0));

        _positionReqs.Add(new SchedPositionRequirement(TestIds.MorningShiftId, TestIds.PositionA, minStaff));
        return this;
    }

    /// <summary>Adds Morning (06h), Afternoon (14h), and Night (22h) shifts for Mon–Fri (or all 7 days).</summary>
    public SchedulingTestBuilder WithThreeShifts(int minStaff = 1)
    {
        AddShift(new SchedShift(TestIds.MorningShiftId,   "Morning"));
        AddShift(new SchedShift(TestIds.AfternoonShiftId, "Afternoon"));
        AddShift(new SchedShift(TestIds.NightShiftId,     "Night"));

        var workDays = _weekendsWorking
            ? new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday }
            : new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                      DayOfWeek.Thursday, DayOfWeek.Friday };

        foreach (var dow in workDays)
        {
            AddDaySchedule(new SchedDaySchedule(TestIds.MorningShiftId,   dow, 8.0, StartHour: 6.0));
            AddDaySchedule(new SchedDaySchedule(TestIds.AfternoonShiftId, dow, 8.0, StartHour: 14.0));
            AddDaySchedule(new SchedDaySchedule(TestIds.NightShiftId,     dow, 8.0, StartHour: 22.0));
        }
        _positionReqs.Add(new SchedPositionRequirement(TestIds.MorningShiftId,   TestIds.PositionA, minStaff));
        _positionReqs.Add(new SchedPositionRequirement(TestIds.AfternoonShiftId, TestIds.PositionA, minStaff));
        _positionReqs.Add(new SchedPositionRequirement(TestIds.NightShiftId,     TestIds.PositionA, minStaff));
        return this;
    }

    // ── Build ────────────────────────────────────────────────────────────────

    public SchedulingContext Build() => new()
    {
        WeekStart            = _weekStart,
        WeekEnd              = _weekEnd,
        WeekendsWorking      = _weekendsWorking,
        ConsiderWeeklyHours  = _considerWeeklyHours,
        Employees            = _employees,
        Shifts               = _shifts,
        DaySchedules         = _daySchedules,
        PositionRequirements         = _positionReqs,
        PositionRequirementOverrides = _posReqOverrides,
        Absences                     = _absences,
        Unavailabilities     = _unavailabilities,
        LockedAssignments    = _lockedAssignments,
        PriorAssignments     = _priorAssignments,
        RotationPatterns     = _rotationPatterns,
        RotationAnchors      = _rotationAnchors,
        AccumulatedHours     = _accumulatedHours,
    };

    // ── Static factories ─────────────────────────────────────────────────────

    public static ShiftSchedulingEngine BuildEngine()
    {
        var constraints = new IScheduleConstraint[]
        {
            new AbsenceConstraint(),
            new ConsecutiveHoursConstraint(),
            new RestPeriodConstraint(),
            new AvailabilityConstraint(),
            new OvertimeConstraint(),
            new PinnedShiftConstraint(),
            new RotationPatternConstraint(),
            new ShiftVarietyConstraint(),
        };
        return new ShiftSchedulingEngine(constraints, new ScheduleLocalSearchOptimizer(constraints));
    }

    /// <summary>Creates an employee with a pre-defined ID for deterministic assertions.</summary>
    public static SchedEmployee Employee(
        Guid id,
        string name,
        Guid? positionId         = null,
        int weeklyHours          = 40,
        Guid? rotationPatternId  = null,
        Guid? pinnedShiftId      = null,
        DateOnly? rotationAnchorDate = null)
        => new(id, name, positionId ?? TestIds.PositionA, weeklyHours, rotationPatternId, pinnedShiftId, rotationAnchorDate);

    public static SchedRotationPattern Pattern5on2off()
        => new(TestIds.PatternId5on2off, "5/2", 5, 2);

    public static SchedRotationPattern Pattern3on2off()
        => new(TestIds.PatternId3on2off, "3/2", 3, 2);

    public static SchedRotationPattern Pattern4on3off()
        => new(TestIds.PatternId4on3off, "4/3", 4, 3);

    // ── Common date helpers ──────────────────────────────────────────────────

    /// <summary>Returns the Monday that starts the ISO week containing <paramref name="date"/>.</summary>
    public static DateOnly ToMonday(DateOnly date)
    {
        var diff = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        return date.AddDays(-diff);
    }

    /// <summary>
    /// Week before the standard test week (Mon 2026-04-27 → Sun 2026-05-03).
    /// Used as the "prior week" in onboarding continuity tests.
    /// </summary>
    public static class Week0
    {
        public static readonly DateOnly Mon = new(2026, 4, 27);
        public static readonly DateOnly Tue = new(2026, 4, 28);
        public static readonly DateOnly Wed = new(2026, 4, 29);
        public static readonly DateOnly Thu = new(2026, 4, 30);
        public static readonly DateOnly Fri = new(2026, 5, 1);
        public static readonly DateOnly Sat = new(2026, 5, 2);
        public static readonly DateOnly Sun = new(2026, 5, 3);
    }

    /// <summary>
    /// Standard test week reference dates (Mon 2026-05-04).
    /// </summary>
    public static class Week1
    {
        public static readonly DateOnly Mon = new(2026, 5, 4);
        public static readonly DateOnly Tue = new(2026, 5, 5);
        public static readonly DateOnly Wed = new(2026, 5, 6);
        public static readonly DateOnly Thu = new(2026, 5, 7);
        public static readonly DateOnly Fri = new(2026, 5, 8);
        public static readonly DateOnly Sat = new(2026, 5, 9);
        public static readonly DateOnly Sun = new(2026, 5, 10);
    }

    public static class Week2
    {
        public static readonly DateOnly Mon = new(2026, 5, 11);
        public static readonly DateOnly Tue = new(2026, 5, 12);
        public static readonly DateOnly Wed = new(2026, 5, 13);
        public static readonly DateOnly Thu = new(2026, 5, 14);
        public static readonly DateOnly Fri = new(2026, 5, 15);
    }

    public static class Week3
    {
        public static readonly DateOnly Mon = new(2026, 5, 18);
        public static readonly DateOnly Fri = new(2026, 5, 22);
    }

    public static class Week4
    {
        public static readonly DateOnly Mon = new(2026, 5, 25);
        public static readonly DateOnly Fri = new(2026, 5, 29);
    }
}
