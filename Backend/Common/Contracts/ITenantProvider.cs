using System;

namespace Iwos.Common.Contracts
{
    public interface ITenantProvider
    {
        Guid GetTenantId();
    }
}
