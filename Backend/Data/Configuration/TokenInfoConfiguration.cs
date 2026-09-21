using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class TokenInfoConfiguration : IEntityTypeConfiguration<TokenInfo>
    {
        public void Configure(EntityTypeBuilder<TokenInfo> builder)
        {
            builder.ToTable(nameof(TokenInfo), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();
            builder.Property(x => x.Username).HasMaxLength(255).IsRequired();
            builder.Property(x => x.RefreshToken).HasMaxLength(200).IsRequired();
            builder.Property(x => x.ExpiredAt).IsRequired().IsUtc();
            builder.Property(x => x.Revoked).IsRequired().HasDefaultValue(false);
        }
    }
}
