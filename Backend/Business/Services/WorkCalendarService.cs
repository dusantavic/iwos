using Iwos.Business.WorkCalendar;
using Iwos.Common.Contracts;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Computes the working-day calendar for an absence request.
    ///
    /// Two top-level scenarios — driven entirely by the tenant's <see cref="ShiftClientConfig.WeekEndsWorking"/>
    /// flag and (for 7-day operations) by the published schedule horizon:
    ///
    ///   1) WeekEndsWorking = false → StandardWeek
    ///        Charge every Mon–Fri inside the range. Sat/Sun are off and not charged.
    ///        Hours per working day come from real assignments where available; otherwise from
    ///        WeeklyHours / WeeklyDays.
    ///
    ///   2) WeekEndsWorking = true → either Scheduled or Approximated, based on whether the
    ///      schedule horizon (= max ShiftAssignment.Date for the tenant) covers the entire range.
    ///
    ///        2a) Scheduled (horizon ≥ end): a published schedule exists for every day in the
    ///            range. Charged days = days the employee has an assignment. Days without an
    ///            assignment are pseudo-weekends and are not charged. Hours come from the actual
    ///            shift schedule.
    ///
    ///        2b) Approximated (horizon &lt; end OR no schedule at all): we cannot identify which
    ///            specific dates would be off, so we approximate using the employee's contracted
    ///            cadence:
    ///                chargedDays  = round(calendarDays × WeeklyDays / 7)
    ///                chargedHours = chargedDays × (WeeklyHours / WeeklyDays)
    ///            All days are surfaced as "Working" with the per-day hours flagged estimated, so
    ///            the FE can communicate that values may shift once the schedule is generated.
    ///
    /// All DB calls are issued in parallel via <see cref="IDbContextFactory{TContext}"/> — each
    /// branch gets its own DbContext because EF Core's context is not thread-safe. Two phases:
    /// first the three independent root reads (employee, clientConfig, assignments), then six
    /// dependent reads (schedule horizon + four shift-metadata fetches + two pinned-shift fetches).
    /// </summary>
    public sealed class WorkCalendarService : IWorkCalendarService
    {
        private readonly IDbContextFactory<IwosDbContext> _contextFactory;

        public WorkCalendarService(IDbContextFactory<IwosDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<EmployeeWorkCalendar> BuildAsync(
            Guid employeeId,
            DateOnly start,
            DateOnly end,
            CancellationToken ct = default)
        {
            if (end < start)
                throw new ArgumentException("End date must be greater than or equal to start date.");

            // ── Phase 1: three independent root reads in parallel ────────────────────
            var employeeT = LoadAsync(c => c.Employees
                .AsNoTracking()
                .Include(e => e.PinnedShift)
                .FirstOrDefaultAsync(e => e.Id == employeeId, ct));

            var assignmentsT = LoadAsync(c => c.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.EmployeeId == employeeId && a.Date >= start && a.Date <= end)
                .Select(a => new AssignmentSlim { Id = a.Id, ShiftId = a.ShiftId, Date = a.Date })
                .ToListAsync(ct));

            await Task.WhenAll(employeeT, assignmentsT);
            var employee = employeeT.Result ?? throw new InvalidOperationException($"Employee {employeeId} not found.");
            var assignments = assignmentsT.Result;
            var assignmentByDate = assignments.ToDictionary(a => a.Date, a => a);

            // clientConfig depends on employee.ClientId — chain it after employee resolves.
            var clientConfig = await LoadAsync(c => c.ShiftClientConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(cfg => cfg.ClientId == employee.ClientId, ct));
            bool weekEndsWorking = clientConfig?.WeekEndsWorking ?? false;

            // ── Phase 2: six dependent reads, all independent of each other ──────────
            var shiftIds = assignments.Select(a => a.ShiftId).Distinct().ToList();
            var pinnedId = employee.PinnedShift?.Id;
            int requiredDays = end.DayNumber - start.DayNumber + 1;

            Task<int> scheduledDaysT = weekEndsWorking
                ? LoadAsync(c => c.ShiftAssignments
                    .AsNoTracking()
                    .Where(a => a.Employee.ClientId == employee.ClientId
                                && a.Date >= start && a.Date <= end)
                    .Select(a => a.Date)
                    .Distinct()
                    .CountAsync(ct))
                : Task.FromResult(0);

            Task<List<Shift>> shiftsT = shiftIds.Count == 0
                ? Task.FromResult(new List<Shift>())
                : LoadAsync(c => c.Shifts.AsNoTracking()
                    .Where(s => shiftIds.Contains(s.Id))
                    .ToListAsync(ct));

            Task<List<ShiftDaySchedule>> daySchedulesT = shiftIds.Count == 0
                ? Task.FromResult(new List<ShiftDaySchedule>())
                : LoadAsync(c => c.ShiftDaySchedules.AsNoTracking()
                    .Where(d => shiftIds.Contains(d.ShiftId))
                    .ToListAsync(ct));

            Task<List<ShiftDateOverride>> dateOverridesT = shiftIds.Count == 0
                ? Task.FromResult(new List<ShiftDateOverride>())
                : LoadAsync(c => c.ShiftDateOverrides.AsNoTracking()
                    .Where(o => shiftIds.Contains(o.ShiftId) && o.Date >= start && o.Date <= end)
                    .ToListAsync(ct));

            Task<List<ShiftDaySchedule>> pinnedDaySchedulesT = pinnedId == null
                ? Task.FromResult(new List<ShiftDaySchedule>())
                : LoadAsync(c => c.ShiftDaySchedules.AsNoTracking()
                    .Where(d => d.ShiftId == pinnedId.Value)
                    .ToListAsync(ct));

            Task<List<ShiftDateOverride>> pinnedDateOverridesT = pinnedId == null
                ? Task.FromResult(new List<ShiftDateOverride>())
                : LoadAsync(c => c.ShiftDateOverrides.AsNoTracking()
                    .Where(o => o.ShiftId == pinnedId.Value && o.Date >= start && o.Date <= end)
                    .ToListAsync(ct));

            await Task.WhenAll(scheduledDaysT, shiftsT, daySchedulesT, dateOverridesT, pinnedDaySchedulesT, pinnedDateOverridesT);

            CalendarRegime regime;
            bool scheduleCoversRange = false;
            if (!weekEndsWorking)
            {
                regime = CalendarRegime.StandardWeek;
            }
            else
            {
                // Range is "fully scheduled" only if every day inside has ≥ 1 tenant assignment.
                // Partial coverage falls back to Approximated — otherwise unscheduled days would
                // be miscounted as off-days.
                scheduleCoversRange = scheduledDaysT.Result >= requiredDays;
                regime = scheduleCoversRange ? CalendarRegime.Scheduled : CalendarRegime.Approximated;
            }

            var shiftById = shiftsT.Result.ToDictionary(s => s.Id);
            var dayScheduleByShiftDow = daySchedulesT.Result.ToDictionary(d => (d.ShiftId, d.DayOfWeek));
            var overrideByShiftDate = dateOverridesT.Result.ToDictionary(o => (o.ShiftId, o.Date));
            var pinnedDayScheduleByDow = pinnedDaySchedulesT.Result.ToDictionary(d => (d.ShiftId, d.DayOfWeek));
            var pinnedOverrideByDate = pinnedDateOverridesT.Result.ToDictionary(o => (o.ShiftId, o.Date));

            int weeklyDays = ClampWeeklyDays(employee.WeeklyDays);
            decimal estimatedHoursPerDay = EstimatedHoursPerWorkingDay(employee, weeklyDays);

            var days = new List<WorkCalendarDay>();
            for (var d = start; d <= end; d = d.AddDays(1))
            {
                DayKind kind;
                decimal hours = 0m;
                bool estimated = false;
                Guid? assignedShiftId = null;
                string? assignedShiftLabel = null;
                Guid? assignmentId = null;

                bool hasAssignment = assignmentByDate.TryGetValue(d, out var a);

                switch (regime)
                {
                    case CalendarRegime.StandardWeek:
                        kind = (d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday)
                            ? DayKind.CalendarWeekendOff
                            : DayKind.Working;
                        break;

                    case CalendarRegime.Scheduled:
                        kind = hasAssignment ? DayKind.Working : DayKind.PseudoWeekendOff;
                        break;

                    case CalendarRegime.Approximated:
                    default:
                        // Without a schedule we can't tell off vs. working; surface every day as
                        // working so the user sees the full range, with hours flagged estimated.
                        kind = DayKind.Working;
                        break;
                }

                if (kind == DayKind.Working)
                {
                    if (hasAssignment && shiftById.TryGetValue(a!.ShiftId, out var shift))
                    {
                        assignmentId = a.Id;
                        assignedShiftId = a.ShiftId;
                        assignedShiftLabel = shift.Label;
                        hours = ResolveShiftHours(shift, d, dayScheduleByShiftDow, overrideByShiftDate);
                    }
                    else if (employee.PinnedShift != null)
                    {
                        assignedShiftLabel = employee.PinnedShift.Label;
                        hours = ResolveShiftHours(employee.PinnedShift, d, pinnedDayScheduleByDow, pinnedOverrideByDate);
                        estimated = true;
                    }
                    else
                    {
                        hours = estimatedHoursPerDay;
                        estimated = true;
                    }
                }

                days.Add(new WorkCalendarDay(
                    Date: d,
                    DayOfWeek: d.DayOfWeek,
                    Kind: kind,
                    Hours: hours,
                    HoursEstimated: estimated,
                    AssignedShiftId: assignedShiftId,
                    AssignedShiftLabel: assignedShiftLabel,
                    AssignmentId: assignmentId
                ));
            }

            int calendarDays = days.Count;
            int chargedDays;
            decimal chargedHours;
            bool hoursEstimated;

            switch (regime)
            {
                case CalendarRegime.StandardWeek:
                case CalendarRegime.Scheduled:
                    chargedDays = days.Count(x => x.Kind == DayKind.Working);
                    chargedHours = days.Where(x => x.Kind == DayKind.Working).Sum(x => x.Hours);
                    hoursEstimated = days.Any(x => x.Kind == DayKind.Working && x.HoursEstimated);
                    break;

                case CalendarRegime.Approximated:
                default:
                    chargedDays = (int)Math.Round(
                        (decimal)calendarDays * weeklyDays / 7m,
                        0, MidpointRounding.AwayFromZero);
                    chargedHours = Math.Round(
                        chargedDays * estimatedHoursPerDay,
                        2, MidpointRounding.AwayFromZero);
                    hoursEstimated = true;
                    break;
            }

            return new EmployeeWorkCalendar
            {
                EmployeeId = employee.Id,
                EmployeeFullName = $"{employee.FirstName} {employee.LastName}",
                Start = start,
                End = end,
                Regime = regime,
                Days = days,
                CalendarDays = calendarDays,
                ChargedWorkingDays = chargedDays,
                ChargedWorkingHours = Math.Round(chargedHours, 2, MidpointRounding.AwayFromZero),
                HoursEstimated = hoursEstimated,
                WeeklyDays = weeklyDays,
                ScheduleCoversRange = scheduleCoversRange
            };
        }

        // Runs a query on its own DbContext so callers can safely launch many in parallel.
        private async Task<T> LoadAsync<T>(Func<IwosDbContext, Task<T>> fn)
        {
            await using var ctx = await _contextFactory.CreateDbContextAsync();
            return await fn(ctx);
        }

        // Projection helper for the assignment slim read — keeps the LINQ tree EF-translatable
        // without leaking an anonymous type across the awaited Task boundary.
        private sealed class AssignmentSlim
        {
            public Guid Id { get; set; }
            public Guid ShiftId { get; set; }
            public DateOnly Date { get; set; }
        }

        private static int ClampWeeklyDays(int weeklyDays)
        {
            if (weeklyDays < 1) return 5;
            if (weeklyDays > 7) return 7;
            return weeklyDays;
        }

        private static decimal EstimatedHoursPerWorkingDay(Employee e, int weeklyDays)
        {
            decimal weekly = e.WeeklyHours <= 0 ? 40m : e.WeeklyHours;
            int divisor = weeklyDays <= 0 ? 5 : weeklyDays;
            return Math.Round(weekly / divisor, 2, MidpointRounding.AwayFromZero);
        }

        private static decimal ResolveShiftHours(
            Shift shift,
            DateOnly date,
            IReadOnlyDictionary<(Guid, DayOfWeek), ShiftDaySchedule> dayScheduleMap,
            IReadOnlyDictionary<(Guid, DateOnly), ShiftDateOverride> overrideMap)
        {
            TimeOnly start = shift.DefaultStartTime;
            TimeOnly endT = shift.DefaultEndTime;

            if (dayScheduleMap.TryGetValue((shift.Id, date.DayOfWeek), out var ds))
            {
                start = ds.StartTime;
                endT = ds.EndTime;
            }

            if (overrideMap.TryGetValue((shift.Id, date), out var ov))
            {
                if (ov.StartTime.HasValue) start = ov.StartTime.Value;
                if (ov.EndTime.HasValue) endT = ov.EndTime.Value;
            }

            double hours = (endT.ToTimeSpan() - start.ToTimeSpan()).TotalHours;
            if (hours <= 0) hours += 24;
            return Math.Round((decimal)hours, 2, MidpointRounding.AwayFromZero);
        }
    }
}
