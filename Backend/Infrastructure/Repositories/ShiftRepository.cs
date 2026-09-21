using Iwos.Business.Scheduling;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Repositories
{
    public class ShiftRepository : GenericRepository<Shift>, IShiftRepository
    {
        private readonly ITenantProvider _tenantProvider;

        public ShiftRepository(IwosDbContext context, ITenantProvider tenantProvider)
            : base(context)
        {
            _tenantProvider = tenantProvider;
        }

        public async Task<bool> HasAnyShiftsAsync(CancellationToken ct = default)
            => await _context.Shifts.AnyAsync(ct);

        public async Task<bool> HasAnyScheduleAsync(CancellationToken ct = default)
            => await _context.ShiftAssignments.AnyAsync(ct);

        public async Task<int> ProvisionPriorWeekAssignmentsAsync(
            IReadOnlyList<Business.Scheduling.SchedAssignment> assignments,
            Guid? importedById,
            CancellationToken ct = default)
        {
            if (assignments.Count == 0) return 0;
            var now = DateTime.UtcNow;
            var inserted = 0;
            foreach (var a in assignments)
            {
                var exists = await _context.ShiftAssignments
                    .AnyAsync(x => x.ShiftId == a.ShiftId && x.EmployeeId == a.EmployeeId && x.Date == a.Date, ct);
                if (exists) continue;
                _context.ShiftAssignments.Add(new ShiftAssignment
                {
                    ShiftId = a.ShiftId,
                    EmployeeId = a.EmployeeId,
                    Date = a.Date,
                    AssignedAt = now,
                    AssignedById = importedById,
                    Shift = null!,
                    Employee = null!,
                });
                inserted++;
            }
            await _context.SaveChangesAsync(ct);
            return inserted;
        }

        public async Task SetRotationAnchorAsync(Guid employeeId, DateOnly? anchorDate, CancellationToken ct = default)
        {
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId, ct)
                ?? throw new Exception("Error 3060: Employee not found.");
            emp.RotationAnchorDate = anchorDate;
            await _context.SaveChangesAsync(ct);
        }

        public async Task CreateDefaultShiftsAsync(CancellationToken ct = default)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable, ct);

            if (await HasAnyShiftsAsync(ct))
            {
                await transaction.RollbackAsync(ct);
                return;
            }

            var tenantId = _tenantProvider.GetTenantId();

            var morning = new Shift { ClientId = tenantId, Label = "Morning", DefaultStartTime = new TimeOnly(6, 0), DefaultEndTime = new TimeOnly(14, 0), IsActive = true, SortOrder = 0, Client = null! };
            var afternoon = new Shift { ClientId = tenantId, Label = "Afternoon", DefaultStartTime = new TimeOnly(14, 0), DefaultEndTime = new TimeOnly(22, 0), IsActive = true, SortOrder = 1, Client = null! };
            var night = new Shift { ClientId = tenantId, Label = "Night", DefaultStartTime = new TimeOnly(22, 0), DefaultEndTime = new TimeOnly(6, 0), IsActive = false, SortOrder = 2, Client = null! };

            _context.Shifts.AddRange(morning, afternoon, night);
            await _context.SaveChangesAsync(ct);

            var shifts = new[] { morning, afternoon, night };
            var daySchedules = new List<ShiftDaySchedule>();

            foreach (var shift in shifts)
            {
                for (int d = 0; d < 7; d++)
                {
                    daySchedules.Add(new ShiftDaySchedule
                    {
                        ShiftId = shift.Id,
                        DayOfWeek = (DayOfWeek)d,
                        StartTime = shift.DefaultStartTime,
                        EndTime = shift.DefaultEndTime,
                        Shift = null!
                    });
                }
            }

            _context.ShiftDaySchedules.AddRange(daySchedules);
            _context.ShiftClientConfigs.Add(new ShiftClientConfig
            {
                ClientId = tenantId,
                WeekEndsWorking = false,
                Client = null!
            });

            await _context.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        public Task<List<Shift>> GetShiftsAsync(CancellationToken ct = default)
            => _context.Shifts.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);

        public Task<List<ShiftDaySchedule>> GetDaySchedulesAsync(CancellationToken ct = default)
            => _context.ShiftDaySchedules.AsNoTracking().ToListAsync(ct);

        public Task<List<ShiftPositionRequirement>> GetPositionRequirementsAsync(CancellationToken ct = default)
            => _context.ShiftPositionRequirements.AsNoTracking().Include(r => r.Position).ToListAsync(ct);

        public Task<List<ShiftDayPositionRequirementOverride>> GetDayPositionRequirementOverridesAsync(CancellationToken ct = default)
            => _context.ShiftDayPositionRequirementOverrides.AsNoTracking().ToListAsync(ct);

        public Task<List<Position>> GetPositionsAsync(CancellationToken ct = default)
            => _context.Positions.AsNoTracking().Include(p => p.Employees).OrderBy(p => p.Title).ToListAsync(ct);

        public Task<ShiftClientConfig?> GetClientConfigAsync(CancellationToken ct = default)
            => _context.ShiftClientConfigs.FirstOrDefaultAsync(ct);

        public Task<List<ShiftRotationPattern>> GetRotationPatternsAsync(CancellationToken ct = default)
            => _context.ShiftRotationPatterns.AsNoTracking().OrderBy(p => p.Name).ToListAsync(ct);

        public async Task<ShiftRotationPattern> UpsertRotationPatternAsync(Guid? id, string name, int daysOn, int daysOff, bool isGlobal = false, CancellationToken ct = default)
        {
            if (daysOn <= 0 || daysOff < 0)
                throw new Exception("Error 3041: DaysOn must be > 0 and DaysOff must be >= 0.");

            // Only one pattern per tenant may be global — clear the flag on all others first
            if (isGlobal)
            {
                var others = await _context.ShiftRotationPatterns
                    .Where(p => p.IsGlobal && (!id.HasValue || p.Id != id.Value))
                    .ToListAsync(ct);
                foreach (var o in others) o.IsGlobal = false;
            }

            if (id.HasValue)
            {
                var existing = await _context.ShiftRotationPatterns.FirstOrDefaultAsync(p => p.Id == id.Value, ct)
                    ?? throw new Exception("Error 3042: Rotation pattern not found.");
                existing.Name = name;
                existing.DaysOn = daysOn;
                existing.DaysOff = daysOff;
                existing.IsGlobal = isGlobal;
                await _context.SaveChangesAsync(ct);
                return existing;
            }

            var created = new ShiftRotationPattern
            {
                ClientId = _tenantProvider.GetTenantId(),
                Name = name,
                DaysOn = daysOn,
                DaysOff = daysOff,
                IsGlobal = isGlobal,
                Client = null!
            };
            _context.ShiftRotationPatterns.Add(created);
            await _context.SaveChangesAsync(ct);
            return created;
        }

        public async Task<int> ApplyPatternToAllEmployeesAsync(Guid patternId, CancellationToken ct = default)
        {
            var employees = await _context.Employees
                .Where(e => e.Active && e.RotationPatternId == null)
                .ToListAsync(ct);

            foreach (var emp in employees)
            {
                emp.RotationPatternId = patternId;
            }

            await _context.SaveChangesAsync(ct);
            return employees.Count;
        }

        public async Task DeleteRotationPatternAsync(Guid id, CancellationToken ct = default)
        {
            var existing = await _context.ShiftRotationPatterns.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (existing == null) return;

            // Null out any employee references before deleting to avoid FK conflicts.
            var linked = await _context.Employees.Where(e => e.RotationPatternId == id).ToListAsync(ct);
            foreach (var emp in linked)
            {
                emp.RotationPatternId = null;
            }

            _context.ShiftRotationPatterns.Remove(existing);
            await _context.SaveChangesAsync(ct);
        }

        public async Task SaveConfigAsync(SaveShiftConfigDto dto, CancellationToken ct = default)
        {
            // Update shift active status
            var shiftIds = dto.Shifts.Select(s => s.Id).ToList();
            var shifts = await _context.Shifts.Where(s => shiftIds.Contains(s.Id)).ToListAsync(ct);
            foreach (var shift in shifts)
            {
                var update = dto.Shifts.First(s => s.Id == shift.Id);
                shift.IsActive = update.IsActive;
            }

            // Replace all day schedules for this tenant's shifts
            var allShiftIds = await _context.Shifts.Select(s => s.Id).ToListAsync(ct);
            var existing = await _context.ShiftDaySchedules
                .Where(s => allShiftIds.Contains(s.ShiftId))
                .ToListAsync(ct);
            _context.ShiftDaySchedules.RemoveRange(existing);

            foreach (var ds in dto.DaySchedules)
            {
                _context.ShiftDaySchedules.Add(new ShiftDaySchedule
                {
                    ShiftId = ds.ShiftId,
                    DayOfWeek = (DayOfWeek)ds.DayOfWeek,
                    StartTime = TimeOnly.Parse(ds.StartTime),
                    EndTime = TimeOnly.Parse(ds.EndTime),
                    Shift = null!
                });
            }

            // Upsert ShiftClientConfig
            var config = await _context.ShiftClientConfigs.FirstOrDefaultAsync(ct);
            if (config == null)
            {
                _context.ShiftClientConfigs.Add(new ShiftClientConfig
                {
                    ClientId = _tenantProvider.GetTenantId(),
                    WeekEndsWorking = dto.WeekEndsWorking,
                    ConsiderWeeklyHours = dto.ConsiderWeeklyHours,
                    Client = null!
                });
            }
            else
            {
                config.WeekEndsWorking = dto.WeekEndsWorking;
                config.ConsiderWeeklyHours = dto.ConsiderWeeklyHours;
            }

            // Replace all position requirements for this tenant's shifts
            var existingReqs = await _context.ShiftPositionRequirements
                .Where(r => allShiftIds.Contains(r.ShiftId))
                .ToListAsync(ct);
            _context.ShiftPositionRequirements.RemoveRange(existingReqs);

            foreach (var req in dto.PositionRequirements)
            {
                if (req.RequiredCount <= 0) continue;
                _context.ShiftPositionRequirements.Add(new ShiftPositionRequirement
                {
                    ShiftId = req.ShiftId,
                    PositionId = req.PositionId,
                    RequiredCount = req.RequiredCount,
                    Shift = null!,
                    Position = null!
                });
            }

            // Replace all day-of-week position requirement overrides for this tenant's shifts
            var existingDayOverrides = await _context.ShiftDayPositionRequirementOverrides
                .Where(r => allShiftIds.Contains(r.ShiftId))
                .ToListAsync(ct);
            _context.ShiftDayPositionRequirementOverrides.RemoveRange(existingDayOverrides);

            foreach (var ov in dto.DayPositionRequirementOverrides)
            {
                if (ov.RequiredCount < 0) continue;
                _context.ShiftDayPositionRequirementOverrides.Add(new ShiftDayPositionRequirementOverride
                {
                    ShiftId = ov.ShiftId,
                    DayOfWeek = (DayOfWeek)ov.DayOfWeek,
                    PositionId = ov.PositionId,
                    RequiredCount = ov.RequiredCount,
                    Shift = null!,
                    Position = null!
                });
            }

            await _context.SaveChangesAsync(ct);
        }

        public async Task<WeeklyScheduleDto> GetWeeklyScheduleAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default)
        { 
            var assignments = await _context.ShiftAssignments
                .Where(a => a.Date >= weekStart && a.Date <= weekEnd)
                .Select(a => new WeeklyScheduleAssignmentDto
                {
                    Date = a.Date.ToString("yyyy-MM-dd"),
                    ShiftId = a.ShiftId,
                    IsSwapped = a.IsSwapped,
                    Employee = new EmployeeShiftDto
                    {
                        Id = a.EmployeeId,
                        FullName = a.Employee.FirstName + " " + a.Employee.LastName,
                        PositionId = a.Employee.PositionId,
                        Position = a.Employee.Position != null
                            ? a.Employee.Position.Title
                            : string.Empty,
                        ProfilePictureSrc = a.Employee.Files != null && a.Employee.Files.Any(f => f.DisplayName == "profile.jpg")
                            ? $"uploads/thumbnails/{a.EmployeeId}.jpg"
                            : null
                    }
                })
                .ToListAsync(ct);

            var unavailabilities = await _context.ShiftUnavailabilities
                .Where(u => u.Date >= weekStart && u.Date <= weekEnd)
                .Select(u => new WeeklyScheduleUnavailabilityDto
                {
                    Date = u.Date.ToString("yyyy-MM-dd"),
                    ShiftId = u.ShiftId,
                    EmployeeId = u.EmployeeId,
                    FullName = u.Employee.FirstName + " " + u.Employee.LastName,
                    ReportedAt = u.ReportedAt
                })
                .ToListAsync(ct);

            var positionRequirementOverrides = await _context.ShiftPositionRequirementOverrides
                .Where(o => o.Date >= weekStart && o.Date <= weekEnd)
                .Select(o => new PositionRequirementOverrideDto
                {
                    Date = o.Date.ToString("yyyy-MM-dd"),
                    ShiftId = o.ShiftId,
                    PositionId = o.PositionId,
                    RequiredCount = o.RequiredCount
                })
                .ToListAsync(ct);

            return new WeeklyScheduleDto
            {
                WeekStart = weekStart.ToString("yyyy-MM-dd"),
                Assignments = assignments,
                Unavailabilities = unavailabilities,
                PositionRequirementOverrides = positionRequirementOverrides
            };
        }

        public async Task AssignEmployeeAsync(Guid shiftId, Guid employeeId, DateOnly date, Guid? assignedById, CancellationToken ct = default)
        {
            var exists = await _context.ShiftAssignments
                .AnyAsync(a => a.ShiftId == shiftId && a.EmployeeId == employeeId && a.Date == date, ct);
            if (exists) return;

            _context.ShiftAssignments.Add(new ShiftAssignment
            {
                ShiftId = shiftId,
                EmployeeId = employeeId,
                Date = date,
                AssignedAt = DateTime.UtcNow,
                AssignedById = assignedById,
                Shift = null!,
                Employee = null!
            });
            await _context.SaveChangesAsync(ct);
        }

        public async Task RemoveAssignmentAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            var assignment = await _context.ShiftAssignments
                .FirstOrDefaultAsync(a => a.ShiftId == shiftId && a.EmployeeId == employeeId && a.Date == date, ct);
            if (assignment == null) return;

            _context.ShiftAssignments.Remove(assignment);
            await _context.SaveChangesAsync(ct);
        }

        public async Task ClearWeekAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default)
        {
            var assignments = await _context.ShiftAssignments
                .Where(a => a.Date >= weekStart && a.Date <= weekEnd)
                .ToListAsync(ct);

            _context.ShiftAssignments.RemoveRange(assignments);
            await _context.SaveChangesAsync(ct);
        }


        public async Task UpsertPositionRequirementOverrideAsync(
            Guid shiftId, DateOnly date, Guid positionId, int requiredCount, CancellationToken ct = default)
        {
            var existing = await _context.ShiftPositionRequirementOverrides
                .FirstOrDefaultAsync(o => o.ShiftId == shiftId && o.Date == date && o.PositionId == positionId, ct);

            if (existing == null)
            {
                _context.ShiftPositionRequirementOverrides.Add(new ShiftPositionRequirementOverride
                {
                    ShiftId = shiftId,
                    Date = date,
                    PositionId = positionId,
                    RequiredCount = requiredCount,
                    Shift = null!,
                    Position = null!
                });
            }
            else
            {
                existing.RequiredCount = requiredCount;
            }
            await _context.SaveChangesAsync(ct);
        }

        public async Task RemovePositionRequirementOverrideAsync(
            Guid shiftId, DateOnly date, Guid positionId, CancellationToken ct = default)
        {
            var existing = await _context.ShiftPositionRequirementOverrides
                .FirstOrDefaultAsync(o => o.ShiftId == shiftId && o.Date == date && o.PositionId == positionId, ct);
            if (existing == null) return;

            _context.ShiftPositionRequirementOverrides.Remove(existing);
            await _context.SaveChangesAsync(ct);
        }

        public async Task ReportUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            var exists = await _context.ShiftUnavailabilities
                .AnyAsync(u => u.ShiftId == shiftId && u.EmployeeId == employeeId && u.Date == date, ct);
            if (exists) return;

            // Read employee name for denormalized storage
            var employee = await _context.Employees
                .AsNoTracking()
                .Where(e => e.Id == employeeId)
                .Select(e => new { e.FirstName, e.LastName })
                .FirstOrDefaultAsync(ct);

            var fullName = employee != null
                ? $"{employee.FirstName} {employee.LastName}"
                : "Unknown";

            _context.ShiftUnavailabilities.Add(new ShiftUnavailability
            {
                ShiftId = shiftId,
                EmployeeId = employeeId,
                FullName = fullName,
                Date = date,
                ReportedAt = DateTime.UtcNow,
                Shift = null!,
                Employee = null!
            });
            await _context.SaveChangesAsync(ct);
        }

        // ── Smart scheduling data loader ──────────────────────────────────────

        public async Task<SchedulingContext> LoadSchedulingContextAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default)
        {
            static double ComputeHours(TimeOnly start, TimeOnly end)
            {
                var diff = end.ToTimeSpan() - start.ToTimeSpan();
                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                return Math.Round(diff.TotalHours, 2);
            }

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => e.Active && (e.EndDate == null || e.EndDate >= weekStart))
                .Select(e => new SchedEmployee(
                    e.Id,
                    e.FirstName + " " + e.LastName,
                    e.PositionId,
                    e.WeeklyHours,
                    e.RotationPatternId,
                    e.PinnedShiftId,
                    e.RotationAnchorDate))
                .ToListAsync(ct);

            var rotationPatterns = await _context.ShiftRotationPatterns
                .AsNoTracking()
                .Select(p => new SchedRotationPattern(p.Id, p.Name, p.DaysOn, p.DaysOff))
                .ToListAsync(ct);

            var shiftEntities = await _context.Shifts
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder)
                .ToListAsync(ct);

            var shifts = shiftEntities
                .Select(s => new SchedShift(s.Id, s.Label))
                .ToList();

            var shiftIds = shiftEntities.Select(s => s.Id).ToList();

            var daySchedEntities = await _context.ShiftDaySchedules
                .AsNoTracking()
                .Where(d => shiftIds.Contains(d.ShiftId))
                .ToListAsync(ct);

            var daySchedules = daySchedEntities
                .Select(d => new SchedDaySchedule(
                    d.ShiftId,
                    d.DayOfWeek,
                    ComputeHours(d.StartTime, d.EndTime),
                    d.StartTime.Hour + d.StartTime.Minute / 60.0))
                .ToList();

            var positionRequirements = await _context.ShiftPositionRequirements
                .AsNoTracking()
                .Where(r => shiftIds.Contains(r.ShiftId))
                .Select(r => new SchedPositionRequirement(r.ShiftId, r.PositionId, r.RequiredCount))
                .ToListAsync(ct);

            var dayPositionRequirementOverrides = await _context.ShiftDayPositionRequirementOverrides
                .AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId))
                .Select(o => new SchedDayPositionRequirementOverride(o.ShiftId, o.DayOfWeek, o.PositionId, o.RequiredCount))
                .ToListAsync(ct);

            var positionRequirementOverrides = await _context.ShiftPositionRequirementOverrides
                .AsNoTracking()
                .Where(o => o.Date >= weekStart && o.Date <= weekEnd)
                .Select(o => new SchedPositionRequirementOverride(o.ShiftId, o.Date, o.PositionId, o.RequiredCount))
                .ToListAsync(ct);

            // Continuous hard constraints (RestPeriod, ConsecutiveHours, Overtime) need to see
            // assignments and absences for ±7 calendar days beyond the planning window so they
            // can evaluate cross-window streaks and rest gaps without being fooled by data
            // outside their immediate window. See each constraint's Evaluate method for the
            // horizon contract.
            var horizonStart = weekStart.AddDays(-7);
            var horizonEnd   = weekEnd.AddDays(7);

            var absences = await _context.Absences
                .AsNoTracking()
                .Where(a => a.Status == AbsenceStatus.Approved
                            && a.StartDate <= horizonEnd
                            && a.EndDate >= horizonStart)
                .Select(a => new SchedAbsence(a.EmployeeId, a.StartDate, a.EndDate))
                .ToListAsync(ct);

            var unavailabilities = await _context.ShiftUnavailabilities
                .AsNoTracking()
                .Where(u => u.Date >= weekStart && u.Date <= weekEnd)
                .Select(u => new SchedUnavailability(u.EmployeeId, u.ShiftId, u.Date))
                .ToListAsync(ct);

            var lockedAssignments = await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= weekStart && a.Date <= weekEnd)
                .Select(a => new SchedAssignment(a.EmployeeId, a.ShiftId, a.Date))
                .ToListAsync(ct);

            // Load the 7 calendar days BEFORE weekStart AND the 7 days AFTER weekEnd so
            // continuous hard constraints (RestPeriod, ConsecutiveHours, Overtime) can see
            // the tails of adjacent weeks. This data is visible to constraints but is NOT
            // seeded into the running state (no hours counted, no date-blocking) — see
            // SchedulingContext.PriorAssignments.
            var priorAssignments = await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= horizonStart
                            && a.Date <= horizonEnd
                            && (a.Date < weekStart || a.Date > weekEnd))
                .Select(a => new SchedAssignment(a.EmployeeId, a.ShiftId, a.Date))
                .ToListAsync(ct);

            var clientConfig = await _context.ShiftClientConfigs.AsNoTracking().FirstOrDefaultAsync(ct);

            return new SchedulingContext
            {
                WeekStart = weekStart,
                WeekEnd = weekEnd,
                WeekendsWorking = clientConfig?.WeekEndsWorking ?? false,
                ConsiderWeeklyHours = clientConfig?.ConsiderWeeklyHours ?? true,
                Employees = employees,
                Shifts = shifts,
                DaySchedules = daySchedules,
                PositionRequirements = positionRequirements,
                DayPositionRequirementOverrides = dayPositionRequirementOverrides,
                PositionRequirementOverrides = positionRequirementOverrides,
                Absences = absences,
                Unavailabilities = unavailabilities,
                LockedAssignments = lockedAssignments,
                RotationPatterns = rotationPatterns,
                PriorAssignments = priorAssignments,
            };
        }

        public async Task BulkInsertAssignmentsAsync(IReadOnlyList<SchedAssignment> assignments, Guid? assignedById, CancellationToken ct = default)
        {
            if (assignments.Count == 0) return;

            var now = DateTime.UtcNow;
            foreach (var a in assignments)
            {
                var exists = await _context.ShiftAssignments
                    .AnyAsync(x => x.ShiftId == a.ShiftId && x.EmployeeId == a.EmployeeId && x.Date == a.Date, ct);
                if (exists) continue;

                _context.ShiftAssignments.Add(new ShiftAssignment
                {
                    ShiftId = a.ShiftId,
                    EmployeeId = a.EmployeeId,
                    Date = a.Date,
                    AssignedAt = now,
                    AssignedById = assignedById,
                    Shift = null!,
                    Employee = null!,
                });
            }
            await _context.SaveChangesAsync(ct);
        }

        public async Task CancelUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            var existing = await _context.ShiftUnavailabilities
                .FirstOrDefaultAsync(u => u.ShiftId == shiftId && u.EmployeeId == employeeId && u.Date == date, ct);
            if (existing == null) return;

            _context.ShiftUnavailabilities.Remove(existing);
            await _context.SaveChangesAsync(ct);
        }

        // ── Historical hours for cross-run fairness ───────────────────────────

        public async Task<Dictionary<Guid, double>> GetAccumulatedHoursBeforeAsync(DateOnly beforeDate, int lookbackDays = 30, CancellationToken ct = default)
        {
            static double ComputeHours(TimeOnly start, TimeOnly end)
            {
                var diff = end.ToTimeSpan() - start.ToTimeSpan();
                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                return Math.Round(diff.TotalHours, 2);
            }

            var rangeStart = beforeDate.AddDays(-lookbackDays);

            var daySchedules = await _context.ShiftDaySchedules.AsNoTracking().ToListAsync(ct);
            var hoursLookup = daySchedules.ToDictionary(
                d => (d.ShiftId, d.DayOfWeek),
                d => ComputeHours(d.StartTime, d.EndTime));

            var shifts = await _context.Shifts.AsNoTracking().ToListAsync(ct);
            var shiftDefaultHours = shifts.ToDictionary(
                s => s.Id,
                s => ComputeHours(s.DefaultStartTime, s.DefaultEndTime));

            var assignments = await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= rangeStart && a.Date < beforeDate)
                .Select(a => new { a.EmployeeId, a.ShiftId, a.Date })
                .ToListAsync(ct);

            var result = new Dictionary<Guid, double>();
            foreach (var a in assignments)
            {
                if (!hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                    shiftDefaultHours.TryGetValue(a.ShiftId, out h);
                result[a.EmployeeId] = (result.TryGetValue(a.EmployeeId, out var prev) ? prev : 0d) + h;
            }
            return result;
        }

        public async Task<List<string>> GetScheduledDaysAsync(DateOnly start, DateOnly end, CancellationToken ct = default)
        {
            return await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= start && a.Date <= end)
                .Select(a => a.Date.ToString("yyyy-MM-dd"))
                .Distinct()
                .ToListAsync(ct);
        }

        // ── Working time overview ─────────────────────────────────────────────

        public async Task<WorkingTimeOverviewDto> GetWorkingTimeOverviewAsync(int year, CancellationToken ct = default)
        {
            static double ComputeHours(TimeOnly start, TimeOnly end)
            {
                var diff = end.ToTimeSpan() - start.ToTimeSpan();
                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                return Math.Round(diff.TotalHours, 2);
            }

            var yearStart = new DateOnly(year, 1, 1);
            var yearEnd   = new DateOnly(year, 12, 31);

            // Extend lookup slightly so weeks that straddle Jan 1 or Dec 31 are included.
            var rangeStart = yearStart.AddDays(-6);
            var rangeEnd   = yearEnd.AddDays(6);

            // Hours lookup: (ShiftId, DayOfWeek) → hours
            var daySchedules = await _context.ShiftDaySchedules.AsNoTracking().ToListAsync(ct);
            var hoursLookup = daySchedules.ToDictionary(
                d => (d.ShiftId, d.DayOfWeek),
                d => ComputeHours(d.StartTime, d.EndTime));

            // Default hours per shift (fallback when day-schedule is absent)
            var shifts = await _context.Shifts.AsNoTracking().ToListAsync(ct);
            var shiftDefaultHours = shifts.ToDictionary(
                s => s.Id,
                s => ComputeHours(s.DefaultStartTime, s.DefaultEndTime));

            // All assignments in the extended range
            var rawAssignments = await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= rangeStart && a.Date <= rangeEnd)
                .Select(a => new
                {
                    a.EmployeeId,
                    a.ShiftId,
                    a.Date,
                    FullName = a.Employee.FirstName + " " + a.Employee.LastName,
                    Position = a.Employee.Position != null
                        ? a.Employee.Position.Title
                        : string.Empty,
                    a.Employee.WeeklyHours,
                    HasProfilePic = a.Employee.Files != null && a.Employee.Files.Any(f => f.DisplayName == "profile.jpg"),
                })
                .ToListAsync(ct);


			// Find the last month that has any assignment, then generate Jan–that month
			var lastMonth = rawAssignments.Count == 0
                ? DateOnly.FromDateTime(DateTime.UtcNow)
                : rawAssignments.Max(a => a.Date);

			var months = Enumerable
				.Range(1, lastMonth.Month)
				.Select(m => new WorkingTimeMonthDto
				{
					Year = year,
					Month = m,
					Label = new DateTime(year, m, 1).ToString("MMMM yyyy"),
					Key = $"{year}-{m}",
				})
				.ToList();

			// Build per-employee rows
			var employees = rawAssignments
                .GroupBy(a => a.EmployeeId)
                .Select(g =>
                {
                    var first = g.First();
                    var monthStats = new Dictionary<string, WorkingTimeMonthStatsDto>();

                    foreach (var m in months)
                    {
                        double hours = 0;
                        int days = 0;
                        foreach (var a in g.Where(a => a.Date.Year == m.Year && a.Date.Month == m.Month))
                        {
                            if (hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                                hours += h;
                            else if (shiftDefaultHours.TryGetValue(a.ShiftId, out var dh))
                                hours += dh;
                            days++;
                        }
                        monthStats[m.Key] = new WorkingTimeMonthStatsDto
                        {
                            Hours = Math.Round(hours, 1),
                            Days  = days,
                        };
                    }

                    return new WorkingTimeEmployeeRowDto
                    {
                        EmployeeId       = first.EmployeeId,
                        FullName         = first.FullName,
                        ProfilePictureSrc = first.HasProfilePic ? $"uploads/thumbnails/{first.EmployeeId}.jpg" : null,
                        Position         = first.Position ?? string.Empty,
                        WeeklyHours      = first.WeeklyHours,
                        MonthStats       = monthStats,
                    };
                })
                .OrderBy(e => e.FullName)
                .ToList();

            return new WorkingTimeOverviewDto { Year = year, Months = months, Employees = employees };
        }

        // ── Payroll export ────────────────────────────────────────────────────

        public async Task<List<PayrollExportRowDto>> GetPayrollExportDataAsync(int year, int month, CancellationToken ct = default)
        {
            static double ComputeHours(TimeOnly start, TimeOnly end)
            {
                var diff = end.ToTimeSpan() - start.ToTimeSpan();
                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                return Math.Round(diff.TotalHours, 2);
            }

            // Monday-anchored ISO week start for a given date.
            static DateOnly WeekStart(DateOnly date)
            {
                int offset = ((int)date.DayOfWeek + 6) % 7; // Monday = 0 ... Sunday = 6
                return date.AddDays(-offset);
            }

            var monthStart = new DateOnly(year, month, 1);
            var monthEnd   = monthStart.AddMonths(1).AddDays(-1);

            // Extend so weeks straddling the month boundary are evaluated in full,
            // matching the lookback/forward window used by OvertimeConstraint.
            var rangeStart = WeekStart(monthStart);
            var rangeEnd   = WeekStart(monthEnd).AddDays(6);

            var daySchedules = await _context.ShiftDaySchedules.AsNoTracking().ToListAsync(ct);
            var hoursLookup = daySchedules.ToDictionary(
                d => (d.ShiftId, d.DayOfWeek),
                d => ComputeHours(d.StartTime, d.EndTime));

            var shifts = await _context.Shifts.AsNoTracking().ToListAsync(ct);
            var shiftDefaultHours = shifts.ToDictionary(
                s => s.Id,
                s => ComputeHours(s.DefaultStartTime, s.DefaultEndTime));

            var rawAssignments = await _context.ShiftAssignments
                .AsNoTracking()
                .Where(a => a.Date >= rangeStart && a.Date <= rangeEnd)
                .Select(a => new
                {
                    a.EmployeeId,
                    a.ShiftId,
                    a.Date,
                    FullName = a.Employee.FirstName + " " + a.Employee.LastName,
                    EmployeeCode = a.Employee.PersonalId ?? string.Empty,
                    Position = a.Employee.Position != null ? a.Employee.Position.Title : string.Empty,
                    a.Employee.WeeklyHours,
                })
                .ToListAsync(ct);

            var rows = new List<PayrollExportRowDto>();

            foreach (var g in rawAssignments.GroupBy(a => a.EmployeeId))
            {
                var first = g.First();
                double totalRegular = 0, totalOvertime = 0;
                int daysWorked = 0;

                foreach (var week in g.GroupBy(a => WeekStart(a.Date)))
                {
                    double weekHours = 0;
                    var hoursByAssignment = new List<(DateOnly Date, double Hours)>();

                    foreach (var a in week)
                    {
                        double h = hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var lookedUp)
                            ? lookedUp
                            : shiftDefaultHours.GetValueOrDefault(a.ShiftId);
                        weekHours += h;
                        hoursByAssignment.Add((a.Date, h));
                    }

                    double weekRegular = Math.Min(weekHours, first.WeeklyHours);
                    double regularRatio = weekHours > 0 ? weekRegular / weekHours : 0;

                    foreach (var (date, hours) in hoursByAssignment)
                    {
                        if (date.Year != year || date.Month != month) continue;

                        totalRegular  += hours * regularRatio;
                        totalOvertime += hours * (1 - regularRatio);
                        daysWorked++;
                    }
                }

                rows.Add(new PayrollExportRowDto
                {
                    EmployeeId    = first.EmployeeId,
                    EmployeeCode  = first.EmployeeCode,
                    FullName      = first.FullName,
                    Position      = first.Position ?? string.Empty,
                    WeeklyHours   = first.WeeklyHours,
                    RegularHours  = Math.Round(totalRegular, 2),
                    OvertimeHours = Math.Round(totalOvertime, 2),
                    TotalHours    = Math.Round(totalRegular + totalOvertime, 2),
                    DaysWorked    = daysWorked,
                });
            }

            return rows.OrderBy(r => r.FullName).ToList();
        }

        // ── Shift swap requests ──────────────────────────────────────────────

        public async Task<Guid> CreateSwapRequestAsync(
            Guid requesterId, Guid targetEmployeeId,
            Guid requestedShiftId, DateOnly requestedDate,
            Guid offeredShiftId, DateOnly offeredDate,
            CancellationToken ct = default)
        {
            var entity = new ShiftSwapRequest
            {
                RequesterId = requesterId,
                TargetEmployeeId = targetEmployeeId,
                RequestedShiftId = requestedShiftId,
                RequestedDate = requestedDate,
                OfferedShiftId = offeredShiftId,
                OfferedDate = offeredDate,
                Status = ShiftSwapStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Requester = null!,
                TargetEmployee = null!,
                RequestedShift = null!,
                OfferedShift = null!,
            };
            _context.ShiftSwapRequests.Add(entity);
            await _context.SaveChangesAsync(ct);
            return entity.Id;
        }

        public async Task<List<ShiftSwapRequestDto>> GetSwapRequestsForEmployeeAsync(Guid employeeId, CancellationToken ct = default)
        {
            return await _context.ShiftSwapRequests
                .AsNoTracking()
                .Where(r => r.RequesterId == employeeId || r.TargetEmployeeId == employeeId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ShiftSwapRequestDto
                {
                    Id = r.Id,
                    RequesterId = r.RequesterId,
                    RequesterName = r.Requester.FirstName + " " + r.Requester.LastName,
                    RequesterProfilePictureSrc = r.Requester.Files != null && r.Requester.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.RequesterId}.jpg"
                        : null,
                    TargetEmployeeId = r.TargetEmployeeId,
                    TargetEmployeeName = r.TargetEmployee.FirstName + " " + r.TargetEmployee.LastName,
                    TargetEmployeeProfilePictureSrc = r.TargetEmployee.Files != null && r.TargetEmployee.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.TargetEmployeeId}.jpg"
                        : null,
                    RequestedShiftId = r.RequestedShiftId,
                    RequestedShiftLabel = r.RequestedShift.Label,
                    RequestedDate = r.RequestedDate.ToString("yyyy-MM-dd"),
                    OfferedShiftId = r.OfferedShiftId,
                    OfferedShiftLabel = r.OfferedShift.Label,
                    OfferedDate = r.OfferedDate.ToString("yyyy-MM-dd"),
                    Status = r.Status.ToString(),
                    CreatedAt = r.CreatedAt,
                    RespondedAt = r.RespondedAt,
                })
                .ToListAsync(ct);
        }

        public async Task<List<ShiftSwapRequestDto>> GetAllPendingSwapRequestsAsync(CancellationToken ct = default)
        {
            return await _context.ShiftSwapRequests
                .AsNoTracking()
                .Where(r => r.Status == ShiftSwapStatus.Pending)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ShiftSwapRequestDto
                {
                    Id = r.Id,
                    RequesterId = r.RequesterId,
                    RequesterName = r.Requester.FirstName + " " + r.Requester.LastName,
                    RequesterProfilePictureSrc = r.Requester.Files != null && r.Requester.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.RequesterId}.jpg"
                        : null,
                    TargetEmployeeId = r.TargetEmployeeId,
                    TargetEmployeeName = r.TargetEmployee.FirstName + " " + r.TargetEmployee.LastName,
                    TargetEmployeeProfilePictureSrc = r.TargetEmployee.Files != null && r.TargetEmployee.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.TargetEmployeeId}.jpg"
                        : null,
                    RequestedShiftId = r.RequestedShiftId,
                    RequestedShiftLabel = r.RequestedShift.Label,
                    RequestedDate = r.RequestedDate.ToString("yyyy-MM-dd"),
                    OfferedShiftId = r.OfferedShiftId,
                    OfferedShiftLabel = r.OfferedShift.Label,
                    OfferedDate = r.OfferedDate.ToString("yyyy-MM-dd"),
                    Status = r.Status.ToString(),
                    CreatedAt = r.CreatedAt,
                    RespondedAt = r.RespondedAt,
                })
                .ToListAsync(ct);
        }

        public async Task<ShiftSwapRequestDto?> GetSwapRequestByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _context.ShiftSwapRequests
                .AsNoTracking()
                .Where(r => r.Id == id)
                .Select(r => new ShiftSwapRequestDto
                {
                    Id = r.Id,
                    RequesterId = r.RequesterId,
                    RequesterName = r.Requester.FirstName + " " + r.Requester.LastName,
                    RequesterProfilePictureSrc = r.Requester.Files != null && r.Requester.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.RequesterId}.jpg"
                        : null,
                    TargetEmployeeId = r.TargetEmployeeId,
                    TargetEmployeeName = r.TargetEmployee.FirstName + " " + r.TargetEmployee.LastName,
                    TargetEmployeeProfilePictureSrc = r.TargetEmployee.Files != null && r.TargetEmployee.Files.Any(f => f.DisplayName == "profile.jpg")
                        ? $"uploads/thumbnails/{r.TargetEmployeeId}.jpg"
                        : null,
                    RequestedShiftId = r.RequestedShiftId,
                    RequestedShiftLabel = r.RequestedShift.Label,
                    RequestedDate = r.RequestedDate.ToString("yyyy-MM-dd"),
                    OfferedShiftId = r.OfferedShiftId,
                    OfferedShiftLabel = r.OfferedShift.Label,
                    OfferedDate = r.OfferedDate.ToString("yyyy-MM-dd"),
                    Status = r.Status.ToString(),
                    CreatedAt = r.CreatedAt,
                    RespondedAt = r.RespondedAt,
                })
                .FirstOrDefaultAsync(ct);
        }

        public async Task AcceptSwapRequestAsync(Guid id, CancellationToken ct = default)
        {
            var request = await _context.ShiftSwapRequests
                .FirstOrDefaultAsync(r => r.Id == id && r.Status == ShiftSwapStatus.Pending, ct)
                ?? throw new Exception("Error 3020: Swap request not found or not pending.");

            // ── Swap the assignments in a single SaveChanges call ─────────────

            // Remove requester from offered shift
            var requesterOldAssignment = await _context.ShiftAssignments
                .FirstOrDefaultAsync(a => a.ShiftId == request.OfferedShiftId
                    && a.EmployeeId == request.RequesterId
                    && a.Date == request.OfferedDate, ct);

            // Remove target from requested shift
            var targetOldAssignment = await _context.ShiftAssignments
                .FirstOrDefaultAsync(a => a.ShiftId == request.RequestedShiftId
                    && a.EmployeeId == request.TargetEmployeeId
                    && a.Date == request.RequestedDate, ct);

            if (requesterOldAssignment != null)
                _context.ShiftAssignments.Remove(requesterOldAssignment);
            if (targetOldAssignment != null)
                _context.ShiftAssignments.Remove(targetOldAssignment);

            // Assign requester to the requested shift
            _context.ShiftAssignments.Add(new ShiftAssignment
            {
                ShiftId = request.RequestedShiftId,
                EmployeeId = request.RequesterId,
                Date = request.RequestedDate,
                AssignedAt = DateTime.UtcNow,
                AssignedById = request.TargetEmployeeId,
                IsSwapped = true,
                LastSwapId = request.Id,
                Shift = null!,
                Employee = null!,
            });

            // Assign target to the offered shift
            _context.ShiftAssignments.Add(new ShiftAssignment
            {
                ShiftId = request.OfferedShiftId,
                EmployeeId = request.TargetEmployeeId,
                Date = request.OfferedDate,
                AssignedAt = DateTime.UtcNow,
                AssignedById = request.TargetEmployeeId,
                IsSwapped = true,
                LastSwapId = request.Id,
                Shift = null!,
                Employee = null!,
            });

            request.Status = ShiftSwapStatus.Accepted;
            request.RespondedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
        }

        public async Task DeclineSwapRequestAsync(Guid id, CancellationToken ct = default)
        {
            var request = await _context.ShiftSwapRequests
                .FirstOrDefaultAsync(r => r.Id == id && r.Status == ShiftSwapStatus.Pending, ct)
                ?? throw new Exception("Error 3021: Swap request not found or not pending.");

            request.Status = ShiftSwapStatus.Declined;
            request.RespondedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        public async Task CancelSwapRequestAsync(Guid id, CancellationToken ct = default)
        {
            var request = await _context.ShiftSwapRequests
                .FirstOrDefaultAsync(r => r.Id == id && r.Status == ShiftSwapStatus.Pending, ct)
                ?? throw new Exception("Error 3022: Swap request not found or not pending.");

            request.Status = ShiftSwapStatus.Cancelled;
            await _context.SaveChangesAsync(ct);
        }
    }
}
