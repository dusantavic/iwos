using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class PositionConfiguration : IEntityTypeConfiguration<Position>
    {
        public void Configure(EntityTypeBuilder<Position> builder)
        {
            builder.ToTable(nameof(Position), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Title).IsRequired(true).HasMaxLength(255);
            builder.Property(x => x.Description).HasMaxLength(1000);

            builder.HasOne(x => x.Department)
                .WithMany(d => d.Positions)
                .HasForeignKey(x => x.DepartmentId)
                .IsRequired(); 
        }
    }
}
