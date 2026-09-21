using Asp.Versioning;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Controllers
{
    /// <summary>
    /// Internal admin portal management of tenants (clients), their application
    /// users, and their subscriptions. Every action requires the
    /// <see cref="PortalAuth.AdminPortalPolicy"/> policy, so a manager or
    /// employee portal token cannot reach this surface even if forged or
    /// stolen. Reads run with <c>IgnoreQueryFilters()</c> because admin staff
    /// must see/manage every tenant, not just one.
    /// </summary>
    [ApiController]
    [Route("api/v{version:apiVersion}/[controller]")]
    [ApiVersion("1.0")]
    [Authorize(Policy = PortalAuth.AdminPortalPolicy)]
    public class AdminClientsController : ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IwosDbContext _context;
        private readonly IUserService _userService;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IAdminAuditLogger _auditLogger;

        public AdminClientsController(
            ILogger logger,
            IwosDbContext context,
            IUserService userService,
            ISubscriptionService subscriptionService,
            IAdminAuditLogger auditLogger)
        {
            _logger = logger;
            _context = context;
            _userService = userService;
            _subscriptionService = subscriptionService;
            _auditLogger = auditLogger;
        }

        // ── Clients ───────────────────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetClients(CancellationToken ct)
        {
            try
            {
                var clients = await _context.Clients
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .OrderBy(c => c.Name)
                    .Select(c => new AdminClientDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        ContactEmail = c.ContactEmail,
                        ContactPerson = c.ContactPerson,
                        Status = c.Status,
                        Plan = c.Plan,
                        Billing = c.Billing,
                        CurrentSubscriptionId = c.CurrentSubscriptionId,
                        LastActivity = c.LastActivity
                    })
                    .ToListAsync(ct);

                return Ok(clients);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin GetClients failed");
                return Problem(title: "Error 7001");
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetClient(Guid id, CancellationToken ct)
        {
            try
            {
                var client = await _context.Clients
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(c => c.Id == id)
                    .Select(c => new AdminClientDetailDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        ContactEmail = c.ContactEmail,
                        ContactPerson = c.ContactPerson,
                        ContactPhone = c.ContactPhone,
                        Country = c.Country,
                        Address = c.Address,
                        Code = c.Code,
                        BankAccountNumber = c.BankAccountNumber,
                        BankWith = c.BankWith,
                        Status = c.Status,
                        Plan = c.Plan,
                        Billing = c.Billing,
                        CurrentSubscriptionId = c.CurrentSubscriptionId,
                        LastActivity = c.LastActivity
                    })
                    .FirstOrDefaultAsync(ct);

                if (client == null)
                {
                    return NotFound();
                }

                return Ok(client);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin GetClient failed");
                return Problem(title: "Error 7009");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateClient([FromBody] CreateClientDto dto, CancellationToken ct)
        {
            try
            {
                if (!TryGetAdminUserId(out var adminUserId))
                {
                    return Unauthorized();
                }

                var client = new Client
                {
                    Id = Guid.CreateVersion7(),
                    Name = dto.Name,
                    ContactEmail = dto.ContactEmail,
                    ContactPerson = dto.ContactPerson,
                    ContactPhone = dto.ContactPhone,
                    Country = dto.Country,
                    Address = dto.Address,
                    Code = dto.Code,
                    BankAccountNumber = dto.BankAccountNumber,
                    BankWith = dto.BankWith,
                    Active = true,
                    Status = Common.Contracts.Enums.ClientStatus.Pending,
                    Plan = Common.Contracts.Enums.ClientPlan.Free,
                    Billing = Common.Contracts.Enums.ClientBilling.Free,
                    Departments = new List<Department>(),
                    Employees = new List<Employee>()
                };

                _context.Clients.Add(client);
                await _context.SaveChangesAsync(ct);

                await _auditLogger.LogAsync(adminUserId, "ClientCreated", "Client", client.Id, $"Name={client.Name}; Code={client.Code}", ct);

                return CreatedAtAction(nameof(GetClient), new { id = client.Id }, new AdminClientDto
                {
                    Id = client.Id,
                    Name = client.Name,
                    ContactEmail = client.ContactEmail,
                    ContactPerson = client.ContactPerson,
                    Status = client.Status,
                    Plan = client.Plan,
                    Billing = client.Billing,
                    CurrentSubscriptionId = client.CurrentSubscriptionId,
                    LastActivity = client.LastActivity
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin CreateClient failed");
                return Problem(title: "Error 7002", detail: ex.Message);
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateClient(Guid id, [FromBody] UpdateClientDto dto, CancellationToken ct)
        {
            try
            {
                if (!TryGetAdminUserId(out var adminUserId))
                {
                    return Unauthorized();
                }

                var client = await _context.Clients
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == id, ct);

                if (client == null)
                {
                    return NotFound();
                }

                client.Name = dto.Name;
                client.ContactEmail = dto.ContactEmail;
                client.ContactPerson = dto.ContactPerson;
                client.ContactPhone = dto.ContactPhone;
                client.Country = dto.Country;
                client.Address = dto.Address;
                client.Code = dto.Code;
                client.BankAccountNumber = dto.BankAccountNumber;
                client.BankWith = dto.BankWith;
                client.Status = dto.Status;

                await _context.SaveChangesAsync(ct);

                await _auditLogger.LogAsync(adminUserId, "ClientUpdated", "Client", client.Id, $"Name={client.Name}; Status={client.Status}", ct);

                return Ok(new AdminClientDto
                {
                    Id = client.Id,
                    Name = client.Name,
                    ContactEmail = client.ContactEmail,
                    ContactPerson = client.ContactPerson,
                    Status = client.Status,
                    Plan = client.Plan,
                    Billing = client.Billing,
                    CurrentSubscriptionId = client.CurrentSubscriptionId,
                    LastActivity = client.LastActivity
                });
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin UpdateClient failed");
                return Problem(title: "Error 7003", detail: ex.Message);
            }
        }

        // ── Application users ────────────────────────────────────────────────

        [HttpGet("{id:guid}/users")]
        public async Task<IActionResult> GetUsers(Guid id, CancellationToken ct)
        {
            try
            {
                var users = await _context.Users
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(u => u.ClientId == id)
                    .OrderBy(u => u.UserName)
                    .Select(u => new AdminApplicationUserDto
                    {
                        Id = u.Id,
                        UserName = u.UserName ?? string.Empty,
                        Email = u.Email ?? string.Empty,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        Type = u.Type,
                        Active = u.Active,
                        CreatedOn = u.CreatedOn
                    })
                    .ToListAsync(ct);

                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin GetUsers failed");
                return Problem(title: "Error 7004");
            }
        }

        [HttpPost("{id:guid}/users")]
        public async Task<IActionResult> CreateUser(Guid id, [FromBody] CreateApplicationUserDto dto, CancellationToken ct)
        {
            try
            {
                if (!TryGetAdminUserId(out var adminUserId))
                {
                    return Unauthorized();
                }

                var clientExists = await _context.Clients
                    .IgnoreQueryFilters()
                    .AnyAsync(c => c.Id == id, ct);

                if (!clientExists)
                {
                    return NotFound();
                }

                var userModel = new UserModelDto
                {
                    Username = dto.UserName,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Email = dto.Email,
                    Password = dto.Password,
                    ClientId = id
                };

                if (!_userService.IsDtoValid(userModel))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: "Invalid user data.");
                }

                if (await _userService.Exist(userModel.Username))
                {
                    return Problem(statusCode: StatusCodes.Status400BadRequest, detail: $"User {userModel.Username} already exists.");
                }

                var added = await _userService.AddUser(userModel);
                if (!added)
                {
                    return Problem(statusCode: StatusCodes.Status500InternalServerError, detail: "User insert failed.");
                }

                // AddUser leaves new ApplicationUsers inactive by default (normal
                // signup flow requires a separate activation step). Admin-provisioned
                // users are created by trusted staff, so activate immediately.
                var createdUser = await _context.ApplicationUsers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.ClientId == id && u.UserName == userModel.Username, ct);
                if (createdUser != null)
                {
                    createdUser.Active = true;
                    await _context.SaveChangesAsync(ct);
                }

                await _auditLogger.LogAsync(adminUserId, "UserAssigned", "Client", id, $"Username={userModel.Username}", ct);

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin CreateUser failed");
                return Problem(title: "Error 7005", detail: ex.Message);
            }
        }

        // ── Subscriptions ─────────────────────────────────────────────────────

        [HttpGet("{id:guid}/subscriptions")]
        public async Task<IActionResult> GetSubscriptions(Guid id, CancellationToken ct)
        {
            try
            {
                var history = await _subscriptionService.GetHistoryForClientAsync(id, ct);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin GetSubscriptions failed");
                return Problem(title: "Error 7006");
            }
        }

        [HttpPost("{id:guid}/subscriptions")]
        public async Task<IActionResult> AssignSubscription(Guid id, [FromBody] AssignSubscriptionDto dto, CancellationToken ct)
        {
            try
            {
                if (!TryGetAdminUserId(out var adminUserId))
                {
                    return Unauthorized();
                }

                dto.ClientId = id;

                var assigned = await _subscriptionService.AssignPlanAsync(dto, adminUserId, ct);

                await _auditLogger.LogAsync(
                    adminUserId,
                    "SubscriptionAssigned",
                    "Client",
                    id,
                    $"PlanCode={assigned.SubscriptionPlanTypeCode}; StartDate={assigned.StartDate}; EndDate={assigned.EndDate}",
                    ct);

                return Ok(assigned);
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: StatusCodes.Status400BadRequest, detail: ex.Message);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin AssignSubscription failed");
                return Problem(title: "Error 7007", detail: ex.Message);
            }
        }

        [HttpGet("subscription-plan-types")]
        public async Task<IActionResult> GetSubscriptionPlanTypes(CancellationToken ct)
        {
            try
            {
                var planTypes = await _subscriptionService.GetPlanTypesAsync(ct);
                return Ok(planTypes);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Admin GetSubscriptionPlanTypes failed");
                return Problem(title: "Error 7008");
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private bool TryGetAdminUserId(out Guid adminUserId)
        {
            var value = User.FindFirst(PortalAuth.AdminUserIdClaim)?.Value;
            return Guid.TryParse(value, out adminUserId);
        }
    }
}
