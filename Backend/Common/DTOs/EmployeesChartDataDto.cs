using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class EmployeesChartDataDto
	{
		public required List<string> Categories { get; set; }
		public required List<int> SeriesData { get; set; }
		public required int Total { get; set; }
		public decimal? MonthlyChangePercent { get; set; }
	}
}
