namespace Iwos.Common.DTOs
{
	public class AbsencesStatsDto
	{
		public int ActiveVacationsToday { get; set; }
		public int ActiveSickLeavesToday { get; set; }
		public decimal TodaysAvailability { get; set; }
		public int BirthdaysThisMonth { get; set; }
	}
}
