using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public class FileConfiguration : IEntityTypeConfiguration<File>
    {
        public void Configure(EntityTypeBuilder<File> builder)
        {
            builder.ToTable(nameof(File), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Active).IsRequired(true);
            builder.Property(x => x.DisplayName).IsRequired(true).HasMaxLength(255);
            builder.Property(x => x.FullSystemName).IsRequired(true).HasMaxLength(1000);
            builder.Property(x => x.Path).IsRequired(true).HasMaxLength(2000);
            builder.Property(x => x.UploadedOn).IsRequired(true).IsUtc();

            builder.HasOne(f => f.UploadedBy)
                .WithMany(a => a.Files)
                .HasForeignKey(f => f.UploadedById)
                .IsRequired();

            builder.HasOne(f => f.Employee)
                .WithMany(e => e.Files)
                .HasForeignKey(f => f.EmployeeId)
                .IsRequired(false);
        }
    }
}
