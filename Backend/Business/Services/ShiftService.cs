using ClosedXML.Excel;
using Iwos.Business.Scheduling;
using Iwos.Business.Scheduling.Constraints;
using Iwos.Business.Scheduling.Optimizer;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Model;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    public class ShiftService : IShiftService
    {
        private readonly IShiftRepository _shiftRepository;
        private readonly IShiftSchedulingEngine _schedulingEngine;
        private readonly IAbsenceRepository _absenceRepository;
        private readonly IReadOnlyList<IScheduleConstraint> _constraints;
        private readonly IEmailService _emailService;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly IUserRepository _userRepository;
        private readonly ITenantProvider _tenantProvider;
        private readonly IMemoryCache _cache;

        // Per-tenant TTL for ShiftConfig. Read on every page mount across manager & portal,
        // and the underlying data only changes on explicit SaveConfig / SaveRotationPattern,
        // which invalidate the entry below.
        private static readonly TimeSpan ConfigCacheTtl = TimeSpan.FromMinutes(5);
        private static string ConfigCacheKey(Guid tenantId) => $"shift-config:{tenantId:N}";

        public ShiftService(
            IShiftRepository shiftRepository,
            IShiftSchedulingEngine schedulingEngine,
            IAbsenceRepository absenceRepository,
            IEnumerable<IScheduleConstraint> constraints,
            IEmailService emailService,
            IEmployeeRepository employeeRepository,
            IUserRepository userRepository,
            ITenantProvider tenantProvider,
            IMemoryCache cache)
        {
            _shiftRepository = shiftRepository;
            _schedulingEngine = schedulingEngine;
            _absenceRepository = absenceRepository;
            _constraints = constraints.Where(c => c.Severity == ConstraintSeverity.Hard).OrderBy(c => c.Priority).ToList();
            _emailService = emailService;
            _employeeRepository = employeeRepository;
            _userRepository = userRepository;
            _tenantProvider = tenantProvider;
            _cache = cache;
        }

        public async Task CreateDefaultShiftAsync(CancellationToken ct)
        {
            await _shiftRepository.CreateDefaultShiftsAsync(ct);
            InvalidateConfigCache();
        }

        /// <summary>
        /// Computes shift duration in decimal hours. Handles overnight shifts (e.g. 22:00–06:00 = 8 h).
        /// </summary>
        private static double ComputeShiftHours(TimeOnly start, TimeOnly end)
        {
            var diff = end.ToTimeSpan() - start.ToTimeSpan();
            if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
            return Math.Round(diff.TotalHours, 2);
        }

        public async Task<ShiftConfigDto> GetConfigAsync(CancellationToken ct = default)
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (tenantId != Guid.Empty && _cache.TryGetValue(ConfigCacheKey(tenantId), out ShiftConfigDto? cached) && cached != null)
            {
                return cached;
            }

            var dto = await BuildConfigDtoAsync(ct);

            // Don't cache empty configs — they happen during first-time onboarding,
            // before shifts have been seeded. Caching empty would force a 5-minute
            // wait before newly seeded shifts become visible.
            if (tenantId != Guid.Empty && dto.Shifts.Count > 0)
            {
                _cache.Set(ConfigCacheKey(tenantId), dto, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ConfigCacheTtl,
                });
            }

            return dto;
        }

        private async Task<ShiftConfigDto> BuildConfigDtoAsync(CancellationToken ct)
        {
            var shifts = await _shiftRepository.GetShiftsAsync(ct);
            var daySchedules = await _shiftRepository.GetDaySchedulesAsync(ct);
            var clientConfig = await _shiftRepository.GetClientConfigAsync(ct);

            var positionRequirements = await _shiftRepository.GetPositionRequirementsAsync(ct);
            var dayPositionOverrides = await _shiftRepository.GetDayPositionRequirementOverridesAsync(ct);
            var rotationPatterns = await _shiftRepository.GetRotationPatternsAsync(ct);

            return new ShiftConfigDto
            {
                WeekEndsWorking = clientConfig?.WeekEndsWorking ?? false,
                ConsiderWeeklyHours = clientConfig?.ConsiderWeeklyHours ?? true,
                Shifts = shifts.Select(s => new ShiftDto
                {
                    Id = s.Id,
                    Label = s.Label,
                    DefaultStartTime = s.DefaultStartTime.ToString("HH:mm"),
                    DefaultEndTime = s.DefaultEndTime.ToString("HH:mm"),
                    DefaultHours = ComputeShiftHours(s.DefaultStartTime, s.DefaultEndTime),
                    IsActive = s.IsActive,
                    SortOrder = s.SortOrder,
                }).ToList(),
                DaySchedules = daySchedules.Select(ds => new ShiftDayScheduleDto
                {
                    ShiftId = ds.ShiftId,
                    DayOfWeek = (int)ds.DayOfWeek,
                    StartTime = ds.StartTime.ToString("HH:mm"),
                    EndTime = ds.EndTime.ToString("HH:mm"),
                    Hours = ComputeShiftHours(ds.StartTime, ds.EndTime),
                }).ToList(),
                PositionRequirements = positionRequirements.Select(r => new ShiftPositionRequirementDto
                {
                    ShiftId = r.ShiftId,
                    PositionId = r.PositionId,
                    PositionTitle = r.Position.Title,
                    RequiredCount = r.RequiredCount,
                }).ToList(),
                DayPositionRequirementOverrides = dayPositionOverrides.Select(o => new ShiftDayPositionRequirementOverrideDto
                {
                    ShiftId = o.ShiftId,
                    DayOfWeek = (int)o.DayOfWeek,
                    PositionId = o.PositionId,
                    RequiredCount = o.RequiredCount,
                }).ToList(),
                RotationPatterns = rotationPatterns.Select(p => new ShiftRotationPatternDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    DaysOn = p.DaysOn,
                    DaysOff = p.DaysOff,
                    IsGlobal = p.IsGlobal,
                }).ToList()
            };
        }

        public async Task<List<ShiftRotationPatternDto>> GetRotationPatternsAsync(CancellationToken ct = default)
        {
            var patterns = await _shiftRepository.GetRotationPatternsAsync(ct);
            return patterns.Select(p => new ShiftRotationPatternDto
            {
                Id = p.Id,
                Name = p.Name,
                DaysOn = p.DaysOn,
                DaysOff = p.DaysOff,
                IsGlobal = p.IsGlobal,
            }).ToList();
        }

        public async Task<SaveRotationPatternResultDto> SaveRotationPatternAsync(SaveRotationPatternDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new Exception("Error 3040: Rotation pattern name is required.");

            var isCreate = !dto.Id.HasValue;

            var saved = await _shiftRepository.UpsertRotationPatternAsync(dto.Id, dto.Name.Trim(), dto.DaysOn, dto.DaysOff, dto.IsGlobal, ct);

            var employeesUpdated = 0;
            if (dto.IsGlobal)
                employeesUpdated = await _shiftRepository.ApplyPatternToAllEmployeesAsync(saved.Id, ct);

            InvalidateConfigCache();

            return new SaveRotationPatternResultDto
            {
                Pattern = new ShiftRotationPatternDto
                {
                    Id = saved.Id,
                    Name = saved.Name,
                    DaysOn = saved.DaysOn,
                    DaysOff = saved.DaysOff,
                    IsGlobal = saved.IsGlobal,
                },
                EmployeesUpdated = employeesUpdated,
            };
        }

        public async Task DeleteRotationPatternAsync(Guid id, CancellationToken ct = default)
        {
            await _shiftRepository.DeleteRotationPatternAsync(id, ct);
            InvalidateConfigCache();
        }

        public async Task SaveConfigAsync(SaveShiftConfigDto dto, CancellationToken ct = default)
        {
            if (dto.Shifts.Count(s => s.IsActive) < 1)
                throw new Exception("At least one shift must be active.");

            await _shiftRepository.SaveConfigAsync(dto, ct);
            InvalidateConfigCache();
        }

        private void InvalidateConfigCache()
        {
            var tenantId = _tenantProvider.GetTenantId();
            if (tenantId != Guid.Empty) _cache.Remove(ConfigCacheKey(tenantId));
        }

        public async Task<WeeklyScheduleDto> GetWeeklyScheduleAsync(DateOnly weekStart, CancellationToken ct = default)
        {
            var weekEnd = weekStart.AddDays(6);
            return await _shiftRepository.GetWeeklyScheduleAsync(weekStart, weekEnd, ct);
        }

        public async Task AssignEmployeeAsync(AssignEmployeeDto dto, Guid assignedById, CancellationToken ct = default)
        {
            var weekStart = AlignToMonday(dto.Date);
            var weekEnd = weekStart.AddDays(6);
            var context = await _shiftRepository.LoadSchedulingContextAsync(weekStart, weekEnd, ct);

            var employee = context.Employees.FirstOrDefault(e => e.Id == dto.EmployeeId);
            if (employee == null)
                throw new Exception("Error 3024: Employee not found or not active.");

            // Build state from all existing assignments this week.
            var hoursLookup = context.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
            var state = new SchedulingState();
            foreach (var a in context.LockedAssignments)
            {
                state.EmployeeDateTaken.Add((a.EmployeeId, a.Date));
                if (hoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                    state.AddHours(a.EmployeeId, h);
            }

            // Duplicate-day guard (engine pre-check, not a constraint).
            if (state.EmployeeDateTaken.Contains((employee.Id, dto.Date)))
                throw new ConstraintViolationException(
                    ["Employee is already assigned to another shift on this date."], []);

            var slotHours = hoursLookup.TryGetValue((dto.ShiftId, dto.Date.DayOfWeek), out var sh) ? sh : 8d;
            var slot = new ScheduleSlot(dto.Date, dto.ShiftId, null, slotHours);

            // Compute rotation anchors so RotationPatternConstraint evaluates correctly.
            var anchors = ComputeRotationAnchors(context.Employees, context.RotationPatterns, RotationEpoch, context.WeekendsWorking);
            var fullContext = new SchedulingContext
            {
                WeekStart = context.WeekStart,
                WeekEnd = context.WeekEnd,
                WeekendsWorking = context.WeekendsWorking,
                ConsiderWeeklyHours = context.ConsiderWeeklyHours,
                Employees = context.Employees,
                Shifts = context.Shifts,
                DaySchedules = context.DaySchedules,
                PositionRequirements = context.PositionRequirements,
                DayPositionRequirementOverrides = context.DayPositionRequirementOverrides,
                PositionRequirementOverrides = context.PositionRequirementOverrides,
                Absences = context.Absences,
                Unavailabilities = context.Unavailabilities,
                LockedAssignments = context.LockedAssignments,
                RotationPatterns = context.RotationPatterns,
                PriorAssignments = context.PriorAssignments,
                RotationAnchors = anchors,
            };

            // Evaluate every hard constraint, separating blocking from overridable.
            var blockingViolations = new List<string>();
            var overridableViolations = new List<string>();
            foreach (var constraint in _constraints)
            {
                // When ForceOverride is set, skip overridable constraints entirely.
                if (dto.ForceOverride && constraint.IsUserOverridable) continue;

                var eval = constraint.Evaluate(fullContext, state, employee, slot);
                if (!eval.Violated) continue;

                if (constraint.IsUserOverridable)
                    overridableViolations.Add(eval.Reason ?? constraint.Name);
                else
                    blockingViolations.Add(eval.Reason ?? constraint.Name);
            }

            if (blockingViolations.Count > 0 || overridableViolations.Count > 0)
                throw new ConstraintViolationException(blockingViolations, overridableViolations);

            await _shiftRepository.AssignEmployeeAsync(dto.ShiftId, dto.EmployeeId, dto.Date, assignedById, ct);
        }

        public async Task RemoveAssignmentAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            await _shiftRepository.RemoveAssignmentAsync(shiftId, employeeId, date, ct);
        }

        public async Task ClearWeekAsync(DateOnly weekStart, CancellationToken ct = default)
        {
            var weekEnd = weekStart.AddDays(6);
            await _shiftRepository.ClearWeekAsync(weekStart, weekEnd, ct);
        }

        public async Task SetPositionRequirementOverrideAsync(SetPositionRequirementOverrideDto dto, CancellationToken ct = default)
        {
            if (dto.RequiredCount < 0)
                throw new Exception("Required count cannot be negative.");

            await _shiftRepository.UpsertPositionRequirementOverrideAsync(
                dto.ShiftId, dto.Date, dto.PositionId, dto.RequiredCount, ct);
        }

        public async Task RemovePositionRequirementOverrideAsync(Guid shiftId, DateOnly date, Guid positionId, CancellationToken ct = default)
        {
            await _shiftRepository.RemovePositionRequirementOverrideAsync(shiftId, date, positionId, ct);
        }

        public async Task ReportUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            if (date < DateOnly.FromDateTime(DateTime.UtcNow))
                throw new Exception("Cannot report unavailability for past dates.");

            await _shiftRepository.ReportUnavailabilityAsync(shiftId, employeeId, date, ct);
        }

        public async Task CancelUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default)
        {
            await _shiftRepository.CancelUnavailabilityAsync(shiftId, employeeId, date, ct);
        }

        public async Task<GenerateScheduleRangeResponseDto> GenerateScheduleForRangeAsync(GenerateScheduleRangeRequestDto request, Guid? generatedById, CancellationToken ct = default)
        {
            if (request.EndDate < request.StartDate)
                throw new Exception("Error 3050: EndDate must be on or after StartDate.");

            // Normalize range to full weeks (Mon–Sun) so the engine runs on whole-week slices.
            var firstMonday = AlignToMonday(request.StartDate);
            var lastSunday = AlignToMonday(request.EndDate).AddDays(6);

            var allProposals = new List<SchedAssignment>();
            var allUnfilled = new List<UnfilledSlotInfo>();
            var allSoftViolations = new List<ScheduleViolation>();
            var weekBreakdown = new List<WeekCoverageBreakdownDto>();
            var allOptimizerChanges = new List<Iwos.Business.Scheduling.Optimizer.OptimizationChange>();
            var totalOptimizerIterations = 0;
            var totalSlotsFilledByOptimizer = 0;
            var totalOptimizerDurationMs = 0L;
            var optimizerRan = false;
            var totalSlots = 0;
            var filledSlots = 0;

            // Seed cross-run fairness from DB history (12-week rolling window before the range).
            // This ensures that employees underutilized in prior runs are preferred in the current one,
            // preventing the engine from systematically favouring the same employees each time.
            var accumulatedHours = await _shiftRepository.GetAccumulatedHoursBeforeAsync(firstMonday, ct: ct);
            // For employee summaries: track proposed days and hours per employee.
            var proposedDays = new Dictionary<Guid, HashSet<DateOnly>>();
            var proposedHours = new Dictionary<Guid, double>();
            // Employee name index built from contexts encountered during the run.
            var employeeNames = new Dictionary<Guid, string>();

            for (var weekStart = firstMonday; weekStart <= lastSunday; weekStart = weekStart.AddDays(7))
            {
                var weekEnd = weekStart.AddDays(6);
                var context = await _shiftRepository.LoadSchedulingContextAsync(weekStart, weekEnd, ct);

                // Collect employee names for the summary (new employees may appear across weeks).
                foreach (var emp in context.Employees)
                    employeeNames.TryAdd(emp.Id, emp.FullName);

                // Build the prior-assignments window for this week. Continuous hard constraints
                // (RestPeriod, ConsecutiveHours, Overtime) require visibility ±7 days around the
                // planning window. Sources:
                //   • DB-loaded prior (context.PriorAssignments) already covers ±7 days from the DB.
                //   • In-flight proposals from previous loop iterations that fall in either the 7-day
                //     window BEFORE weekStart or AFTER weekEnd — the DB doesn't have them yet
                //     (not persisted), so we supply them from allProposals accumulated so far.
                var priorWindowStart = weekStart.AddDays(-7);
                var priorWindowEnd   = weekEnd.AddDays(7);
                var inFlightPrior = allProposals
                    .Where(a => a.Date >= priorWindowStart && a.Date <= priorWindowEnd
                                && (a.Date < weekStart || a.Date > weekEnd))
                    .ToList();
                var mergedPrior = context.PriorAssignments
                    .Concat(inFlightPrior)
                    .GroupBy(a => (a.EmployeeId, a.ShiftId, a.Date))
                    .Select(g => g.First())
                    .ToList();

                // Anchor from the global epoch so rotation is continuous with single-week runs
                // and consistent throughout the entire year.
                var weekAnchors = ComputeRotationAnchors(context.Employees, context.RotationPatterns, RotationEpoch, context.WeekendsWorking);
                var rangedContext = new SchedulingContext
                {
                    WeekStart = context.WeekStart,
                    WeekEnd = context.WeekEnd,
                    WeekendsWorking = context.WeekendsWorking,
                    ConsiderWeeklyHours = context.ConsiderWeeklyHours,
                    AccumulatedHours = accumulatedHours,
                    Employees = context.Employees,
                    Shifts = context.Shifts,
                    DaySchedules = context.DaySchedules,
                    PositionRequirements = context.PositionRequirements,
                    DayPositionRequirementOverrides = context.DayPositionRequirementOverrides,
                    PositionRequirementOverrides = context.PositionRequirementOverrides,
                    Absences = context.Absences,
                    Unavailabilities = context.Unavailabilities,
                    LockedAssignments = context.LockedAssignments,
                    RotationPatterns = context.RotationPatterns,
                    PriorAssignments = mergedPrior,
                    RotationAnchors = weekAnchors,
                };

                // Engine always runs greedy + post-pass local-search optimizer; never returns a raw greedy result.
                var weekResult = _schedulingEngine.Generate(rangedContext);

                allProposals.AddRange(weekResult.ProposedAssignments);
                allUnfilled.AddRange(weekResult.UnfilledSlots);
                allSoftViolations.AddRange(weekResult.AcceptedSoftViolations);
                totalSlots += weekResult.TotalSlots;
                filledSlots += weekResult.FilledSlots;

                weekBreakdown.Add(new WeekCoverageBreakdownDto
                {
                    WeekStart = weekStart.ToString("yyyy-MM-dd"),
                    TotalSlots = weekResult.TotalSlots,
                    FilledSlots = weekResult.FilledSlots,
                });

                if (weekResult.Optimization != null)
                {
                    optimizerRan = true;
                    allOptimizerChanges.AddRange(weekResult.Optimization.Changes);
                    totalOptimizerIterations += weekResult.Optimization.Iterations;
                    totalSlotsFilledByOptimizer += weekResult.Optimization.SlotsFilledByOptimizer;
                    totalOptimizerDurationMs += weekResult.Optimization.DurationMs;
                }

                // Accumulate hours (locked + proposed) for fairness scoring in the next week.
                var dayHoursLookup = context.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
                foreach (var a in context.LockedAssignments.Concat(weekResult.ProposedAssignments))
                {
                    var h = dayHoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var hrs) ? hrs : 0d;
                    accumulatedHours[a.EmployeeId] = (accumulatedHours.TryGetValue(a.EmployeeId, out var prev) ? prev : 0d) + h;
                }

                // Track proposed-only stats for the employee distribution summary.
                foreach (var a in weekResult.ProposedAssignments)
                {
                    var h = dayHoursLookup.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var hrs) ? hrs : 0d;
                    if (!proposedDays.TryGetValue(a.EmployeeId, out var days)) proposedDays[a.EmployeeId] = days = [];
                    days.Add(a.Date);
                    proposedHours[a.EmployeeId] = (proposedHours.TryGetValue(a.EmployeeId, out var ph) ? ph : 0d) + h;
                }
            }

            if (request.Persist && allProposals.Count > 0)
            {
                await _shiftRepository.BulkInsertAssignmentsAsync(allProposals, generatedById, ct);
            }

            var employeeSummaries = proposedDays
                .Select(kv => new EmployeeMonthSummaryDto
                {
                    EmployeeId = kv.Key,
                    FullName = employeeNames.TryGetValue(kv.Key, out var name) ? name : "",
                    DaysWorked = kv.Value.Count,
                    HoursWorked = Math.Round(proposedHours.TryGetValue(kv.Key, out var h) ? h : 0d, 1),
                })
                .OrderBy(s => s.FullName)
                .ToList();

            return new GenerateScheduleRangeResponseDto
            {
                StartDate = firstMonday.ToString("yyyy-MM-dd"),
                EndDate = lastSunday.ToString("yyyy-MM-dd"),
                TotalSlots = totalSlots,
                FilledSlots = filledSlots,
                Persisted = request.Persist,
                WeekBreakdown = weekBreakdown,
                ProposedAssignments = allProposals
                    .Select(a => new ProposedAssignmentDto
                    {
                        ShiftId = a.ShiftId,
                        EmployeeId = a.EmployeeId,
                        Date = a.Date.ToString("yyyy-MM-dd"),
                    }).ToList(),
                UnfilledSlots = allUnfilled
                    .Select(u => new UnfilledSlotDto
                    {
                        Date = u.Date.ToString("yyyy-MM-dd"),
                        ShiftId = u.ShiftId,
                        RequiredPositionId = u.RequiredPositionId,
                        Reason = u.Reason,
                    }).ToList(),
                AcceptedSoftViolations = allSoftViolations
                    .Select(v => new ScheduleSoftViolationDto
                    {
                        EmployeeId = v.EmployeeId,
                        ShiftId = v.ShiftId,
                        Date = v.Date.ToString("yyyy-MM-dd"),
                        ConstraintName = v.ConstraintName,
                        Priority = v.Priority,
                        Reason = v.Reason,
                    }).ToList(),
                EmployeeSummaries = employeeSummaries,
                Optimization = optimizerRan
                    ? new OptimizationSummaryDto
                    {
                        Iterations = totalOptimizerIterations,
                        SlotsFilledByOptimizer = totalSlotsFilledByOptimizer,
                        RemainingUnfilled = allUnfilled.Count,
                        DurationMs = totalOptimizerDurationMs,
                        Changes = allOptimizerChanges.Select(c => new OptimizerChangeDto
                        {
                            Type = c.Type.ToString(),
                            Date = c.Date.ToString("yyyy-MM-dd"),
                            ShiftId = c.ShiftId,
                            EmployeeId = c.EmployeeId,
                            FromShiftId = c.FromShiftId,
                            FromDate = c.FromDate?.ToString("yyyy-MM-dd"),
                            Description = c.Description,
                        }).ToList(),
                    }
                    : null,
            };
        }

        private static DateOnly AlignToMonday(DateOnly date)
        {
            var daysFromMonday = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return date.AddDays(-daysFromMonday);
        }

        /// <summary>
        /// Fixed Monday used as the global reference for all rotation-anchor computations.
        /// Using a stable epoch (rather than the scheduling week's start) ensures that
        /// rotation positions are continuous across separate single-week and multi-week
        /// generation runs — an employee always lands on the same cycle day for any
        /// given calendar date, regardless of when the schedule was generated.
        /// </summary>
        private static readonly DateOnly RotationEpoch = new DateOnly(2020, 1, 6); // Monday

        /// <summary>
        /// Stagger rotation anchors so that employees in the same pattern group have
        /// their off-days on different calendar days, maximising shift coverage.
        /// Employee i of N gets phase_i = round(i * cycle / N) working days subtracted
        /// from rangeStart, so at rangeStart each employee is at a different point in
        /// their cycle.
        /// </summary>
        private static IReadOnlyDictionary<Guid, DateOnly> ComputeRotationAnchors(
            IReadOnlyList<SchedEmployee> employees,
            IReadOnlyList<SchedRotationPattern> patterns,
            DateOnly rangeStart,
            bool weekendsWorking)
        {
            var patternMap = patterns.ToDictionary(p => p.Id);
            var anchors = new Dictionary<Guid, DateOnly>();

            var groups = employees
                .Where(e => e.RotationPatternId.HasValue)
                .GroupBy(e => e.RotationPatternId!.Value);

            foreach (var group in groups)
            {
                if (!patternMap.TryGetValue(group.Key, out var pattern)) continue;

                var cycle = pattern.DaysOn + pattern.DaysOff;
                if (cycle <= 0) continue;

                // Employees with a persisted anchor skip epoch staggering; they use it directly.
                var withPersistedAnchor = group.Where(e => e.RotationAnchorDate.HasValue).ToList();
                foreach (var emp in withPersistedAnchor)
                    anchors[emp.Id] = emp.RotationAnchorDate!.Value;

                // Remaining employees get staggered anchors computed from the epoch.
                var needsEpoch = group.Where(e => !e.RotationAnchorDate.HasValue)
                    .OrderBy(e => e.FullName).ThenBy(e => e.Id).ToList();
                var n = needsEpoch.Count;

                for (var i = 0; i < n; i++)
                {
                    var phase = (int)Math.Round((double)i * cycle / n);
                    anchors[needsEpoch[i].Id] = SubtractWorkingDays(rangeStart, phase, weekendsWorking);
                }
            }

            return anchors;
        }

        /// <summary>Moves <paramref name="start"/> back by <paramref name="count"/> working days.</summary>
        private static DateOnly SubtractWorkingDays(DateOnly start, int count, bool weekendsWorking)
        {
            if (count == 0) return start;
            if (weekendsWorking) return start.AddDays(-count);

            var current = start;
            var remaining = count;
            while (remaining > 0)
            {
                current = current.AddDays(-1);
                var dow = current.DayOfWeek;
                if (dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday)
                    remaining--;
            }
            return current;
        }

        public async Task<List<PositionForShiftDto>> GetPositionsAsync(CancellationToken ct = default)
        {
            var positions = await _shiftRepository.GetPositionsAsync(ct);
            return positions.Select(p => new PositionForShiftDto { Id = p.Id, Title = p.Title }).ToList();
        }

        // ── Working time overview ─────────────────────────────────────────────

        public Task<WorkingTimeOverviewDto> GetWorkingTimeOverviewAsync(int year, CancellationToken ct = default)
            => _shiftRepository.GetWorkingTimeOverviewAsync(year, ct);

        public async Task<byte[]> ExportPayrollAsync(int year, int month, CancellationToken ct = default)
        {
            var rows = await _shiftRepository.GetPayrollExportDataAsync(year, month, ct);

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Payroll");

            worksheet.Cell(1, 1).Value = "Employee ID";
            worksheet.Cell(1, 2).Value = "Full Name";
            worksheet.Cell(1, 3).Value = "Position";
            worksheet.Cell(1, 4).Value = "Pay Period";
            worksheet.Cell(1, 5).Value = "Contracted Weekly Hours";
            worksheet.Cell(1, 6).Value = "Regular Hours";
            worksheet.Cell(1, 7).Value = "Overtime Hours";
            worksheet.Cell(1, 8).Value = "Total Hours";
            worksheet.Cell(1, 9).Value = "Days Worked";

            var payPeriod = new DateOnly(year, month, 1).ToString("MMMM yyyy");

            int row = 2;
            foreach (var r in rows)
            {
                worksheet.Cell(row, 1).Value = r.EmployeeCode;
                worksheet.Cell(row, 2).Value = r.FullName;
                worksheet.Cell(row, 3).Value = r.Position;
                worksheet.Cell(row, 4).Value = payPeriod;
                worksheet.Cell(row, 5).Value = r.WeeklyHours;
                worksheet.Cell(row, 6).Value = r.RegularHours;
                worksheet.Cell(row, 7).Value = r.OvertimeHours;
                worksheet.Cell(row, 8).Value = r.TotalHours;
                worksheet.Cell(row, 9).Value = r.DaysWorked;
                row++;
            }

            int lastColumn = worksheet.LastColumnUsed().ColumnNumber();
            for (int col = 1; col <= lastColumn; col++)
            {
                worksheet.Column(col).AdjustToContents();
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        // ── Shift swap ───────────────────────────────────────────────────────

        public async Task<Guid> RequestShiftSwapAsync(Guid requesterId, RequestShiftSwapDto dto, CancellationToken ct = default)
        {
            if (requesterId == dto.TargetEmployeeId)
                throw new Exception("Error 3015: Cannot request a swap with yourself.");

            if (dto.RequestedShiftId == dto.OfferedShiftId && dto.RequestedDate == dto.OfferedDate)
                throw new Exception("Error 3016: Requested and offered shifts must differ.");

            if (dto.RequestedDate < DateOnly.FromDateTime(DateTime.UtcNow))
                throw new Exception("Error 3017: Cannot request a swap for a past date.");

            if (dto.OfferedDate < DateOnly.FromDateTime(DateTime.UtcNow))
                throw new Exception("Error 3018: Cannot offer a shift on a past date.");

            var swapId = await _shiftRepository.CreateSwapRequestAsync(
                requesterId, dto.TargetEmployeeId,
                dto.RequestedShiftId, dto.RequestedDate,
                dto.OfferedShiftId, dto.OfferedDate, ct);

            var swap = await _shiftRepository.GetSwapRequestByIdAsync(swapId, ct);
            if (swap != null)
            {
                var targetEmployee = await _employeeRepository.Get(dto.TargetEmployeeId, ct);
                if (!string.IsNullOrWhiteSpace(targetEmployee?.ContactEmail))
                    await SendSwapRequestedNotification(targetEmployee.ContactEmail, swap, ct);
            }

            return swapId;
        }

        public async Task<List<ShiftSwapRequestDto>> GetMySwapRequestsAsync(Guid employeeId, CancellationToken ct = default)
        {
            return await _shiftRepository.GetSwapRequestsForEmployeeAsync(employeeId, ct);
        }

        public async Task<List<ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(CancellationToken ct = default)
        {
            return await _shiftRepository.GetAllPendingSwapRequestsAsync(ct);
        }

        public async Task RespondToSwapRequestAsync(Guid swapRequestId, Guid responderId, bool accept, CancellationToken ct = default)
        {
            var swap = await _shiftRepository.GetSwapRequestByIdAsync(swapRequestId, ct)
                ?? throw new Exception("Error 3019: Swap request not found.");

            if (swap.TargetEmployeeId != responderId)
                throw new Exception("Error 3019: Only the target employee can respond to a swap request.");

            if (accept)
                await _shiftRepository.AcceptSwapRequestAsync(swapRequestId, ct);
            else
                await _shiftRepository.DeclineSwapRequestAsync(swapRequestId, ct);

            var offererEmployee = await _employeeRepository.Get(swap.RequesterId, ct);
            if (!string.IsNullOrWhiteSpace(offererEmployee?.ContactEmail))
                await SendSwapRespondedNotification(offererEmployee.ContactEmail, swap, accept, ct);

            if (accept)
            {
                var clientId = _tenantProvider.GetTenantId();
                Expression<Func<ApplicationUser, bool>> filter = u => u.ClientId == clientId;
                var managers = await _userRepository.GetList(filter: filter, token: ct);
                if (managers != null)
                {
                    var managerEmails = managers
                        .Where(m => !string.IsNullOrEmpty(m.Email))
                        .Select(m => m.Email!);
                    foreach (var email in managerEmails)
                        await SendSwapAcceptedManagerNotification(email, swap, ct);
                }
            }
        }

        private async Task SendSwapRequestedNotification(string email, ShiftSwapRequestDto swap, CancellationToken ct)
        {
            var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "shift-swap-requested.html");
            var template = await System.IO.File.ReadAllTextAsync(templatePath);

            template = template
                .Replace("{{offererName}}", swap.RequesterName)
                .Replace("{{offeredShiftLabel}}", swap.OfferedShiftLabel)
                .Replace("{{offeredDate}}", swap.OfferedDate)
                .Replace("{{requestedShiftLabel}}", swap.RequestedShiftLabel)
                .Replace("{{requestedDate}}", swap.RequestedDate);

            await _emailService.SendEmail(email, "New Shift Swap Request", template);
        }

        private async Task SendSwapRespondedNotification(string email, ShiftSwapRequestDto swap, bool accepted, CancellationToken ct)
        {
            var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "shift-swap-responded.html");
            var template = await System.IO.File.ReadAllTextAsync(templatePath);

            var statusText = accepted ? "Accepted" : "Declined";
            var statusBadgeClass = accepted ? "status-accepted" : "status-declined";

            template = template
                .Replace("{{targetName}}", swap.TargetEmployeeName)
                .Replace("{{status}}", statusText)
                .Replace("{{statusBadgeClass}}", statusBadgeClass)
                .Replace("{{status_lower}}", statusText.ToLowerInvariant())
                .Replace("{{offeredShiftLabel}}", swap.OfferedShiftLabel)
                .Replace("{{offeredDate}}", swap.OfferedDate)
                .Replace("{{requestedShiftLabel}}", swap.RequestedShiftLabel)
                .Replace("{{requestedDate}}", swap.RequestedDate);

            await _emailService.SendEmail(email, $"Shift Swap Request {statusText}", template);
        }

        private async Task SendSwapAcceptedManagerNotification(string email, ShiftSwapRequestDto swap, CancellationToken ct)
        {
            var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "shift-swap-accepted-manager.html");
            var template = await System.IO.File.ReadAllTextAsync(templatePath);

            template = template
                .Replace("{{offererName}}", swap.RequesterName)
                .Replace("{{targetName}}", swap.TargetEmployeeName)
                .Replace("{{offeredShiftLabel}}", swap.OfferedShiftLabel)
                .Replace("{{offeredDate}}", swap.OfferedDate)
                .Replace("{{requestedShiftLabel}}", swap.RequestedShiftLabel)
                .Replace("{{requestedDate}}", swap.RequestedDate);

            await _emailService.SendEmail(email, "Shift Swap Completed", template);
        }

        public async Task CancelSwapRequestAsync(Guid swapRequestId, Guid requesterId, CancellationToken ct = default)
        {
            var swap = await _shiftRepository.GetSwapRequestByIdAsync(swapRequestId, ct)
                ?? throw new Exception("Error 3019: Swap request not found.");

            if (swap.RequesterId != requesterId)
                throw new Exception("Error 3019: Only the requester can cancel a swap request.");

            await _shiftRepository.CancelSwapRequestAsync(swapRequestId, ct);

            var targetEmployee = await _employeeRepository.Get(swap.TargetEmployeeId, ct);
            if (!string.IsNullOrWhiteSpace(targetEmployee?.ContactEmail))
                await SendSwapCancelledNotification(targetEmployee.ContactEmail, swap, ct);
        }

        private async Task SendSwapCancelledNotification(string email, ShiftSwapRequestDto swap, CancellationToken ct)
        {
            var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "shift-swap-cancelled.html");
            var template = await System.IO.File.ReadAllTextAsync(templatePath);

            template = template
                .Replace("{{offererName}}", swap.RequesterName)
                .Replace("{{offeredShiftLabel}}", swap.OfferedShiftLabel)
                .Replace("{{offeredDate}}", swap.OfferedDate)
                .Replace("{{requestedShiftLabel}}", swap.RequestedShiftLabel)
                .Replace("{{requestedDate}}", swap.RequestedDate);

            await _emailService.SendEmail(email, "Shift Swap Request Cancelled", template);
        }

        public Task<List<string>> GetScheduledDaysAsync(DateOnly start, DateOnly end, CancellationToken ct = default)
            => _shiftRepository.GetScheduledDaysAsync(start, end, ct);

        // ── Onboarding ────────────────────────────────────────────────────────

        public Task<bool> HasAnyScheduleAsync(CancellationToken ct = default)
            => _shiftRepository.HasAnyScheduleAsync(ct);

        public async Task<ProvisionPriorWeekResultDto> ProvisionPriorWeekAsync(ProvisionPriorWeekDto dto, Guid? importedById, CancellationToken ct = default)
        {
            if (!DateOnly.TryParse(dto.WeekStart, out var weekStart))
                throw new Exception("Error 3062: Invalid WeekStart date format. Expected yyyy-MM-dd.");

            if (weekStart.DayOfWeek != DayOfWeek.Monday)
                throw new Exception("Error 3062: WeekStart must be a Monday.");

            var assignments = new List<SchedAssignment>();

            foreach (var entry in dto.Employees)
            {
                if (entry.DailyShiftIds.Count != 7)
                    throw new Exception($"Error 3062: Employee {entry.EmployeeId} must have exactly 7 daily shift entries (Mon–Sun).");

                for (var i = 0; i < 7; i++)
                {
                    if (entry.DailyShiftIds[i] is not Guid shiftId) continue;
                    assignments.Add(new SchedAssignment(entry.EmployeeId, shiftId, weekStart.AddDays(i)));
                }
            }

            var inserted = await _shiftRepository.ProvisionPriorWeekAssignmentsAsync(assignments, importedById, ct);

            var anchorDatesSet = 0;
            foreach (var entry in dto.Employees.Where(e => e.AnchorDate != null))
            {
                if (!DateOnly.TryParse(entry.AnchorDate, out var anchor))
                    throw new Exception($"Error 3062: Invalid AnchorDate for employee {entry.EmployeeId}. Expected yyyy-MM-dd.");

                await _shiftRepository.SetRotationAnchorAsync(entry.EmployeeId, anchor, ct);
                anchorDatesSet++;
            }

            return new ProvisionPriorWeekResultDto
            {
                AssignmentsInserted = inserted,
                AnchorDatesSet = anchorDatesSet,
            };
        }

        public async Task SetRotationAnchorAsync(SetRotationAnchorDto dto, CancellationToken ct = default)
        {
            DateOnly? anchor = null;
            if (dto.AnchorDate != null)
            {
                if (!DateOnly.TryParse(dto.AnchorDate, out var parsed))
                    throw new Exception("Error 3063: Invalid AnchorDate format. Expected yyyy-MM-dd.");
                anchor = parsed;
            }

            await _shiftRepository.SetRotationAnchorAsync(dto.EmployeeId, anchor, ct);
        }

        // ── CP-SAT re-optimization ──────────────────────────────────────────
        // Runs Google OR-Tools across the whole requested range as a single
        // problem (not per-week), validates the result against every hard
        // constraint with a ±1-week padding so cross-week interactions
        // (consecutive hours, rest period, rotation continuity) are honoured,
        // and only persists when validation passes.

        public async Task<ReoptimizeScheduleResponseDto> ReoptimizeScheduleAsync(
            ReoptimizeScheduleRequestDto request, Guid? requestedById, CancellationToken ct = default)
        {
            if (request.EndDate < request.StartDate)
                throw new Exception("Error 3080: EndDate must be on or after StartDate.");

            // ── Sanitize disabled constraints ────────────────────────────────
            // Hard safety gate: only constraints that are BOTH user-overridable AND
            // already classified as Hard may be disabled. Anything else the client
            // passes is silently dropped here, so non-overridable rules cannot be
            // bypassed by tampering with the request body.
            var disabledNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (request.DisabledConstraints != null && request.DisabledConstraints.Count > 0)
            {
                var allowed = _constraints
                    .Where(c => c.IsUserOverridable)
                    .Select(c => c.Name)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                foreach (var name in request.DisabledConstraints)
                    if (!string.IsNullOrWhiteSpace(name) && allowed.Contains(name))
                        disabledNames.Add(name);
            }

            var rangeStart = AlignToMonday(request.StartDate);
            var rangeEnd = AlignToMonday(request.EndDate).AddDays(6);

            // Padding: one week before + one week after so cross-period
            // constraints are evaluated against real neighbours, not voids.
            var paddedStart = rangeStart.AddDays(-7);
            var paddedEnd = rangeEnd.AddDays(7);

            // Load context for the padded range — gives us all employees,
            // shifts, configs, absences/unavailabilities/rotations etc.
            var paddedContext = await _shiftRepository.LoadSchedulingContextAsync(paddedStart, paddedEnd, ct);

            // Anchor rotation cycles to the global epoch so the model honours
            // the same rotation logic the existing engine uses.
            var anchors = ComputeRotationAnchors(paddedContext.Employees, paddedContext.RotationPatterns,
                RotationEpoch, paddedContext.WeekendsWorking);

            // Existing assignments in the padded range. We split them:
            //   • inRange    → these are what CP-SAT may overwrite.
            //   • outOfRange → these stay locked. Folded into the model as
            //                  fixed constants in the consecutive-hours and
            //                  weekly-hour bookkeeping.
            var existingAll = paddedContext.LockedAssignments.ToList();
            var existingInRange = existingAll
                .Where(a => a.Date >= rangeStart && a.Date <= rangeEnd)
                .ToList();
            var existingOutOfRange = existingAll
                .Where(a => a.Date < rangeStart || a.Date > rangeEnd)
                .ToList();

            var solverContext = new SchedulingContext
            {
                WeekStart = rangeStart,
                WeekEnd = rangeEnd,
                WeekendsWorking = paddedContext.WeekendsWorking,
                ConsiderWeeklyHours = paddedContext.ConsiderWeeklyHours,
                AccumulatedHours = paddedContext.AccumulatedHours,
                Employees = paddedContext.Employees,
                Shifts = paddedContext.Shifts,
                DaySchedules = paddedContext.DaySchedules,
                PositionRequirements = paddedContext.PositionRequirements,
                DayPositionRequirementOverrides = paddedContext.DayPositionRequirementOverrides,
                PositionRequirementOverrides = paddedContext.PositionRequirementOverrides,
                Absences = paddedContext.Absences,
                Unavailabilities = paddedContext.Unavailabilities,
                LockedAssignments = existingOutOfRange,
                RotationPatterns = paddedContext.RotationPatterns,
                PriorAssignments = paddedContext.PriorAssignments,
                RotationAnchors = anchors,
            };

            // ── Solve ───────────────────────────────────────────────────────
            var optimizer = new Iwos.Business.Scheduling.Optimizer.CpSatScheduleOptimizer();
            var solverResult = optimizer.Solve(solverContext,
                new Iwos.Business.Scheduling.Optimizer.CpSatScheduleOptimizer.Options
                {
                    TimeBudget = TimeSpan.FromSeconds(request.TimeBudgetSeconds ?? (rangeEnd.DayNumber - rangeStart.DayNumber > 14 ? 30 : 15)),
                    WarmStart = existingInRange,
                    DisabledConstraints = disabledNames,
                });

            // Coverage delta — informational only; both numbers go on the response.
            var filledBefore = existingInRange.Count;
            var filledAfter = solverResult.Assignments.Count;

            // ── Validate against the FULL hard-constraint pipeline ──────────
            // Build a state with the padded out-of-range assignments fixed and
            // the proposed assignments stacked in. For every proposed (e,
            // shift, date), drop it from state, then ask each hard constraint
            // whether re-adding would violate. Failure → reject the whole run.
            var violations = ValidateProposedAgainstHardConstraints(
                solverContext, solverResult.Assignments, disabledNames);

            var validationPassed = solverResult.Success && violations.Count == 0;

            // ── Apply if requested AND validation passed ────────────────────
            var applied = false;
            if (request.Persist && validationPassed)
            {
                await _shiftRepository.ClearWeekAsync(rangeStart, rangeEnd, ct);
                if (solverResult.Assignments.Count > 0)
                {
                    await _shiftRepository.BulkInsertAssignmentsAsync(solverResult.Assignments, requestedById, ct);
                }
                applied = true;
            }

            // ── Compute unfilled by comparing slot expectations to filled ──
            var unfilled = ComputeUnfilledForRange(solverContext, solverResult.Assignments);

            return new ReoptimizeScheduleResponseDto
            {
                StartDate = rangeStart.ToString("yyyy-MM-dd"),
                EndDate = rangeEnd.ToString("yyyy-MM-dd"),
                SolverStatus = solverResult.SolverStatus.ToString(),
                Applied = applied,
                ValidationPassed = validationPassed,
                TotalSlots = solverResult.TotalSlots,
                FilledSlotsBefore = filledBefore,
                FilledSlotsAfter = filledAfter,
                SolverDurationMs = solverResult.DurationMs,
                ProposedAssignments = solverResult.Assignments
                    .Select(a => new ProposedAssignmentDto
                    {
                        ShiftId = a.ShiftId,
                        EmployeeId = a.EmployeeId,
                        Date = a.Date.ToString("yyyy-MM-dd"),
                    }).ToList(),
                UnfilledSlots = unfilled,
                Violations = violations,
            };
        }

        private List<HardConstraintViolationDto> ValidateProposedAgainstHardConstraints(
            SchedulingContext ctx,
            IReadOnlyList<SchedAssignment> proposed,
            IReadOnlySet<string> disabledNames)
        {
            // Build the validation pipeline from the registered hard constraints.
            // The IsUserOverridable check is the second line of defence: even if a
            // disabled name slipped past the controller-level sanitiser, a non-
            // overridable constraint here is ALWAYS evaluated.
            var hard = _constraints
                .Where(c =>
                    c.Severity == Iwos.Business.Scheduling.Constraints.ConstraintSeverity.Hard
                    && !(c.IsUserOverridable && disabledNames.Contains(c.Name)))
                .ToArray();

            var dayHours = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
            var empById = ctx.Employees.ToDictionary(e => e.Id);

            // ScheduledHours is interpreted as a per-week running total by OvertimeConstraint
            // (its cap is `WeeklyHours`). When validating a multi-week proposal, summing the
            // entire range into one tally inflates every employee's "current" hours by
            // (weeks-1) × weekly cap and triggers false-positive Overtime violations on every
            // slot. Bucket hours by ISO-week (Monday-anchored) so the per-slot evaluation
            // sees only the hours from that slot's own calendar week.
            var hoursByEmpWeek = new Dictionary<(Guid Emp, DateOnly WeekStart), double>();
            var allProposed = new List<SchedAssignment>(proposed);
            var takenAll = new HashSet<(Guid, DateOnly)>();
            foreach (var a in proposed)
            {
                takenAll.Add((a.EmployeeId, a.Date));
                if (dayHours.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                {
                    var key = (a.EmployeeId, StartOfIsoWeek(a.Date));
                    hoursByEmpWeek[key] = (hoursByEmpWeek.TryGetValue(key, out var x) ? x : 0d) + h;
                }
            }

            var violations = new List<HardConstraintViolationDto>();

            foreach (var a in proposed)
            {
                if (!empById.TryGetValue(a.EmployeeId, out var emp)) continue;
                if (!dayHours.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h)) continue;

                // Drop this one from state, ask the constraint pipeline whether
                // re-adding it would violate. Mirrors how the engine evaluates
                // a candidate before placement.
                var temp = new SchedulingState();
                foreach (var t in takenAll) temp.EmployeeDateTaken.Add(t);
                foreach (var p in allProposed)
                    if (!(p.EmployeeId == a.EmployeeId && p.Date == a.Date && p.ShiftId == a.ShiftId))
                        temp.Proposed.Add(p);
                temp.EmployeeDateTaken.Remove((a.EmployeeId, a.Date));
                var weekKey = (a.EmployeeId, StartOfIsoWeek(a.Date));
                var sameWeekTotal = hoursByEmpWeek.TryGetValue(weekKey, out var w) ? w : 0d;
                temp.ScheduledHours[a.EmployeeId] = Math.Max(0, sameWeekTotal - h);

                var slot = new ScheduleSlot(a.Date, a.ShiftId, emp.PositionId, h);
                foreach (var cstr in hard)
                {
                    var eval = cstr.Evaluate(ctx, temp, emp, slot);
                    if (!eval.Violated) continue;

                    violations.Add(new HardConstraintViolationDto
                    {
                        EmployeeId = a.EmployeeId,
                        ShiftId = a.ShiftId,
                        Date = a.Date.ToString("yyyy-MM-dd"),
                        ConstraintName = cstr.Name,
                        Reason = eval.Reason ?? "violated",
                    });
                }
            }

            return violations;
        }

        private static DateOnly StartOfIsoWeek(DateOnly date)
        {
            int dow = (int)date.DayOfWeek;
            int offset = dow == 0 ? -6 : 1 - dow;
            return date.AddDays(offset);
        }

        private static List<UnfilledSlotDto> ComputeUnfilledForRange(
            SchedulingContext ctx, IReadOnlyList<SchedAssignment> proposed)
        {
            var result = new List<UnfilledSlotDto>();
            var daySchedIndex = ctx.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek));
            var posReqsByShift = ctx.PositionRequirements
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());
            var posReqOverrides = ctx.PositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.Date, o.PositionId), o => o.RequiredCount);
            var posReqDayOverrides = ctx.DayPositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);
            var empById = ctx.Employees.ToDictionary(e => e.Id);

            // Count proposed per (date, shift, position).
            var filledCounts = new Dictionary<(DateOnly, Guid, Guid), int>();
            foreach (var a in proposed)
            {
                if (!empById.TryGetValue(a.EmployeeId, out var emp)) continue;
                var key = (a.Date, a.ShiftId, emp.PositionId);
                filledCounts[key] = (filledCounts.TryGetValue(key, out var c) ? c : 0) + 1;
            }

            for (var date = ctx.WeekStart; date <= ctx.WeekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                if (!ctx.WeekendsWorking && (dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday)) continue;

                foreach (var shift in ctx.Shifts)
                {
                    if (!daySchedIndex.ContainsKey((shift.Id, dow))) continue;
                    if (!posReqsByShift.TryGetValue(shift.Id, out var posReqs)) continue;

                    foreach (var req in posReqs)
                    {
                        var required = posReqDayOverrides.TryGetValue((shift.Id, dow, req.PositionId), out var dayOv)
                            ? dayOv : req.RequiredCount;
                        if (posReqOverrides.TryGetValue((shift.Id, date, req.PositionId), out var dateOv))
                            required = dateOv;

                        var filled = filledCounts.TryGetValue((date, shift.Id, req.PositionId), out var f) ? f : 0;
                        var gap = required - filled;
                        for (var i = 0; i < gap; i++)
                        {
                            result.Add(new UnfilledSlotDto
                            {
                                Date = date.ToString("yyyy-MM-dd"),
                                ShiftId = shift.Id,
                                RequiredPositionId = req.PositionId,
                                Reason = "No legal assignment found by CP-SAT",
                            });
                        }
                    }
                }
            }

            return result;
        }
    }
}
