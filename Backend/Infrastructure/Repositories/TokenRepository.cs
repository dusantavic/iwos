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
    public sealed class TokenRepository : GenericRepository<TokenInfo>, ITokenRepository
    {
        public TokenRepository(IwosDbContext context) : base(context)
        { }

        public async Task<TokenInfo?> GetToken(Expression<Func<TokenInfo, bool>> filter, CancellationToken token = default)
        {
            return await _dbSet
                .Where(filter)
                .FirstOrDefaultAsync(token);
        }
    }
}
