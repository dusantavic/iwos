using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ClientConfiguration : IEntityTypeConfiguration<Client>
    {
        public void Configure(EntityTypeBuilder<Client> builder)
        {
            builder.ToTable(nameof(Client), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Name).IsRequired(true).HasMaxLength(100);
            builder.Property(x => x.ContactEmail).IsRequired(true).HasMaxLength(255);
            builder.Property(x => x.Active).IsRequired(true);
            builder.Property(x => x.Status).IsRequired(true);
            builder.Property(x => x.Plan).IsRequired(true);
            builder.Property(x => x.Billing).IsRequired(true);
            builder.Property(x => x.ContactPerson).HasMaxLength(100);
            builder.Property(x => x.ContactPhone).HasMaxLength(50);
            builder.Property(x => x.LastActivity).IsRequired(false).IsUtc();
            builder.Property(x => x.Country).IsRequired(true).HasMaxLength(100);
            builder.Property(x => x.Address).HasMaxLength(1000);
            builder.Property(x => x.LogoId);
            builder.Property(x => x.IdentificationNumber).HasMaxLength(50);
            builder.Property(x => x.Code).HasMaxLength(10);
            builder.Property(x => x.BankAccountNumber).HasMaxLength(50);
            builder.Property(x => x.BankWith).HasMaxLength(100);

            builder.HasOne(c => c.Logo)
                .WithMany(f => f.Clients)
                .HasForeignKey(c => c.LogoId)
                .IsRequired(false);

            // Denormalized pointer to the active subscription period.
            // Kept as a NoAction relationship to avoid cascade cycles —
            // the subscription rows live in SubscriptionHistory and are
            // managed by SubscriptionService.
            builder.HasOne(c => c.CurrentSubscription)
                .WithMany()
                .HasForeignKey(c => c.CurrentSubscriptionId)
                .OnDelete(DeleteBehavior.NoAction)
                .IsRequired(false);
        }
    }
}
