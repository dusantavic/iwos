using System;

namespace Iwos.Common.DTOs
{
	public class AbsenceDensityDto
	{
		public DateOnly Date { get; set; }
		public double Density { get; set; }
		public int TotalAbsent { get; set; }
		public string Level { get; set; }
	}
}
