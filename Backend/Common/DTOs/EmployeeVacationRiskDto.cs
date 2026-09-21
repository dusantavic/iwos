using System;

namespace Iwos.Common.DTOs
{
	public class EmployeeVacationRiskDto
	{
		public required Guid EmployeeId { get; set; }
		public required string EmployeeFullName { get; set; }
		public string? EmployeeProfilePic { get; set; }
		public required int RemainingDays { get; set; }
		public required double RiskPercentage { get; set; }
	}
}
