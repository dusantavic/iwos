using Iwos.Data.Model;
using System;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IUserRepository : IGenericRepository<ApplicationUser>
    {
        Task<bool> IsActive(Expression<Func<ApplicationUser, bool>> filter, CancellationToken token = default);
        Task<bool> SoftDelete(Guid id, CancellationToken token = default);
    }
}
