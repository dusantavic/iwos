using Iwos.Common.Contracts;
using Iwos.Data.Context;
using Iwos.Data.Model;

namespace Iwos.Infrastructure.Repositories
{
    public sealed class EmployeeAccountRepository : GenericRepository<EmployeeAccount>, IEmployeeAccountRepository
    {
        public EmployeeAccountRepository(IwosDbContext context) : base(context)
        { }
    }
}
