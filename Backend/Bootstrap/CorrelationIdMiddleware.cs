using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Serilog.Context;
using System.Threading.Tasks;
using System;
using System.Linq;

namespace Iwos.Bootstrap
{
    public sealed class CorrelationIdMiddleware
    {
        private readonly RequestDelegate _next;

        public CorrelationIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            context.Request.Headers.TryGetValue("X-Correlation-Id", out StringValues correlationIds);
            var correlationId = correlationIds.FirstOrDefault() ??
                Guid.CreateVersion7(TimeProvider.System.GetUtcNow()).ToString("D");

            using (LogContext.PushProperty("CorrelationId", correlationId))
            {
                await _next(context);
            }
        }
    }
}
