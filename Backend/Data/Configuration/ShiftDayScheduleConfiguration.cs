using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftDayScheduleConfiguration : IEntityTypeConfiguration<ShiftDaySchedule>
    {
        public void Configure(EntityTypeBuilder<ShiftDaySchedule> builder)
        {
            builder.ToTable(nameof(ShiftDaySchedule), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ShiftId).IsRequired();
            builder.Property(x => x.DayOfWeek).IsRequired();
            builder.Property(x => x.StartTime).IsRequired();
            builder.Property(x => x.EndTime).IsRequired();

            // Each shift has at most one schedule entry per day of the week
            builder.HasIndex(x => new { x.ShiftId, x.DayOfWeek }).IsUnique();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.DaySchedules)
                .HasForeignKey(x => x.ShiftId)
                .IsRequired();
        }
    }
}
