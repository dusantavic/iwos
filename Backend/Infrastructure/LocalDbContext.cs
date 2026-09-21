using Iwos.Common.Configurations;
using Iwos.Data.Context;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;

namespace Iwos.Infrastructure
{
    public static class LocalDbContext
    {
        public static void AddHrServiceDbContext(this IServiceCollection services, AppConfiguration appConfig, bool isDevelopment)
        {
            var connectionString = appConfig.DatabaseConnectionString;

            services.AddDbContext<IwosDbContext>(options =>
            {
                options
                    .UseLazyLoadingProxies(false)
                    .UseNpgsql(connectionString, builder =>
                    {
                        builder.MigrationsHistoryTable(HistoryRepository.DefaultTableName, GlobalConfiguration.SchemaName);
                        builder.MigrationsAssembly(typeof(LocalDbContext).Assembly.GetName().Name);
                    });
                if (isDevelopment)
                {
                    options.LogTo(Console.WriteLine, LogLevel.Information);
                    options.EnableSensitiveDataLogging();
                    options.EnableDetailedErrors();
                }
            }, ServiceLifetime.Scoped, ServiceLifetime.Scoped);

            // For specific use cases (parallel processing, background tasks, long-running tasks, ...)
            services.AddDbContextFactory<IwosDbContext>(options =>
            {
                options
                    .UseLazyLoadingProxies(false)
                    .UseNpgsql(connectionString);
                if (isDevelopment)
                {
                    options.LogTo(Console.WriteLine, LogLevel.Information);
                    options.EnableSensitiveDataLogging();
                    options.EnableDetailedErrors();
                }
            }, ServiceLifetime.Scoped);
        }

        public static void EnsureMigrationsApplied(this IApplicationBuilder application)
        {
            using var serviceScope = application.ApplicationServices
                .GetRequiredService<IServiceScopeFactory>()
                .CreateScope();

            using (var context = serviceScope.ServiceProvider.GetService<IwosDbContext>())
            {
                if (context == null)
                {
                    return;
                }

                var applied = context.GetService<IHistoryRepository>().GetAppliedMigrations().Select(m => m.MigrationId);

                var total = context.GetService<IMigrationsAssembly>().Migrations.Select(m => m.Key);

                if (total.Except(applied).Any())
                {
                    context.Database.Migrate();
                }
            }
        }
    }
}
