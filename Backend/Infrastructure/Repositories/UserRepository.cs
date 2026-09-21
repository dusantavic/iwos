using Iwos.Common.Contracts;
using Iwos.Data.Context;
using Iwos.Data.Model;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Repositories
{
    public sealed class UserRepository : GenericRepository<ApplicationUser>, IUserRepository
    {
        public UserRepository(IwosDbContext context) : base(context)
        { }

        public async Task<bool> IsActive(Expression<Func<ApplicationUser, bool>> filter, CancellationToken token = default)
        {
            return await _dbSet.AsNoTracking()
                .Where(filter)
                .Select(u => u.Active)
                .FirstOrDefaultAsync(token);
        }

        public async Task<bool> SoftDelete(Guid id, CancellationToken token = default)
        {
            var employeeToDelete = await _dbSet.FindAsync(new[] { id }, token);
            if (employeeToDelete == null)
            {
                return false;
            }

            employeeToDelete.Active = false;
            var changedItems = await _context.SaveChangesAsync(token);
            return changedItems > 0;
        }
    }
}
