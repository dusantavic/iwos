using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;
using System;

namespace Iwos.Data.Configuration
{
	public sealed class AbsenceBalanceConfiguration : IEntityTypeConfiguration<AbsenceBalance>
	{
		public void Configure(EntityTypeBuilder<AbsenceBalance> builder)
		{
			builder.ToTable(nameof(AbsenceBalance), GlobalConfiguration.SchemaName);

			builder.HasKey(x => x.Id);

			builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
			builder.Property(x => x.Year).IsRequired(true);
			builder.Property(x => x.AnnualDays).IsRequired(true).HasDefaultValue(20); 
			builder.Property(x => x.CarriedOverDays).IsRequired(true).HasDefaultValue(0);
			builder.Property(x => x.LastModifiedTimeStamp).IsUtc().IsRequired(false);
			builder.Property(x => x.LastModifiedBy).IsRequired(false);

			builder.HasOne(a => a.Employee)
				.WithMany(e => e.AbsenceBalances)
				.HasForeignKey(a => a.EmployeeId)
				.IsRequired();
		}
	}
}