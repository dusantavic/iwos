import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Lock, Clock, Rocket } from "lucide-react";
import api from "../../../utils/axiosInstance";
import DashboardCard from "../DashboardCard";

const PLAN_CODES = { ACTIVE: "ACTIVE", TRIAL: "TRIAL" };

export default function SubscriptionCard() {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => {
      setError(null);
      api
        .get("/Shift/GetSchedulingPolicy", { signal: ctrl.signal })
        .then(({ data }) => setPolicy(data))
        .catch((e) => {
          if (e.code === "ERR_CANCELED") return;
          setError(e.message ?? "Failed to load");
        });
    };
    load();
    return () => ctrl.abort();
  }, []);

  const view = useMemo(() => deriveView(policy), [policy]);
  const loading = policy == null && !error;

  return (
    <DashboardCard
      title="Subscription"
      subtitle={view?.subtitle}
      icon={view?.Icon ? <view.Icon className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={() => setPolicy(null)}
    >
      {view && <SubscriptionBody view={view} />}
    </DashboardCard>
  );
}

function SubscriptionBody({ view }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900 dark:text-white">
          {view.planName}
        </span>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${view.badgeClass}`}
        >
          {view.badgeLabel}
        </span>
      </div>

      {view.kind === "trial" && (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Trial usage</span>
              <span className="tabular-nums">
                {view.daysElapsed} / {view.totalDays} days
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${view.barClass}`}
                style={{ width: `${Math.min(100, Math.max(0, view.percent))}%` }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <DefRow label="Started" value={view.startLabel} />
            <DefRow label="Last usable day" value={view.endLabel} />
          </dl>

          <p
            className={`flex items-center gap-1.5 text-xs ${
              view.daysRemaining <= 7
                ? "text-amber-700 dark:text-amber-400"
                : "text-gray-600 dark:text-gray-300"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {view.daysRemaining > 0
              ? `${view.daysRemaining} day${view.daysRemaining === 1 ? "" : "s"} until trial ends`
              : "Trial has expired"}
          </p>

          {view.planUpToLabel && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed pt-1 border-t border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Planning window:
              </span>{" "}
              schedule up to{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {view.planUpToLabel}
              </span>
              .
            </p>
          )}
        </>
      )}

      {view.kind === "active" && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <DefRow label="Active since" value={view.startLabel ?? "—"} />
          <DefRow label="Scheduling window" value="Unlimited" />
        </dl>
      )}

      {view.kind === "blocked" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
          {view.message}
        </div>
      )}
    </div>
  );
}

function DefRow({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</dd>
    </div>
  );
}

// ── Derivation ────────────────────────────────────────────────────────────────
// Normalize the raw policy DTO into a render-ready view model. Keeps the
// JSX above readable and the date math out of the component body.

function deriveView(policy) {
  if (!policy) return null;

  if (policy.isBlocked) {
    return {
      kind: "blocked",
      Icon: Lock,
      planName: policy.subscriptionPlanName ?? "No subscription",
      badgeLabel: "Locked",
      badgeClass:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      subtitle: "Scheduling is unavailable",
      message:
        "The scheduling engine is locked for this client. Contact your administrator to assign an active subscription.",
    };
  }

  if (policy.subscriptionPlanCode === PLAN_CODES.TRIAL) {
    // Countdown is the SUBSCRIPTION PERIOD — driven by SubscriptionEndDate.
    // The planning window (maxPlannableDate) is a separate concept and is
    // shown as secondary metadata so the user understands the difference.
    const start = parseDate(policy.subscriptionStartDate);
    const subscriptionEnd = parseDate(policy.subscriptionEndDate);
    const planUpTo = parseDate(policy.maxPlannableDate);
    const today = startOfDay(new Date());

    const totalDays = start && subscriptionEnd
      ? Math.max(1, Math.round(diffInDays(start, subscriptionEnd)))
      : 0;
    const daysElapsed = start
      ? clamp(Math.round(diffInDays(start, today)), 0, totalDays)
      : 0;
    const daysRemaining = subscriptionEnd
      ? Math.max(0, Math.round(diffInDays(today, subscriptionEnd)))
      : 0;
    const percent = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    const barClass =
      percent >= 90 ? "bg-red-500" : percent >= 60 ? "bg-amber-500" : "bg-emerald-500";

    // EndDate is exclusive — last usable calendar day is the day before it.
    const lastUsable = subscriptionEnd
      ? new Date(subscriptionEnd.getTime() - 86_400_000)
      : null;

    return {
      kind: "trial",
      Icon: Rocket,
      planName: policy.subscriptionPlanName ?? "Trial",
      badgeLabel: "Trial",
      badgeClass:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      subtitle: "Trial subscription — limited scheduling window",
      startLabel: formatDate(start),
      endLabel: formatDate(lastUsable),
      planUpToLabel: formatDate(planUpTo),
      totalDays,
      daysElapsed,
      daysRemaining,
      percent,
      barClass,
    };
  }

  if (policy.subscriptionPlanCode === PLAN_CODES.ACTIVE) {
    const start = parseDate(policy.subscriptionStartDate);
    return {
      kind: "active",
      Icon: ShieldCheck,
      planName: policy.subscriptionPlanName ?? "Active",
      badgeLabel: "Active",
      badgeClass:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      subtitle: "Full access to scheduling",
      startLabel: formatDate(start),
    };
  }

  // Unknown / unmapped plan — show neutral "unknown" state without erroring.
  return {
    kind: "blocked",
    Icon: Lock,
    planName: policy.subscriptionPlanName ?? "Unknown plan",
    badgeLabel: "Unknown",
    badgeClass:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    subtitle: "Plan not recognised",
    message: "The current subscription plan is not recognised by this version of the app.",
  };
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffInDays(a, b) {
  return (startOfDay(b) - startOfDay(a)) / 86_400_000;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function formatDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
