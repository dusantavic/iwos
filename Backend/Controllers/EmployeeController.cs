using Asp.Versioning;
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
	public class EmployeeController : ControllerBase
	{
		private readonly ILogger _logger;
		private readonly IEmployeeService _employeeService;

		public EmployeeController(ILogger logger, IEmployeeService employeeService)
		{
			_logger = logger;
			_employeeService = employeeService;
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetEmployees")]
		public async Task<IActionResult> GetEmployees(Guid? departmentId, CancellationToken cancellationToken)
		{
			try
			{
				var employees = await _employeeService.GetEmployees(departmentId,cancellationToken);

				return Ok(employees);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Employees failed");
				return Problem(title: "Error 2002: Get Employees failed");
			}
		}


		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetEmployeesForSelect")]
		public async Task<IActionResult> GetEmployeesForSelect(Guid? departmentId, CancellationToken cancellationToken)
		{
			try
			{
				var employees = await _employeeService.GetEmployeesForSelect(departmentId, cancellationToken);

				return Ok(employees);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Employees failed");
				return Problem(title: "Error 2002: Get Employees failed");
			}
		}

		[HttpGet]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status401Unauthorized)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		[Route("GetEmployeesForShift")]
		public async Task<IActionResult> GetEmployeesForShift(CancellationToken cancellationToken)
		{
			try
			{
				var employees = await _employeeService.GetEmployeesForShift(cancellationToken);

				return Ok(employees);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get Employees For Shift failed");
				return Problem(title: "Error 2003: Get Employees For Shift failed");
			}
		}

		[HttpGet]
		[Route("GetEmployeeDetails")]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status404NotFound)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> GetEmployeeDetails(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				var employee = await _employeeService.GetEmployeeDetails(employeeId, cancellationToken);

				if (employee == null)
				{
					return NotFound();
				}

				return Ok(employee);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, $"Get Employee details failed for {employeeId}");
				return Problem(title: "Error 2002: Get Employee details failed.");
			}
		}

		[HttpPost("UploadProfileImage")]
		[Authorize]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> UploadProfileImage([FromForm] UploadProfileImageRequest request, CancellationToken cancellationToken)
		{
			try
			{
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid uploadedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				var file = await _employeeService.SaveEmployeeProfileImage(request.File, request.EmployeeId, uploadedById, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Image upload failed");
				return Problem(title: "Error 2002: Image upload failed");
			}
		}

		[HttpPost("AddFile")]
		[Authorize]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> AddFile([FromForm] UploadFileRequest request, CancellationToken cancellationToken)
		{
			try
			{
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid uploadedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				var file = await _employeeService.AddFile(request.File, request.EmployeeId, uploadedById, request.DisplayName, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "File upload failed");
				return Problem(title: "Error 2002: File upload failed");
			}
		}

		[HttpGet("GetProfileImage")]
		[Authorize]
		public async Task<IActionResult> GetProfileImage(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				(var stream, var contentType) = await _employeeService.GetProfileImage(employeeId, cancellationToken);

				if (stream == null || contentType == null)
				{
					return NotFound();
				}

				return File(stream, contentType);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Image download failed");
				return Problem(title: "Error 2002: Image download failed");
			}
		}

		[HttpGet("GetFiles")]
		[Authorize]
		public async Task<IActionResult> GetFiles(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				(var stream, var contentType) = await _employeeService.GetProfileImage(employeeId, cancellationToken);

				if (stream == null || contentType == null)
				{
					return NotFound();
				}

				return File(stream, contentType);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Image download failed");
				return Problem(title: "Error 2002: Image download failed");
			}
		}

		[HttpGet("GetFile")]
		[Authorize]
		public async Task<IActionResult> GetFile(Guid employeeId, Guid fileId, bool download, CancellationToken cancellationToken)
		{
			try
			{
				var fileStreamResult = await _employeeService.GetFileStreamResult(employeeId, fileId, download, cancellationToken);
				return fileStreamResult; 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Image download failed");
				return Problem(title: "Error 2002: Image download failed");
			}
		}

		[HttpGet("GetAllFiles")]
		[Authorize]
		public async Task<IActionResult> GetAllFiles(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				var files = await _employeeService.GetAllFiles(employeeId, cancellationToken); 
				return Ok(files); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting all files failed");
				return Problem(title: "Error 2002: Getting all files failed");
			}
		}

		[HttpDelete("DeleteFile")]
		[Authorize]
		public async Task<IActionResult> DeleteFile(Guid fileId, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId can delete this file (via employeeId)
				await _employeeService.DeleteFile(fileId, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "File not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "File deleting failed");
				return Problem(title: "Error 2002: Note deleting failed");
			}
		}


		[HttpPost("AddEmployee")]
		[Authorize]
		public async Task<IActionResult> AddEmployee(CreateEmployeeDto employeeDto, CancellationToken cancellationToken)
		{
			try
			{
				var result = await _employeeService.AddEmployee(employeeDto, null, null, cancellationToken);

				if (result == null || result.EmployeeId == Guid.Empty)
				{
					return BadRequest();
				}

				return Ok(new
				{
					Id = result.EmployeeId,
					Credentials = result.Credentials
				});
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Adding employee failed");
				return Problem(title: "Error 2002: Adding employee failed"); 
			}
		}

		[HttpGet("GetEnumLookups")]
		[Authorize]
		public IActionResult GetEnumLookups()
		{
			try
			{
				var lookups = _employeeService.GetEmployeeEnumLookups();

				return Ok(lookups); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Fetching enum lookups failed");
				return Problem(title: "Error 2002: Fetching enum lookups failed");
			}
		}


		[HttpGet("GetNotes")]
		[Authorize]
		public async Task<IActionResult> GetNotes(Guid? employeeId, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee

				var notes = await _employeeService.GetNotes(employeeId, cancellationToken);

				return Ok(notes);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting notes failed");
				return Problem(title: "Error 2002: Getting notes failed");
			}
		}

		[HttpGet("GetToDos")]
		[Authorize]
		public async Task<IActionResult> GetToDos(Guid? employeeId, bool? all, int? take, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee

				var todos = await _employeeService.GetToDos(employeeId, all, take, cancellationToken);

				return Ok(todos);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting ToDos failed");
				return Problem(title: "Error 2002: Getting ToDos failed");
			}
		}

		[HttpPost("CreateNote")]
		[Authorize]
		public async Task<IActionResult> CreateNote([FromBody] CreateNoteDto createNote, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid createdById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _employeeService.AddNote(createNote, createdById, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Note creation failed");
				return Problem(title: "Error 2002: Note creation failed");
			}
		}

		[HttpGet("GetAbsenceTypesForSelect")]
		[Authorize]
		public IActionResult GetAbsenceTypesForSelect()
		{
			try
			{
				var absenceTypes = _employeeService.GetAbsenceTypes();

				return Ok(absenceTypes);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Get absence types for select failed");
				return Problem(title: "Error 2002: Get absence types for select failed");
			}
		}

		[HttpPost("CreateToDo")]
		[Authorize]
		public async Task<IActionResult> CreateToDo([FromBody] CreateToDoDto createToDo, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid createdById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _employeeService.AddToDo(createToDo, createdById, cancellationToken);

				return Ok();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "ToDo creation failed");
				return Problem(title: "Error 2002: ToDo creation failed");
			}
		}

		[HttpPatch("UpdateNoteContent")]
		[Authorize]
		public async Task<IActionResult> UpdateNoteContent([FromBody] UpdateNoteDto updateNote, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid updatedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				// @dusan: Check if clientId is valid for this employee
				await _employeeService.UpdateNoteContent(updateNote.Id, updateNote.Content, updatedById, cancellationToken);
				return Ok(); 
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "Note not found");
				return NotFound(); 
			}
			catch (ArgumentException aex)
			{
				_logger.Error(aex, "Empty content passed while updating the note");
				return BadRequest(); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Note's content update failed");
				return Problem(title: "Error 2002: Note's content update failed");
			}
		}


		[HttpPatch("UpdateToDoContent")]
		[Authorize]
		public async Task<IActionResult> UpdateToDoContent([FromBody] UpdateToDoDto updateToDo, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid updatedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _employeeService.UpdateToDoContent(updateToDo.Id, updateToDo.Content, updatedById, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "ToDo not found");
				return NotFound();
			}
			catch (InvalidOperationException ioex)
			{
				_logger.Error(ioex, "Completed ToDo's content can not be updated");
				return BadRequest();
			}
			catch (ArgumentException aex)
			{
				_logger.Error(aex, "Empty content passed while updating the ToDo");
				return BadRequest();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "ToDo's content update failed");
				return Problem(title: "Error 2002: ToDo's content update failed");
			}
		}

		[HttpPatch("UpdateToDoCompletion")]
		[Authorize]
		public async Task<IActionResult> UpdateToDoCompletion([FromBody] UpdateToDoDto updateToDo, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid updatedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				if (!updateToDo.Completed.HasValue)
				{
					_logger.Error("Completion flag wasn't passed while updating the ToDo");
					return BadRequest();
				}

				await _employeeService.UpdateToDoCompletion(updateToDo.Id, updateToDo.Completed.Value, updatedById, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "ToDo not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "ToDo's completion update failed");
				return Problem(title: "Error 2002: ToDo's completion update failed");
			}
		}

		[HttpDelete("DeleteNote")]
		[Authorize]
		public async Task<IActionResult> DeleteNote(Guid noteId, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid deletedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _employeeService.DeleteNote(noteId, deletedById, cancellationToken); 
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "Note not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Note deleting failed");
				return Problem(title: "Error 2002: Note deleting failed");
			}
		}


		[HttpDelete("DeleteToDo")]
		[Authorize]
		public async Task<IActionResult> DeleteToDo(Guid toDoId, CancellationToken cancellationToken)
		{
			try
			{
				// @dusan: Check if clientId is valid for this employee
				if (!Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid deletedById))
				{
					return Unauthorized("Invalid or missing user id in token.");
				}

				await _employeeService.DeleteToDo(toDoId, deletedById, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, "ToDo not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "ToDo deleting failed");
				return Problem(title: "Error 2002: ToDo deleting failed");
			}
		}



		[HttpGet("GetUpcomingAnniversaries")]
		[Authorize]
		public async Task<IActionResult> GetUpcomingAnniversaries(CancellationToken cancellationToken)
		{
			try
			{
				var upcomingAnniversaries = await _employeeService.GetUpcomingAnniversaries(5, cancellationToken); 

				return Ok(upcomingAnniversaries);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting upcoming anniversaries failed");
				return Problem(title: "Error 2002: Getting upcoming anniversaries failed");
			}
		}

		[HttpGet("GetEmployeesChartData")]
		[Authorize]
		public async Task<IActionResult> GetEmployeesChartData(int? yearsPeriod, CancellationToken cancellationToken)
		{
			try
			{
				var chartData = await _employeeService.GetEmployeesChartData(yearsPeriod, cancellationToken);

				return Ok(chartData);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting chart data failed");
				return Problem(title: "Error 2002: Getting chart data failed");
			}
		}

		[HttpGet("GetRecentNotes")]
		[Authorize]
		public async Task<IActionResult> GetRecentNotes(CancellationToken cancellationToken)
		{
			try
			{
				var recentNotes = await _employeeService.GetRecentNotes(5,cancellationToken);

				return Ok(recentNotes);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting recent notes failed");
				return Problem(title: "Error 2002: Getting recent notes failed");
			}
		}

		[HttpGet("GetEvents")]
		[Authorize]
		public async Task<IActionResult> GetEvents(Guid employeeId, DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken)
		{
			try
			{
				var events = await _employeeService.GetEvents(employeeId, startDate, endDate, cancellationToken); 

				return Ok(events);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting events failed");
				return Problem(title: "Error 2002: Getting events failed");
			}
		}

		[HttpGet("GetUpcomingAbsences")]
		[Authorize]
		public async Task<IActionResult> GetUpcomingAbsences(CancellationToken cancellationToken)
		{
			try
			{
				var absences = await _employeeService.GetUpcomingAbsences(cancellationToken);

				return Ok(absences);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting events failed");
				return Problem(title: "Error 2002: Getting events failed");
			}
		}


		[HttpGet("GetYearEvents")]
		[Authorize]
		public async Task<IActionResult> GetYearEvents(Guid employeeId, int year, CancellationToken cancellationToken)
		{
			try
			{
				var events = await _employeeService.GetYearEvents(employeeId, year, cancellationToken);

				return Ok(events);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting events failed");
				return Problem(title: "Error 2002: Getting events failed");
			}
		}

		[HttpGet("GetUpcomingEvents")]
		[Authorize]
		public async Task<IActionResult> GetUpcomingEvents(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				var upcomingEvents = await _employeeService.GetUpcomingEvents(employeeId, cancellationToken);

				return Ok(upcomingEvents); 
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting upcoming events failed");
				return Problem(title: "Error 2002: Getting upcoming events failed");
			}
		}

		[HttpPatch("EditEmployeeBasicInfo")]
		[Authorize]
		public async Task<IActionResult> EditEmployeeBasicInfo([FromBody] EditEmployeeBasicInfoDto basicInfoDto, CancellationToken cancellationToken)
		{
			try
			{
				await _employeeService.EditEmployeeBasicInfo(basicInfoDto, cancellationToken);
				return Ok(); 
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, $"Employee {basicInfoDto?.EmployeeId} not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, $"Edit employee basic info failed for {basicInfoDto?.EmployeeId}");
				return Problem(title: $"Edit employee basic info failed for {basicInfoDto?.EmployeeId}");
			}
		}

		[HttpPatch("EditEmployeePersonalData")]
		[Authorize]
		public async Task<IActionResult> EditEmployeePersonalData([FromBody] EditEmployeePersonalDataDto personalDataDto, CancellationToken cancellationToken)
		{
			try
			{
				await _employeeService.EditEmployeePersonalData(personalDataDto, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, $"Employee {personalDataDto?.EmployeeId} not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, $"Edit employee personal data failed for {personalDataDto?.EmployeeId}");
				return Problem(title: $"Edit employee personal data failed for {personalDataDto?.EmployeeId}");
			}
		}

		[HttpPatch("EditEmployeeSchedulingPreferences")]
		[Authorize]
		public async Task<IActionResult> EditEmployeeSchedulingPreferences([FromBody] EditEmployeeSchedulingPreferencesDto dto, CancellationToken cancellationToken)
		{
			try
			{
				await _employeeService.EditEmployeeSchedulingPreferences(dto, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, $"Employee {dto?.EmployeeId} not found");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, $"Edit employee scheduling preferences failed for {dto?.EmployeeId}");
				return Problem(title: "Edit employee scheduling preferences failed", detail: ex.Message);
			}
		}



		[HttpPatch("DeactivateEmployee")]
		[Authorize]
		[ProducesResponseType(StatusCodes.Status200OK)]
		[ProducesResponseType(StatusCodes.Status404NotFound)]
		[ProducesResponseType(StatusCodes.Status500InternalServerError)]
		public async Task<IActionResult> DeactivateEmployee(Guid employeeId, CancellationToken cancellationToken)
		{
			try
			{
				await _employeeService.DeactivateEmployee(employeeId, cancellationToken);
				return Ok();
			}
			catch (KeyNotFoundException kex)
			{
				_logger.Error(kex, $"Employee {employeeId} not found for deactivation");
				return NotFound();
			}
			catch (Exception ex)
			{
				_logger.Error(ex, $"Deactivating employee {employeeId} failed");
				return Problem(title: "Error 2002: Deactivating employee failed");
			}
		}

		//Dashboard

		[HttpGet("GetEmployeesBasicStats")]
		[Authorize]
		public async Task<IActionResult> GetEmployeesBasicStats(int? yearsPeriod, CancellationToken cancellationToken)
		{
			try
			{
				var basicStats = await _employeeService.GetEmployeesBasicStats(yearsPeriod, cancellationToken);

				return Ok(basicStats);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting basic stats failed");
				return Problem(title: "Error 2002: Getting basic stats failed");
			}
		}

		[HttpGet("GetNewEmployeesList")]
		[Authorize]
		public async Task<IActionResult> GetNewEmployeesList(CancellationToken cancellationToken)
		{
			try
			{
				var newEmployees = await _employeeService.GetNewEmployeesList(cancellationToken);

				return Ok(newEmployees);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting new employees failed");
				return Problem(title: "Error 2002: Getting new employees failed");
			}
		}

		[HttpGet("GetCsvColumnDefinitions")]
		[Authorize]
		public IActionResult GetCsvColumnDefinitions()
		{
			try
			{
				return Ok(_employeeService.GetCsvColumnDefinitions());
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting CSV column definitions failed");
				return Problem(title: "Error 2002: Getting CSV column definitions failed");
			}
		}

		[HttpPost("BulkImportEmployees")]
		[Authorize]
		[Consumes("multipart/form-data")]
		public async Task<IActionResult> BulkImportEmployees(IFormFile file, CancellationToken cancellationToken)
		{
			if (file == null || file.Length == 0)
				return BadRequest("No file provided.");

			if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
				return BadRequest("Only CSV files are accepted.");

			try
			{
				var result = await _employeeService.BulkImportEmployeesAsync(file, cancellationToken);
				return Ok(result);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Bulk employee import failed");
				return Problem(title: "Error 2002: Bulk employee import failed");
			}
		}

		[HttpGet("GetAttritionRate")]
		[Authorize]
		public async Task<IActionResult> GetAttritionRate(int? yearsPeriod, CancellationToken cancellationToken)
		{
			try
			{
				var rate = await _employeeService.GetAttritionRate(yearsPeriod, cancellationToken);

				return Ok(rate);
			}
			catch (Exception ex)
			{
				_logger.Error(ex, "Getting attrition rate failed");
				return Problem(title: "Error 2002: Getting attrition rate failed");
			}
		}
	}
}
