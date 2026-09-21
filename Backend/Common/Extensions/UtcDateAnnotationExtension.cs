using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.EntityFrameworkCore;
using System;

namespace Iwos.Common.Extensions
{
    /// <summary>
    /// Correctly set datetime kind of dates stored as UTC dates independently of server settings
    /// </summary>
    public static class UtcDateAnnotationExtension
    {
        private const string IsUtcAnnotation = "IsUtc";

        private static readonly ValueConverter<DateTime, DateTime> UtcDateTimeConverter =
            new(dt => dt, dt => DateTime.SpecifyKind(dt, DateTimeKind.Utc));

        public static PropertyBuilder<TProperty> IsUtc<TProperty>(this PropertyBuilder<TProperty> builder, bool isUtc = true) =>
            builder.HasAnnotation(IsUtcAnnotation, isUtc);

        public static bool IsUtc(this IMutableProperty property) =>
            (bool?)property.FindAnnotation(IsUtcAnnotation)?.Value ?? true;

        public static void ApplyUtcConverter(this ModelBuilder builder)
        {
            var types = builder.Model.GetEntityTypes();
            foreach (var type in types)
            {
                foreach (var property in type.GetProperties())
                {
                    if (!property.IsUtc())
                    {
                        continue;
                    }

                    if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(UtcDateTimeConverter);
                    }
                }
            }
        }
    }
}
