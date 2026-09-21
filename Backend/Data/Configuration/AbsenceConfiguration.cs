using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class AbsenceConfiguration : IEntityTypeConfiguration<Absence>
    {
        public void Configure(EntityTypeBuilder<Absence> builder)
        {
            builder.ToTable(nameof(Absence), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Type).IsRequired(true);
            builder.Property(x => x.Status).IsRequired(true);
            builder.Property(x => x.StartDate).IsRequired(true).IsUtc();
            builder.Property(x => x.EndDate).IsRequired(true).IsUtc();
            builder.Property(x => x.RequestedDateTime).IsRequired(true).IsUtc();
            builder.Property(x => x.ApprovedDateTime).IsUtc();
            builder.Property(x => x.RejectedDateTime).IsUtc();

			builder.Property(x => x.RequestGroupId).IsRequired(false);
			builder.Property(x => x.RequestGroupId).IsRequired(false);
            builder.Property(x => x.Year).IsRequired(true);
            builder.Property(x => x.WorkingDays).IsRequired(true);
            builder.Property(x => x.WorkingHours).IsRequired(true).HasPrecision(8, 2).HasDefaultValue(0m);
            builder.Property(x => x.IsHoursEstimated).IsRequired(true).HasDefaultValue(false);
            builder.Property(x => x.PseudoWeekendDaysCount).IsRequired(true).HasDefaultValue(0);
            builder.Property(x => x.MinChargedWorkingDays).IsRequired(false);
            builder.Property(x => x.MaxChargedWorkingDays).IsRequired(false);
            builder.Property(x => x.UsedFromCarriedOver).IsRequired(true);
            builder.Property(x => x.UsedFromAnnual).IsRequired(true);
            builder.Property(x => x.ApprovedById).IsRequired(false);
            builder.Property(x => x.RejectedById).IsRequired(false);

			builder.Property(x => x.LastModifiedTimeStamp).IsUtc().IsRequired(false);
			builder.Property(x => x.LastModifiedBy).IsRequired(false);

			builder.HasOne(a => a.Employee)
                .WithMany(e => e.Absences)
                .HasForeignKey(a => a.EmployeeId)
                .IsRequired();
        }
    }
}