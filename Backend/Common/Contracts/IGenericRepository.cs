using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface IGenericRepository<T> : IDisposable where T : class
    {
        Task<T?> Get(Guid id, CancellationToken token = default);
        Task<T?> Get(Expression<Func<T, bool>>? filter, bool? includeTracking, CancellationToken token = default);
        Task<List<T>> GetList(Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, CancellationToken token = default, params Expression<Func<T, object>>[] includes);
        
        // Fully supports .Include().ThenInclude()
        Task<List<T>> GetList(Expression<Func<T, bool>>? filter = null, Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, Func<IQueryable<T>, IQueryable<T>>? include = null, CancellationToken token = default);
		Task<int> CountAsync(Expression<Func<T, bool>>? filter, CancellationToken token = default);
        Task<bool> Exist(Expression<Func<T, bool>> filter, CancellationToken token = default);

        Task<T> Add(T entity, CancellationToken token = default);
        Task AddRange(IEnumerable<T> entities, CancellationToken token = default);
        Task<T> Update(T entityToUpdate, CancellationToken token = default);
        Task<bool> Delete(Guid id, CancellationToken token = default);
    }
}
