using System;

namespace Iwos.Data.Model
{
    /// <summary>
    /// Per-tenant shift settings (one row per client).
    /// ClientId serves as both PK and FK to Client.
    /// </summary>
    public class ShiftClientConfig
    {
        public Guid ClientId { get; set; }
        public bool WeekEndsWorking { get; set; } = false;
        /// <summary>When true, the scheduler enforces each employee's weekly hour cap. Default on.</summary>
        public bool ConsiderWeeklyHours { get; set; } = true;
        public virtual required Client Client { get; set; }
    }
}
