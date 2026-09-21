using Google.OrTools.Sat;
using Iwos.Business.Scheduling.Constraints;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace Iwos.Business.Scheduling.Optimizer
{
    /// <summary>
    /// Schedule optimizer backed by Google OR-Tools CP-SAT. Treats the input
    /// <see cref="SchedulingContext"/> as a single multi-week problem and
    /// looks for an assignment that maximizes filled slots while respecting
    /// every hard constraint and minimizing soft-constraint penalties.
    ///
    /// The model is built with a ±7-day padding context so cross-period rules
    /// (consecutive hours, rest period, shift variety, weekly hours) see real
    /// neighbours rather than voids. Days outside the optimization range
    /// reach the model as <em>constants</em> derived from
    /// <c>LockedAssignments</c> + <c>PriorAssignments</c>; days inside are
    /// decision variables.
    ///
    /// Constraints encoded directly in the model:
    ///   • <b>Coverage</b>: at most <c>RequiredCount</c> employees per
    ///     (date, shift, position) cell.
    ///   • <b>One-shift-per-day</b>: each employee fills at most one shift
    ///     per calendar day (in-range).
    ///   • <b>Weekly hours</b>: per ISO week, sum of variable hours plus
    ///     locked hours ≤ <c>WeeklyHours</c>.
    ///   • <b>Consecutive hours / 48 h streak</b>: for every 4–14 day window
    ///     touching the range, if every day in the window is worked
    ///     (variable OR padded-locked), the cumulative hours in that window
    ///     must not exceed 48. This is the streak-aware encoding — a 6-day
    ///     rolling sum would miss 7-or-more-day runs of shorter shifts.
    ///   • <b>Rest period</b>: pairwise exclusion for cross-day shift pairs
    ///     whose end-to-start gap is &lt; 12 h. Padded locked assignments are
    ///     handled as static pre-filters that drop the corresponding variable.
    ///
    /// Pre-filtered (variable not created at all) when blocked statically:
    /// position mismatch, pinned-shift mismatch, approved absence, self-
    /// reported unavailability, rotation off-day, rest-period violation
    /// against an immediately adjacent locked shift on the prior/next day.
    ///
    /// Soft constraints are added to the objective as priority-weighted
    /// penalty terms. Coverage carries the dominant weight so it is never
    /// traded away. <see cref="ShiftVarietyConstraint"/> is encoded by
    /// counting same-shift triples for each employee/shift/3-day window.
    ///
    /// The caller (service layer) re-validates the produced assignments
    /// against the full constraint pipeline with the same ±7-day padding
    /// before persisting; any encoding gap manifests as a rejected run, not
    /// as a corrupt schedule.
    /// </summary>
    public sealed class CpSatScheduleOptimizer
    {
        // CP-SAT only handles integer variables; scale fractional hours to
        // hundredths of an hour (so 8.5 h → 850) when summing into linear constraints.
        private const long HourScale = 100;

        private const double MaxConsecutiveHours = 48.0;
        private const double MinRestHours = 12.0;

        // Streak window sweep: 4..14 catches everything from 4×12 h shifts
        // up to 14×3.5 h shifts. Each window adds an indicator BoolVar plus
        // a clause + an implication, so the total stays small.
        private const int MinStreakWindow = 4;
        private const int MaxStreakWindow = 14;

        // Padding: how many days outside the range to load as locked context
        // so cross-period constraints (consecutive hours, rest, weekly hours,
        // shift variety) see real neighbours.
        private const int PaddingDays = 7;

        // Coverage dominates: every soft penalty carries weight strictly less
        // than this so the objective never trades a filled slot for a
        // soft-constraint reduction.
        private const long CoverageReward = 1_000_000;

        // When the caller relaxes the Overtime hard cap, we still want the solver
        // to prefer assignments that keep employees as close to their contracted
        // hours as possible. Penalty applies per scaled-hour of weekly excess —
        // 8h overtime ≈ 8 × HourScale × 10 = 8 000, vs 1 000 000 per filled seat,
        // so coverage is never sacrificed but ties resolve toward the
        // less-loaded employee.
        private const long OvertimeOverridePenaltyPerScaledHour = 10;

        public sealed class Options
        {
            public TimeSpan TimeBudget { get; set; } = TimeSpan.FromSeconds(15);
            /// <summary>Hint to the solver: ProposedAssignments to start search from.</summary>
            public IReadOnlyList<SchedAssignment>? WarmStart { get; set; }

            /// <summary>
            /// Names of user-overridable hard constraints to disable in this solve.
            /// The caller (service layer) is responsible for ensuring this set NEVER
            /// contains a non-overridable constraint — the optimizer trusts the input
            /// but explicitly hard-codes which constraints can be skipped, so a leaked
            /// non-overridable name here would simply be ignored. Currently
            /// recognised: "Overtime", "Rotation", "PinnedShift".
            /// </summary>
            public IReadOnlySet<string>? DisabledConstraints { get; set; }
        }

        public sealed class CpSatResult
        {
            public bool Success { get; set; }
            public string? Reason { get; set; }
            public CpSolverStatus SolverStatus { get; set; }
            public IReadOnlyList<SchedAssignment> Assignments { get; set; } = [];
            public int FilledSlots { get; set; }
            public int TotalSlots { get; set; }
            public long DurationMs { get; set; }
        }

        public CpSatResult Solve(SchedulingContext ctx, Options? options = null)
        {
            options ??= new Options();
            var sw = Stopwatch.StartNew();

            // Whitelist of constraint names this optimizer is permitted to disable.
            // Even if the caller passed something else, only these are honored —
            // the optimizer can't be tricked into skipping a non-overridable rule.
            var disabled = options.DisabledConstraints ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var skipPinnedShift = disabled.Contains("PinnedShift");
            var skipRotation    = disabled.Contains("Rotation");
            var skipOvertime    = disabled.Contains("Overtime");

            var model = new CpModel();

            var groups = ExpandGroups(ctx);
            if (groups.Count == 0)
            {
                return new CpSatResult
                {
                    Success = true,
                    SolverStatus = CpSolverStatus.Optimal,
                    Assignments = [],
                    FilledSlots = 0,
                    TotalSlots = 0,
                    DurationMs = sw.ElapsedMilliseconds,
                };
            }

            var employees = ctx.Employees.ToList();
            var dayHoursByShift = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.Hours);
            var startHourByShift = ctx.DaySchedules
                .ToDictionary(d => (d.ShiftId, d.DayOfWeek), d => d.StartHour);

            // ── Static pre-filter indices ────────────────────────────────────
            var absenceDays = BuildAbsenceDayIndex(ctx);
            var unavailable = ctx.Unavailabilities
                .Select(u => (u.EmployeeId, u.ShiftId, u.Date))
                .ToHashSet();
            var rotationPatternById = ctx.RotationPatterns.ToDictionary(p => p.Id);

            // Lookup of locked + prior shifts per employee per date — used both
            // for pre-filtering rest-period violators and for the consecutive-
            // hours window-hour constants.
            var lockedShiftByEmpDay = BuildLockedShiftIndex(ctx);

            var minDate = groups.Min(g => g.Date);
            var maxDate = groups.Max(g => g.Date);
            var paddedStart = minDate.AddDays(-PaddingDays);
            var paddedEnd = maxDate.AddDays(PaddingDays);

            // ── Decision variables: x[employeeIdx, groupIdx] ─────────────────
            var x = new Dictionary<(int e, int g), BoolVar>();
            for (int g = 0; g < groups.Count; g++)
            {
                var group = groups[g];
                if (!startHourByShift.TryGetValue((group.ShiftId, group.Date.DayOfWeek), out var slotStart))
                    slotStart = 0.0;
                var slotEnd = slotStart + group.Hours;

                for (int e = 0; e < employees.Count; e++)
                {
                    var emp = employees[e];

                    if (group.PositionId.HasValue && emp.PositionId != group.PositionId.Value)
                        continue;
                    if (!skipPinnedShift && emp.PinnedShiftId.HasValue && emp.PinnedShiftId.Value != group.ShiftId)
                        continue;
                    // Absence is non-overridable — never skipped here, regardless of options.
                    if (absenceDays.TryGetValue(emp.Id, out var days) && days.Contains(group.Date))
                        continue;
                    if (unavailable.Contains((emp.Id, group.ShiftId, group.Date)))
                        continue;
                    if (!skipRotation && IsRotationOffDay(emp, group.Date, ctx, rotationPatternById))
                        continue;
                    if (ViolatesRestVsLocked(emp.Id, group, slotStart, slotEnd,
                        lockedShiftByEmpDay, dayHoursByShift, startHourByShift))
                        continue;

                    x[(e, g)] = model.NewBoolVar($"x_{e}_{g}");
                }
            }

            // ── C1: per-group seat count ─────────────────────────────────────
            for (int g = 0; g < groups.Count; g++)
            {
                var vars = new List<BoolVar>();
                for (int e = 0; e < employees.Count; e++)
                    if (x.TryGetValue((e, g), out var v))
                        vars.Add(v);
                if (vars.Count == 0) continue;
                model.Add(LinearExpr.Sum(vars) <= groups[g].Required);
            }

            // ── C2: at most one shift per (employee, day) in-range ──────────
            var groupsByDate = groups
                .Select((g, idx) => (g, idx))
                .GroupBy(t => t.g.Date)
                .ToDictionary(grp => grp.Key, grp => grp.Select(t => t.idx).ToList());

            for (int e = 0; e < employees.Count; e++)
            {
                foreach (var (date, groupIdxs) in groupsByDate)
                {
                    var vars = new List<BoolVar>();
                    foreach (var g in groupIdxs)
                        if (x.TryGetValue((e, g), out var v)) vars.Add(v);
                    if (vars.Count > 1) model.Add(LinearExpr.Sum(vars) <= 1);
                }
            }

            // ── C3: weekly hours ≤ contracted ────────────────────────────────
            // Overtime is the only weekly-hour cap; skipping it is the user-overridable
            // "let people go over their contract" path.
            if (ctx.ConsiderWeeklyHours && !skipOvertime)
            {
                var groupIdxByWeek = groups
                    .Select((g, idx) => (g, idx))
                    .GroupBy(t => MondayOf(t.g.Date))
                    .ToDictionary(grp => grp.Key, grp => grp.Select(t => t.idx).ToList());

                for (int e = 0; e < employees.Count; e++)
                {
                    var emp = employees[e];
                    foreach (var (weekStart, groupIdxs) in groupIdxByWeek)
                    {
                        var weeklyTerms = new List<LinearExpr>();
                        long lockedHoursThisWeek = SumStaticHoursForEmployeeInRange(
                            ctx, emp.Id, weekStart, weekStart.AddDays(6), dayHoursByShift);

                        foreach (var g in groupIdxs)
                        {
                            if (!x.TryGetValue((e, g), out var v)) continue;
                            weeklyTerms.Add(LinearExpr.Term(v, ScaleHours(groups[g].Hours)));
                        }

                        if (weeklyTerms.Count == 0) continue;
                        var cap = Math.Max(0, ScaleHours(emp.WeeklyHours) - lockedHoursThisWeek);
                        model.Add(LinearExpr.Sum(weeklyTerms) <= cap);
                    }
                }
            }

            // ── C4: streak-aware consecutive hours ──────────────────────────
            // For each employee, build a per-day "worked" indicator across the
            // padded range. In-range days are BoolVars (= 1 iff some x[e,g] is
            // 1 for that day); padding days are constants drawn from locked +
            // prior assignments.
            //
            // For every window of size W ∈ [4, 14] that touches the range, we
            // create an indicator <c>allWorked</c> = AND(worked[d..d+W-1]) and
            // require <c>sum_hours[d..d+W-1] ≤ 48</c> only when allWorked = 1.
            // If allWorked = 0, the window has at least one day off and the
            // streak cap is implied vacuously by some other window that does
            // have all-worked.
            //
            // This catches arbitrarily long consecutive-day runs that the
            // older 6-day rolling-sum encoding silently allowed.
            EncodeConsecutiveHours(model, ctx, employees, groups, x,
                paddedStart, paddedEnd, minDate, maxDate, dayHoursByShift, lockedShiftByEmpDay);

            // ── C5: rest period — in-range pairwise exclusions ──────────────
            // Cross-day pairs with rest < 12 h cannot both be assigned to the
            // same employee. Locked-vs-variable cross-day pairs are handled in
            // the static pre-filter above.
            for (int g1 = 0; g1 < groups.Count; g1++)
            {
                var a = groups[g1];
                if (!startHourByShift.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var aStart)) continue;
                var aEnd = aStart + a.Hours;

                for (int g2 = 0; g2 < groups.Count; g2++)
                {
                    var b = groups[g2];
                    if (b.Date != a.Date.AddDays(1)) continue;
                    if (!startHourByShift.TryGetValue((b.ShiftId, b.Date.DayOfWeek), out var bStart)) continue;

                    var rest = (24 + bStart) - aEnd;
                    if (rest >= MinRestHours) continue;

                    for (int e = 0; e < employees.Count; e++)
                    {
                        if (!x.TryGetValue((e, g1), out var v1)) continue;
                        if (!x.TryGetValue((e, g2), out var v2)) continue;
                        model.Add(v1 + v2 <= 1);
                    }
                }
            }

            // ── Objective: maximize coverage, minimize soft-rule penalties ──
            // Coverage carries CoverageReward per filled seat. Soft constraints
            // are subtracted (priority-weighted) so a violation is preferred
            // only when it doesn't displace coverage.
            var objectiveTerms = new List<LinearExpr>();
            foreach (var v in x.Values)
                objectiveTerms.Add(LinearExpr.Term(v, CoverageReward));

            // ShiftVariety (priority 5, soft): for each (employee, shift) and
            // each consecutive 3-day window touching the range, count occurrences
            // where all 3 days place the employee on the same shift. Each such
            // triple subtracts a small penalty from the objective.
            var shiftVarietyPenalty = AddShiftVarietyPenalty(model, ctx, employees, groups, x,
                paddedStart, paddedEnd, minDate, maxDate, lockedShiftByEmpDay);
            if (shiftVarietyPenalty != null)
                objectiveTerms.Add(LinearExpr.Term(shiftVarietyPenalty, -SoftWeight(ConstraintPriorities.ShiftVariety)));

            // Overtime override penalty: only active when the Overtime hard cap is
            // relaxed by the caller. Without this, the solver has no incentive to
            // prefer a 32h employee over a 40h one when filling an extra shift —
            // every filled seat earns the same coverage reward. With this, the
            // sum of weekly-hour overshoot across the range is subtracted from
            // the objective, so ties resolve toward whoever is furthest below cap.
            if (ctx.ConsiderWeeklyHours && skipOvertime)
            {
                var overtimeExcess = AddOvertimeOverridePenalty(model, ctx, employees, groups, x, dayHoursByShift);
                if (overtimeExcess != null)
                    objectiveTerms.Add(LinearExpr.Term(overtimeExcess, -OvertimeOverridePenaltyPerScaledHour));
            }

            model.Maximize(LinearExpr.Sum(objectiveTerms));

            // ── Warm-start hint ──────────────────────────────────────────────
            if (options.WarmStart != null && options.WarmStart.Count > 0)
            {
                foreach (var hint in options.WarmStart)
                {
                    var e = employees.FindIndex(emp => emp.Id == hint.EmployeeId);
                    if (e < 0) continue;
                    var g = groups.FindIndex(gr => gr.Date == hint.Date && gr.ShiftId == hint.ShiftId
                        && gr.PositionId == employees[e].PositionId);
                    if (g < 0) continue;
                    if (!x.TryGetValue((e, g), out var v)) continue;
                    model.AddHint(v, 1);
                }
            }

            // ── Solve ────────────────────────────────────────────────────────
            var solver = new CpSolver
            {
                StringParameters = $"max_time_in_seconds:{options.TimeBudget.TotalSeconds};num_search_workers:4",
            };
            var status = solver.Solve(model);
            sw.Stop();

            if (status != CpSolverStatus.Optimal && status != CpSolverStatus.Feasible)
            {
                return new CpSatResult
                {
                    Success = false,
                    SolverStatus = status,
                    Reason = $"CP-SAT returned {status}",
                    TotalSlots = groups.Sum(g => g.Required),
                    DurationMs = sw.ElapsedMilliseconds,
                };
            }

            var assignments = new List<SchedAssignment>();
            for (int g = 0; g < groups.Count; g++)
            {
                for (int e = 0; e < employees.Count; e++)
                {
                    if (!x.TryGetValue((e, g), out var v)) continue;
                    if (solver.BooleanValue(v))
                        assignments.Add(new SchedAssignment(employees[e].Id, groups[g].ShiftId, groups[g].Date));
                }
            }

            return new CpSatResult
            {
                Success = true,
                SolverStatus = status,
                Assignments = assignments,
                FilledSlots = assignments.Count,
                TotalSlots = groups.Sum(g => g.Required),
                DurationMs = sw.ElapsedMilliseconds,
            };
        }

        // ── Consecutive-hours encoding ───────────────────────────────────────

        private static void EncodeConsecutiveHours(
            CpModel model,
            SchedulingContext ctx,
            List<SchedEmployee> employees,
            List<SlotGroup> groups,
            Dictionary<(int, int), BoolVar> x,
            DateOnly paddedStart, DateOnly paddedEnd,
            DateOnly minDate, DateOnly maxDate,
            Dictionary<(Guid, DayOfWeek), double> dayHoursByShift,
            Dictionary<(Guid empId, DateOnly date), Guid> lockedShiftByEmpDay)
        {
            // Per-employee, per-day worked literals + per-day hours expressions.
            // Literals are reused across all window sizes — that's the point of
            // building them once outside the W loop.
            for (int e = 0; e < employees.Count; e++)
            {
                var emp = employees[e];
                var workedByDate = new Dictionary<DateOnly, ILiteral>();
                var hoursVarsByDate = new Dictionary<DateOnly, List<LinearExpr>>();
                var hoursConstByDate = new Dictionary<DateOnly, long>();

                for (var d = paddedStart; d <= paddedEnd; d = d.AddDays(1))
                {
                    if (d >= minDate && d <= maxDate)
                    {
                        var dayVars = new List<BoolVar>();
                        var dayHourTerms = new List<LinearExpr>();
                        for (int g = 0; g < groups.Count; g++)
                        {
                            if (groups[g].Date != d) continue;
                            if (!x.TryGetValue((e, g), out var v)) continue;
                            dayVars.Add(v);
                            dayHourTerms.Add(LinearExpr.Term(v, ScaleHours(groups[g].Hours)));
                        }

                        if (dayVars.Count == 0)
                        {
                            workedByDate[d] = model.FalseLiteral();
                            hoursVarsByDate[d] = [];
                            hoursConstByDate[d] = 0;
                        }
                        else
                        {
                            var w = model.NewBoolVar($"w_{e}_{d:yyyyMMdd}");
                            // worked = max of the day's vars (= OR, since at-most-one is enforced).
                            model.AddMaxEquality(w, dayVars);
                            workedByDate[d] = w;
                            hoursVarsByDate[d] = dayHourTerms;
                            hoursConstByDate[d] = 0;
                        }
                    }
                    else
                    {
                        // Padding day: constant from locked / prior assignments.
                        if (lockedShiftByEmpDay.TryGetValue((emp.Id, d), out var shiftId))
                        {
                            workedByDate[d] = model.TrueLiteral();
                            hoursVarsByDate[d] = [];
                            hoursConstByDate[d] = dayHoursByShift.TryGetValue((shiftId, d.DayOfWeek), out var h)
                                ? ScaleHours(h) : 0;
                        }
                        else
                        {
                            workedByDate[d] = model.FalseLiteral();
                            hoursVarsByDate[d] = [];
                            hoursConstByDate[d] = 0;
                        }
                    }
                }

                // Slide every window size W from MinStreakWindow to MaxStreakWindow
                // across the padded range. Skip windows that don't touch the
                // optimization range — those are pure-constant and have no
                // bearing on decision variables.
                for (int W = MinStreakWindow; W <= MaxStreakWindow; W++)
                {
                    for (var d = paddedStart; d.AddDays(W - 1) <= paddedEnd; d = d.AddDays(1))
                    {
                        var winDays = Enumerable.Range(0, W).Select(i => d.AddDays(i)).ToList();
                        if (!winDays.Any(wd => wd >= minDate && wd <= maxDate)) continue;

                        var literals = winDays.Select(wd => workedByDate[wd]).ToList();
                        var allWorked = model.NewBoolVar($"all_{e}_{d:yyyyMMdd}_{W}");

                        // Forward: allWorked = 1 → every literal = 1.
                        foreach (var lit in literals)
                            model.AddImplication(allWorked, lit);

                        // Reverse: every literal = 1 → allWorked = 1, expressed as
                        // OR(¬lit_0, ¬lit_1, …, allWorked).
                        var clauseLits = literals.Select(l => l.Not()).Append((ILiteral)allWorked).ToArray();
                        model.AddBoolOr(clauseLits);

                        // Aggregate hours in the window: variable terms + locked constants.
                        var terms = new List<LinearExpr>();
                        long constant = 0;
                        foreach (var wd in winDays)
                        {
                            if (hoursVarsByDate.TryGetValue(wd, out var t)) terms.AddRange(t);
                            if (hoursConstByDate.TryGetValue(wd, out var c)) constant += c;
                        }

                        var rhs = ScaleHours(MaxConsecutiveHours) - constant;
                        if (rhs < 0)
                        {
                            // Locked constants alone already exceed the cap. allWorked must be 0.
                            model.Add(allWorked == 0);
                            continue;
                        }

                        if (terms.Count > 0)
                            model.Add(LinearExpr.Sum(terms) <= rhs).OnlyEnforceIf(allWorked);
                        // (When terms.Count == 0 and rhs >= 0, the constraint is trivially satisfied.)
                    }
                }
            }
        }

        // ── ShiftVariety as soft penalty ─────────────────────────────────────
        // For each (employee, shift, 3-day-window) where all three days place
        // the employee on the same shift, we count one violation. Padding days
        // contribute as constants. The total violation count is returned as
        // a single integer expression that the caller subtracts from the
        // objective with a priority-weighted multiplier.

        private static IntVar? AddShiftVarietyPenalty(
            CpModel model,
            SchedulingContext ctx,
            List<SchedEmployee> employees,
            List<SlotGroup> groups,
            Dictionary<(int, int), BoolVar> x,
            DateOnly paddedStart, DateOnly paddedEnd,
            DateOnly minDate, DateOnly maxDate,
            Dictionary<(Guid empId, DateOnly date), Guid> lockedShiftByEmpDay)
        {
            // Per-(employee, shift, day) literal: 1 iff that employee is
            // assigned to that shift on that day. In-range = sum of x for
            // matching groups (at most 1). Padding = constant.
            var shiftIds = ctx.Shifts.Select(s => s.Id).ToList();
            if (shiftIds.Count == 0 || employees.Count == 0) return null;

            var triples = new List<BoolVar>();

            for (int e = 0; e < employees.Count; e++)
            {
                var emp = employees[e];
                foreach (var shiftId in shiftIds)
                {
                    var occByDate = new Dictionary<DateOnly, ILiteral>();
                    for (var d = paddedStart; d <= paddedEnd; d = d.AddDays(1))
                    {
                        if (d >= minDate && d <= maxDate)
                        {
                            var matchingVars = new List<BoolVar>();
                            for (int g = 0; g < groups.Count; g++)
                            {
                                if (groups[g].ShiftId != shiftId) continue;
                                if (groups[g].Date != d) continue;
                                if (x.TryGetValue((e, g), out var v)) matchingVars.Add(v);
                            }
                            if (matchingVars.Count == 0)
                                occByDate[d] = model.FalseLiteral();
                            else
                            {
                                var occ = model.NewBoolVar($"occ_{e}_{shiftId}_{d:yyyyMMdd}");
                                model.AddMaxEquality(occ, matchingVars);
                                occByDate[d] = occ;
                            }
                        }
                        else
                        {
                            var lockedOnShift = lockedShiftByEmpDay.TryGetValue((emp.Id, d), out var sid)
                                && sid == shiftId;
                            occByDate[d] = lockedOnShift ? model.TrueLiteral() : model.FalseLiteral();
                        }
                    }

                    // Sliding 3-day same-shift triples that touch the range.
                    for (var d = paddedStart; d.AddDays(2) <= paddedEnd; d = d.AddDays(1))
                    {
                        var days = new[] { d, d.AddDays(1), d.AddDays(2) };
                        if (!days.Any(wd => wd >= minDate && wd <= maxDate)) continue;

                        var triple = model.NewBoolVar($"triple_{e}_{shiftId}_{d:yyyyMMdd}");
                        // triple = 1 iff all three occByDate are 1.
                        foreach (var wd in days)
                            model.AddImplication(triple, occByDate[wd]);
                        var orLits = days.Select(wd => occByDate[wd].Not()).Append((ILiteral)triple).ToArray();
                        model.AddBoolOr(orLits);
                        triples.Add(triple);
                    }
                }
            }

            if (triples.Count == 0) return null;

            // Total violations = sum of triple indicators. Capped above by
            // triples.Count for IntVar bounds.
            var total = model.NewIntVar(0, triples.Count, "shiftVarietyViolations");
            model.Add(total == LinearExpr.Sum(triples));
            return total;
        }

        // Builds Σ over (employee, week) of max(0, totalWeeklyHours − contractedCap),
        // expressed in scaled hours. Used as a soft penalty when the Overtime hard
        // cap is intentionally relaxed by the caller.
        private static IntVar? AddOvertimeOverridePenalty(
            CpModel model,
            SchedulingContext ctx,
            List<SchedEmployee> employees,
            List<SlotGroup> groups,
            Dictionary<(int, int), BoolVar> x,
            Dictionary<(Guid, DayOfWeek), double> dayHoursByShift)
        {
            var groupIdxByWeek = groups
                .Select((g, idx) => (g, idx))
                .GroupBy(t => MondayOf(t.g.Date))
                .ToDictionary(grp => grp.Key, grp => grp.Select(t => t.idx).ToList());

            if (groupIdxByWeek.Count == 0) return null;

            // Upper bound per employee per week — 7 × 24h × HourScale leaves plenty of room.
            const long PerWeekMaxScaledHours = 7L * 24L * HourScale;
            var excessTerms = new List<IntVar>();

            for (int e = 0; e < employees.Count; e++)
            {
                var emp = employees[e];
                foreach (var (weekStart, groupIdxs) in groupIdxByWeek)
                {
                    var weeklyTerms = new List<LinearExpr>();
                    long lockedHoursThisWeek = SumStaticHoursForEmployeeInRange(
                        ctx, emp.Id, weekStart, weekStart.AddDays(6), dayHoursByShift);

                    foreach (var g in groupIdxs)
                    {
                        if (!x.TryGetValue((e, g), out var v)) continue;
                        weeklyTerms.Add(LinearExpr.Term(v, ScaleHours(groups[g].Hours)));
                    }

                    if (weeklyTerms.Count == 0 && lockedHoursThisWeek == 0) continue;

                    long cap = ScaleHours(emp.WeeklyHours);
                    var excess = model.NewIntVar(0, PerWeekMaxScaledHours, $"otExcess_e{e}_w{weekStart:yyyyMMdd}");

                    // excess ≥ (locked + variable) − cap. The solver, maximizing the
                    // objective, drives excess down to its true value at optimum since
                    // any larger value strictly reduces the objective.
                    var lhs = LinearExpr.Sum(weeklyTerms) + lockedHoursThisWeek;
                    model.Add(excess >= lhs - cap);
                    excessTerms.Add(excess);
                }
            }

            if (excessTerms.Count == 0) return null;

            var total = model.NewIntVar(0, PerWeekMaxScaledHours * Math.Max(1, excessTerms.Count), "overtimeExcessTotal");
            model.Add(total == LinearExpr.Sum(excessTerms));
            return total;
        }

        private static long SoftWeight(int priority) => Math.Max(1, 1_000L / (priority + 1));

        // ── Static rest-period pre-filter against locked neighbours ──────────

        private static bool ViolatesRestVsLocked(
            Guid employeeId,
            SlotGroup group,
            double slotStart,
            double slotEnd,
            Dictionary<(Guid empId, DateOnly date), Guid> lockedShiftByEmpDay,
            Dictionary<(Guid, DayOfWeek), double> dayHours,
            Dictionary<(Guid, DayOfWeek), double> startHourByShift)
        {
            // Previous day: need ≥ 12 h between locked-end and group-start.
            var prevDay = group.Date.AddDays(-1);
            if (lockedShiftByEmpDay.TryGetValue((employeeId, prevDay), out var prevShift))
            {
                if (startHourByShift.TryGetValue((prevShift, prevDay.DayOfWeek), out var prevStart)
                    && dayHours.TryGetValue((prevShift, prevDay.DayOfWeek), out var prevHours))
                {
                    var prevEnd = prevStart + prevHours;
                    var rest = (24 + slotStart) - prevEnd;
                    if (rest < MinRestHours) return true;
                }
            }

            // Next day: same check in the other direction.
            var nextDay = group.Date.AddDays(1);
            if (lockedShiftByEmpDay.TryGetValue((employeeId, nextDay), out var nextShift))
            {
                if (startHourByShift.TryGetValue((nextShift, nextDay.DayOfWeek), out var nextStart))
                {
                    var rest = (24 + nextStart) - slotEnd;
                    if (rest < MinRestHours) return true;
                }
            }

            return false;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private readonly record struct SlotGroup(
            DateOnly Date, Guid ShiftId, Guid? PositionId, int Required, double Hours);

        private static List<SlotGroup> ExpandGroups(SchedulingContext ctx)
        {
            var groups = new List<SlotGroup>();
            var daySchedIndex = ctx.DaySchedules.ToDictionary(d => (d.ShiftId, d.DayOfWeek));
            var posReqsByShift = ctx.PositionRequirements
                .GroupBy(r => r.ShiftId)
                .ToDictionary(g => g.Key, g => g.ToList());
            var posReqOverrides = ctx.PositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.Date, o.PositionId), o => o.RequiredCount);
            var posReqDayOverrides = ctx.DayPositionRequirementOverrides
                .ToDictionary(o => (o.ShiftId, o.DayOfWeek, o.PositionId), o => o.RequiredCount);

            for (var date = ctx.WeekStart; date <= ctx.WeekEnd; date = date.AddDays(1))
            {
                var dow = date.DayOfWeek;
                if (!ctx.WeekendsWorking && (dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday))
                    continue;

                foreach (var shift in ctx.Shifts)
                {
                    if (!daySchedIndex.TryGetValue((shift.Id, dow), out var ds)) continue;
                    if (!posReqsByShift.TryGetValue(shift.Id, out var posReqs) || posReqs.Count == 0) continue;

                    foreach (var req in posReqs)
                    {
                        var required = posReqDayOverrides.TryGetValue((shift.Id, dow, req.PositionId), out var dayOv)
                            ? dayOv : req.RequiredCount;
                        if (posReqOverrides.TryGetValue((shift.Id, date, req.PositionId), out var dateOv))
                            required = dateOv;

                        if (required <= 0) continue;
                        groups.Add(new SlotGroup(date, shift.Id, req.PositionId, required, ds.Hours));
                    }
                }
            }
            return groups;
        }

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
        /// Returns a flat (employeeId, date) → shiftId map combining locked
        /// and prior assignments. When the same (employee, date) appears in
        /// both, locked wins (it's the more recent/in-range artefact).
        /// </summary>
        private static Dictionary<(Guid empId, DateOnly date), Guid> BuildLockedShiftIndex(SchedulingContext ctx)
        {
            var dict = new Dictionary<(Guid, DateOnly), Guid>();
            foreach (var a in ctx.PriorAssignments)
                dict[(a.EmployeeId, a.Date)] = a.ShiftId;
            foreach (var a in ctx.LockedAssignments)
                dict[(a.EmployeeId, a.Date)] = a.ShiftId;
            return dict;
        }

        private static bool IsRotationOffDay(
            SchedEmployee emp,
            DateOnly date,
            SchedulingContext ctx,
            Dictionary<Guid, SchedRotationPattern> patternById)
        {
            if (emp.RotationPatternId is null) return false;
            if (!ctx.RotationAnchors.TryGetValue(emp.Id, out var anchor)) return false;
            if (!patternById.TryGetValue(emp.RotationPatternId.Value, out var pattern)) return false;

            var cycle = pattern.DaysOn + pattern.DaysOff;
            if (cycle <= 0) return false;

            var workingDays = CountWorkingDays(anchor, date, ctx.WeekendsWorking);
            var mod = ((workingDays % cycle) + cycle) % cycle;
            return mod >= pattern.DaysOn;
        }

        private static int CountWorkingDays(DateOnly from, DateOnly to, bool weekendsWorking)
        {
            var totalDays = to.DayNumber - from.DayNumber;
            if (totalDays <= 0) return 0;
            if (weekendsWorking) return totalDays;

            var fullWeeks = totalDays / 7;
            var remainder = totalDays % 7;
            var weekendDays = fullWeeks * 2;
            var startDow = (int)from.DayOfWeek;
            for (var i = 0; i < remainder; i++)
            {
                var dow = (startDow + i) % 7;
                if (dow == 0 || dow == 6) weekendDays++;
            }
            return totalDays - weekendDays;
        }

        private static long SumStaticHoursForEmployeeInRange(
            SchedulingContext ctx,
            Guid employeeId,
            DateOnly fromDate,
            DateOnly toDate,
            Dictionary<(Guid, DayOfWeek), double> dayHours)
        {
            long total = 0;
            foreach (var a in ctx.LockedAssignments)
            {
                if (a.EmployeeId != employeeId) continue;
                if (a.Date < fromDate || a.Date > toDate) continue;
                if (dayHours.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                    total += ScaleHours(h);
            }
            foreach (var a in ctx.PriorAssignments)
            {
                if (a.EmployeeId != employeeId) continue;
                if (a.Date < fromDate || a.Date > toDate) continue;
                if (dayHours.TryGetValue((a.ShiftId, a.Date.DayOfWeek), out var h))
                    total += ScaleHours(h);
            }
            return total;
        }

        private static long ScaleHours(double hours) => (long)Math.Round(hours * HourScale);

        private static DateOnly MondayOf(DateOnly date)
        {
            var diff = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
            return date.AddDays(-diff);
        }
    }
}
