using Asp.Versioning;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using System.Threading.Tasks;

namespace Iwos.Common.Extensions
{
    public static class ApiVersioningExtension
    {
        /// <summary>
        /// Header API versioning, which doesn't break Rest
        /// </summary>
        public static IServiceCollection AddApiVersions(this IServiceCollection services)
        {
            services.AddApiVersioning(options =>
            {
                options.DefaultApiVersion = new ApiVersion(1);
                options.AssumeDefaultVersionWhenUnspecified = true;
                options.ReportApiVersions = true;
                options.ApiVersionReader = new HeaderApiVersionReader("X-Api-Version");
            })
            .AddApiExplorer(options =>
            {
                options.GroupNameFormat = "'v'VVV";
                options.SubstituteApiVersionInUrl = true;
            });

            services.AddOpenApi(options =>
            {
                options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1;

                options.AddDocumentTransformer((document, _, _) =>
                {
                    document.Info = new OpenApiInfo
                    {
                        Title = "Iwos API",
                        Version = "v1",
                        Description = "Iwos REST API"
                    };

                    return Task.CompletedTask;
                });

                // Uncomment for auth
                //options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
            });

            return services;
        }
    }
}
