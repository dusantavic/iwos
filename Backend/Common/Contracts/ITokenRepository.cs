using Iwos.Data.Model;
using System;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace Iwos.Common.Contracts
{
    public interface ITokenRepository : IGenericRepository<TokenInfo>
    {
        Task<TokenInfo?> GetToken(Expression<Func<TokenInfo, bool>> filter, CancellationToken token = default);
    }
}
