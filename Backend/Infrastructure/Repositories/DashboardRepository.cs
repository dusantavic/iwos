using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Repositories
{
    /// <summary>
    /// Aggregator repository for the DashboardV2 endpoints. Composes counts and
    /// coverage projections that span multiple domains (shifts, employees,
    /// absences, configuration) — it intentionally avoids GenericRepository
    /// inheritance because no single entity is the natural "owner".
    /// </summary>
    public sealed class DashboardRepository : IDashboardRepository
    {
        private readonly IwosDbContext _context;

        public DashboardRepository(IwosDbContext context)
        {
            _context = context;
        }

        // ── Simple counts ─────────────────────────────────────────────────────

        public Task<int> GetActiveEmployeesCountAsync(CancellationToken ct = default)
            => _context.Employees.AsNoTracking().Where(e => e.Active).CountAsync(ct);

        public Task<int> GetPendingAbsenceApprovalsCountAsync(CancellationToken ct = default)
            => _context.Absences.AsNoTracking()
                .Where(a => a.Status == AbsenceStatus.Pending || a.Status == AbsenceStatus.Requested)
                .CountAsync(ct);

        // ── Today's shift coverage ────────────────────────────────────────────

        public async Task<List<TodayShiftCoverageDto>> GetTodayShiftCoverageAsync(DateOnly today, CancellationToken ct = default)
        {
            var dow = today.DayOfWeek;

            var shifts = await _context.Shifts.AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder)
                .Select(s => new { s.Id, s.Label })
                .ToListAsync(ct);

            if (shifts.Count == 0) return new List<TodayShiftCoverageDto>();

            var shiftIds = shifts.Select(s => s.Id).ToList();

            var positionRequirements = await _context.ShiftPositionRequirements.AsNoTracking()
                .Where(r => shiftIds.Contains(r.ShiftId))
                .Select(r => new { r.ShiftId, r.PositionId, r.RequiredCount })
                .ToListAsync(ct);
            var posReqsByShift = positionRequirements
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var posReqOverridesForToday = await _context.ShiftPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId) && o.Date == today)
                .Select(o => new { o.ShiftId, o.PositionId, o.RequiredCount })
                .ToListAsync(ct);
            var posReqOverrideLookup = posReqOverridesForToday
                .ToDictionary(o => (o.ShiftId, o.PositionId), o => o.RequiredCount);

            // Day-of-week overrides sit between base requirements and date-specific overrides.
            var dowOverrides = await _context.ShiftDayPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId) && o.DayOfWeek == dow)
                .Select(o => new { o.ShiftId, o.PositionId, o.RequiredCount })
                .ToListAsync(ct);
            var dowOverrideLookup = dowOverrides
                .ToDictionary(o => (o.ShiftId, o.PositionId), o => o.RequiredCount);

            var assignmentsRaw = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => shiftIds.Contains(a.ShiftId) && a.Date == today)
                .Select(a => new
                {
                    a.ShiftId,
                    a.EmployeeId,
                    FirstName = a.Employee.FirstName,
                    LastName = a.Employee.LastName,
                    PositionTitle = a.Employee.Position.Title,
                    HasProfile = a.Employee.Files != null && a.Employee.Files.Any(f => f.DisplayName == "profile.jpg"),
                })
                .ToListAsync(ct);

            var assignmentsByShift = assignmentsRaw
                .GroupBy(a => a.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = new List<TodayShiftCoverageDto>(shifts.Count);
            foreach (var s in shifts)
            {
                var required = 0;
                if (posReqsByShift.TryGetValue(s.Id, out var posReqList))
                {
                    foreach (var req in posReqList)
                    {
                        // Priority: date-specific override > day-of-week override > base
                        int effective = posReqOverrideLookup.TryGetValue((s.Id, req.PositionId), out var dateOv)
                            ? dateOv
                            : dowOverrideLookup.TryGetValue((s.Id, req.PositionId), out var dowOv)
                                ? dowOv
                                : req.RequiredCount;
                        if (effective == 0) continue;
                        required += effective;
                    }
                }

                var assigned = assignmentsByShift.TryGetValue(s.Id, out var list) ? list : new();
                var assignedCount = assigned.Count;

                string status = assignedCount == required
                    ? "Covered"
                    : (assignedCount < required ? "Under" : "Over");

                var assignees = assigned
                    .OrderBy(a => a.FirstName).ThenBy(a => a.LastName)
                    .Take(6)
                    .Select(a => new ShiftCoverageAssigneeDto
                    {
                        EmployeeId = a.EmployeeId,
                        FullName = a.FirstName + " " + a.LastName,
                        ProfilePictureSrc = a.HasProfile ? $"uploads/thumbnails/{a.EmployeeId}.jpg" : null,
                        Position = a.PositionTitle,
                    })
                    .ToList();

                result.Add(new TodayShiftCoverageDto
                {
                    ShiftId = s.Id,
                    ShiftLabel = s.Label,
                    RequiredCount = required,
                    AssignedCount = assignedCount,
                    Status = status,
                    Assignees = assignees,
                });
            }

            return result;
        }

        // ── Week coverage breakdown ───────────────────────────────────────────

        public async Task<DashboardWeekCoverageDto> GetWeekCoverageBreakdownAsync(DateOnly weekStart, DateOnly weekEnd, bool weekendsWorking, CancellationToken ct = default)
        {
            var shifts = await _context.Shifts.AsNoTracking()
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.Label })
                .ToListAsync(ct);
            var shiftLabels = shifts.ToDictionary(s => s.Id, s => s.Label);
            var shiftIds = shifts.Select(s => s.Id).ToList();

            var posReqsRaw = await _context.ShiftPositionRequirements.AsNoTracking()
                .Where(r => shiftIds.Contains(r.ShiftId))
                .Select(r => new { r.ShiftId, r.PositionId, r.RequiredCount, PositionTitle = r.Position.Title })
                .ToListAsync(ct);
            var posReqsByShift = posReqsRaw
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var posReqOverridesRaw = await _context.ShiftPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId) && o.Date >= weekStart && o.Date <= weekEnd)
                .Select(o => new { o.ShiftId, o.Date, o.PositionId, o.RequiredCount })
                .ToListAsync(ct);
            var posReqOverrideLookup = posReqOverridesRaw
                .ToDictionary(o => (o.ShiftId, o.Date, o.PositionId), o => o.RequiredCount);

            // Day-of-week overrides — keyed by (ShiftId, DayOfWeek, PositionId).
            var dowOverridesRaw = await _context.ShiftDayPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId))
                .Select(o => new { o.ShiftId, o.DayOfWeek, o.PositionId, o.RequiredCount })
                .ToListAsync(ct);
            var dowOverrideLookup = dowOverridesRaw
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);

            var assignmentsRaw = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => a.Date >= weekStart && a.Date <= weekEnd)
                .Select(a => new { a.ShiftId, a.Date, a.EmployeeId, EmployeePositionId = a.Employee.PositionId })
                .ToListAsync(ct);

            var assignmentsByShiftDate = assignmentsRaw
                .GroupBy(a => (a.ShiftId, a.Date))
                .ToDictionary(g => g.Key, g => g.ToList());

            var days = new List<DayCoverageDto>();
            var unfilled = new List<UnfilledSlotShortDto>();

            for (var date = weekStart; date <= weekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                var isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
                if (!weekendsWorking && isWeekend) continue;

                int dayRequired = 0;
                int dayFilled = 0;

                foreach (var shift in shifts)
                {
                    var assignments = assignmentsByShiftDate.TryGetValue((shift.Id, date), out var list) ? list : new();
                    var hasPosReqs = posReqsByShift.TryGetValue(shift.Id, out var posReqs) && posReqs.Count > 0;

                    if (hasPosReqs)
                    {
                        foreach (var req in posReqs!)
                        {
                            // Priority: date-specific override > day-of-week override > base
                            int effectiveRequired = posReqOverrideLookup.TryGetValue((shift.Id, date, req.PositionId), out var dateOv)
                                ? dateOv
                                : dowOverrideLookup.TryGetValue((shift.Id, dow, req.PositionId), out var dowOv)
                                    ? dowOv
                                    : req.RequiredCount;

                            if (effectiveRequired == 0) continue;

                            var assignedForPos = assignments.Count(a => a.EmployeePositionId == req.PositionId);
                            dayRequired += effectiveRequired;
                            dayFilled += Math.Min(assignedForPos, effectiveRequired);

                            var missing = effectiveRequired - assignedForPos;
                            if (missing > 0)
                            {
                                unfilled.Add(new UnfilledSlotShortDto
                                {
                                    Date = date.ToString("yyyy-MM-dd"),
                                    ShiftId = shift.Id,
                                    ShiftLabel = shift.Label,
                                    RequiredPositionId = req.PositionId,
                                    RequiredPositionTitle = req.PositionTitle,
                                    MissingCount = missing,
                                });
                            }
                        }
                    }
                }

                int percent = dayRequired > 0
                    ? (int)Math.Round(100.0 * dayFilled / dayRequired)
                    : 0;

                days.Add(new DayCoverageDto
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    DayOfWeek = (int)dow,
                    FilledSlots = dayFilled,
                    RequiredSlots = dayRequired,
                    Percent = percent,
                });
            }

            return new DashboardWeekCoverageDto
            {
                WeekStart = weekStart.ToString("yyyy-MM-dd"),
                WeekEnd = weekEnd.ToString("yyyy-MM-dd"),
                Days = days,
                UnfilledSlots = unfilled,
            };
        }

        // ── Working hours summary (this-week scheduled vs contracted) ─────────

        public async Task<WorkingHoursSummaryDto> GetWorkingHoursSummaryAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default)
        {
            static double ComputeHours(TimeOnly start, TimeOnly end)
            {
                var diff = end.ToTimeSpan() - start.ToTimeSpan();
                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                return Math.Round(diff.TotalHours, 2);
            }

            var employees = await _context.Employees.AsNoTracking()
                .Where(e => e.Active)
                .Select(e => new
                {
                    e.Id,
                    FullName = e.FirstName + " " + e.LastName,
                    e.WeeklyHours,
                    HasProfile = e.Files != null && e.Files.Any(f => f.DisplayName == "profile.jpg"),
                })
                .ToListAsync(ct);

            var daySchedules = await _context.ShiftDaySchedules.AsNoTracking().ToListAsync(ct);
            var hoursLookup = daySchedules.ToDictionary(
                d => (d.ShiftId, d.DayOfWeek),
                d => ComputeHours(d.StartTime, d.EndTime));

            var shiftDefaultHours = await _context.Shifts.AsNoTracking()
                .Select(s => new { s.Id, s.DefaultStartTime, s.DefaultEndTime })
                .ToListAsync(ct);
            var shiftDefaults = shiftDefaultHours.ToDictionary(s => s.Id, s => ComputeHours(s.DefaultStartTime, s.DefaultEndTime));

            var assignments = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => a.Date >= weekStart && a.Date <= weekEnd)
                .Select(a => new { a.EmployeeId, a.ShiftId, a.Date })
                .ToListAsync(ct);

            // Employees with absences covering any day of the week — exclude from the
            // under-utilized list since their low hours are expected.
            var absentEmployeeIds = await _context.Absences.AsNoTracking()
                .Where(a => a.Status == AbsenceStatus.Approved
                            && a.StartDate <= weekEnd
                            && a.EndDate >= weekStart)
                .Select(a => a.EmployeeId)
                .Distinct()
                .ToListAsync(ct);
            var absentSet = new HashSet<Guid>(absentEmployeeIds);

            var rows = new List<EmployeeHoursRowDto>(employees.Count);
            foreach (var emp in employees)
            {
                double scheduledHours = 0;
                foreach (var a in assignments.Where(x => x.EmployeeId == emp.Id))
                {
                    if (hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                        scheduledHours += h;
                    else if (shiftDefaults.TryGetValue(a.ShiftId, out var dh))
                        scheduledHours += dh;
                }

                var variance = Math.Round(scheduledHours - emp.WeeklyHours, 2);
                var variancePct = emp.WeeklyHours > 0
                    ? Math.Round(100.0 * variance / emp.WeeklyHours, 1)
                    : 0;

                rows.Add(new EmployeeHoursRowDto
                {
                    EmployeeId = emp.Id,
                    FullName = emp.FullName,
                    ProfilePictureSrc = emp.HasProfile ? $"uploads/thumbnails/{emp.Id}.jpg" : null,
                    ScheduledHours = Math.Round(scheduledHours, 1),
                    ContractedHours = emp.WeeklyHours,
                    Variance = variance,
                    VariancePercent = variancePct,
                });
            }

            var topOver = rows
                .Where(r => r.Variance > 0)
                .OrderByDescending(r => r.Variance)
                .Take(5)
                .ToList();

            var topUnder = rows
                .Where(r => r.Variance < 0 && !absentSet.Contains(r.EmployeeId))
                .OrderBy(r => r.Variance)
                .Take(5)
                .ToList();

            // Distribution buckets (8) for the sparkbar header.
            // [-∞..-10), [-10..-6), [-6..-3), [-3..0), [0..+3), [+3..+6), [+6..+10), [+10..+∞)
            var distribution = new int[8];
            foreach (var r in rows)
            {
                var v = r.Variance;
                int bucket = v < -10 ? 0
                            : v < -6 ? 1
                            : v < -3 ? 2
                            : v < 0  ? 3
                            : v < 3  ? 4
                            : v < 6  ? 5
                            : v < 10 ? 6
                            : 7;
                distribution[bucket]++;
            }

            return new WorkingHoursSummaryDto
            {
                WeekStart = weekStart.ToString("yyyy-MM-dd"),
                WeekEnd = weekEnd.ToString("yyyy-MM-dd"),
                TopOverUtilized = topOver,
                TopUnderUtilized = topUnder,
                Distribution = distribution.ToList(),
            };
        }

        // ── Configuration snapshot + open issues ──────────────────────────────

        public async Task<ConfigurationSnapshotDto> GetConfigurationSnapshotAsync(DateOnly currentWeekStart, DateOnly currentWeekEnd, bool weekendsWorking, CancellationToken ct = default)
        {
            var activeShiftsCount = await _context.Shifts.AsNoTracking().CountAsync(s => s.IsActive, ct);
            var rotationPatternsCount = await _context.ShiftRotationPatterns.AsNoTracking().CountAsync(ct);
            var positionsCount = await _context.Positions.AsNoTracking().CountAsync(ct);
            var departmentsCount = await _context.Departments.AsNoTracking().CountAsync(ct);
            var employeesWithoutRotationCount = await _context.Employees.AsNoTracking()
                .Where(e => e.Active && e.RotationPatternId == null)
                .CountAsync(ct);

            var issues = new List<ScheduleHealthIssueDto>();

            // 1. Active shifts missing day schedules.
            var activeShifts = await _context.Shifts.AsNoTracking()
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.Label })
                .ToListAsync(ct);
            var shiftIds = activeShifts.Select(s => s.Id).ToList();

            var schedulesByShift = (await _context.ShiftDaySchedules.AsNoTracking()
                .Where(d => shiftIds.Contains(d.ShiftId))
                .Select(d => new { d.ShiftId, d.DayOfWeek })
                .ToListAsync(ct))
                .GroupBy(d => d.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            foreach (var s in activeShifts)
            {
                if (!schedulesByShift.ContainsKey(s.Id))
                {
                    issues.Add(new ScheduleHealthIssueDto
                    {
                        Severity = "warning",
                        Code = "ShiftMissingDaySchedule",
                        Title = $"Shift \"{s.Label}\" has no day schedule",
                        Description = "Activate this shift's day schedules so the engine can place it on the calendar.",
                        CtaRoute = "/shift-config",
                    });
                }
            }

            // 2. Active employees without a rotation pattern.
            if (employeesWithoutRotationCount > 0 && rotationPatternsCount > 0)
            {
                issues.Add(new ScheduleHealthIssueDto
                {
                    Severity = "info",
                    Code = "EmployeesWithoutRotation",
                    Title = $"{employeesWithoutRotationCount} active employee{(employeesWithoutRotationCount == 1 ? "" : "s")} without a rotation pattern",
                    Description = "Assigning a rotation keeps off-days predictable and improves scheduling fairness.",
                    CtaRoute = "/employees",
                });
            }

            // 3. Days in the current week that need coverage but have zero assignments.
            var weekAssignmentDates = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => a.Date >= currentWeekStart && a.Date <= currentWeekEnd)
                .Select(a => a.Date)
                .Distinct()
                .ToListAsync(ct);
            var assignedDateSet = new HashSet<DateOnly>(weekAssignmentDates);

            for (var date = currentWeekStart; date <= currentWeekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                var isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
                if (!weekendsWorking && isWeekend) continue;
                if (!assignedDateSet.Contains(date))
                {
                    issues.Add(new ScheduleHealthIssueDto
                    {
                        Severity = "critical",
                        Code = "DayWithoutAssignments",
                        Title = $"No assignments for {date:ddd, MMM d}",
                        Description = "Generate or build the schedule for this day before it goes live.",
                        CtaRoute = $"/shift-planner?view=week&date={date:yyyy-MM-dd}",
                    });
                }
            }

            // 4. Active shifts with day schedules but no position requirements (engine can't place anyone).
            var posReqShiftIds = (await _context.ShiftPositionRequirements.AsNoTracking()
                .Where(r => shiftIds.Contains(r.ShiftId) && r.RequiredCount > 0)
                .Select(r => r.ShiftId)
                .Distinct()
                .ToListAsync(ct)).ToHashSet();

            foreach (var s in activeShifts)
            {
                if (posReqShiftIds.Contains(s.Id)) continue;
                if (!schedulesByShift.ContainsKey(s.Id)) continue; // already flagged as missing day schedule
                issues.Add(new ScheduleHealthIssueDto
                {
                    Severity = "info",
                    Code = "ShiftNoHeadcount",
                    Title = $"Shift \"{s.Label}\" has no headcount target",
                    Description = "Define position requirements so the engine knows how many people to place.",
                    CtaRoute = "/shift-config",
                });
            }

            // Severity ordering (critical first) for the UI.
            var severityRank = new Dictionary<string, int> { ["critical"] = 0, ["warning"] = 1, ["info"] = 2 };
            issues = issues
                .OrderBy(i => severityRank.TryGetValue(i.Severity, out var r) ? r : 99)
                .ThenBy(i => i.Title)
                .ToList();

            return new ConfigurationSnapshotDto
            {
                Counts = new ConfigurationCountsDto
                {
                    ActiveShifts = activeShiftsCount,
                    RotationPatterns = rotationPatternsCount,
                    Positions = positionsCount,
                    Departments = departmentsCount,
                    EmployeesWithoutRotation = employeesWithoutRotationCount,
                },
                OpenIssues = issues,
            };
        }

        // ── First unscheduled week / month ────────────────────────────────────

        public async Task<DateOnly?> GetFirstUnscheduledWeekStartAsync(DateOnly today, int weeksHorizon, CancellationToken ct = default)
        {
            var firstMonday = AlignToMonday(today);
            var horizonEnd = firstMonday.AddDays(weeksHorizon * 7);

            var assignmentDates = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => a.Date >= firstMonday && a.Date < horizonEnd)
                .Select(a => a.Date)
                .Distinct()
                .ToListAsync(ct);
            var assignedSet = new HashSet<DateOnly>(assignmentDates);

            for (var weekStart = firstMonday; weekStart < horizonEnd; weekStart = weekStart.AddDays(7))
            {
                var weekEnd = weekStart.AddDays(7);
                var hasAny = false;
                for (var d = weekStart; d < weekEnd; d = d.AddDays(1))
                {
                    if (assignedSet.Contains(d)) { hasAny = true; break; }
                }
                if (!hasAny) return weekStart;
            }
            return null;
        }

        public async Task<DateOnly?> GetFirstUnscheduledMonthStartAsync(DateOnly today, int monthsHorizon, CancellationToken ct = default)
        {
            var firstOfThisMonth = new DateOnly(today.Year, today.Month, 1);
            var horizonStart = firstOfThisMonth;
            var horizonEnd = firstOfThisMonth.AddMonths(monthsHorizon);

            var assignmentDates = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => a.Date >= horizonStart && a.Date < horizonEnd)
                .Select(a => a.Date)
                .Distinct()
                .ToListAsync(ct);
            var assignedSet = new HashSet<DateOnly>(assignmentDates);

            for (int i = 0; i < monthsHorizon; i++)
            {
                var monthStart = firstOfThisMonth.AddMonths(i);
                var monthEnd = firstOfThisMonth.AddMonths(i + 1);
                var hasAny = false;
                foreach (var d in assignedSet)
                {
                    if (d >= monthStart && d < monthEnd) { hasAny = true; break; }
                }
                if (!hasAny) return monthStart;
            }
            return null;
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static DateOnly AlignToMonday(DateOnly date)
        {
            var daysFromMonday = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return date.AddDays(-daysFromMonday);
        }
    }
}
