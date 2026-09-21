using AutoMapper;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
using Iwos.Data.Model;
using Iwos.Infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Business.Services
{
	public class DepartmentService : IDepartmentService
	{
		private readonly IDepartmentRepository _departmentRepository;
		private readonly IMapper _mapper;
		private readonly ITenantProvider _tenantProvider;

		public DepartmentService(IDepartmentRepository departmentRepository, IMapper mapper, ITenantProvider tenantProvider)
		{
			_departmentRepository = departmentRepository;
			_mapper = mapper;
			_tenantProvider = tenantProvider;
		}

		public async Task<List<SelectItemDto>> GetDepartmentsForSelect(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartmentsForSelect(cancellationToken); 
		}

		public async Task<List<SelectItemDto>> GetPositionsForSelectByDepartment(Guid departmentId, CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetPositionsForSelectByDepartment(departmentId, cancellationToken); 
		}

		public async Task<List<DepartmentDto>> GetDepartments(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartments(cancellationToken); 
		}

		public async Task<DepartmentDetailsDto?> GetDepartmentDetails(Guid departmentId, CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartmentDetails(departmentId, cancellationToken); 
		}

		public async Task<DepartmentStatsDto> GetDepartmentsStats(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartmentsStats(cancellationToken); 
		}

		public async Task<List<DepartmentHeadDto>> GetDepartmentsHeads(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartmentsHeads(cancellationToken);
		}

		public async Task<TodayAvailabilityDto> GetTodayAvailability(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetTodayAvailability(cancellationToken); 
		}

		public async Task<List<LargestDepartmentDto>> GetLargestDepartmentsList(CancellationToken cancellationToken = default)
		{
			int count = 5;
			return await _departmentRepository.GetLargestDepartmentsList(count, cancellationToken); 
		}

		public async Task<List<DepartmentCountDto>> GetDepartmentsCounts(CancellationToken cancellationToken = default)
		{
			return await _departmentRepository.GetDepartmentsCounts(cancellationToken); 
		}

		public async Task AddPosition(CreatePositionDto createPositionDto, CancellationToken cancellationToken = default)
		{
			var position = _mapper.Map<Position>(createPositionDto);
			await _departmentRepository.AddPosition(position, cancellationToken);
		}

		public async Task<Guid> CreateDepartment(string name, CancellationToken cancellationToken = default)
		{
			var department = new Department
			{
				Id = Guid.NewGuid(),
				Name = name,
				ClientId = _tenantProvider.GetTenantId(),
				Client = null!,
			};
			return await _departmentRepository.AddDepartment(department, cancellationToken);
		}

		public async Task UpdateDepartmentHead(UpdateDepartmentHeadDto updateDepartmentHeadDto, CancellationToken cancellationToken = default)
		{
			var department = await _departmentRepository.GetDepartmentById(updateDepartmentHeadDto.DepartmentId, cancellationToken); 

			if (department == null)
			{
				return;
			}

			department.HeadId = updateDepartmentHeadDto.HeadId;
			department.CurrentHeadAssignmentDate = updateDepartmentHeadDto.AssignmentDate;

			await _departmentRepository.SaveChangesAsync(cancellationToken); 
		}

	}
}
