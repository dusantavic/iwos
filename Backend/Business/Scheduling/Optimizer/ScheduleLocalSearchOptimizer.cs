using Iwos.Business.Scheduling.Constraints;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace Iwos.Business.Scheduling.Optimizer
{
    /// <summary>
    /// Post-pass schedule optimizer based on local search (hill-climbing) with
    /// constraint-safe neighborhood operators. Runs automatically after the greedy
    /// engine and never violates any hard constraint.
    ///
    /// Operators (applied to each unfilled slot, first-improvement strategy):
    ///
    ///   1. <b>DirectFill</b> — assign any eligible employee not yet working that day.
    ///      Tie-broken by lowest scheduled hours so coverage gains spread fairly.
    ///
    ///   2. <b>ReassignWithReplacement</b> — move an existing assignment so it covers
    ///      the unfilled slot, then optionally backfill its origin slot with another
    ///      idle eligible employee. Accepts the move only when (a) a replacement is
    ///      found, or (b) the origin's <em>per-position</em> requirement is still
    ///      satisfied without one.
    ///
    ///   3. <b>ReassignChained</b> (2-deep) — when no idle replacement exists for the
    ///      origin slot, walk every other existing assignment looking for an employee
    ///      whose own slot can be backfilled by an idle candidate. Lets the optimizer
    ///      escape configurations where the only way to reach the unfilled slot is via
    ///      a 3-way swap (A → U, B → A's origin, C → B's origin).
    ///
    /// Coverage and min-staff are tracked <em>per position</em> so that moving an
    /// employee out of a position-specific slot is never silently treated as fine
    /// just because the shift's total head-count is still met.
    /// </summary>
    public sealed class ScheduleLocalSearchOptimizer
    {
        private const int MaxIterations = 200;
        private const int MaxSeconds = 8;

        private readonly IReadOnlyList<IScheduleConstraint> _constraints;

        public ScheduleLocalSearchOptimizer(IEnumerable<IScheduleConstraint> constraints)
        {
            _constraints = constraints.OrderBy(c => c.Priority).ToList();
        }

        public SchedulingResult Optimize(SchedulingContext ctx, SchedulingResult firstPass)
        {
            var sw = Stopwatch.StartNew();

            var hoursLookup = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
            var empById = ctx.Employees.ToDictionary(e => e.Id);
            var minStaff = BuildMinStaffLookup(ctx);
            var shiftLabels = ctx.Shifts.ToDictionary(s => s.Id, s => s.Label);

            var proposals = firstPass.ProposedAssignments.ToList();
            var unfilled = firstPass.UnfilledSlots
                .Select(u => new ScheduleSlot(u.Date, u.ShiftId, u.RequiredPositionId,
                    SlotHours(hoursLookup, u.ShiftId, u.Date)))
                .ToList();

            var state = BuildState(ctx, proposals, hoursLookup);
            var coverage = BuildCoverage(proposals, ctx.LockedAssignments, empById);
            var changes = new List<OptimizationChange>();
            var initialUnfilled = unfilled.Count;
            var iterations = 0;

            while (iterations < MaxIterations
                   && sw.Elapsed.TotalSeconds < MaxSeconds
                   && unfilled.Count > 0)
            {
                iterations++;
                var progressed = false;

                foreach (var slot in unfilled.ToList())
                {
                    if (TryDirectFill(ctx, state, slot, proposals, unfilled, coverage, shiftLabels, changes))
                    { progressed = true; break; }

                    if (TryReassign(ctx, state, slot, proposals, unfilled, coverage, minStaff,
                                    hoursLookup, shiftLabels, empById, changes))
                    { progressed = true; break; }

                    if (TryReassignChained(ctx, state, slot, proposals, unfilled, coverage,
                                           hoursLookup, shiftLabels, empById, changes))
                    { progressed = true; break; }
                }

                if (!progressed) break;
            }

            sw.Stop();
            var slotsFilled = initialUnfilled - unfilled.Count;

            return new SchedulingResult
            {
                ProposedAssignments = proposals,
                UnfilledSlots = unfilled
                    .Select(s => new UnfilledSlotInfo(s.Date, s.ShiftId, s.RequiredPositionId,
                        "No legal assignment found after greedy + local-search optimization"))
                    .ToList(),
                AcceptedSoftViolations = firstPass.AcceptedSoftViolations,
                TotalSlots = firstPass.TotalSlots,
                FilledSlots = firstPass.FilledSlots + slotsFilled,
                Optimization = new OptimizationSummary
                {
                    Iterations = iterations,
                    SlotsFilledByOptimizer = slotsFilled,
                    RemainingUnfilled = unfilled.Count,
                    DurationMs = sw.ElapsedMilliseconds,
                    Changes = changes,
                },
            };
        }

        // ── Operator 1: Direct fill ───────────────────────────────────────────

        private bool TryDirectFill(
            SchedulingContext ctx,
            SchedulingState state,
            ScheduleSlot slot,
            List<SchedAssignment> proposals,
            List<ScheduleSlot> unfilled,
            Dictionary<CoverageKey, int> coverage,
            Dictionary<Guid, string> shiftLabels,
            List<OptimizationChange> changes)
        {
            SchedEmployee? best = null;
            double bestHours = double.MaxValue;

            foreach (var emp in ctx.Employees)
            {
                if (slot.RequiredPositionId.HasValue && emp.PositionId != slot.RequiredPositionId.Value)
                    continue;
                if (state.EmployeeDateTaken.Contains((emp.Id, slot.Date)))
                    continue;
                if (!IsAllowed(ctx, state, emp, slot))
                    continue;

                var h = state.GetHours(emp.Id);
                if (h < bestHours)
                {
                    best = emp;
                    bestHours = h;
                }
            }

            if (best == null) return false;

            ApplyAssign(best, slot, proposals, unfilled, state, coverage);
            changes.Add(new OptimizationChange(
                OptimizationOpType.DirectFill,
                slot.Date, slot.ShiftId, best.Id, null, null,
                $"Assigned {best.FullName} directly to {Lbl(shiftLabels, slot.ShiftId)} on {slot.Date:yyyy-MM-dd}"));
            return true;
        }

        // ── Operator 2: Reassign with optional idle backfill ─────────────────

        private bool TryReassign(
            SchedulingContext ctx,
            SchedulingState state,
            ScheduleSlot slot,
            List<SchedAssignment> proposals,
            List<ScheduleSlot> unfilled,
            Dictionary<CoverageKey, int> coverage,
            Dictionary<CoverageKey, int> minStaff,
            Dictionary<(Guid, DayOfWeek), double> hoursLookup,
            Dictionary<Guid, string> shiftLabels,
            Dictionary<Guid, SchedEmployee> empById,
            List<OptimizationChange> changes)
        {
            foreach (var existing in proposals.ToList())
            {
                if (!empById.TryGetValue(existing.EmployeeId, out var emp)) continue;

                if (slot.RequiredPositionId.HasValue && emp.PositionId != slot.RequiredPositionId.Value)
                    continue;

                var sameDay = existing.Date == slot.Date;
                if (!sameDay && state.EmployeeDateTaken.Contains((emp.Id, slot.Date)))
                    continue;
                if (sameDay && existing.ShiftId == slot.ShiftId)
                    continue;

                var origHours = SlotHours(hoursLookup, existing.ShiftId, existing.Date);
                var temp = StateWithoutAssignment(state, emp.Id, existing.Date, origHours);

                if (!IsAllowed(ctx, temp, emp, slot)) continue;

                var slotForF = new ScheduleSlot(existing.Date, existing.ShiftId, emp.PositionId, origHours);
                var replacement = FindReplacement(ctx, temp, slotForF, emp.Id);

                if (replacement == null)
                {
                    // No idle replacement — only accept if origin's PER-POSITION
                    // requirement is still met without this employee. This is
                    // the position-aware version of the old "min-staff" gate
                    // and prevents silently creating a position-specific gap.
                    var originKey = Key(existing.ShiftId, existing.Date, emp.PositionId);
                    var currentCount = coverage.TryGetValue(originKey, out var c) ? c : 0;
                    var min = minStaff.TryGetValue(originKey, out var m) ? m : 0;
                    if (currentCount - 1 < min) continue;
                }

                CommitReassign(emp, existing, slot, slotForF, replacement,
                    proposals, unfilled, state, coverage, origHours);

                if (replacement != null)
                {
                    changes.Add(new OptimizationChange(
                        OptimizationOpType.ReassignWithReplacement,
                        slot.Date, slot.ShiftId, emp.Id, existing.ShiftId, existing.Date,
                        $"Moved {emp.FullName} from {Lbl(shiftLabels, existing.ShiftId)} on " +
                        $"{existing.Date:yyyy-MM-dd} → {Lbl(shiftLabels, slot.ShiftId)} on {slot.Date:yyyy-MM-dd}; " +
                        $"backfilled origin with {replacement.FullName}"));
                }
                else
                {
                    changes.Add(new OptimizationChange(
                        OptimizationOpType.ShiftSwap,
                        slot.Date, slot.ShiftId, emp.Id, existing.ShiftId, existing.Date,
                        $"Moved {emp.FullName} from {Lbl(shiftLabels, existing.ShiftId)} on " +
                        $"{existing.Date:yyyy-MM-dd} → {Lbl(shiftLabels, slot.ShiftId)} on {slot.Date:yyyy-MM-dd}"));
                }

                return true;
            }

            return false;
        }

        // ── Operator 3: Chained 2-deep reassign ──────────────────────────────
        // When TryReassign can't find an idle replacement for the origin slot,
        // we may still be able to reach the unfilled slot via a 3-employee swap:
        //
        //   A is currently on slot S_A; A can fit U.
        //   B is currently on slot S_B; B can fit S_A (so S_A's position stays covered).
        //   C is idle on S_B's date and can fit S_B.
        //
        // We commit all three moves atomically iff every step respects every hard
        // constraint and leaves the per-position coverage at S_B intact via C's fill.

        private bool TryReassignChained(
            SchedulingContext ctx,
            SchedulingState state,
            ScheduleSlot slot,
            List<SchedAssignment> proposals,
            List<ScheduleSlot> unfilled,
            Dictionary<CoverageKey, int> coverage,
            Dictionary<(Guid, DayOfWeek), double> hoursLookup,
            Dictionary<Guid, string> shiftLabels,
            Dictionary<Guid, SchedEmployee> empById,
            List<OptimizationChange> changes)
        {
            foreach (var existingA in proposals.ToList())
            {
                if (!empById.TryGetValue(existingA.EmployeeId, out var empA)) continue;
                if (slot.RequiredPositionId.HasValue && empA.PositionId != slot.RequiredPositionId.Value) continue;

                var sameDayA = existingA.Date == slot.Date;
                if (!sameDayA && state.EmployeeDateTaken.Contains((empA.Id, slot.Date))) continue;
                if (sameDayA && existingA.ShiftId == slot.ShiftId) continue;

                var hoursA = SlotHours(hoursLookup, existingA.ShiftId, existingA.Date);
                var afterA = StateWithoutAssignment(state, empA.Id, existingA.Date, hoursA);
                if (!IsAllowed(ctx, afterA, empA, slot)) continue;

                // Simulate A having moved to U so subsequent constraint checks
                // see the in-flight state.
                var afterAU = StateWith(afterA, empA.Id, slot.Date, slot.Hours, slot.ShiftId);

                var slotA = new ScheduleSlot(existingA.Date, existingA.ShiftId, empA.PositionId, hoursA);

                // Search for a B whose own slot can be backfilled by an idle C.
                foreach (var existingB in proposals)
                {
                    if (existingB.EmployeeId == existingA.EmployeeId) continue;
                    if (!empById.TryGetValue(existingB.EmployeeId, out var empB)) continue;

                    // B must fit slot A (same position).
                    if (empB.PositionId != empA.PositionId) continue;

                    var sameDayB = existingB.Date == existingA.Date;
                    if (!sameDayB && afterAU.EmployeeDateTaken.Contains((empB.Id, existingA.Date))) continue;
                    if (sameDayB && existingB.ShiftId == existingA.ShiftId) continue;

                    var hoursB = SlotHours(hoursLookup, existingB.ShiftId, existingB.Date);
                    var afterB = StateWithoutAssignment(afterAU, empB.Id, existingB.Date, hoursB);
                    if (!IsAllowed(ctx, afterB, empB, slotA)) continue;

                    var afterBA = StateWith(afterB, empB.Id, slotA.Date, slotA.Hours, slotA.ShiftId);

                    var slotB = new ScheduleSlot(existingB.Date, existingB.ShiftId, empB.PositionId, hoursB);

                    var c = FindReplacement(ctx, afterBA, slotB, empA.Id, empB.Id);
                    if (c == null) continue;

                    // Commit the 3-way chain atomically: A → U, B → S_A, C → S_B.
                    CommitReassign(empA, existingA, slot, slotA, replacement: null,
                        proposals, unfilled, state, coverage, hoursA);
                    CommitReassign(empB, existingB, slotA, slotB, replacement: null,
                        proposals, unfilled: null, state, coverage, hoursB);
                    ApplyAssign(c, slotB, proposals, unfilled: null, state, coverage);

                    changes.Add(new OptimizationChange(
                        OptimizationOpType.ReassignWithReplacement,
                        slot.Date, slot.ShiftId, empA.Id, existingA.ShiftId, existingA.Date,
                        $"Chained: {empA.FullName} → {Lbl(shiftLabels, slot.ShiftId)} on {slot.Date:yyyy-MM-dd}; " +
                        $"{empB.FullName} → {Lbl(shiftLabels, existingA.ShiftId)} on {existingA.Date:yyyy-MM-dd}; " +
                        $"{c.FullName} → {Lbl(shiftLabels, existingB.ShiftId)} on {existingB.Date:yyyy-MM-dd}"));

                    return true;
                }
            }

            return false;
        }

        // ── Replacement search ───────────────────────────────────────────────

        private SchedEmployee? FindReplacement(
            SchedulingContext ctx,
            SchedulingState state,
            ScheduleSlot slot,
            params Guid[] excludeEmployeeIds)
        {
            var exclude = new HashSet<Guid>(excludeEmployeeIds);

            SchedEmployee? best = null;
            double bestHours = double.MaxValue;

            foreach (var emp in ctx.Employees)
            {
                if (exclude.Contains(emp.Id)) continue;
                if (slot.RequiredPositionId.HasValue && emp.PositionId != slot.RequiredPositionId.Value) continue;
                if (state.EmployeeDateTaken.Contains((emp.Id, slot.Date))) continue;
                if (!IsAllowed(ctx, state, emp, slot)) continue;

                var h = state.GetHours(emp.Id);
                if (h < bestHours)
                {
                    best = emp;
                    bestHours = h;
                }
            }

            return best;
        }

        // ── Constraint check ─────────────────────────────────────────────────

        private bool IsAllowed(SchedulingContext ctx, SchedulingState state, SchedEmployee emp, ScheduleSlot slot)
        {
            foreach (var constraint in _constraints)
            {
                if (constraint.Severity != ConstraintSeverity.Hard) continue;
                var eval = constraint.Evaluate(ctx, state, emp, slot);
                if (eval.Violated) return false;
            }
            return true;
        }

        // ── State / coverage helpers ─────────────────────────────────────────

        /// <summary>
        /// Commits a reassign step: removes <paramref name="existing"/>, assigns
        /// <paramref name="emp"/> to <paramref name="targetSlot"/>, and (when
        /// <paramref name="replacement"/> is provided) places them at <paramref name="originSlot"/>.
        /// When <paramref name="replacement"/> is null AND removing emp drops the origin
        /// position below its requirement, the origin slot is added back to <paramref name="unfilled"/>
        /// so the next iteration of the optimizer can try to fill it. The caller is
        /// responsible for guarding against rejected moves before calling.
        /// </summary>
        private static void CommitReassign(
            SchedEmployee emp,
            SchedAssignment existing,
            ScheduleSlot targetSlot,
            ScheduleSlot originSlot,
            SchedEmployee? replacement,
            List<SchedAssignment> proposals,
            List<ScheduleSlot>? unfilled,
            SchedulingState state,
            Dictionary<CoverageKey, int> coverage,
            double existingHours)
        {
            proposals.Remove(existing);
            state.Proposed.Remove(existing);
            state.EmployeeDateTaken.Remove((emp.Id, existing.Date));
            state.ScheduledHours[emp.Id] = Math.Max(0, state.GetHours(emp.Id) - existingHours);
            DecCoverage(coverage, existing.ShiftId, existing.Date, emp.PositionId);

            ApplyAssign(emp, targetSlot, proposals, unfilled, state, coverage);

            if (replacement != null)
            {
                ApplyAssign(replacement, originSlot, proposals, unfilled: null, state, coverage);
            }
        }

        private static void ApplyAssign(
            SchedEmployee emp,
            ScheduleSlot slot,
            List<SchedAssignment> proposals,
            List<ScheduleSlot>? unfilled,
            SchedulingState state,
            Dictionary<CoverageKey, int> coverage)
        {
            var assignment = new SchedAssignment(emp.Id, slot.ShiftId, slot.Date);
            proposals.Add(assignment);
            unfilled?.Remove(slot);
            state.EmployeeDateTaken.Add((emp.Id, slot.Date));
            state.AddHours(emp.Id, slot.Hours);
            // state.Proposed must mirror proposals so cross-day constraints see in-flight optimizer moves.
            state.Proposed.Add(assignment);
            IncCoverage(coverage, slot.ShiftId, slot.Date, slot.RequiredPositionId ?? emp.PositionId);
        }

        // ── Per-position coverage ────────────────────────────────────────────
        // Keying coverage and min-staff by (shiftId, date, positionId) lets the
        // optimizer distinguish "shift has a Cook missing" from "shift has the
        // right total head-count but the Cook seat is empty" — a distinction
        // the previous total-only accounting could not make.

        private readonly record struct CoverageKey(Guid ShiftId, DateOnly Date, Guid PositionId);

        private static CoverageKey Key(Guid shiftId, DateOnly date, Guid positionId)
            => new(shiftId, date, positionId);

        private static void IncCoverage(Dictionary<CoverageKey, int> dict, Guid shiftId, DateOnly date, Guid positionId)
        {
            var key = Key(shiftId, date, positionId);
            dict[key] = (dict.TryGetValue(key, out var c) ? c : 0) + 1;
        }

        private static void DecCoverage(Dictionary<CoverageKey, int> dict, Guid shiftId, DateOnly date, Guid positionId)
        {
            var key = Key(shiftId, date, positionId);
            if (dict.TryGetValue(key, out var c))
                dict[key] = Math.Max(0, c - 1);
        }

        private static SchedulingState BuildState(
            SchedulingContext ctx,
            List<SchedAssignment> proposals,
            Dictionary<(Guid, DayOfWeek), double> hoursLookup)
        {
            var state = new SchedulingState();
            foreach (var locked in ctx.LockedAssignments)
            {
                state.EmployeeDateTaken.Add((locked.EmployeeId, locked.Date));
                if (hoursLookup.TryGetValue((locked.ShiftId, locked.Date.DayOfWeek), out var h))
                    state.AddHours(locked.EmployeeId, h);
            }
            foreach (var p in proposals)
            {
                state.EmployeeDateTaken.Add((p.EmployeeId, p.Date));
                state.Proposed.Add(p);
                if (hoursLookup.TryGetValue((p.ShiftId, p.Date.DayOfWeek), out var h))
                    state.AddHours(p.EmployeeId, h);
            }
            return state;
        }

        private static SchedulingState StateWithoutAssignment(
            SchedulingState original, Guid employeeId, DateOnly date, double subtractHours)
        {
            var temp = new SchedulingState();
            foreach (var kv in original.ScheduledHours)
                temp.ScheduledHours[kv.Key] = kv.Value;
            foreach (var taken in original.EmployeeDateTaken)
                temp.EmployeeDateTaken.Add(taken);
            foreach (var p in original.Proposed)
                if (!(p.EmployeeId == employeeId && p.Date == date))
                    temp.Proposed.Add(p);
            temp.EmployeeDateTaken.Remove((employeeId, date));
            temp.ScheduledHours[employeeId] = Math.Max(0, original.GetHours(employeeId) - subtractHours);
            return temp;
        }

        /// <summary>
        /// Returns a temp state that simulates <paramref name="employeeId"/> having
        /// just been assigned to (<paramref name="date"/>, <paramref name="shiftId"/>)
        /// for <paramref name="addHours"/>. Used by the chained operator to evaluate
        /// step-2 candidates against the post-step-1 state.
        /// </summary>
        private static SchedulingState StateWith(
            SchedulingState original, Guid employeeId, DateOnly date, double addHours, Guid shiftId)
        {
            var temp = new SchedulingState();
            foreach (var kv in original.ScheduledHours)
                temp.ScheduledHours[kv.Key] = kv.Value;
            foreach (var taken in original.EmployeeDateTaken)
                temp.EmployeeDateTaken.Add(taken);
            foreach (var p in original.Proposed)
                temp.Proposed.Add(p);

            temp.EmployeeDateTaken.Add((employeeId, date));
            temp.ScheduledHours[employeeId] = original.GetHours(employeeId) + addHours;
            temp.Proposed.Add(new SchedAssignment(employeeId, shiftId, date));
            return temp;
        }

        private static Dictionary<CoverageKey, int> BuildCoverage(
            List<SchedAssignment> proposals,
            IReadOnlyList<SchedAssignment> locked,
            Dictionary<Guid, SchedEmployee> empById)
        {
            var dict = new Dictionary<CoverageKey, int>();
            foreach (var a in proposals)
                if (empById.TryGetValue(a.EmployeeId, out var emp))
                    IncCoverage(dict, a.ShiftId, a.Date, emp.PositionId);
            foreach (var a in locked)
                if (empById.TryGetValue(a.EmployeeId, out var emp))
                    IncCoverage(dict, a.ShiftId, a.Date, emp.PositionId);
            return dict;
        }

        private static Dictionary<CoverageKey, int> BuildMinStaffLookup(SchedulingContext ctx)
        {
            var posReqsByShift = ctx.PositionRequirements
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());
            var dayOverrides = ctx.DayPositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);
            var dateOverrides = ctx.PositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.Date, o.PositionId), o => o.RequiredCount);
            var dayScheds = ctx.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek));

            var dict = new Dictionary<CoverageKey, int>();
            for (var date = ctx.WeekStart; date <= ctx.WeekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                if (!ctx.WeekendsWorking && (dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday)) continue;

                foreach (var shift in ctx.Shifts)
                {
                    if (!dayScheds.ContainsKey((shift.Id, dow))) continue;
                    if (!posReqsByShift.TryGetValue(shift.Id, out var posReqs)) continue;

                    foreach (var req in posReqs)
                    {
                        var required = dayOverrides.TryGetValue((shift.Id, dow, req.PositionId), out var dayOv)
                            ? dayOv : req.RequiredCount;
                        if (dateOverrides.TryGetValue((shift.Id, date, req.PositionId), out var dateOv))
                            required = dateOv;

                        dict[Key(shift.Id, date, req.PositionId)] = required;
                    }
                }
            }
            return dict;
        }

        private static double SlotHours(Dictionary<(Guid, DayOfWeek), double> lookup, Guid shiftId, DateOnly date)
            => lookup.TryGetValue((shiftId, date.DayOfWeek), out var h) ? h : 0d;

        private static string Lbl(Dictionary<Guid, string> labels, Guid id)
            => labels.TryGetValue(id, out var l) ? l : id.ToString();
    }
}
