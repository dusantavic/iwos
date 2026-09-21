using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftPositionRequirementOverrideConfiguration
        : IEntityTypeConfiguration<ShiftPositionRequirementOverride>
    {
        public void Configure(EntityTypeBuilder<ShiftPositionRequirementOverride> builder)
        {
            builder.ToTable(nameof(ShiftPositionRequirementOverride), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ShiftId).IsRequired();
            builder.Property(x => x.Date).IsRequired();
            builder.Property(x => x.PositionId).IsRequired();
            builder.Property(x => x.RequiredCount).IsRequired();

            builder.HasIndex(x => new { x.ShiftId, x.Date, x.PositionId }).IsUnique();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.PositionRequirementOverrides)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Position)
                .WithMany()
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
