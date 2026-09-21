using System;
using Iwos.Common.Configurations;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Iwos.Data.Configuration
{
    public sealed class SubscriptionPlanTypeConfiguration : IEntityTypeConfiguration<SubscriptionPlanType>
    {
        // Stable seed IDs so application code can reference plan types by Guid in tests/scripts.
        public static readonly Guid ActiveId = new("11111111-1111-1111-1111-111111111111");
        public static readonly Guid TrialId = new("22222222-2222-2222-2222-222222222222");

        public void Configure(EntityTypeBuilder<SubscriptionPlanType> builder)
        {
            builder.ToTable(nameof(SubscriptionPlanType), GlobalConfiguration.SchemaName);

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Code).IsRequired().HasMaxLength(50);
            builder.Property(x => x.Name).IsRequired().HasMaxLength(100);
            builder.Property(x => x.Description).HasMaxLength(500);
            builder.Property(x => x.IsActive).IsRequired();
            builder.Property(x => x.DurationMonths).IsRequired(false);
            builder.Property(x => x.PlanningWindowMonths).IsRequired(false);

            builder.HasIndex(x => x.Code).IsUnique();

            builder.HasData(
                new SubscriptionPlanType
                {
                    Id = ActiveId,
                    Code = "ACTIVE",
                    Name = "Active",
                    Description = "Paid subscription with unrestricted scheduling and no fixed expiry.",
                    IsActive = true,
                    DurationMonths = null,        // open-ended
                    PlanningWindowMonths = null,  // unrestricted
                },
                new SubscriptionPlanType
                {
                    Id = TrialId,
                    Code = "TRIAL",
                    Name = "Trial",
                    Description = "Free trial; subscription lasts 1 month, scheduling reach is 2 months from the trial start date.",
                    IsActive = true,
                    DurationMonths = 1,
                    PlanningWindowMonths = 2,
                });
        }
    }
}
