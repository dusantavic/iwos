using Iwos.Common.Contracts.Enums;
using System;

namespace Iwos.Data.Model
{
    public class Absence
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public required AbsenceType Type { get; set; }
        public required AbsenceStatus Status { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public DateTime RequestedDateTime { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedDateTime { get; set; }
        public DateTime? RejectedDateTime { get; set; }

		public Guid? RequestGroupId { get; set; }
        public int Year { get; set; }

        /// <summary>
        /// Charged working days against the employee's balance. Excludes pseudo-weekends
        /// (rotation off-days), calendar weekends when not working, and holidays.
        /// </summary>
        public int WorkingDays { get; set; }

        /// <summary>Charged working hours — the authoritative "hours on absence" figure.</summary>
        public decimal WorkingHours { get; set; }

        /// <summary>
        /// True when the planning service could not determine off-days deterministically
        /// (no rotation pattern + 7-day operation) at request time. UI surfaces this clearly.
        /// </summary>
        public bool IsHoursEstimated { get; set; }

        /// <summary>Off-days inside the range that did NOT count as charged days.</summary>
        public int PseudoWeekendDaysCount { get; set; }

        /// <summary>For ambiguous regime: lower bound of charged days at request time.</summary>
        public int? MinChargedWorkingDays { get; set; }

        /// <summary>For ambiguous regime: upper bound of charged days at request time.</summary>
        public int? MaxChargedWorkingDays { get; set; }

        public int UsedFromCarriedOver { get; set; }
        public int UsedFromAnnual { get; set; }
        public Guid? ApprovedById { get; set; }
        public Guid? RejectedById { get; set; }
        public DateTime? LastModifiedTimeStamp { get; set; }
        public Guid? LastModifiedBy { get; set; }
		public virtual required Employee Employee { get; set; }
    }
}
