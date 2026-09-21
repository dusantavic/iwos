using Iwos.Business.WorkCalendar;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Common.Extensions;
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
    public sealed class AbsencePlanningService : IAbsencePlanningService
    {
        private readonly IwosDbContext _context;
        private readonly IWorkCalendarService _calendar;

        public AbsencePlanningService(IwosDbContext context, IWorkCalendarService calendar)
        {
            _context = context;
            _calendar = calendar;
        }

        public Task<AbsenceImpactDto> EvaluateAsync(Guid employeeId, DateOnly startDate, DateOnly endDate, AbsenceType type, CancellationToken ct = default)
            => EvaluateInternalAsync(employeeId, startDate, endDate, type, excludeAbsenceId: null, ct);

        public async Task<AbsenceImpactDto> EvaluateExistingAsync(Guid absenceId, CancellationToken ct = default)
        {
            var a = await _context.Absences.AsNoTracking().FirstOrDefaultAsync(x => x.Id == absenceId, ct)
                ?? throw new InvalidOperationException($"Absence {absenceId} not found.");
            return await EvaluateInternalAsync(a.EmployeeId, a.StartDate, a.EndDate, a.Type, excludeAbsenceId: absenceId, ct);
        }

        private async Task<AbsenceImpactDto> EvaluateInternalAsync(
            Guid employeeId, DateOnly startDate, DateOnly endDate, AbsenceType type, Guid? excludeAbsenceId, CancellationToken ct)
        {
            if (endDate < startDate)
                throw new ArgumentException("End date must be greater than or equal to start date.");

            var employee = await _context.Employees.AsNoTracking()
                .Include(e => e.Position)
                .FirstOrDefaultAsync(e => e.Id == employeeId, ct)
                ?? throw new InvalidOperationException($"Employee {employeeId} not found.");

            var calendar = await _calendar.BuildAsync(employeeId, startDate, endDate, ct);

            int chargedDays = calendar.ChargedWorkingDays;
            decimal chargedHours = calendar.ChargedWorkingHours;
            int pseudoOff = calendar.Days.Count(d => d.Kind == DayKind.PseudoWeekendOff);
            int calendarOff = calendar.Days.Count(d => d.Kind == DayKind.CalendarWeekendOff);
            int holidays = calendar.Days.Count(d => d.Kind == DayKind.Holiday);

            // Min/Max are only meaningful on the legacy ambiguous regime — kept null going forward.
            int? minCharged = null, maxCharged = null;

            bool hoursEstimated = calendar.HoursEstimated;

            // Mode classification — driven by regime first so a single all-off day inside the
            // published schedule is reported as PostSchedule (not PreSchedule).
            string mode;
            int workingDays = calendar.Days.Count(d => d.Kind == DayKind.Working);
            int assignedWorkingDays = calendar.Days.Count(d => d.Kind == DayKind.Working && d.AssignmentId != null);
            if (calendar.Regime == CalendarRegime.Approximated)
                mode = "PreSchedule";
            else if (calendar.Regime == CalendarRegime.Scheduled)
                mode = (workingDays == 0 || assignedWorkingDays == workingDays) ? "PostSchedule" : "Mixed";
            else if (workingDays == 0 || assignedWorkingDays == 0)
                mode = "PreSchedule";
            else if (assignedWorkingDays == workingDays)
                mode = "PostSchedule";
            else
                mode = "Mixed";

            // Conflicts (existing assignments inside the range)
            var conflicts = calendar.Days
                .Where(d => d.AssignmentId != null)
                .Select(d => new AbsenceImpactConflictDto
                {
                    AssignmentId = d.AssignmentId!.Value,
                    ShiftId = d.AssignedShiftId!.Value,
                    ShiftLabel = d.AssignedShiftLabel ?? string.Empty,
                    Date = d.Date,
                    Hours = d.Hours
                })
                .ToList();

            // Coverage warnings — for each conflict day+shift+position
            var coverage = await ComputeCoverageWarningsAsync(employee, conflicts, ct);

            // Balance + allocation (vacation only)
            var balance = await ComputeBalanceAsync(employee.Id, startDate.Year, type, chargedDays, excludeAbsenceId, ct);

            var dto = new AbsenceImpactDto
            {
                EmployeeId = employee.Id,
                EmployeeFullName = $"{employee.FirstName} {employee.LastName}",
                StartDate = startDate,
                EndDate = endDate,
                Type = type,
                TypeLabel = type.GetDisplayName(),
                CalendarDays = calendar.Days.Count,
                Mode = mode,
                Regime = calendar.Regime.ToString(),
                HoursEstimated = hoursEstimated,
                ChargedWorkingDays = chargedDays,
                ChargedWorkingHours = Math.Round(chargedHours, 2, MidpointRounding.AwayFromZero),
                MinChargedWorkingDays = minCharged,
                MaxChargedWorkingDays = maxCharged,
                PseudoWeekendDays = pseudoOff,
                CalendarWeekendDays = calendarOff,
                HolidayDays = holidays,
                Days = calendar.Days.Select(d => new AbsenceImpactDayDto
                {
                    Date = d.Date,
                    Kind = d.Kind.ToString(),
                    Hours = d.Hours,
                    HoursEstimated = d.HoursEstimated,
                    AssignedShiftId = d.AssignedShiftId,
                    AssignedShiftLabel = d.AssignedShiftLabel
                }).ToList(),
                Conflicts = conflicts,
                CoverageWarnings = coverage,
                Balance = balance.balanceDto,
                Sufficient = type != AbsenceType.Vacation || balance.sufficient
            };

            AddNotices(dto, calendar);
            return dto;
        }

        private static void AddNotices(AbsenceImpactDto dto, EmployeeWorkCalendar calendar)
        {
            switch (calendar.Regime)
            {
                case CalendarRegime.StandardWeek:
                    dto.Notices.Add(
                        dto.CalendarWeekendDays > 0
                            ? $"Mon–Fri working week. {dto.CalendarWeekendDays} weekend day(s) inside the range are not charged."
                            : "Mon–Fri working week. The full range falls on working days.");
                    break;

                case CalendarRegime.Scheduled:
                    dto.Notices.Add(
                        $"7-day operation — schedule has been published for the full range. Charging {dto.ChargedWorkingDays} day(s) backed by real shift assignments. {dto.PseudoWeekendDays} day(s) without an assignment are off and not charged.");
                    break;

                case CalendarRegime.Approximated:
                    dto.Notices.Add(
                        $"7-day operation — schedule has not yet been published for the entire range. Charged days are approximated from this employee's contracted cadence: {calendar.CalendarDays} calendar day(s) × {calendar.WeeklyDays}/7 ≈ {dto.ChargedWorkingDays} working day(s). The exact count will be reconciled when the schedule is generated and the request is approved.");
                    break;
            }

            if (dto.Mode == "PostSchedule")
                dto.Notices.Add("All working days are backed by the active schedule. Approving will release the listed shifts.");
            if (dto.Mode == "Mixed")
                dto.Notices.Add("Some days are scheduled and some are not. Scheduled days use actual hours; unscheduled days use estimated hours.");
        }

        private async Task<List<AbsenceImpactCoverageDto>> ComputeCoverageWarningsAsync(
            Employee employee,
            List<AbsenceImpactConflictDto> conflicts,
            CancellationToken ct)
        {
            if (conflicts.Count == 0) return new List<AbsenceImpactCoverageDto>();

            var positionId = employee.PositionId;
            var shiftIds = conflicts.Select(c => c.ShiftId).Distinct().ToList();
            var dates = conflicts.Select(c => c.Date).Distinct().ToList();
            var minDate = dates.Min();
            var maxDate = dates.Max();

            var baseRequirements = await _context.ShiftPositionRequirements.AsNoTracking()
                .Where(r => shiftIds.Contains(r.ShiftId) && r.PositionId == positionId)
                .ToListAsync(ct);
            var dayOverrides = await _context.ShiftDayPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId) && o.PositionId == positionId)
                .ToListAsync(ct);
            var dateOverrides = await _context.ShiftPositionRequirementOverrides.AsNoTracking()
                .Where(o => shiftIds.Contains(o.ShiftId) && o.PositionId == positionId
                            && o.Date >= minDate && o.Date <= maxDate)
                .ToListAsync(ct);

            // Current headcount per (shiftId, date) for this position
            var headcounts = await _context.ShiftAssignments.AsNoTracking()
                .Where(a => shiftIds.Contains(a.ShiftId)
                            && a.Date >= minDate && a.Date <= maxDate
                            && a.Employee.PositionId == positionId)
                .GroupBy(a => new { a.ShiftId, a.Date })
                .Select(g => new { g.Key.ShiftId, g.Key.Date, Count = g.Count() })
                .ToListAsync(ct);
            var headcountMap = headcounts.ToDictionary(h => (h.ShiftId, h.Date), h => h.Count);

            var positionTitle = (await _context.Positions.AsNoTracking()
                .Where(p => p.Id == positionId)
                .Select(p => p.Title)
                .FirstOrDefaultAsync(ct)) ?? string.Empty;

            var warnings = new List<AbsenceImpactCoverageDto>();
            foreach (var c in conflicts)
            {
                int required = ResolveRequired(c.ShiftId, c.Date, baseRequirements, dayOverrides, dateOverrides);
                int before = headcountMap.TryGetValue((c.ShiftId, c.Date), out var n) ? n : 0;
                int after = Math.Max(0, before - 1);
                if (required <= 0) continue;
                if (after >= required) continue;

                string severity = (required - after) >= 2 ? "Critical" : "Warning";
                warnings.Add(new AbsenceImpactCoverageDto
                {
                    Date = c.Date,
                    ShiftId = c.ShiftId,
                    ShiftLabel = c.ShiftLabel,
                    PositionId = positionId,
                    PositionTitle = positionTitle,
                    Required = required,
                    AssignedBefore = before,
                    AssignedAfter = after,
                    Severity = severity
                });
            }
            return warnings;
        }

        private static int ResolveRequired(
            Guid shiftId, DateOnly date,
            List<ShiftPositionRequirement> baseReq,
            List<ShiftDayPositionRequirementOverride> dayOverrides,
            List<ShiftPositionRequirementOverride> dateOverrides)
        {
            var dateOv = dateOverrides.FirstOrDefault(o => o.ShiftId == shiftId && o.Date == date);
            if (dateOv != null) return dateOv.RequiredCount;
            var dowOv = dayOverrides.FirstOrDefault(o => o.ShiftId == shiftId && o.DayOfWeek == date.DayOfWeek);
            if (dowOv != null) return dowOv.RequiredCount;
            var req = baseReq.FirstOrDefault(r => r.ShiftId == shiftId);
            return req?.RequiredCount ?? 0;
        }

        private async Task<((int useFromAnnual, int useFromCarried) alloc, AbsenceImpactBalanceDto balanceDto, bool sufficient)>
            ComputeBalanceAsync(Guid employeeId, int year, AbsenceType type, int chargedDays, Guid? excludeAbsenceId, CancellationToken ct)
        {
            if (type != AbsenceType.Vacation)
            {
                return (
                    (0, 0),
                    new AbsenceImpactBalanceDto(),
                    true
                );
            }

            var balance = await _context.AbsenceBalances.AsNoTracking()
                .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.Year == year, ct);

            if (balance == null)
            {
                return (
                    (0, 0),
                    new AbsenceImpactBalanceDto(),
                    false
                );
            }

            var carriedExpiry = new DateOnly(year, 6, 30);
            bool carriedExpired = DateOnly.FromDateTime(DateTime.UtcNow) > carriedExpiry;

            var consumingStatuses = new[] { AbsenceStatus.Approved, AbsenceStatus.Pending };
            var existing = await _context.Absences.AsNoTracking()
                .Where(a => a.EmployeeId == employeeId && a.Year == year
                            && a.Type == AbsenceType.Vacation
                            && consumingStatuses.Contains(a.Status)
                            && (excludeAbsenceId == null || a.Id != excludeAbsenceId))
                .Select(a => new { a.UsedFromAnnual, a.UsedFromCarriedOver })
                .ToListAsync(ct);

            int usedAnnual = existing.Sum(x => x.UsedFromAnnual);
            int usedCarried = existing.Sum(x => x.UsedFromCarriedOver);

            int remainingAnnual = Math.Max(0, balance.AnnualDays - usedAnnual);
            int remainingCarried = carriedExpired ? 0 : Math.Max(0, balance.CarriedOverDays - usedCarried);

            int useCarried = 0, useAnnual = 0;
            if (!carriedExpired && remainingCarried > 0)
            {
                useCarried = Math.Min(remainingCarried, chargedDays);
                useAnnual = chargedDays - useCarried;
            }
            else
            {
                useAnnual = chargedDays;
            }

            bool sufficient = (remainingAnnual + remainingCarried) >= chargedDays;

            return (
                (useAnnual, useCarried),
                new AbsenceImpactBalanceDto
                {
                    CurrentRemainingAnnualDays = remainingAnnual,
                    CurrentRemainingCarriedOverDays = remainingCarried,
                    ProjectedRemainingAnnualDays = Math.Max(0, remainingAnnual - useAnnual),
                    ProjectedRemainingCarriedOverDays = Math.Max(0, remainingCarried - useCarried),
                    UseFromAnnual = useAnnual,
                    UseFromCarriedOver = useCarried
                },
                sufficient
            );
        }
    }
}
