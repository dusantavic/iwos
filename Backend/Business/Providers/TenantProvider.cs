using Iwos.Common.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.Identity.Web;
using System;

namespace Iwos.Business.Providers
{
    public sealed class TenantProvider : ITenantProvider
    {
        private readonly Guid _tenantId = Guid.Empty;

        public TenantProvider(IHttpContextAccessor httpContextAccessor)
        {
            var httpContext = httpContextAccessor.HttpContext;
            if (httpContext != null && httpContext.User != null &&
                httpContext.User.Identity?.IsAuthenticated == true)
            {
                // Only for authorized users
                var tenantIdClaim = httpContext.User.FindFirst(ClaimConstants.TenantId)?.Value;
                if (!string.IsNullOrWhiteSpace(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var clientId))
                {
                    _tenantId = clientId;
                }
            }
        }

        public Guid GetTenantId()
        {
            return _tenantId;
        }
    }
}
