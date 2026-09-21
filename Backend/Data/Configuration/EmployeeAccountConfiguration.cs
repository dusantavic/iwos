using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Iwos.Data.Configuration
{
    public sealed class EmployeeAccountConfiguration : IEntityTypeConfiguration<EmployeeAccount>
    {
        public void Configure(EntityTypeBuilder<EmployeeAccount> builder)
        {
            builder.ToTable(nameof(EmployeeAccount), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Username)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.PasswordHash)
                .IsRequired();

            builder.Property(x => x.Active).IsRequired();
            builder.Property(x => x.CreatedAt).IsRequired();

            // Enforce single portal account per employee
            builder.HasOne(x => x.Employee)
                .WithOne()
                .HasForeignKey<EmployeeAccount>(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            builder.HasOne(x => x.Client)
                .WithMany()
                .HasForeignKey(x => x.ClientId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            // Username is globally unique so the login endpoint can route to the right tenant
            // without prompting for a client code.
            builder.HasIndex(x => x.Username).IsUnique();
            builder.HasIndex(x => x.EmployeeId).IsUnique();
        }
    }
}
