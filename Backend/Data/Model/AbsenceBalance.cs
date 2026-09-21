using System;

namespace Iwos.Data.Model
{
	public class AbsenceBalance
	{
		public Guid Id { get; set;  }
		public int Year { get; set; }
		public int AnnualDays { get; set; }
		public int CarriedOverDays { get; set; }
		//public DateOnly CarriedOverExpiryDate { get; set; }
		public required Guid EmployeeId { get; set; }
		public DateTime? LastModifiedTimeStamp { get; set; }
		public Guid? LastModifiedBy { get; set; }
		public virtual Employee Employee { get; set; }
	}
}
