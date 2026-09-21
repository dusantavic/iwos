using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public class ShiftPositionRequirementConfiguration : IEntityTypeConfiguration<ShiftPositionRequirement>
    {
        public void Configure(EntityTypeBuilder<ShiftPositionRequirement> builder)
        {
            builder.ToTable("ShiftPositionRequirement");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.HasOne(x => x.Shift)
                .WithMany(s => s.PositionRequirements)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Position)
                .WithMany()
                .HasForeignKey(x => x.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.ShiftId, x.PositionId }).IsUnique();
        }
    }
}
