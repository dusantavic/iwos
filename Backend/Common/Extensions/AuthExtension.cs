using Iwos.Common.Configurations;
using Iwos.Common.Contracts;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Text;

namespace Iwos.Common.Extensions
{
    /// <summary>
    /// Authentication and authorization wiring for the application.
    ///
    /// Two logical identities share one JWT signing key but are discriminated by
    ///   1) audience (<c>aud</c> claim): manager audience vs. portal audience
    ///   2) a custom <c>portal_type</c> claim: "manager" or "employee"
    ///
    /// Authorization policies gate endpoints by <c>portal_type</c>. The default
    /// policy is <see cref="PortalAuth.ManagerPolicy"/>, so every unadorned
    /// [Authorize] automatically locks the endpoint to managers — an employee
    /// token cannot reach manager endpoints even if the bearer is forged or stolen.
    /// </summary>
    public static class AuthExtension
    {
        public static IServiceCollection AddJwtAuth(this IServiceCollection services)
        {
            var jwtConfiguration = ApplicationSettings.Instance?.JwtSettings;

            var validAudiences = new List<string>();
            if (!string.IsNullOrWhiteSpace(jwtConfiguration?.Audience))
            {
                validAudiences.Add(jwtConfiguration.Audience);
            }
            if (!string.IsNullOrWhiteSpace(jwtConfiguration?.PortalAudience))
            {
                validAudiences.Add(jwtConfiguration.PortalAudience);
            }
            if (!string.IsNullOrWhiteSpace(jwtConfiguration?.AdminAudience))
            {
                validAudiences.Add(jwtConfiguration.AdminAudience);
            }

            services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(jwtOptions =>
                {
                    jwtOptions.SaveToken = true;
                    jwtOptions.RequireHttpsMetadata = false;
                    jwtOptions.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidIssuer = jwtConfiguration?.Issuer,
                        ValidAudiences = validAudiences,
                        ClockSkew = TimeSpan.Zero,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfiguration?.JwtSecretKey ?? string.Empty))
                    };
                });

            return services;
        }

        public static IServiceCollection AddPortalAuthorization(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                var managerPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .RequireClaim(PortalAuth.PortalTypeClaim, PortalAuth.Manager)
                    .Build();

                var employeePortalPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .RequireClaim(PortalAuth.PortalTypeClaim, PortalAuth.Employee)
                    .Build();

                var adminPortalPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .RequireClaim(PortalAuth.PortalTypeClaim, PortalAuth.Admin)
                    .Build();

                options.AddPolicy(PortalAuth.ManagerPolicy, managerPolicy);
                options.AddPolicy(PortalAuth.EmployeePortalPolicy, employeePortalPolicy);
                options.AddPolicy(PortalAuth.AdminPortalPolicy, adminPortalPolicy);

                // Every [Authorize] without a named policy falls through to ManagerOnly.
                // This locks down the entire existing surface area without touching any
                // controller: an employee-portal token will be rejected by every
                // manager-side endpoint automatically.
                options.DefaultPolicy = managerPolicy;
            });

            return services;
        }
    }
}
