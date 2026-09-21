using System;

namespace Iwos.Common.DTOs
{
	public class AbsenceRemainingDto
	{
		public int RemainingCarriedOver { get; set; }
		public int RemainingAnnual { get; set; }
		public int TotalRemaining => RemainingCarriedOver + RemainingAnnual;
		public DateOnly ExpiryDate { get; set; }
	}
}
