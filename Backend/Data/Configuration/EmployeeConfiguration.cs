using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
    {
        public void Configure(EntityTypeBuilder<Employee> builder)
        {
            builder.ToTable(nameof(Employee), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.ContactEmail).IsRequired(false).HasMaxLength(255);
            builder.Property(x => x.Active).IsRequired(true);
            builder.Property(x => x.FirstName).IsRequired(true).HasMaxLength(100);
            builder.Property(x => x.LastName).IsRequired(true).HasMaxLength(100);
            builder.Property(x => x.PersonalId).IsRequired(false).HasMaxLength(100);
            builder.Property(x => x.ContractType).IsRequired(false);
            builder.Property(x => x.Country).IsRequired(false).HasMaxLength(100);
            builder.Property(x => x.BirthDate).IsRequired(false);
            builder.Property(x => x.WeeklyHours).IsRequired(true).HasDefaultValue(40);
            builder.Property(x => x.WeeklyDays).IsRequired(true).HasDefaultValue(5);

            builder.HasOne(e => e.Client)
                .WithMany(c => c.Employees)
                .HasForeignKey(e => e.ClientId)
                .IsRequired();

            builder.HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .IsRequired();

            builder.HasOne(e => e.RotationPattern)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.RotationPatternId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(e => e.PinnedShift)
                .WithMany()
                .HasForeignKey(e => e.PinnedShiftId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
