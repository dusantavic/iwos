using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftRotationPatternConfiguration : IEntityTypeConfiguration<ShiftRotationPattern>
    {
        public void Configure(EntityTypeBuilder<ShiftRotationPattern> builder)
        {
            builder.ToTable(nameof(ShiftRotationPattern), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ClientId).IsRequired();
            builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
            builder.Property(x => x.DaysOn).IsRequired();
            builder.Property(x => x.DaysOff).IsRequired();
            builder.Property(x => x.IsGlobal).IsRequired().HasDefaultValue(false);

            builder.HasOne(p => p.Client)
                .WithMany()
                .HasForeignKey(p => p.ClientId)
                .IsRequired();
        }
    }
}
