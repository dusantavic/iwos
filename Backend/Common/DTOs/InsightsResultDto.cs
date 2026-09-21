using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
	public class InsightsResultDto
	{
		public List<InsightsResultObjectDto> Insights { get; set; }
	}

	public class InsightsResultObjectDto
	{
		public string Type { get; set; }      // warning | info | tip
		public string ShortTitle { get; set; }
		public string Text { get; set; }
		public string Priority { get; set; }  // high | medium | low
	}
}
