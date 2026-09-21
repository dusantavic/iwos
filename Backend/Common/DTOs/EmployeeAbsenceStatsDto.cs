namespace Iwos.Common.DTOs
{
	public class EmployeeAbsenceStatsDto
	{
		public required int RemainingVacationDays { get; set; }
		public required int RemainingVacationDaysPending { get; set; }
		public required int RemainingCarriedOverDays { get; set; }
		public required int RemainingCarriedOverDaysPending { get; set; }
		public required int PendingRequestsNumber { get; set; }
		public required int ApprovedRequestsNumber { get; set; }
		public required int AnnualTotalAllowance { get; set; }	
		public required int CarriedOverTotalAllowance { get; set; }
	}
}
