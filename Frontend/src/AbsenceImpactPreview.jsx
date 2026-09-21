import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Hourglass,
  Info,
  Layers,
  ShieldAlert,
} from "lucide-react";
import api from "./utils/axiosInstance";
import { formatDate } from "./utils/dateFormatter";

const REGIME_LABEL = {
  StandardWeek: "Mon–Fri week",
  Scheduled: "7-day · scheduled",
  Approximated: "7-day · approximated",
};

const REGIME_TONE = {
  StandardWeek: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Scheduled: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  Approximated: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
};

const MODE_LABEL = {
  PreSchedule: "Schedule not generated",
  PostSchedule: "Fully scheduled",
  Mixed: "Partially scheduled",
};

const SEVERITY_TONE = {
  Critical: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800",
  Warning: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800",
  Info: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800",
};

/**
 * Shows AbsenceImpactDto in a collapsible panel.
 * Provide ONE of:
 *  - { request: { employeeId, startDate, endDate, type } } → fetches PreviewImpact
 *  - { absenceId } → fetches PreviewExistingImpact
 *  - { impact } → renders a pre-loaded impact (no fetch)
 */
export default function AbsenceImpactPreview({
  request,
  absenceId,
  impact: providedImpact,
  compact = false,
  onLoaded,
}) {
  const [impact, setImpact] = useState(providedImpact ?? null);
  const [loading, setLoading] = useState(!providedImpact);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (providedImpact) {
      setImpact(providedImpact);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        let res;
        if (absenceId) {
          res = await api.get(`/Absence/PreviewExistingImpact?absenceId=${absenceId}`);
        } else if (
          request?.employeeId &&
          request?.startDate &&
          request?.endDate &&
          request?.type !== undefined &&
          request?.type !== null
        ) {
          const params = new URLSearchParams({
            employeeId: request.employeeId,
            startDate: request.startDate,
            endDate: request.endDate,
            type: String(request.type),
          });
          res = await api.get(`/Absence/PreviewImpact?${params.toString()}`);
        } else {
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setImpact(res.data);
        onLoaded?.(res.data);
      } catch {
        if (!cancelled) setError("Could not compute impact. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [
    absenceId,
    request?.employeeId,
    request?.startDate,
    request?.endDate,
    request?.type,
    providedImpact,
  ]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        <Hourglass className="h-4 w-4 animate-pulse" />
        Calculating impact…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
        {error}
      </div>
    );
  }

  if (!impact) return null;

  const hasConflicts = (impact.conflicts?.length ?? 0) > 0;
  const hasWarnings = (impact.coverageWarnings?.length ?? 0) > 0;
  const hasNotices = (impact.notices?.length ?? 0) > 0;
  const showBalance = impact.type === 2 || impact.typeLabel === "Vacation";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Header impact={impact} />
      <Metrics impact={impact} />

      {hasNotices && (
        <CollapsibleSection
          title={`Notes (${impact.notices.length})`}
          icon={<Info className="h-4 w-4 text-sky-600" />}
          defaultOpen
        >
          <div className="space-y-1.5 px-5 pb-3">
            {impact.notices.map((n, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-[12px] text-blue-800 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-900"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{n}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {hasConflicts && (
        <CollapsibleSection
          title={`Schedule conflicts (${impact.conflicts.length})`}
          icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
          subtitle="Released on approval"
          defaultOpen
        >
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {impact.conflicts.map((c) => (
              <li
                key={c.assignmentId}
                className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(c.date)}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700 dark:text-gray-300">{c.shiftLabel}</span>
                </div>
                <span className="text-[12px] tabular-nums text-gray-500 dark:text-gray-400">
                  {Number(c.hours).toFixed(2)}h
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {hasWarnings && (
        <CollapsibleSection
          title={`Coverage warnings (${impact.coverageWarnings.length})`}
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          subtitle="Slots understaffed after release"
          defaultOpen
        >
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {impact.coverageWarnings.map((w, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={SEVERITY_TONE[w.severity] ?? SEVERITY_TONE.Info}>
                    {w.severity}
                  </Pill>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(w.date)}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700 dark:text-gray-300">{w.shiftLabel}</span>
                  {w.positionTitle && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-700 dark:text-gray-300">{w.positionTitle}</span>
                    </>
                  )}
                </div>
                <span className="text-[12px] tabular-nums text-gray-500 dark:text-gray-400">
                  {w.assignedAfter} / {w.required}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {showBalance && impact.balance && (
        <CollapsibleSection
          title="Vacation balance"
          icon={
            impact.sufficient ? (
              <CircleCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )
          }
          defaultOpen
        >
          <BalancePanel balance={impact.balance} sufficient={impact.sufficient} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Day-by-day breakdown"
        icon={<CalendarDays className="h-4 w-4 text-gray-400" />}
        subtitle={`${impact.days?.length ?? 0} days`}
        defaultOpen={false}
      >
        <DayGrid days={impact.days} />
      </CollapsibleSection>
    </div>
  );
}

function Header({ impact }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/30">
          <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Absence impact
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {formatDate(impact.startDate)}
            <span className="mx-1.5 text-gray-300">→</span>
            {formatDate(impact.endDate)}
            <span className="ml-1.5 text-xs font-medium text-gray-500">
              · {impact.calendarDays} day{impact.calendarDays === 1 ? "" : "s"}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={REGIME_TONE[impact.regime] ?? REGIME_TONE.StandardWeek}>
          {REGIME_LABEL[impact.regime] ?? impact.regime}
        </Pill>
        <Pill tone="bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          {MODE_LABEL[impact.mode] ?? impact.mode}
        </Pill>
        {impact.hoursEstimated && (
          <Pill tone="bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800">
            <Info className="mr-1 inline h-3 w-3" /> Estimated
          </Pill>
        )}
      </div>
    </div>
  );
}

function Metrics({ impact }) {
  const items = [
    {
      label: "Charged days",
      value: String(impact.chargedWorkingDays),
      sub:
        impact.regime === "Approximated"
          ? "Approximation — finalized at approval"
          : impact.regime === "StandardWeek"
            ? "Mon–Fri inside range"
            : "From schedule",
      icon: <CalendarDays className="h-4 w-4 text-blue-500" />,
    },
    {
      label: "Charged hours",
      value: Number(impact.chargedWorkingHours ?? 0).toFixed(2),
      sub: impact.hoursEstimated ? "Estimated" : "From schedule",
      icon: <Clock className="h-4 w-4 text-blue-500" />,
    },
    {
      label:
        impact.regime === "StandardWeek"
          ? "Weekend days"
          : impact.regime === "Approximated"
            ? "Approx. off days"
            : "Off days",
      value: String(
        impact.regime === "StandardWeek"
          ? impact.calendarWeekendDays
          : impact.regime === "Approximated"
            ? Math.max(0, (impact.calendarDays ?? 0) - (impact.chargedWorkingDays ?? 0))
            : impact.pseudoWeekendDays
      ),
      sub: impact.regime === "Approximated" ? "Estimated, not charged" : "Not charged",
      icon: <Layers className="h-4 w-4 text-emerald-500" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700">
      {items.map((it, i) => (
        <div key={i} className="bg-white px-4 py-3 dark:bg-gray-800">
          <div className="flex items-center gap-1.5">
            {it.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {it.label}
            </span>
          </div>
          <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white tabular-nums">
            {it.value}
          </p>
          {it.sub && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{it.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function BalancePanel({ balance, sufficient }) {
  const tone = sufficient
    ? "ring-emerald-200 dark:ring-emerald-800"
    : "ring-rose-200 dark:ring-rose-800";
  return (
    <div className={`mx-5 mb-3 rounded-lg bg-gray-50 p-4 ring-1 ${tone} dark:bg-gray-900/40`}>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Annual remaining" value={balance.currentRemainingAnnualDays} />
        <Stat label="Carried-over remaining" value={balance.currentRemainingCarriedOverDays} />
        <Stat label="After · Annual" value={balance.projectedRemainingAnnualDays} />
        <Stat label="After · Carried-over" value={balance.projectedRemainingCarriedOverDays} />
      </div>
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Deducting {balance.useFromAnnual} from annual + {balance.useFromCarriedOver} from carried-over.
      </p>
      {!sufficient && (
        <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          Not enough balance to cover this request.
        </div>
      )}
    </div>
  );
}

function DayGrid({ days }) {
  const list = useMemo(() => days ?? [], [days]);
  if (!list.length) return null;
  return (
    <ul className="grid grid-cols-1 gap-px bg-gray-100 pb-2 sm:grid-cols-2 dark:bg-gray-700">
      {list.map((d) => (
        <li
          key={d.date}
          className="flex items-center justify-between bg-white px-4 py-2 text-[12px] dark:bg-gray-800"
        >
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-white">
              {formatDate(d.date)}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {dayKindLabel(d.kind)}
              {d.assignedShiftLabel ? ` · ${d.assignedShiftLabel}` : ""}
            </span>
          </div>
          <span
            className={`tabular-nums ${
              d.kind === "Working" ? "text-gray-900 dark:text-white" : "text-gray-400"
            }`}
          >
            {Number(d.hours).toFixed(2)}h
            {d.hoursEstimated && d.kind === "Working" && (
              <span className="ml-1 text-amber-500">~</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CollapsibleSection({ title, icon, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              · {subtitle}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function dayKindLabel(kind) {
  switch (kind) {
    case "Working": return "Working day";
    case "PseudoWeekendOff": return "Off day (no shift)";
    case "CalendarWeekendOff": return "Weekend (off)";
    case "Holiday": return "Holiday";
    default: return kind;
  }
}

function Pill({ tone, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone}`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
    </div>
  );
}
