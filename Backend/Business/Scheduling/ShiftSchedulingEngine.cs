using Iwos.Business.Scheduling.Constraints;
using Iwos.Business.Scheduling.Optimizer;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Iwos.Business.Scheduling
{
    /// <summary>
    /// Default implementation of <see cref="IShiftSchedulingEngine"/>.
    ///
    /// Algorithm (greedy, constraint-driven):
    ///   1. Seed the running state with every locked (manager-created) assignment
    ///      so their hours count toward weekly caps and their (employee, day) pairs
    ///      block further assignment on the same day.
    ///   2. Expand the week into ordered slots (date × shift × required position / min-staff).
    ///   3. For each slot, walk every employee and apply the constraint pipeline
    ///      in priority order. Hard violations disqualify a candidate outright;
    ///      soft violations accumulate a penalty score (weighted by priority).
    ///   4. Rank eligible candidates by penalty ascending, then remaining
    ///      weekly capacity descending (load balancing), then FullName for
    ///      deterministic output. Pick the top candidate.
    ///   5. Update state and continue.
    ///
    /// The engine never touches EF. All side effects are confined to the
    /// service layer which optionally persists the returned proposals.
    /// </summary>
    public sealed class ShiftSchedulingEngine : IShiftSchedulingEngine
    {
        private readonly IReadOnlyList<IScheduleConstraint> _constraints;
        private readonly ScheduleLocalSearchOptimizer _optimizer;

        public ShiftSchedulingEngine(
            IEnumerable<IScheduleConstraint> constraints,
            ScheduleLocalSearchOptimizer optimizer)
        {
            _constraints = constraints.OrderBy(c => c.Priority).ToList();
            _optimizer = optimizer;
        }

        public SchedulingResult Generate(SchedulingContext context)
        {
            var greedy = RunGreedy(context);

            // Greedy alone doesn't ship — always follow with local-search post-optimization.
            // The optimizer respects every hard constraint and only accepts strictly improving moves.

            //For testing optimization algorithm:
            //return greedy; 

            return _optimizer.Optimize(context, greedy);
        }

        private SchedulingResult RunGreedy(SchedulingContext context)
        {
            var state = new SchedulingState();
            SeedLockedAssignments(context, state);

            var slots = ExpandSlots(context);
            var acceptedSoftViolations = new List<ScheduleViolation>();

            // Pre-compute absence days per employee once — used by the urgency scorer
            // to favour employees whose vacation starts later this same week.
            var absenceDays = BuildAbsenceDayIndex(context);

            foreach (var slot in slots)
            {
                var pick = SelectBestCandidate(context, state, slot, acceptedSoftViolations, absenceDays);
                if (pick == null)
                {
                    state.Unfilled.Add(slot);
                    continue;
                }

                var assignment = new SchedAssignment(pick.Id, slot.ShiftId, slot.Date);
                state.Proposed.Add(assignment);
                state.EmployeeDateTaken.Add((pick.Id, slot.Date));
                state.AddHours(pick.Id, slot.Hours);
            }

            var unfilled = state.Unfilled
                .Select(s => new UnfilledSlotInfo(s.Date, s.ShiftId, s.RequiredPositionId,
                    "No eligible employee satisfied all hard constraints"))
                .ToList();

            return new SchedulingResult
            {
                ProposedAssignments = state.Proposed,
                UnfilledSlots = unfilled,
                AcceptedSoftViolations = acceptedSoftViolations,
                TotalSlots = slots.Count,
                FilledSlots = state.Proposed.Count,
            };
        }

        // ── Absence day index ─────────────────────────────────────────────────
        // Flat set of every absent calendar day per employee.  Built once per
        // Generate() call so the urgency scorer below never re-walks the list.

        private static Dictionary<Guid, HashSet<DateOnly>> BuildAbsenceDayIndex(SchedulingContext ctx)
        {
            var index = new Dictionary<Guid, HashSet<DateOnly>>();
            foreach (var absence in ctx.Absences)
            {
                if (!index.TryGetValue(absence.EmployeeId, out var days))
                    index[absence.EmployeeId] = days = [];
                for (var d = absence.StartDate; d <= absence.EndDate; d = d.AddDays(1))
                    days.Add(d);
            }
            return index;
        }

        /// <summary>
        /// How many working days does <paramref name="emp"/> still have available
        /// in the week, counting from <paramref name="fromDate"/> (inclusive)?
        /// Absent days and non-working weekend days are excluded.
        /// </summary>
        private static int CountAvailableWorkdays(
            SchedulingContext ctx,
            Dictionary<Guid, HashSet<DateOnly>> absenceDays,
            SchedEmployee emp,
            DateOnly fromDate)
        {
            var count = 0;
            for (var d = fromDate; d <= ctx.WeekEnd; d = d.AddDays(1))
            {
                var dow = d.DayOfWeek;
                if (!ctx.WeekendsWorking && (dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday))
                    continue;
                if (absenceDays.TryGetValue(emp.Id, out var absent) && absent.Contains(d))
                    continue;
                count++;
            }
            return count;
        }

        // ── Seeding ───────────────────────────────────────────────────────────

        private static void SeedLockedAssignments(SchedulingContext ctx, SchedulingState state)
        {
            // Hours per (shift, dayOfWeek) lookup for locked assignments.
            var hoursLookup = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);

            foreach (var locked in ctx.LockedAssignments)
            {
                state.EmployeeDateTaken.Add((locked.EmployeeId, locked.Date));
                if (hoursLookup.TryGetValue((locked.ShiftId, locked.Date.DayOfWeek), out var h))
                    state.AddHours(locked.EmployeeId, h);
            }
        }

        // ── Slot expansion ────────────────────────────────────────────────────

        private static List<ScheduleSlot> ExpandSlots(SchedulingContext ctx)
        {
            var slots = new List<ScheduleSlot>();

            // Per-position candidate pool: how many employees in the workforce
            // hold each position. Used below to sort generated slots so scarce
            // positions are committed before abundant ones — without this, the
            // greedy can spend a uniquely-qualified employee's capacity on a
            // slot anyone could fill, leaving the position's true bottleneck
            // slots unfillable.
            var candidatePoolByPosition = ctx.Employees
                .GroupBy(e => e.PositionId)
                .ToDictionary(g => g.Key, g => g.Count());

            var daySchedIndex = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek));

            var posReqsByShift = ctx.PositionRequirements
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Per-date position requirement overrides: (shiftId, date, positionId) → requiredCount
            var posReqOverrides = ctx.PositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.Date, o.PositionId), o => o.RequiredCount);

            // Per-day-of-week position requirement overrides: (shiftId, dayOfWeek, positionId) → requiredCount
            var posReqDayOverrides = ctx.DayPositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);

            for (var date = ctx.WeekStart; date <= ctx.WeekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                var isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
                if (isWeekend && !ctx.WeekendsWorking)
                    continue;

                foreach (var shift in ctx.Shifts)
                {
                    if (!daySchedIndex.TryGetValue((shift.Id, dow), out var ds))
                        continue;

                    if (!posReqsByShift.TryGetValue(shift.Id, out var posReqs) || posReqs.Count == 0)
                        continue; // No position requirements configured — no slots generated.

                    foreach (var req in posReqs)
                    {
                        // Priority: per-date override > per-day-of-week override > default.
                        var required = posReqDayOverrides.TryGetValue((shift.Id, dow, req.PositionId), out var dayOv)
                            ? dayOv
                            : req.RequiredCount;
                        if (posReqOverrides.TryGetValue((shift.Id, date, req.PositionId), out var dateOv))
                            required = dateOv;

                        var lockedForPos = CountLockedForPosition(ctx, shift.Id, date, req.PositionId);
                        var needed = Math.Max(0, required - lockedForPos);
                        for (var i = 0; i < needed; i++)
                            slots.Add(new ScheduleSlot(date, shift.Id, req.PositionId, ds.Hours));
                    }
                }
            }

            // Sort: scarcer positions first (smaller candidate pool), then by date
            // for determinism. Slots without a required position (pool = unknown)
            // sink to the end so they can soak up whoever's left.
            slots.Sort((a, b) =>
            {
                var aPool = a.RequiredPositionId.HasValue
                    && candidatePoolByPosition.TryGetValue(a.RequiredPositionId.Value, out var pa) ? pa : int.MaxValue;
                var bPool = b.RequiredPositionId.HasValue
                    && candidatePoolByPosition.TryGetValue(b.RequiredPositionId.Value, out var pb) ? pb : int.MaxValue;
                var byPool = aPool.CompareTo(bPool);
                if (byPool != 0) return byPool;
                var byDate = a.Date.CompareTo(b.Date);
                if (byDate != 0) return byDate;
                var byShift = a.ShiftId.CompareTo(b.ShiftId);
                if (byShift != 0) return byShift;
                return (a.RequiredPositionId ?? Guid.Empty).CompareTo(b.RequiredPositionId ?? Guid.Empty);
            });

            return slots;
        }

        private static int CountLockedForPosition(SchedulingContext ctx, Guid shiftId, DateOnly date, Guid positionId)
        {
            // Locked assignments don't know the employee's position, so we join
            // against the employee list. Kept small by building a dictionary once.
            // For simplicity we walk the list — week-scoped so count stays small.
            var positionByEmp = ctx.Employees.ToDictionary(e => e.Id, e => e.PositionId);
            var count = 0;
            foreach (var a in ctx.LockedAssignments)
            {
                if (a.ShiftId != shiftId || a.Date != date) continue;
                if (positionByEmp.TryGetValue(a.EmployeeId, out var pid) && pid == positionId)
                    count++;
            }
            return count;
        }

        // ── Candidate selection ───────────────────────────────────────────────

        /// <summary>
        /// Selects the best employee for <paramref name="slot"/> using a four-tier ranking:
        /// <list type="number">
        ///   <item>Lowest constraint penalty (hard violations already excluded).</item>
        ///   <item>
        ///     Fewest total hours scheduled (accumulated from prior weeks + this week so far).
        ///     Achieves equal distribution across the scheduling period.
        ///   </item>
        ///   <item>
        ///     Highest <em>utilization urgency ratio</em> (only when ConsiderWeeklyHours is on):
        ///     <c>remaining_weekly_hours / available_workdays_left</c>.
        ///     Favours employees whose absence starts later this week so they get
        ///     scheduled before their leave begins.
        ///   </item>
        ///   <item>Lexicographic FullName tiebreaker for deterministic output.</item>
        /// </list>
        /// No hard constraint is ever bypassed.
        /// </summary>
        private SchedEmployee? SelectBestCandidate(
            SchedulingContext ctx,
            SchedulingState state,
            ScheduleSlot slot,
            List<ScheduleViolation> acceptedSoftViolations,
            Dictionary<Guid, HashSet<DateOnly>> absenceDays)
        {
            SchedEmployee? best = null;
            double bestPenalty = double.MaxValue;
            double bestTotalHours = double.MaxValue;
            double bestUrgency = double.MinValue;
            List<ScheduleViolation>? bestSoftViolations = null;

            foreach (var emp in ctx.Employees)
            {
                // Position filter when the slot asks for a specific position.
                if (slot.RequiredPositionId.HasValue && emp.PositionId != slot.RequiredPositionId.Value)
                    continue;

                // Can't assign the same employee to two shifts on the same day.
                if (state.EmployeeDateTaken.Contains((emp.Id, slot.Date)))
                    continue;

                var (allowed, penalty, violations) = EvaluateConstraints(ctx, state, emp, slot);
                if (!allowed)
                    continue;

                // Fairness: total hours scheduled across the entire scheduling period
                // (accumulated from prior weeks + running total this week).
                var accumulated = ctx.AccumulatedHours.TryGetValue(emp.Id, out var acc) ? acc : 0d;
                var totalHours = accumulated + state.GetHours(emp.Id);

                // Urgency: meaningful only when the weekly hour cap is being enforced.
                // Favours employees with little time left before absence starts.
                var urgency = 0d;
                if (ctx.ConsiderWeeklyHours)
                {
                    var remaining = emp.WeeklyHours - state.GetHours(emp.Id);
                    var workdaysLeft = CountAvailableWorkdays(ctx, absenceDays, emp, slot.Date);
                    urgency = remaining / Math.Max(1, workdaysLeft);
                }

                // Rank: penalty → total hours (fair distribution) → urgency → name.
                var betterPenalty = penalty < bestPenalty;
                var tiePenalty = Math.Abs(penalty - bestPenalty) < 0.0001;

                var betterTotalHours = tiePenalty && totalHours < bestTotalHours;
                var tieTotalHours = tiePenalty && Math.Abs(totalHours - bestTotalHours) < 0.001;

                var betterUrgency = tieTotalHours && urgency > bestUrgency;
                var tieUrgency = tieTotalHours && Math.Abs(urgency - bestUrgency) < 0.0001;

                var betterName = tieUrgency && best != null &&
                                 string.CompareOrdinal(emp.FullName, best.FullName) < 0;

                if (best == null || betterPenalty || betterTotalHours || betterUrgency || betterName)
                {
                    best = emp;
                    bestPenalty = penalty;
                    bestTotalHours = totalHours;
                    bestUrgency = urgency;
                    bestSoftViolations = violations;
                }
            }

            if (best != null && bestSoftViolations != null)
                acceptedSoftViolations.AddRange(bestSoftViolations);

            return best;
        }

        private (bool Allowed, double Penalty, List<ScheduleViolation> SoftViolations) EvaluateConstraints(
            SchedulingContext ctx,
            SchedulingState state,
            SchedEmployee emp,
            ScheduleSlot slot)
        {
            double penalty = 0;
            var softViolations = new List<ScheduleViolation>();

            foreach (var constraint in _constraints)
            {
                var eval = constraint.Evaluate(ctx, state, emp, slot);
                if (!eval.Violated) continue;

                // Excluding employeees violating hard constraints immediatelly
                if (constraint.Severity == ConstraintSeverity.Hard)
                    return (false, 0, softViolations);

                // Soft violation — weight inversely by priority so P1 hurts more than P10.
                penalty += 1000d / (constraint.Priority + 1);
                softViolations.Add(new ScheduleViolation(
                    emp.Id, slot.ShiftId, slot.Date,
                    constraint.Name, constraint.Priority,
                    eval.Reason ?? "violated"));
            }

            return (true, penalty, softViolations);
        }
    }
}
