using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
using Iwos.Data.Model;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
	public interface IDepartmentService
	{
		Task<List<SelectItemDto>> GetDepartmentsForSelect(CancellationToken cancellationToken = default);
		Task<List<SelectItemDto>> GetPositionsForSelectByDepartment(Guid departmentId, CancellationToken cancellationToken = default);
		Task<List<DepartmentDto>> GetDepartments(CancellationToken cancellationToken = default);
		Task<DepartmentDetailsDto?> GetDepartmentDetails(Guid departmentId, CancellationToken cancellationToken = default);
		Task<DepartmentStatsDto> GetDepartmentsStats(CancellationToken cancellationToken = default);
		Task<List<DepartmentHeadDto>> GetDepartmentsHeads(CancellationToken cancellationToken = default);
		Task<TodayAvailabilityDto> GetTodayAvailability(CancellationToken cancellationToken = default);
		Task<List<LargestDepartmentDto>> GetLargestDepartmentsList(CancellationToken cancellationToken = default);
		Task<List<DepartmentCountDto>> GetDepartmentsCounts(CancellationToken cancellationToken = default);
		Task AddPosition(CreatePositionDto createPositionDto, CancellationToken cancellationToken = default);
		Task<Guid> CreateDepartment(string name, CancellationToken cancellationToken = default);
		Task UpdateDepartmentHead(UpdateDepartmentHeadDto updateDepartmentHeadDto, CancellationToken cancellationToken = default);

	}
}
