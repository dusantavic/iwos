using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftAssignmentConfiguration : IEntityTypeConfiguration<ShiftAssignment>
    {
        public void Configure(EntityTypeBuilder<ShiftAssignment> builder)
        {
            builder.ToTable(nameof(ShiftAssignment), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ShiftId).IsRequired();
            builder.Property(x => x.EmployeeId).IsRequired();
            builder.Property(x => x.Date).IsRequired();
            builder.Property(x => x.AssignedAt).IsRequired().IsUtc();
            builder.Property(x => x.AssignedById).IsRequired(false);
            builder.Property(x => x.IsSwapped).IsRequired().HasDefaultValue(false);
            builder.Property(x => x.LastSwapId).IsRequired(false);

            // One assignment per employee per shift per day
            builder.HasIndex(x => new { x.ShiftId, x.EmployeeId, x.Date }).IsUnique();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.Assignments)
                .HasForeignKey(x => x.ShiftId)
                .IsRequired();

            builder.HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .IsRequired();
        }
    }
}
