using Iwos.Common.Contracts;
using Iwos.Data.Context;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Repositories
{
    public class GenericRepository<TEntity> : IGenericRepository<TEntity> where TEntity : class
    {
        protected readonly IwosDbContext _context;
        protected DbSet<TEntity> _dbSet;

        public GenericRepository(IwosDbContext context)
        {
            _context = context;
            _dbSet = context.Set<TEntity>();
        }

        public async Task<TEntity> Add(TEntity entity, CancellationToken token = default)
        {
            _dbSet.Add(entity);
            await _context.SaveChangesAsync(token);
            return entity;
        }

        public async Task AddRange(IEnumerable<TEntity> entities, CancellationToken token = default)
        {
            _dbSet.AddRange(entities);
            await _context.SaveChangesAsync(token);
        }

        public async Task<bool> Delete(Guid id, CancellationToken token = default)
        {
            var entityToDelete = await _dbSet.FindAsync(new[] { id }, token);
            if (entityToDelete == null)
            {
                return false;
            }

            _dbSet.Remove(entityToDelete);
            var changesCount = await _context.SaveChangesAsync(token);
            return changesCount > 0;
        }

        public async Task<TEntity> Update(TEntity entityToUpdate, CancellationToken token = default)
        {
            if (_context.Entry(entityToUpdate).State == EntityState.Detached)
            {
                _dbSet.Attach(entityToUpdate);
            }
            _context.Entry(entityToUpdate).State = EntityState.Modified;
            await _context.SaveChangesAsync(token);
            return entityToUpdate;
        }

        public async Task<int> CountAsync(Expression<Func<TEntity, bool>>? filter, CancellationToken token = default)
        {
            IQueryable<TEntity> query = _dbSet.AsNoTracking();

            if (filter != null)
            {
                query = query.Where(filter);
            }

            return await query.CountAsync(token);
        }

        public async Task<TEntity?> Get(Guid id, CancellationToken token = default)
        {
            return await _dbSet.FindAsync(id, token);
        }

        public async Task<TEntity?> Get(Expression<Func<TEntity, bool>>? filter, bool? includeTracking, CancellationToken token = default)
        {
            IQueryable<TEntity> query = _dbSet;

            if (includeTracking.HasValue && includeTracking == true)
            {
                query = query.AsNoTracking();
            }

            if (filter != null)
            {
                query = query.Where(filter);
            }

            return await query.FirstOrDefaultAsync(token);
        }

        public async Task<List<TEntity>> GetList(Expression<Func<TEntity, bool>>? filter = null, Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>>? orderBy = null,
            CancellationToken token = default, params Expression<Func<TEntity, object>>[] includes)
        {
            IQueryable<TEntity> query = _dbSet.AsNoTracking();

            foreach (var include in includes)
            {
                query = query.Include(include);
            }

            if (filter != null)
            {
                query = query.Where(filter);
            }

            if (orderBy != null)
            {
                return await orderBy(query)
                    .ToListAsync(token);
            }

            return await query
                .ToListAsync(token);
        }

		// Fully supports .Include().ThenInclude()
		public async Task<List<TEntity>> GetList(Expression<Func<TEntity, bool>>? filter = null, Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>>? orderBy = null,
	            Func<IQueryable<TEntity>, IQueryable<TEntity>>? include = null, CancellationToken token = default)
		{
			IQueryable<TEntity> query = _context.Set<TEntity>();

			if (filter != null)
            {
				query = query.Where(filter);
			}
				

			if (include != null)
            {
				query = include(query);
			}

			if (orderBy != null)
            {
				return await orderBy(query)
	                .ToListAsync(token);
			}

			return await query
                .ToListAsync(token);
		}

		public async Task<bool> Exist(Expression<Func<TEntity, bool>> filter, CancellationToken token = default)
        {
            return await _dbSet.AsNoTracking()
                .AnyAsync(filter, token);
        }

        public void Dispose()
        {
            _context?.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
