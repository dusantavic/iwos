using System;
using System.Collections.Generic;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Named rotation template (e.g. "6/2", "4/2", "5/2"). Scoped per client (tenant).
    /// Employees opt-in by setting RotationPatternId 
    /// </summary>
    public class ShiftRotationPattern
    {
        public Guid Id { get; set; }
        public Guid ClientId { get; set; }

        /// <summary>Human-readable name, e.g. "6/2".</summary>
        public required string Name { get; set; }

        /// <summary>Consecutive working days in one cycle.</summary>
        public int DaysOn { get; set; }

        /// <summary>Consecutive off days in one cycle.</summary>
        public int DaysOff { get; set; }

        /// <summary>When true, this pattern is automatically assigned to every new employee at creation time.</summary>
        public bool IsGlobal { get; set; } = false;

        public virtual required Client Client { get; set; }
        public virtual ICollection<Employee>? Employees { get; set; }
    }
}
