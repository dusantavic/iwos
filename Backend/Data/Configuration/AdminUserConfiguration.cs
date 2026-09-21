using System;
using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Iwos.Data.Configuration
{
    public sealed class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
    {
        // Stable seed id for the bootstrap admin account.
        public static readonly Guid SeedAdminId = new("99999999-9999-9999-9999-999999999999");

        public void Configure(EntityTypeBuilder<AdminUser> builder)
        {
            builder.ToTable(nameof(AdminUser), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Username).IsRequired().HasMaxLength(200);
            builder.Property(x => x.PasswordHash).IsRequired();
            builder.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            builder.Property(x => x.LastName).IsRequired().HasMaxLength(100);
            builder.Property(x => x.Active).IsRequired();
            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.Username).IsUnique();

            // Seeded bootstrap account, meant to be used once and have its password
            // changed immediately. Hash below is the IdentityV3/PasswordHasher<T>
            // (default 10000-iteration PBKDF2) hash of "ChangeMe123!", generated the
            // same way Iwos.Business.Providers.PasswordProvider.GetPasswordHash does
            // (PasswordHasher<T> with no injected options, so default IterationCount).
            // Change this password immediately after first login.
            builder.HasData(new AdminUser
            {
                Id = SeedAdminId,
                Username = "admin",
                PasswordHash = "AQAAAAIAAYagAAAAEGxVr5jOv5R4JthBJlsF/5CuHHsuO9gLLMIvDVMulGyLacija5DVJC7Q76s6evLXJg==",
                FirstName = "Iwos",
                LastName = "Admin",
                Active = true,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            });
        }
    }
}
