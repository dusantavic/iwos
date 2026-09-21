using System;
using System.Collections.Generic;

namespace Iwos.Business.Scheduling
{
    /// <summary>
    /// Mutable run-time state tracked by the engine while it walks slots.
    /// Constraints read this to decide if a candidate employee is still eligible
    /// (e.g. OvertimeConstraint consults <see cref="ScheduledHours"/>).
    /// </summary>
    public sealed class SchedulingState
    {
        /// <summary>Hours already scheduled per employee (both locked and newly proposed).</summary>
        public Dictionary<Guid, double> ScheduledHours { get; } = new();

        /// <summary>(EmployeeId, Date) pairs already assigned, to prevent double-booking on the same day.</summary>
        public HashSet<(Guid EmployeeId, DateOnly Date)> EmployeeDateTaken { get; } = new();

        /// <summary>(EmployeeId, ShiftId, Date) set of assignments proposed by the engine this run.</summary>
        public List<SchedAssignment> Proposed { get; } = new();

        /// <summary>Slots the engine could not fill (e.g. no eligible candidates).</summary>
        public List<ScheduleSlot> Unfilled { get; } = new();

        public double GetHours(Guid employeeId)
            => ScheduledHours.TryGetValue(employeeId, out var h) ? h : 0d;

        public void AddHours(Guid employeeId, double hours)
        {
            ScheduledHours[employeeId] = GetHours(employeeId) + hours;
        }
    }
}
