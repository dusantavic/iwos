using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ClientSubscriptionPlanHistoryConfiguration : IEntityTypeConfiguration<ClientSubscriptionPlanHistory>
    {
        public void Configure(EntityTypeBuilder<ClientSubscriptionPlanHistory> builder)
        {
            builder.ToTable(nameof(ClientSubscriptionPlanHistory), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.StartDate).IsRequired();
            builder.Property(x => x.EndDate).IsRequired(false);
            builder.Property(x => x.Notes).HasMaxLength(1000);
            builder.Property(x => x.CreatedAt).IsRequired();
            builder.Property(x => x.CreatedById).IsRequired(false);

            builder.HasOne(x => x.Client)
                .WithMany(c => c.SubscriptionHistory)
                .HasForeignKey(x => x.ClientId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.SubscriptionPlanType)
                .WithMany(p => p.Histories)
                .HasForeignKey(x => x.SubscriptionPlanTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => new { x.ClientId, x.StartDate });
            builder.HasIndex(x => new { x.ClientId, x.EndDate });
        }
    }
}
