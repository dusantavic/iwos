using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftClientConfigConfiguration : IEntityTypeConfiguration<ShiftClientConfig>
    {
        public void Configure(EntityTypeBuilder<ShiftClientConfig> builder)
        {
            builder.ToTable(nameof(ShiftClientConfig), GlobalConfiguration.SchemaName);

            // ClientId is the PK — never auto-generated, it comes from the tenant context
            builder.HasKey(x => x.ClientId);
            builder.Property(x => x.ClientId).ValueGeneratedNever();

            builder.Property(x => x.WeekEndsWorking).IsRequired();
            builder.Property(x => x.ConsiderWeeklyHours).IsRequired().HasDefaultValue(true);

            builder.HasOne(x => x.Client)
                .WithOne()
                .HasForeignKey<ShiftClientConfig>(x => x.ClientId)
                .IsRequired();
        }
    }
}
