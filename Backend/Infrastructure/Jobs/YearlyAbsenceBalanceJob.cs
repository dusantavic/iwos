using Castle.Core.Logging;
using Iwos.Common.Contracts;
using Quartz;
using System;
using System.Threading.Tasks;

namespace Iwos.Infrastructure.Jobs
{
	public class YearlyAbsenceBalanceJob : IJob
	{
	
		private readonly IAbsenceService _absenceService;

		public YearlyAbsenceBalanceJob(IAbsenceService absenceService)
		{
			_absenceService = absenceService;
		}

		public async Task Execute(IJobExecutionContext context)
		{
			await _absenceService.ProvisionNewYearBalances(DateTime.UtcNow.Year);
		}

	}
}
