using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ToDoConfiguration : IEntityTypeConfiguration<ToDo>
    {
        public void Configure(EntityTypeBuilder<ToDo> builder)
        {
            builder.ToTable(nameof(ToDo), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Content).IsRequired(true).HasMaxLength(4000);
            builder.Property(x => x.Completed).IsRequired(); 
            builder.Property(x => x.CreatedDateTime).IsRequired(true).IsUtc();
            builder.Property(x => x.DueDateTime).IsUtc();
            builder.Property(x => x.LastModifiedAt).IsUtc();
            builder.Property(x => x.LastModifiedById);
            builder.Property(x => x.IsDeleted).IsRequired(true);
            builder.Property(x => x.DeletedAt).IsUtc();
            builder.Property(x => x.DeletedById); 

            builder.HasOne(t => t.Employee)
                .WithMany(e => e.ToDos)
                .HasForeignKey(t => t.EmployeeId)
                .IsRequired();

			builder.HasOne(n => n.CreatedByUser)
				.WithMany(u => u.ToDos)
				.HasForeignKey(n => n.CreatedById);

			builder.HasOne<ApplicationUser>()
				.WithMany()
				.HasForeignKey(n => n.LastModifiedById);

			builder.HasOne<ApplicationUser>()
				.WithMany()
				.HasForeignKey(n => n.DeletedById);
		}
    }
}
