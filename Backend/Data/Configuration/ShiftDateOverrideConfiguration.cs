using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftDateOverrideConfiguration : IEntityTypeConfiguration<ShiftDateOverride>
    {
        public void Configure(EntityTypeBuilder<ShiftDateOverride> builder)
        {
            builder.ToTable(nameof(ShiftDateOverride), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ShiftId).IsRequired();
            builder.Property(x => x.Date).IsRequired();
            builder.Property(x => x.StartTime).IsRequired(false);
            builder.Property(x => x.EndTime).IsRequired(false);

            // One override per shift per specific date
            builder.HasIndex(x => new { x.ShiftId, x.Date }).IsUnique();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.DateOverrides)
                .HasForeignKey(x => x.ShiftId)
                .IsRequired();
        }
    }
}
