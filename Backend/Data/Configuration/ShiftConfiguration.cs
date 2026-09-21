using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftConfiguration : IEntityTypeConfiguration<Shift>
    {
        public void Configure(EntityTypeBuilder<Shift> builder)
        {
            builder.ToTable(nameof(Shift), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.ClientId).IsRequired();
            builder.Property(x => x.Label).IsRequired().HasMaxLength(100);
            builder.Property(x => x.DefaultStartTime).IsRequired();
            builder.Property(x => x.DefaultEndTime).IsRequired();
            builder.Property(x => x.IsActive).IsRequired();
            builder.Property(x => x.SortOrder).IsRequired();

            builder.HasOne(s => s.Client)
                .WithMany()
                .HasForeignKey(s => s.ClientId)
                .IsRequired();
        }
    }
}
