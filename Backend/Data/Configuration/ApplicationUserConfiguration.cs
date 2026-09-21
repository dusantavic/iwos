using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;
using Iwos.Common.Extensions;
using Iwos.Common.Configurations;

namespace Iwos.Data.Configuration
{
    public sealed class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
    {
        public void Configure(EntityTypeBuilder<ApplicationUser> builder)
        {
            builder.ToTable(nameof(ApplicationUser), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.FirstName).IsRequired(true).HasMaxLength(255);
            builder.Property(x => x.LastName).IsRequired(true).HasMaxLength(255);
            builder.Property(x => x.CreatedOn).IsRequired(true).IsUtc();
            builder.Property(x => x.ModifiedOn).IsUtc();
            builder.Property(x => x.LastLogin).IsUtc();
            builder.Property(x => x.Active).IsRequired(true);
            builder.Property(x => x.Type).IsRequired(true);
            builder.Property(x => x.ReceiveEmail).IsRequired(true);
            builder.Property(x => x.Email).IsRequired(true);

            builder.HasIndex(x => x.NormalizedUserName).IsUnique(true);
            builder.HasIndex(x => x.NormalizedEmail).IsUnique(true);

            // Relationship
            builder.HasOne(u => u.Client)
                .WithMany(c => c.ApplicationUsers)
                .HasForeignKey(u => u.ClientId)
                .IsRequired(true);

            // Each User can have many UserClaims
            builder.HasMany(u => u.Claims)
                .WithOne()
                .HasForeignKey(uc => uc.UserId)
                .IsRequired();

            builder.HasMany(u => u.Notes)
                .WithOne()
                .HasForeignKey(n => n.CreatedById);

			builder.HasMany(u => u.ToDos)
				.WithOne()
				.HasForeignKey(n => n.CreatedById);
		}
    }
}
