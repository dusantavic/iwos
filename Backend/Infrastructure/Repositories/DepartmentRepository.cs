using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Common.DTOs;
using Iwos.Common.DTOs.DashboardStatsDtos;
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
	public class DepartmentRepository : GenericRepository<Department>, IDepartmentRepository
	{
		public DepartmentRepository(IwosDbContext context) : base(context) { }

		public async Task<List<SelectItemDto>> GetDepartmentsForSelect(CancellationToken cancellationToken = default)
		{
			return await _context.Departments
				.Select(d => new SelectItemDto
				{
					Value = d.Id,
					Label = d.Name
				}).ToListAsync(cancellationToken); 
		}

		public async Task<List<SelectItemDto>> GetPositionsForSelectByDepartment(Guid departmentId, CancellationToken cancellationToken = default)
		{
			return await _context.Positions
				.Where(p => p.DepartmentId == departmentId)
				.Select(p => new SelectItemDto
				{
					Value = p.Id,
					Label = p.Title
				}).ToListAsync(cancellationToken); 
		}

		public async Task<List<DepartmentDto>> GetDepartments(CancellationToken cancellationToken = default)
		{

			var totalEmployeesForClient = await _context.Employees
				.CountAsync(e => e.Active, cancellationToken); 


			var result = await _context.Departments
				.Select(d => new DepartmentDto
				{
					Id = d.Id,
					Title = d.Name,
					Head = d.HeadId.HasValue? d.Head!.FirstName + " " + d.Head!.LastName : null,
					TotalEmployees = d.Positions.SelectMany(p => p.Employees).Count(e => e.Active), 
					EmployeeShare = 0 //will be computed in memory
				}).ToListAsync(cancellationToken); 

			if (totalEmployeesForClient == 0)
			{
				return result; 
			}

			foreach (var dept in result)
			{
				dept.EmployeeShare = Math.Round((decimal)dept.TotalEmployees / totalEmployeesForClient * 100, 2);
			}

			return result; 
		}

		public async Task<DepartmentDetailsDto?> GetDepartmentDetails(Guid departmentId, CancellationToken cancellationToken = default)
		{
			return await _context.Departments
				.Where(d => d.Id == departmentId)
				.Select(d => new DepartmentDetailsDto
				{
					Id = d.Id,
					Name = d.Name,
					Description = d.Description,
					TotalEmployees = d.Positions.SelectMany(p => p.Employees).Count(e => e.Active),
					PositionsCount = d.Positions.Count,
					HeadId = d.HeadId,
					HeadName = d.HeadId.HasValue ? d.Head.FirstName + " " + d.Head.LastName : null,
					HeadPosition = d.HeadId.HasValue ? d.Head.Position.Title : null,
					Positions = d.Positions.Select(p => new PositionDto { Title = p.Title, Description = p.Description, TotalEmployees = p.Employees.Count }).ToList()
				})
				.FirstOrDefaultAsync(cancellationToken);
		}


		public async Task<DepartmentStatsDto> GetDepartmentsStats(CancellationToken cancellationToken = default)
		{
			var departmentsObjects = await _context.Departments
				.Select(d => new DepartmentStatsObject
				{
					Title = d.Name,
					TotalEmployees = d.Positions.SelectMany(p => p.Employees).Count(e => e.Active)
				})
				.OrderByDescending(d => d.TotalEmployees)
				.ToListAsync(cancellationToken);

			return new DepartmentStatsDto
			{
				DepartmentsData = departmentsObjects,
				TotalDepartments = departmentsObjects.Count,
				Uniformity = departmentsObjects.Any()
					? (int)Math.Round(
						(departmentsObjects.Average(d => d.TotalEmployees) /
						(double)departmentsObjects.Max(d => d.TotalEmployees)) * 100,
						MidpointRounding.AwayFromZero)
					: 0
			};
		}

		public async Task<List<DepartmentHeadDto>> GetDepartmentsHeads(CancellationToken cancellationToken = default) 
		{  
			return await _context.Departments
				.Where(d => d.HeadId.HasValue)
				.Select(d => new DepartmentHeadDto
				{
					Id = d.HeadId!.Value,
					FullName = d.Head!.FirstName + " " + d.Head!.LastName,
					DepartmentTitle = d.Name,
					ProfilePictureSrc = d.Head!.Files.Any(f => f.DisplayName == "profile.jpg") ? $"uploads/thumbnails/{d.HeadId}.jpg" : null,
					CurrentHeadAssignmentDate = d.CurrentHeadAssignmentDate
				}).ToListAsync(cancellationToken); 
		}

		public async Task<List<EmployeeDto>> GetEmployees(CancellationToken cancellationToken = default)
		{
			return await _context.Employees
				.Select(e => new EmployeeDto
				{
					Id = e.Id,
					ContactEmail = e.ContactEmail,
					FirstName = e.FirstName,
					LastName = e.LastName,
					PersonalId = e.PersonalId,
					Position = e.Position.Title,
					Department = e.Position.Department.Name,
					ProfilePictureSrc = e.Files.Any(f => f.DisplayName == "profile.jpg") ? $"uploads/thumbnails/{e.Id}.jpg" : null
				}).ToListAsync(cancellationToken);
		}

		public async Task<TodayAvailabilityDto> GetTodayAvailability(CancellationToken cancellationToken = default)
		{

			var utcNow = DateTime.UtcNow;
			var today = DateOnly.FromDateTime(utcNow); 

			var departmentData = await _context.Departments
				.Select(d => new DepartmentTodayAvailabilityDto
				{
					DepartmentName = d.Name,
					TotalCount = d.Positions.SelectMany(p => p.Employees)
						.Count(e => e.Active),
					ActiveTodayCount = d.Positions
						.SelectMany(p => p.Employees)
						.Count(e => e.Active && !e.Absences.Any(a =>
							a.StartDate <= today &&
							a.EndDate >= today && a.Status == AbsenceStatus.Approved))
				})
				.OrderByDescending(d => d.ActiveTodayCount)
				.ToListAsync(cancellationToken);

			var totalEmployees = departmentData.Sum(x => x.TotalCount);
			var totalActive = departmentData.Sum(x => x.ActiveTodayCount);

			var overallAvailability = totalEmployees == 0
				? 0
				: Math.Round((double)totalActive / totalEmployees * 100, 1);

			return new TodayAvailabilityDto
			{
				OverallAvailability = overallAvailability,
				DepartmentsAvailabilities = departmentData
			}; 
		}


		public async Task<List<LargestDepartmentDto>> GetLargestDepartmentsList(int count, CancellationToken cancellationToken = default)
		{

			return await _context.Departments
				.Select(d => new LargestDepartmentDto
				{
					Name = d.Name,
					Head = d.HeadId.HasValue ? d.Head!.FirstName + " " + d.Head!.LastName : null,
					EmployeesCount = d.Positions.SelectMany(p => p.Employees).Count(e => e.Active)
				})
				.OrderByDescending(d => d.EmployeesCount)
				.Take(count)
				.ToListAsync(cancellationToken);

		}

		public async Task<List<DepartmentCountDto>> GetDepartmentsCounts(CancellationToken cancellationToken = default)
		{
			return await _context.Departments
				.Select(d => new DepartmentCountDto
				{
					Name = d.Name,
					Count = d.Positions.SelectMany(p => p.Employees).Count(e => e.Active)
				})
				.ToListAsync(cancellationToken); 
		}

		public async Task AddPosition(Position position, CancellationToken cancellationToken = default)
		{
			await _context.Positions.AddAsync(position, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
		}

		public async Task<Guid> AddDepartment(Department department, CancellationToken cancellationToken = default)
		{
			await _context.Departments.AddAsync(department, cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
			return department.Id;
		}

		public async Task<Department?> GetDepartmentById(Guid departmentId, CancellationToken cancellationToken = default)
		{
			return await _context.Departments
				.FirstOrDefaultAsync(d => d.Id == departmentId, cancellationToken);
		}

		public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
		{
			await _context.SaveChangesAsync(cancellationToken);
		}
	}
}
