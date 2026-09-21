using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Iwos.Data.Configuration
{
    public sealed class AdminAuditLogConfiguration : IEntityTypeConfiguration<AdminAuditLog>
    {
        public void Configure(EntityTypeBuilder<AdminAuditLog> builder)
        {
            builder.ToTable(nameof(AdminAuditLog), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Action).IsRequired().HasMaxLength(100);
            builder.Property(x => x.EntityType).HasMaxLength(100);
            builder.Property(x => x.Details);
            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasOne(x => x.AdminUser)
                .WithMany(x => x.AuditLogs)
                .HasForeignKey(x => x.AdminUserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            builder.HasIndex(x => x.CreatedAt);
        }
    }
}
