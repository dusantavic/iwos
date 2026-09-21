using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
    /// <summary>
    /// Computes, per position, required weekly staffing coverage (derived from shift/day
    /// staffing rules) against actual weekly capacity (active employees in that position,
    /// each covering 5 shifts/week).
    /// </summary>
    public class CapacityService : ICapacityService
    {
        private const int ShiftsPerEmployeePerWeek = 5;

        private readonly IShiftRepository _shiftRepository;

        public CapacityService(IShiftRepository shiftRepository)
        {
            _shiftRepository = shiftRepository;
        }

        public async Task<CapacityOverviewDto> GetCapacityOverviewAsync(CancellationToken ct = default)
        {
            var shifts = await _shiftRepository.GetShiftsAsync(ct);
            var positions = await _shiftRepository.GetPositionsAsync(ct);
            var baseRequirements = await _shiftRepository.GetPositionRequirementsAsync(ct);
            var dayOverrides = await _shiftRepository.GetDayPositionRequirementOverridesAsync(ct);
            var clientConfig = await _shiftRepository.GetClientConfigAsync(ct);
            var weekEndsWorking = clientConfig?.WeekEndsWorking ?? false;

            var activeShifts = shifts.Where(s => s.IsActive).ToList();

            var baseByShiftPosition = baseRequirements
                .ToDictionary(r => (r.ShiftId, r.PositionId), r => r.RequiredCount);
            var overrideByShiftDayPosition = dayOverrides
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);

            var positionDtos = positions
                .Select(p => BuildPositionDto(p, activeShifts, baseByShiftPosition, overrideByShiftDayPosition, weekEndsWorking))
                .OrderBy(p => p.Title)
                .ToList();

            return new CapacityOverviewDto
            {
                Positions = positionDtos,
                TotalRequiredWeeklySlots = positionDtos.Sum(p => p.TotalRequiredWeeklySlots),
                TotalActualWeeklyCapacity = positionDtos.Sum(p => p.ActualWeeklyCapacity),
                UnderstaffedPositionCount = positionDtos.Count(p => p.Status == "Understaffed"),
                OverstaffedPositionCount = positionDtos.Count(p => p.Status == "Overstaffed"),
            };
        }

        private static CapacityPositionDto BuildPositionDto(
            Position position,
            List<Shift> activeShifts,
            Dictionary<(Guid ShiftId, Guid PositionId), int> baseByShiftPosition,
            Dictionary<(Guid ShiftId, DayOfWeek DayOfWeek, Guid PositionId), int> overrideByShiftDayPosition,
            bool weekEndsWorking)
        {
            // For each shift, partition its 7 days into buckets keyed by required count (0 excluded).
            var shiftDayBuckets = new List<(string ShiftLabel, int Count, HashSet<int> Days)>();

            foreach (var shift in activeShifts)
            {
                var countsByDay = new Dictionary<int, List<int>>();

                for (var dow = 0; dow < 7; dow++)
                {
                    var dayOfWeek = (DayOfWeek)dow;
                    if (!weekEndsWorking && (dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday))
                        continue;

                    var hasOverride = overrideByShiftDayPosition.TryGetValue((shift.Id, dayOfWeek, position.Id), out var overrideCount);
                    var hasBase = baseByShiftPosition.TryGetValue((shift.Id, position.Id), out var baseCount);
                    var effectiveCount = hasOverride ? overrideCount : (hasBase ? baseCount : 0);
                    if (effectiveCount <= 0) continue;

                    if (!countsByDay.TryGetValue(effectiveCount, out var days))
                    {
                        days = new List<int>();
                        countsByDay[effectiveCount] = days;
                    }
                    days.Add(dow);
                }

                foreach (var (count, days) in countsByDay)
                    shiftDayBuckets.Add((shift.Label, count, days.ToHashSet()));
            }

            // Merge buckets that share the exact same (count, days) pattern across shifts into rows.
            var rows = shiftDayBuckets
                .GroupBy(b => (b.Count, Days: string.Join(",", b.Days.OrderBy(d => d))))
                .Select(g =>
                {
                    var first = g.First();
                    var activeDays = first.Days.OrderBy(d => d).ToList();
                    return new CapacityRequirementRowDto
                    {
                        ShiftLabels = g.Select(x => x.ShiftLabel).ToList(),
                        ShiftsCount = g.Count(),
                        StaffPerShift = first.Count,
                        DaysPerWeek = activeDays.Count,
                        ActiveDaysOfWeek = activeDays,
                        WeeklyRequiredSlots = first.Count * g.Count() * activeDays.Count,
                    };
                })
                .OrderByDescending(r => r.WeeklyRequiredSlots)
                .ToList();

            var employeeCount = position.Employees?.Count(e => e.Active) ?? 0;
            var actualWeeklyCapacity = employeeCount * ShiftsPerEmployeePerWeek;
            var totalRequiredWeeklySlots = rows.Sum(r => r.WeeklyRequiredSlots);
            var deltaSlots = actualWeeklyCapacity - totalRequiredWeeklySlots;

            int deltaEmployees;
            string status;
            if (deltaSlots < 0)
            {
                deltaEmployees = -(int)Math.Ceiling(-deltaSlots / (double)ShiftsPerEmployeePerWeek);
                status = "Understaffed";
            }
            else if (deltaSlots > 0)
            {
                deltaEmployees = deltaSlots / ShiftsPerEmployeePerWeek;
                status = "Overstaffed";
            }
            else
            {
                deltaEmployees = 0;
                status = "Balanced";
            }

            return new CapacityPositionDto
            {
                PositionId = position.Id,
                Title = position.Title,
                EmployeeCount = employeeCount,
                ActualWeeklyCapacity = actualWeeklyCapacity,
                RequirementRows = rows,
                TotalRequiredWeeklySlots = totalRequiredWeeklySlots,
                DeltaSlots = deltaSlots,
                DeltaEmployees = deltaEmployees,
                Status = status,
            };
        }
    }
}
