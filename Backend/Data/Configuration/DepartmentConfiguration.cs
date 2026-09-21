using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
	public sealed class DepartmentConfiguration : IEntityTypeConfiguration<Department>
	{
		public void Configure(EntityTypeBuilder<Department> builder)
		{
			builder.ToTable(nameof(Department), GlobalConfiguration.SchemaName);

			builder.HasKey(x => x.Id);

			builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
			builder.Property(x => x.Name).IsRequired(true).HasMaxLength(255);
			builder.Property(x => x.Description).HasMaxLength(1000);
			builder.Property(x => x.CurrentHeadAssignmentDate).IsUtc();

			builder.HasOne(d => d.Client)
				.WithMany(c => c.Departments)
				.HasForeignKey(c => c.ClientId)
				.IsRequired();

			builder.HasOne(d => d.Head)
				.WithMany(e => e.HeadedDepartments)
				.HasForeignKey(d => d.HeadId);
		}
	}
}
