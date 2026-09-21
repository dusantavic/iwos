using Asp.Versioning;
using Iwos.Business.Services;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Serilog;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
	[ApiController]
	[Route("api/v{version:apiVersion}/[controller]")]
	[ApiVersion("1.0")]
	public class DepartmentController : ControllerBase
	{
		private readonly ILogger _logger;
		private readonly IDepartmentService _departmentService; 
		public DepartmentController(ILogger logger, IDepartmentService departmentService)
		{
			_logger = logger;
			_departmentService = departmentService; 
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartmentsForSelect")]
		public async Task<IActionResult> GetDepartmentsForSelect(CancellationToken cancellationToken = default)
		{
			try
			{
				var departments = await _departmentService.GetDepartmentsForSelect(cancellationToken);

				return Ok(departments); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments for select failed");
				return Problem(title: "Error 2002: Get Departments for select failed");
			}
		}


		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetPositionsForSelectByDepartment")]
		public async Task<IActionResult> GetPositionsForSelectByDepartment(Guid departmentId, CancellationToken cancellationToken = default)
		{
			try
			{
				var positions = await _departmentService.GetPositionsForSelectByDepartment(departmentId, cancellationToken);

				return Ok(positions); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments for select failed");
				return Problem(title: "Error 2002: Get Departments for select failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartments")]
		public async Task<IActionResult> GetDepartments(CancellationToken cancellationToken = default)
		{
			try
			{
				var departments = await _departmentService.GetDepartments(cancellationToken);

				return Ok(departments);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments failed");
				return Problem(title: "Error 2002: Get Departments failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartmentDetails")]
		public async Task<IActionResult> GetDepartmentDetails(Guid departmentId, CancellationToken cancellationToken = default)
		{
			try
			{
				var details = await _departmentService.GetDepartmentDetails(departmentId, cancellationToken);

				return Ok(details);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments failed");
				return Problem(title: "Error 2002: Get Departments failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartmentsStats")]
		public async Task<IActionResult> GetDepartmentsStats(CancellationToken cancellationToken = default)
		{
			try
			{
				var departmentsStats = await _departmentService.GetDepartmentsStats(cancellationToken);

				return Ok(departmentsStats);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments Stats failed");
				return Problem(title: "Error 2002: Get Departments Stats failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartmentsHeads")]
		public async Task<IActionResult> GetDepartmentsHeads(CancellationToken cancellationToken = default)
		{
			try
			{
				var departmentHeads = await _departmentService.GetDepartmentsHeads(cancellationToken);

				return Ok(departmentHeads);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments Heads failed");
				return Problem(title: "Error 2002: Get Departments Heads failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetTodayAvailability")]
		public async Task<IActionResult> GetTodayAvailability(CancellationToken cancellationToken = default)
		{
			try
			{
				var availability = await _departmentService.GetTodayAvailability(cancellationToken);

				return Ok(availability);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Departments availability failed");
				return Problem(title: "Error 2002: Get Departments availability failed");
			}
		}


		//Dashboard 

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetLargestDepartmentsList")]
		public async Task<IActionResult> GetLargestDepartmentsList(CancellationToken cancellationToken = default)
		{
			try
			{
				var departments = await _departmentService.GetLargestDepartmentsList(cancellationToken);

				return Ok(departments);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting largest departments list failed");
				return Problem(title: "Error 2002: Getting largest departments list failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetDepartmentsCounts")]
		public async Task<IActionResult> GetDepartmentsCounts(CancellationToken cancellationToken = default)
		{
			try
			{
				var counts = await _departmentService.GetDepartmentsCounts(cancellationToken);

				return Ok(counts);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting departments counts failed");
				return Problem(title: "Error 2002: Getting departments counts failed");
			}
		}


		[HttpPost("CreateDepartment")]
		[Authorize]
		public async Task<IActionResult> CreateDepartment([FromBody] string name, CancellationToken cancellationToken)
		{
			try
			{
				var id = await _departmentService.CreateDepartment(name, cancellationToken);
				return Ok(new { id });
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Department creation failed");
				return Problem(title: "Error 2002: Department creation failed");
			}
		}

		[HttpPost("CreatePosition")]
		[Authorize]
		public async Task<IActionResult> CreatePosition([FromBody] CreatePositionDto createPositionDto, CancellationToken cancellationToken)
		{
			try
			{
				await _departmentService.AddPosition(createPositionDto, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Position creation failed");
				return Problem(title: "Error 2002: Position creation failed");
			}
		}

		[HttpPatch("UpdateDepartmentHead")]
		[Authorize]
		public async Task<IActionResult> UpdateDepartmentHead([FromBody] UpdateDepartmentHeadDto updateDepartmentHeadDto, CancellationToken cancellationToken)
		{
			try
			{
				await _departmentService.UpdateDepartmentHead(updateDepartmentHeadDto, cancellationToken);
				return Ok(); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Department head update failed");
				return Problem(title: "Error 2002: Department head update failed"); 
			}
		}
	}
}
