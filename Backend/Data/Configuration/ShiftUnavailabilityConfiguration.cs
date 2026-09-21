using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftUnavailabilityConfiguration : IEntityTypeConfiguration<ShiftUnavailability>
    {
        public void Configure(EntityTypeBuilder<ShiftUnavailability> builder)
        {
            builder.ToTable(nameof(ShiftUnavailability), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ShiftId).IsRequired();
            builder.Property(x => x.EmployeeId).IsRequired();
            builder.Property(x => x.Date).IsRequired();
            builder.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            builder.Property(x => x.ReportedAt).IsRequired().IsUtc();

            // One unavailability report per employee per shift per day
            builder.HasIndex(x => new { x.ShiftId, x.EmployeeId, x.Date }).IsUnique();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.Unavailabilities)
                .HasForeignKey(x => x.ShiftId)
                .IsRequired();

            builder.HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .IsRequired();
        }
    }
}
