using Iwos.Business.Providers;
using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

// ── One-off dev/demo data generator ─────────────────────────────────────────
// Creates a self-contained mock tenant ("Northfield Manufacturing Co.") with
// realistic plant departments, positions, shifts, rotation patterns and
// 250-500 employees, so the scheduling features can be demoed without using
// real customer data. Safe to re-run: it no-ops if the tenant already exists.
//
// Usage:  dotnet run --project Tools/SeedMockTenant -- [employeeCount]
//
// Connection string resolution order:
//   1. ConnectionStrings__Db environment variable  (recommended)
//   2. Backend/appsettings.Development.json        (local checkout)

const string TenantCode = "DEMO-PLANT";
const string AdminUsername = "plant.admin";
const string AdminPassword = "Demo#Plant2026!";

int employeeCount = args.Length > 0 && int.TryParse(args[0], out var parsed)
    ? Math.Clamp(parsed, 250, 500)
    : 350;

var backendRoot = FindBackendRoot(AppContext.BaseDirectory);
var configuration = new ConfigurationBuilder()
    .SetBasePath(backendRoot)
    .AddJsonFile("appsettings.json", optional: true)
    .AddJsonFile("appsettings.Development.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = configuration.GetConnectionString("Db");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Missing connection string 'Db'. Either set the ConnectionStrings__Db environment variable, " +
        "e.g. ConnectionStrings__Db=Server=localhost;Port=5432;Database=iwos;User Id=postgres;Password=...;SearchPath=hrs; " +
        "or create Backend/appsettings.Development.json from Backend/appsettings.Development.example.json.");
}

var tenantId = Guid.NewGuid();
var options = new DbContextOptionsBuilder<IwosDbContext>()
    .UseNpgsql(connectionString)
    .Options;

await using var context = new IwosDbContext(options, new FixedTenantProvider(tenantId));

if (await context.Clients.AnyAsync(c => c.Code == TenantCode))
{
    Console.WriteLine($"Tenant with code '{TenantCode}' already exists — skipping. Delete it first to reseed.");
    return;
}

var passwordProvider = new PasswordProvider();

await using var transaction = await context.Database.BeginTransactionAsync();

// ── Client (tenant) ──────────────────────────────────────────────────────
var client = new Client
{
    Id = tenantId,
    Name = "Northfield Manufacturing Co.",
    ContactEmail = "ops@northfield-mfg.demo",
    Active = true,
    Status = ClientStatus.Active,
    Plan = ClientPlan.Pro,
    Billing = ClientBilling.Paid,
    ContactPerson = "Maria Hendricks",
    ContactPhone = "+1-555-0142",
    Country = "United States",
    Code = TenantCode,
    BankAccountNumber = "000-000-0000",
    BankWith = "Demo Bank",
    Departments = new List<Department>(),
    Employees = new List<Employee>(),
};
context.Clients.Add(client);

// ── Subscription ─────────────────────────────────────────────────────────
var activePlanType = await context.SubscriptionPlanTypes.FirstOrDefaultAsync(p => p.Code == "ACTIVE")
    ?? throw new InvalidOperationException("Global 'ACTIVE' SubscriptionPlanType is missing — run EF migrations first.");

var subscriptionHistory = new ClientSubscriptionPlanHistory
{
    Id = Guid.NewGuid(),
    ClientId = tenantId,
    SubscriptionPlanTypeId = activePlanType.Id,
    StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
    EndDate = null,
};
context.ClientSubscriptionPlanHistories.Add(subscriptionHistory);

// Saved separately: Client and ClientSubscriptionPlanHistory have a circular FK
// (Client.CurrentSubscriptionId <-> History.ClientId) that EF can't batch in one
// INSERT graph. Insert both with CurrentSubscriptionId null, then backfill it.
await context.SaveChangesAsync();
client.CurrentSubscriptionId = subscriptionHistory.Id;

// ── Client admin user ─────────────────────────────────────────────────────
var adminUser = new ApplicationUser
{
    Id = Guid.NewGuid(),
    UserName = AdminUsername,
    NormalizedUserName = AdminUsername.ToUpperInvariant(),
    Email = "plant.admin@northfield-mfg.demo",
    NormalizedEmail = "PLANT.ADMIN@NORTHFIELD-MFG.DEMO",
    EmailConfirmed = true,
    SecurityStamp = Guid.NewGuid().ToString(),
    ConcurrencyStamp = Guid.NewGuid().ToString(),
    FirstName = "Plant",
    LastName = "Admin",
    Active = true,
    Type = UserType.ClientAdmin,
    ClientId = tenantId,
    PasswordHash = passwordProvider.GetPasswordHash(AdminPassword),
    Claims = new List<IdentityUserClaim<Guid>>(),
    Files = new List<Iwos.Data.Model.File>(),
};
context.ApplicationUsers.Add(adminUser);

// ── Departments & positions ─────────────────────────────────────────────
// weight = relative share of total headcount; frontline production/warehouse
// departments are intentionally much larger than office/support functions.
var departmentPlan = new[]
{
    new DepartmentPlan("Production", 0.30, new[] { "Machine Operator", "CNC Operator", "Production Line Worker", "Line Lead" }, RotationKind.Continental),
    new DepartmentPlan("Assembly", 0.20, new[] { "Assembly Technician", "Assembly Line Worker", "Assembly Team Lead" }, RotationKind.Continental),
    new DepartmentPlan("Warehouse & Logistics", 0.16, new[] { "Forklift Operator", "Warehouse Associate", "Inventory Clerk", "Logistics Coordinator" }, RotationKind.Continental),
    new DepartmentPlan("Packaging", 0.10, new[] { "Packaging Operator", "Packaging Line Lead" }, RotationKind.Continental),
    new DepartmentPlan("Shipping & Receiving", 0.08, new[] { "Shipping Clerk", "Receiving Associate", "Dock Worker" }, RotationKind.Continental),
    new DepartmentPlan("Quality Control", 0.07, new[] { "Quality Inspector", "QA Technician", "QA Supervisor" }, RotationKind.Standard),
    new DepartmentPlan("Maintenance", 0.06, new[] { "Maintenance Technician", "Electrician", "Mechanical Engineer" }, RotationKind.Standard),
    new DepartmentPlan("Plant Management", 0.03, new[] { "Shift Supervisor", "Plant Manager", "HR Coordinator" }, RotationKind.OfficeDay),
};

// ── Shifts (24/7 plant operation) ───────────────────────────────────────
var shiftA = new Shift { Id = Guid.NewGuid(), ClientId = tenantId, Client = client, Label = "Shift A (Day)", DefaultStartTime = new TimeOnly(6, 0), DefaultEndTime = new TimeOnly(14, 0), IsActive = true, SortOrder = 0 };
var shiftB = new Shift { Id = Guid.NewGuid(), ClientId = tenantId, Client = client, Label = "Shift B (Afternoon)", DefaultStartTime = new TimeOnly(14, 0), DefaultEndTime = new TimeOnly(22, 0), IsActive = true, SortOrder = 1 };
var shiftC = new Shift { Id = Guid.NewGuid(), ClientId = tenantId, Client = client, Label = "Shift C (Night)", DefaultStartTime = new TimeOnly(22, 0), DefaultEndTime = new TimeOnly(6, 0), IsActive = true, SortOrder = 2 };
var plantShifts = new[] { shiftA, shiftB, shiftC };
context.Shifts.AddRange(plantShifts);

foreach (var shift in plantShifts)
{
    foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
    {
        context.ShiftDaySchedules.Add(new ShiftDaySchedule
        {
            Id = Guid.NewGuid(),
            ShiftId = shift.Id,
            Shift = shift,
            DayOfWeek = day,
            StartTime = shift.DefaultStartTime,
            EndTime = shift.DefaultEndTime,
        });
    }
}

context.ShiftClientConfigs.Add(new ShiftClientConfig
{
    ClientId = tenantId,
    Client = client,
    WeekEndsWorking = true, // continuous plant operation runs weekends
    ConsiderWeeklyHours = true,
});

// ── Rotation patterns ─────────────────────────────────────────────────────
var continentalPattern = new ShiftRotationPattern { Id = Guid.NewGuid(), ClientId = tenantId, Client = client, Name = "4 on / 2 off (Continental)", DaysOn = 4, DaysOff = 2, IsGlobal = false };
var standardPattern = new ShiftRotationPattern { Id = Guid.NewGuid(), ClientId = tenantId, Client = client, Name = "5 on / 2 off (Standard)", DaysOn = 5, DaysOff = 2, IsGlobal = true };
context.ShiftRotationPatterns.AddRange(continentalPattern, standardPattern);

// ── Build departments + positions, then distribute employees ─────────────
var random = new Random(20260622); // fixed seed: reproducible demo data
var positionsByDepartment = new List<(DepartmentPlan Plan, Position[] Positions)>();

foreach (var plan in departmentPlan)
{
    var department = new Department
    {
        Id = Guid.NewGuid(),
        Name = plan.Name,
        ClientId = tenantId,
        Client = client,
    };
    context.Departments.Add(department);

    var positions = plan.PositionTitles
        .Select(title => new Position { Id = Guid.NewGuid(), Title = title, DepartmentId = department.Id, Department = department })
        .ToArray();
    context.Positions.AddRange(positions);

    positionsByDepartment.Add((plan, positions));
}

var employees = new List<Employee>();
var positionHeadcount = new Dictionary<Guid, int>();
var remaining = employeeCount;

for (int i = 0; i < positionsByDepartment.Count; i++)
{
    var (plan, positions) = positionsByDepartment[i];
    bool isLast = i == positionsByDepartment.Count - 1;
    int deptCount = isLast ? remaining : (int)Math.Round(employeeCount * plan.Weight);
    deptCount = Math.Max(deptCount, positions.Length); // at least one person per position
    remaining -= deptCount;

    var rotationPatternId = plan.Rotation switch
    {
        RotationKind.Continental => continentalPattern.Id,
        RotationKind.Standard => standardPattern.Id,
        RotationKind.OfficeDay => standardPattern.Id,
        _ => (Guid?)null,
    };
    var pinnedShiftId = plan.Rotation == RotationKind.OfficeDay ? shiftA.Id : (Guid?)null;

    for (int n = 0; n < deptCount; n++)
    {
        var position = positions[n % positions.Length];
        positionHeadcount[position.Id] = positionHeadcount.GetValueOrDefault(position.Id) + 1;

        var (contractType, weeklyHours, weeklyDays) = PickContract(random);

        employees.Add(new Employee
        {
            Id = Guid.NewGuid(),
            FirstName = NameBank.FirstNames[random.Next(NameBank.FirstNames.Length)],
            LastName = NameBank.LastNames[random.Next(NameBank.LastNames.Length)],
            PersonalId = $"EMP-{random.Next(100000, 999999)}",
            ContractType = contractType,
            Country = "United States",
            BirthDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-random.Next(20, 61)).AddDays(-random.Next(0, 365))),
            ClientId = tenantId,
            PositionId = position.Id,
            WeeklyHours = weeklyHours,
            WeeklyDays = weeklyDays,
            RotationPatternId = rotationPatternId,
            PinnedShiftId = pinnedShiftId,
            Active = true,
        });
    }
}

context.Employees.AddRange(employees);

// ── Position staffing requirements, so the planner has real coverage targets ──
foreach (var (plan, positions) in positionsByDepartment)
{
    foreach (var position in positions)
    {
        var headcount = positionHeadcount.GetValueOrDefault(position.Id);
        if (headcount == 0) continue;

        if (plan.Rotation == RotationKind.OfficeDay)
        {
            context.ShiftPositionRequirements.Add(new ShiftPositionRequirement
            {
                Id = Guid.NewGuid(),
                ShiftId = shiftA.Id,
                Shift = shiftA,
                PositionId = position.Id,
                Position = position,
                RequiredCount = headcount,
            });
            continue;
        }

        // Spread the position's headcount evenly across the three plant shifts.
        var perShift = Math.Max(1, (int)Math.Ceiling(headcount / 3.0));
        foreach (var shift in plantShifts)
        {
            context.ShiftPositionRequirements.Add(new ShiftPositionRequirement
            {
                Id = Guid.NewGuid(),
                ShiftId = shift.Id,
                Shift = shift,
                PositionId = position.Id,
                Position = position,
                RequiredCount = perShift,
            });
        }
    }
}

await context.SaveChangesAsync();
await transaction.CommitAsync();

Console.WriteLine("Mock manufacturing tenant created.");
Console.WriteLine($"  Client:        Northfield Manufacturing Co. ({TenantCode})");
Console.WriteLine($"  Client ID:     {tenantId}");
Console.WriteLine($"  Admin login:   {AdminUsername} / {AdminPassword}");
Console.WriteLine($"  Departments:   {departmentPlan.Length}");
Console.WriteLine($"  Positions:     {positionsByDepartment.Sum(p => p.Positions.Length)}");
Console.WriteLine($"  Employees:     {employees.Count}");
Console.WriteLine($"  Shifts:        {plantShifts.Length} (24/7 coverage)");
Console.WriteLine($"  Rotations:     {continentalPattern.Name}, {standardPattern.Name}");

static string FindBackendRoot(string startDir)
{
    var dir = new DirectoryInfo(startDir);
    while (dir is not null)
    {
        var candidate = Path.Combine(dir.FullName, "Backend", "Iwos.csproj");
        if (System.IO.File.Exists(candidate))
        {
            return Path.Combine(dir.FullName, "Backend");
        }
        dir = dir.Parent;
    }
    throw new InvalidOperationException("Could not locate Backend project root (Backend/Iwos.csproj) from " + startDir);
}

static (ContractType ContractType, int WeeklyHours, int WeeklyDays) PickContract(Random random)
{
    var roll = random.NextDouble();
    return roll switch
    {
        < 0.85 => (ContractType.Permanent, 40, 5),
        < 0.93 => (ContractType.Casual, 24, 3),
        < 0.97 => (ContractType.Temporary, 40, 5),
        _ => (ContractType.Trial, 40, 5),
    };
}

internal enum RotationKind { Continental, Standard, OfficeDay }

internal sealed record DepartmentPlan(string Name, double Weight, string[] PositionTitles, RotationKind Rotation);

internal sealed class FixedTenantProvider(Guid tenantId) : ITenantProvider
{
    public Guid GetTenantId() => tenantId;
}

internal static class NameBank
{
    public static readonly string[] FirstNames =
    [
        "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Charles",
        "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Steven", "Andrew", "Paul", "Joshua", "Kevin",
        "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary",
        "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
        "Nancy", "Lisa", "Margaret", "Betty", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle",
        "Carol", "Amanda", "Melissa", "Deborah", "Stephanie", "Rebecca", "Laura", "Sharon", "Cynthia", "Kathleen",
    ];

    public static readonly string[] LastNames =
    [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
        "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
        "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    ];
}
