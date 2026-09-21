using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NpgsqlTypes;
using Serilog;
using System.Collections.Generic;
using System;
using Microsoft.Extensions.Configuration;
using Medallion.Threading;
using Medallion.Threading.Postgres;
using Serilog.Sinks.PostgreSQL;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Iwos.Common.Configurations;
using Serilog.Sinks.PostgreSQL.ColumnWriters;

namespace Iwos.Bootstrap
{
    public static class DependencyInjectionSetup
    {
        /// <summary>
        /// Register third party API, cognito, ...
        /// </summary>
        public static IServiceCollection RegisterServices(this IServiceCollection services)
        {
            return services;
        }

        /// <summary>
        /// Register service configuration
        /// </summary>
        public static IServiceCollection ConfigureServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Register services
            services.AddHttpContextAccessor();
            services.AddMemoryCache();

            var appConfig = AppConfiguration.Build(configuration);
            services.AddSingleton(appConfig);
            services.AddSingleton(appConfig.Application);
            services.AddSingleton(appConfig.Files);
            services.AddSingleton(appConfig.EmailNotification);

            var connectionString = appConfig.DatabaseConnectionString;
            services.AddSingleton<IDistributedLockProvider>(_ => new PostgresDistributedSynchronizationProvider(connectionString));

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddFixedWindowLimiter("fixed", opt =>
                {
                    opt.PermitLimit = 10;
                    opt.Window = TimeSpan.FromSeconds(10);
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 5;
                });

                options.AddConcurrencyLimiter("concurrency", opt =>
                {
                    opt.PermitLimit = 10;
                    opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    opt.QueueLimit = 5;
                });

                // Stricter per-IP limiter for unauthenticated and credential-handling endpoints
                // (login, refresh, password change, registration). Slows down credential-stuffing
                // and brute-force attempts without impacting normal interactive usage.
                options.AddPolicy("auth", httpContext =>
                {
                    var partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
                });
            });

            return services;
        }

        /// <summary>
        /// Serilog configuration
        /// </summary>
        public static ILoggingBuilder AddSerilogLogger(this ILoggingBuilder builder, string connectionString)
        {
            IDictionary<string, ColumnWriterBase> columnWriters = new Dictionary<string, ColumnWriterBase>
            {
                { "correlation_id", new SinglePropertyColumnWriter("CorrelationId", PropertyWriteMethod.ToString, NpgsqlDbType.Text, "l") },
                { "level", new LevelColumnWriter(true, NpgsqlDbType.Varchar) },
                { "message", new RenderedMessageColumnWriter(NpgsqlDbType.Text) },
                { "message_template", new MessageTemplateColumnWriter(NpgsqlDbType.Text) },
                { "raise_date", new TimestampColumnWriter(NpgsqlDbType.TimestampTz) },
                { "exception", new ExceptionColumnWriter(NpgsqlDbType.Text) },
                { "properties", new PropertiesColumnWriter(NpgsqlDbType.Jsonb) }
            };
            // Console sink first so stdout still captures logs when the DB is unreachable
            // (boot-up, DNS failures, network blips). Container orchestrators stream stdout
            // straight into their log aggregator, which makes this the most reliable channel.
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
                .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
                .WriteTo.PostgreSQL(connectionString, "Log", columnWriters, Serilog.Events.LogEventLevel.Information,
                    schemaName: GlobalConfiguration.SchemaName, needAutoCreateTable: true)
                .Enrich.FromLogContext()
                .CreateLogger();

            return builder;
        }
    }
}
