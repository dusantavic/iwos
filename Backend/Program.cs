using Autofac;
using Autofac.Extensions.DependencyInjection;
using HealthChecks.UI.Client;
using Iwos.Bootstrap;
using Iwos.Common.Configurations;
using Iwos.Common.Extensions;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Iwos.Infrastructure;
using Iwos.Infrastructure.Jobs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Net.Http.Headers;
using Quartz;
using Scalar.AspNetCore;
using Serilog;
using System;
using System.Threading.Tasks;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace Iwos
{
    public static class Program
    {
        public async static Task Main(string[] args)
        {
            const string defPolicy = "defPolicy";

            var builder = WebApplication.CreateBuilder(args);
            var services = builder.Services;
            var configuration = builder.Configuration;

            var appConfig = AppConfiguration.Build(configuration);
            var connectionString = appConfig.DatabaseConnectionString;

            // ASP.NET Core honors ASPNETCORE_FORWARDEDHEADERS_ENABLED=true automatically when
            // present in the environment. We additionally relax KnownNetworks/Proxies so the
            // forwarded values from in-cluster proxies (Caddy/Traefik/nginx) are accepted —
            // otherwise headers from non-loopback peers are silently dropped.
            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
                options.KnownIPNetworks.Clear();
                options.KnownProxies.Clear();
            });

            services.AddCors(options =>
            {
                options.AddPolicy(defPolicy, policy =>
                {
                    policy
                        .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                        .WithHeaders(HeaderNames.Accept, HeaderNames.ContentType, HeaderNames.Authorization)
                        .SetIsOriginAllowed(origin =>
                        {
                            if (string.IsNullOrWhiteSpace(origin))
                            {
                                return false;
                            }

                            if (builder.Environment.IsDevelopment())
                            {
                                // Allow testing with locals
                                return true;
                            }

                            // Production allow-list. Apex + www both permitted; the edge
                            // (Caddy/Traefik/nginx) is responsible for canonicalising one to
                            // the other if the product wants a single hostname.
                            if (origin.StartsWith("https://www.iwos.app", StringComparison.OrdinalIgnoreCase) ||
                                origin.StartsWith("https://iwos.app", StringComparison.OrdinalIgnoreCase))
                            {
                                return true;
                            }
                            return false;
                        });
                });
            });

            services.AddControllers();

            services.AddAutoMapper(x => x.AddProfile(new GeneralMapperProfile()));

            services.AddApiVersions();

            services.Configure<JsonOptions>(options =>
            {
                options.SerializerOptions.PropertyNameCaseInsensitive = true;
                options.SerializerOptions.AllowTrailingCommas = true;
                options.SerializerOptions.MaxDepth = 16;
            });

            configuration.AddEnvironmentVariables();
            builder.Host.UseServiceProviderFactory(new AutofacServiceProviderFactory());
            builder.Host.ConfigureContainer<ContainerBuilder>(cb =>
            {
                cb.RegisterModule(new AutofacModule());
            });

            builder.Logging.AddSerilogLogger(connectionString);
            builder.Host.UseSerilog(Log.Logger);

            services.AddHrServiceDbContext(AppConfiguration.Instance, builder.Environment.IsDevelopment());

            services.AddHealthChecks()
                .AddNpgSql(connectionString);

            services.RegisterServices();
            services.ConfigureServices(configuration);

            services.Configure<PasswordHasherOptions>(option =>
            {
                option.CompatibilityMode = PasswordHasherCompatibilityMode.IdentityV3;
                option.IterationCount = 30000;
            });

            services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.MaxFailedAccessAttempts = 10;
                options.Lockout.AllowedForNewUsers = true;

                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequireUppercase = true;
                options.Password.RequiredLength = 8;
                options.Password.RequiredUniqueChars = 5;

                options.SignIn.RequireConfirmedEmail = true;
                options.SignIn.RequireConfirmedAccount = true;

                options.User.RequireUniqueEmail = true;
                options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@";
            })
                .AddEntityFrameworkStores<IwosDbContext>()
                .AddDefaultTokenProviders();

            services.AddJwtAuth();
            services.AddPortalAuthorization();

            // Quartz

            builder.Services.AddQuartz(q =>
            {
                var jobKey = new JobKey("YearlyAbsenceBalanceJob");

                q.AddJob<YearlyAbsenceBalanceJob>(opts => opts.WithIdentity(jobKey));

                q.AddTrigger(opts => opts
                    .ForJob(jobKey)
                    .WithIdentity("YearlyAbsenceBalanceJob-trigger")
                    .WithCronSchedule("0 0 0 1 1 ? *") // Run at midnight on January 1st every year
                );

                var logRetentionKey = new JobKey("LogRetentionJob");
                q.AddJob<LogRetentionJob>(opts => opts.WithIdentity(logRetentionKey));
                q.AddTrigger(opts => opts
                    .ForJob(logRetentionKey)
                    .WithIdentity("LogRetentionJob-trigger")
                    .WithCronSchedule("0 30 2 * * ? *") // Daily at 02:30 — off-peak
                );
            });

            services.AddQuartzHostedService(opts =>
            {
                opts.WaitForJobsToComplete = true;
            });

            if (builder.Environment.IsDevelopment())
            {
                services.AddDatabaseDeveloperPageExceptionFilter();
            }

            builder.WebHost.UseKestrel(options =>
            {
                options.AddServerHeader = false;
                options.Limits.MaxRequestBodySize = configuration.GetValue<long>("FileSizeLimit");
            });

            var app = builder.Build();

            app.EnsureMigrationsApplied();

            // Configure the HTTP request pipeline
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.MapScalarApiReference(o => o
                    .WithTheme(ScalarTheme.Mars)
                    .HideSidebar()
                );
            }
            else
            {
                app.UseHsts();
            }

            // ForwardedHeaders must run before any middleware that inspects scheme/host
            // (HTTPS redirect, CORS origin checks, request logging) so each sees the
            // client-side values surfaced by the TLS-terminating proxy.
            app.UseForwardedHeaders();

            app.UseStaticFiles();

            app.UseSerilogRequestLogging();

            app.UseHttpsRedirection();

            app.UseRouting();
            app.UseRateLimiter();
            app.UseCors(defPolicy);

            app.UseMiddleware<CorrelationIdMiddleware>();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapHealthChecks("/healthz", new HealthCheckOptions
            {
                AllowCachingResponses = false,
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
                ResultStatusCodes =
                {
                    [HealthStatus.Healthy] = StatusCodes.Status200OK,
                    [HealthStatus.Degraded] = StatusCodes.Status302Found,
                    [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable
                }
            });

            app.MapControllers();

            await app.RunAsync();
        }
    }
}
