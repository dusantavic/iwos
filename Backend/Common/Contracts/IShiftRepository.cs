using Iwos.Business.Scheduling;
using Iwos.Common.DTOs;
using Iwos.Data.Model;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IShiftRepository
    {
        Task<SchedulingContext> LoadSchedulingContextAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default);
        Task BulkInsertAssignmentsAsync(IReadOnlyList<SchedAssignment> assignments, Guid? assignedById, CancellationToken ct = default);

        Task<bool> HasAnyShiftsAsync(CancellationToken ct = default);
        Task<bool> HasAnyScheduleAsync(CancellationToken ct = default);
        Task<int> ProvisionPriorWeekAssignmentsAsync(IReadOnlyList<Iwos.Business.Scheduling.SchedAssignment> assignments, Guid? importedById, CancellationToken ct = default);
        Task SetRotationAnchorAsync(Guid employeeId, DateOnly? anchorDate, CancellationToken ct = default);
        Task CreateDefaultShiftsAsync(CancellationToken ct = default);

        Task<List<Shift>> GetShiftsAsync(CancellationToken ct = default);
        Task<List<ShiftDaySchedule>> GetDaySchedulesAsync(CancellationToken ct = default);
        Task<List<ShiftPositionRequirement>> GetPositionRequirementsAsync(CancellationToken ct = default);
        Task<List<ShiftDayPositionRequirementOverride>> GetDayPositionRequirementOverridesAsync(CancellationToken ct = default);
        Task<List<Position>> GetPositionsAsync(CancellationToken ct = default);
        Task<ShiftClientConfig?> GetClientConfigAsync(CancellationToken ct = default);
        Task<List<ShiftRotationPattern>> GetRotationPatternsAsync(CancellationToken ct = default);
        Task<ShiftRotationPattern> UpsertRotationPatternAsync(Guid? id, string name, int daysOn, int daysOff, bool isGlobal = false, CancellationToken ct = default);
        Task DeleteRotationPatternAsync(Guid id, CancellationToken ct = default);
        Task<int> ApplyPatternToAllEmployeesAsync(Guid patternId, CancellationToken ct = default);

        Task SaveConfigAsync(SaveShiftConfigDto dto, CancellationToken ct = default);

        Task<WeeklyScheduleDto> GetWeeklyScheduleAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default);

        Task AssignEmployeeAsync(Guid shiftId, Guid employeeId, DateOnly date, Guid? assignedById, CancellationToken ct = default);
        Task RemoveAssignmentAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);
        Task ClearWeekAsync(DateOnly weekStart, DateOnly weekEnd, CancellationToken ct = default);

        Task UpsertPositionRequirementOverrideAsync(Guid shiftId, DateOnly date, Guid positionId, int requiredCount, CancellationToken ct = default);
        Task RemovePositionRequirementOverrideAsync(Guid shiftId, DateOnly date, Guid positionId, CancellationToken ct = default);

        Task ReportUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);
        Task CancelUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);

        Task<WorkingTimeOverviewDto> GetWorkingTimeOverviewAsync(int year, CancellationToken ct = default);

        /// <summary>Per-employee regular/overtime hour breakdown for one calendar month, for payroll export.</summary>
        Task<List<PayrollExportRowDto>> GetPayrollExportDataAsync(int year, int month, CancellationToken ct = default);

        /// <summary>
        /// Returns the total scheduled hours per employee for the <paramref name="lookbackWeeks"/> weeks
        /// immediately before <paramref name="beforeDate"/>. Used to seed cross-run fairness so the engine
        /// prefers employees who have accumulated fewer hours in recent history.
        /// </summary>
        Task<Dictionary<Guid, double>> GetAccumulatedHoursBeforeAsync(DateOnly beforeDate, int lookbackDays = 30, CancellationToken ct = default);

        Task<List<string>> GetScheduledDaysAsync(DateOnly start, DateOnly end, CancellationToken ct = default);

        Task<Guid> CreateSwapRequestAsync(Guid requesterId, Guid targetEmployeeId, Guid requestedShiftId, DateOnly requestedDate, Guid offeredShiftId, DateOnly offeredDate, CancellationToken ct = default);
        Task<List<DTOs.ShiftSwapRequestDto>> GetSwapRequestsForEmployeeAsync(Guid employeeId, CancellationToken ct = default);
        Task<List<DTOs.ShiftSwapRequestDto>> GetAllPendingSwapRequestsAsync(CancellationToken ct = default);
        Task<DTOs.ShiftSwapRequestDto?> GetSwapRequestByIdAsync(Guid id, CancellationToken ct = default);
        Task AcceptSwapRequestAsync(Guid id, CancellationToken ct = default);
        Task DeclineSwapRequestAsync(Guid id, CancellationToken ct = default);
        Task CancelSwapRequestAsync(Guid id, CancellationToken ct = default);
    }
}
