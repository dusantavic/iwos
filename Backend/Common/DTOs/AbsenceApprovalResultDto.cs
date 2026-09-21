using System.Collections.Generic;

namespace Iwos.Common.DTOs
{
    /// <summary>
    /// Returned from a confirmed absence approval. Lists every assignment that was released
    /// from the schedule so the UI can refresh the planner and show unfilled markers.
    /// </summary>
    public sealed class AbsenceApprovalResultDto
    {
        public System.Guid AbsenceId { get; set; }
        public int ChargedWorkingDays { get; set; }
        public decimal ChargedWorkingHours { get; set; }
        public List<AbsenceImpactConflictDto> ReleasedAssignments { get; set; } = new();
    }
}
