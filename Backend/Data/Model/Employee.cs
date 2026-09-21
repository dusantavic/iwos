using Iwos.Common.Contracts;
using Iwos.Common.Contracts.Enums;
using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    public class Employee : IActiveEntity
    {
        public Guid Id { get; set; }
        public string? ContactEmail { get; set; }
        public bool Active { get; set; } = false;
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public string? PersonalId { get; set; }
        public ContractType? ContractType { get; set; }
        public string? Country { get; set; }
        public DateOnly? BirthDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public Guid ClientId { get; set; }
        public Guid PositionId { get; set; }

        /// <summary>Contracted weekly working hours. Default is 40 (full-time). Used for shift hour allocation tracking.</summary>
        public int WeeklyHours { get; set; } = 40;

        /// <summary>Contracted working days per week (1–7). Drives absence charging when the schedule has not been generated yet on a 7-day operation. Default 5.</summary>
        public int WeeklyDays { get; set; } = 5;

        /// <summary>Optional rotation template (e.g. "6/2"). Null = no rotation enforced.</summary>
        public Guid? RotationPatternId { get; set; }

        /// <summary>If set, employee is dedicated to this shift only. Null = rotates across all shifts.</summary>
        public Guid? PinnedShiftId { get; set; }

        /// <summary>
        /// Persisted rotation anchor: the calendar date of working-day 0 of this employee's
        /// current rotation on-block. Null = auto-compute from epoch.
        /// </summary>
        public DateOnly? RotationAnchorDate { get; set; }

        public virtual Client? Client { get; set; }
        public virtual Position? Position { get; set; }
        public virtual ICollection<Note>? Notes { get; set; }
        public virtual ICollection<ToDo>? ToDos { get; set; }
        public virtual ICollection<Absence>? Absences { get; set; }
        public virtual ICollection<File>? Files { get; set; }
        public virtual ICollection<Department>? HeadedDepartments { get; set; }
        public virtual ICollection<AbsenceBalance>? AbsenceBalances { get; set; }
        public virtual ShiftRotationPattern? RotationPattern { get; set; }
        public virtual Shift? PinnedShift { get; set; }
    }
}
