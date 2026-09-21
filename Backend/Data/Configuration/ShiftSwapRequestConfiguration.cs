using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.ValueGeneration;

namespace Iwos.Data.Configuration
{
    public sealed class ShiftSwapRequestConfiguration : IEntityTypeConfiguration<ShiftSwapRequest>
    {
        public void Configure(EntityTypeBuilder<ShiftSwapRequest> builder)
        {
            builder.ToTable(nameof(ShiftSwapRequest), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasValueGenerator<NpgsqlSequentialGuidValueGenerator>();

            builder.Property(x => x.RequesterId).IsRequired();
            builder.Property(x => x.TargetEmployeeId).IsRequired();
            builder.Property(x => x.RequestedShiftId).IsRequired();
            builder.Property(x => x.RequestedDate).IsRequired();
            builder.Property(x => x.OfferedShiftId).IsRequired();
            builder.Property(x => x.OfferedDate).IsRequired();
            builder.Property(x => x.Status).IsRequired();
            builder.Property(x => x.CreatedAt).IsRequired().IsUtc();
            builder.Property(x => x.RespondedAt).IsRequired(false).IsUtc();

            builder.HasOne(x => x.Requester)
                .WithMany()
                .HasForeignKey(x => x.RequesterId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne(x => x.TargetEmployee)
                .WithMany()
                .HasForeignKey(x => x.TargetEmployeeId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne(x => x.RequestedShift)
                .WithMany()
                .HasForeignKey(x => x.RequestedShiftId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne(x => x.OfferedShift)
                .WithMany()
                .HasForeignKey(x => x.OfferedShiftId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();
        }
    }
}
