using Iwos.Common.Configurations;
using Iwos.Common.Contracts;
using Iwos.Common.DTOs;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using System;

namespace Iwos.Data.Context
{
    public sealed class IwosDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        private readonly Guid _tenantId;

        public DbSet<Absence> Absences { get; set; }
        public DbSet<AbsenceBalance> AbsenceBalances { get; set; }
		public DbSet<ToDo> ToDos { get; set; }
        public DbSet<ApplicationUser> ApplicationUsers { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Note> Notes { get; set; }
        public DbSet<Position> Positions { get; set; }
        public DbSet<TokenInfo> TokensInfo { get; set; }
        public DbSet<File> Files { get; set; }
		public DbSet<UpcomingAnniversariesDto> Anniversaries { get; set; }
        public DbSet<Shift> Shifts { get; set; }
        public DbSet<ShiftDaySchedule> ShiftDaySchedules { get; set; }
        public DbSet<ShiftDateOverride> ShiftDateOverrides { get; set; }
        public DbSet<ShiftAssignment> ShiftAssignments { get; set; }
        public DbSet<ShiftUnavailability> ShiftUnavailabilities { get; set; }
        public DbSet<ShiftClientConfig> ShiftClientConfigs { get; set; }
        public DbSet<ShiftPositionRequirement> ShiftPositionRequirements { get; set; }
        public DbSet<ShiftPositionRequirementOverride> ShiftPositionRequirementOverrides { get; set; }
        public DbSet<ShiftDayPositionRequirementOverride> ShiftDayPositionRequirementOverrides { get; set; }
        public DbSet<ShiftSwapRequest> ShiftSwapRequests { get; set; }
        public DbSet<ShiftRotationPattern> ShiftRotationPatterns { get; set; }
        public DbSet<EmployeeAccount> EmployeeAccounts { get; set; }
        public DbSet<SubscriptionPlanType> SubscriptionPlanTypes { get; set; }
        public DbSet<ClientSubscriptionPlanHistory> ClientSubscriptionPlanHistories { get; set; }
        public DbSet<AdminUser> AdminUsers { get; set; }
        public DbSet<AdminAuditLog> AdminAuditLogs { get; set; }

		public IwosDbContext(DbContextOptions options, ITenantProvider tenantProvider)
            : base(options)
        {
            _tenantId = tenantProvider.GetTenantId();
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);

            modelBuilder.ApplyUtcConverter();

            modelBuilder.HasDefaultSchema(GlobalConfiguration.SchemaName);

			modelBuilder.Entity<UpcomingAnniversariesDto>().HasNoKey();

			// Query filters for tenant
			modelBuilder.Entity<Employee>().HasQueryFilter(e => e.ClientId == _tenantId);
            modelBuilder.Entity<Department>().HasQueryFilter(d => d.ClientId == _tenantId);
            modelBuilder.Entity<Note>().HasQueryFilter(d => d.Employee.ClientId == _tenantId);
            modelBuilder.Entity<Absence>().HasQueryFilter(a => a.Employee.ClientId == _tenantId);
            modelBuilder.Entity<AbsenceBalance>().HasQueryFilter(a => a.Employee.ClientId == _tenantId); 
            modelBuilder.Entity<AbsenceBalance>().HasIndex(a => new { a.EmployeeId, a.Year }).IsUnique();

            modelBuilder.Entity<ToDo>().HasQueryFilter(t => t.Employee.Active);
            modelBuilder.Entity<Position>().HasQueryFilter(p => p.Department.ClientId == _tenantId);

            // Shift query filters — tenant isolation via Shift.ClientId
            modelBuilder.Entity<Shift>().HasQueryFilter(s => s.ClientId == _tenantId);
            modelBuilder.Entity<ShiftDaySchedule>().HasQueryFilter(s => s.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftDateOverride>().HasQueryFilter(s => s.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftAssignment>().HasQueryFilter(a => a.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftUnavailability>().HasQueryFilter(u => u.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftClientConfig>().HasQueryFilter(c => c.ClientId == _tenantId);
            modelBuilder.Entity<ShiftPositionRequirement>().HasQueryFilter(r => r.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftPositionRequirementOverride>().HasQueryFilter(r => r.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftDayPositionRequirementOverride>().HasQueryFilter(r => r.Shift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftSwapRequest>().HasQueryFilter(r => r.RequestedShift.ClientId == _tenantId);
            modelBuilder.Entity<ShiftRotationPattern>().HasQueryFilter(p => p.ClientId == _tenantId);

            // EmployeeAccount intentionally has NO tenant query filter. Login must
            // be able to resolve an account by username before any token (and tenant
            // claim) exists. The service layer enforces tenant scoping on reads
            // performed by manager-authenticated callers.

            // AdminUser and AdminAuditLog intentionally have NO tenant query filter.
            // Iwos staff accounts are not tenant-scoped at all — there is no ClientId
            // to filter by, and the admin portal must be able to see and manage every
            // tenant. Login must also be able to resolve an admin by username before
            // any token (and tenant claim) exists.
        }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<decimal>().HavePrecision(18, 6);
            configurationBuilder.Conventions.Remove<TableNameFromDbSetConvention>();
        }
    }
}
