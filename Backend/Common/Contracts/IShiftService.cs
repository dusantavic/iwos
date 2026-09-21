using Iwos.Common.DTOs;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IShiftService
    {
        Task CreateDefaultShiftAsync(CancellationToken ct = default);
		Task<ShiftConfigDto> GetConfigAsync(CancellationToken ct = default);
        Task SaveConfigAsync(SaveShiftConfigDto dto, CancellationToken ct = default);
		Task<List<ShiftRotationPatternDto>> GetRotationPatternsAsync(CancellationToken ct = default);
        Task<SaveRotationPatternResultDto> SaveRotationPatternAsync(SaveRotationPatternDto dto, CancellationToken ct = default);
        Task DeleteRotationPatternAsync(Guid id, CancellationToken ct = default);
        Task<List<PositionForShiftDto>> GetPositionsAsync(CancellationToken ct = default);

        Task<WeeklyScheduleDto> GetWeeklyScheduleAsync(DateOnly weekStart, CancellationToken ct = default);

        Task AssignEmployeeAsync(AssignEmployeeDto dto, Guid assignedById, CancellationToken ct = default);
        Task RemoveAssignmentAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);
        Task ClearWeekAsync(DateOnly weekStart, CancellationToken ct = default);

        Task<GenerateScheduleRangeResponseDto> GenerateScheduleForRangeAsync(GenerateScheduleRangeRequestDto request, Guid? generatedById, CancellationToken ct = default);

        Task<ReoptimizeScheduleResponseDto> ReoptimizeScheduleAsync(ReoptimizeScheduleRequestDto request, Guid? requestedById, CancellationToken ct = default);

        Task SetPositionRequirementOverrideAsync(SetPositionRequirementOverrideDto dto, CancellationToken ct = default);
        Task RemovePositionRequirementOverrideAsync(Guid shiftId, DateOnly date, Guid positionId, CancellationToken ct = default);

        Task ReportUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);
        Task CancelUnavailabilityAsync(Guid shiftId, Guid employeeId, DateOnly date, CancellationToken ct = default);

        Task<WorkingTimeOverviewDto> GetWorkingTimeOverviewAsync(int year, CancellationToken ct = default);

        /// <summary>Builds an .xlsx payroll export (regular/overtime hours per employee) for one calendar month.</summary>
        Task<byte[]> ExportPayrollAsync(int year, int month, CancellationToken ct = default);

        Task<Guid> RequestShiftSwapAsync(Guid requesterId, DTOs.RequestShiftSwapDto dto, CancellationToken ct = default);
        Task<List<DTOs.ShiftSwapRequestDto>> GetMySwapRequestsAsync(Guid employeeId, CancellationToken ct = default);
        Task<List<DTOs.ShiftSwapRequestDto>> GetPendingSwapRequestsAsync(CancellationToken ct = default);
        Task RespondToSwapRequestAsync(Guid swapRequestId, Guid responderId, bool accept, CancellationToken ct = default);
        Task CancelSwapRequestAsync(Guid swapRequestId, Guid requesterId, CancellationToken ct = default);

        Task<List<string>> GetScheduledDaysAsync(DateOnly start, DateOnly end, CancellationToken ct = default);

        // ── Onboarding ────────────────────────────────────────────────────────
        Task<bool> HasAnyScheduleAsync(CancellationToken ct = default);
        Task<DTOs.ProvisionPriorWeekResultDto> ProvisionPriorWeekAsync(DTOs.ProvisionPriorWeekDto dto, Guid? importedById, CancellationToken ct = default);
        Task SetRotationAnchorAsync(DTOs.SetRotationAnchorDto dto, CancellationToken ct = default);
    }
}
