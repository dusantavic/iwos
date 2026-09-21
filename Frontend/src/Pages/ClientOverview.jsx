import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  ShieldCheck,
  Users as UsersIcon,
  Lock,
  Hash,
  AlertCircle,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/axiosInstance";
import { defaultProfile, favicon } from "../assets";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_CODES = { ACTIVE: "ACTIVE", TRIAL: "TRIAL" };

const USER_TYPE_LABELS = {
  0: "Temporary",
  1: "Level 1",
  2: "Level 2",
  9: "Client Admin",
  10: "Global Admin",
};

const USER_TYPE_BADGE = {
  10: "bg-fuchsia-100 text-fuchsia-700",
  9: "bg-blue-100 text-blue-700",
  2: "bg-emerald-100 text-emerald-700",
  1: "bg-slate-100 text-slate-700",
  0: "bg-amber-100 text-amber-800",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientOverview() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api
      .get("/Client/GetOverview")
      .then(({ data }) => setOverview(data))
      .catch((e) => setError(e.message ?? "Failed to load"));
  };

  useEffect(() => {
    load();
  }, []);

  if (error && !overview) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const loading = !overview;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-700/70 dark:text-blue-400/70 font-semibold">
              Account
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
              Client Overview
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Subscription, organisation details, and registered users.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <img src={favicon} alt="Iwos" className="h-4" />
            <span className="font-semibold tracking-tight text-gray-700 dark:text-gray-200">
              Iwos
            </span>
          </div>
        </header>

        {/* Row 1: Subscription card (left) + Client info (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-7">
            <SubscriptionCard
              loading={loading}
              client={overview?.client}
              subscription={overview?.currentSubscription}
              maxPlannableDate={overview?.maxPlannableDate}
            />
          </div>
          <div className="lg:col-span-5">
            <ClientInfoCard loading={loading} client={overview?.client} />
          </div>
        </div>

        {/* Row 2: Users */}
        <UsersCard loading={loading} users={overview?.users ?? []} />
      </div>
    </div>
  );
}

// ── Subscription Card (premium / business-card style) ────────────────────────

function SubscriptionCard({ loading, client, subscription, maxPlannableDate }) {
  const view = useMemo(
    () => deriveSubscriptionView(subscription, maxPlannableDate),
    [subscription, maxPlannableDate],
  );

  if (loading) {
    return (
      <div className="aspect-[1.6/1] w-full rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative w-full aspect-[1.6/1] mx-auto"
    >
      {/* Soft shadow halo behind the card */}
      <div className="absolute inset-x-6 -bottom-3 h-8 rounded-full bg-blue-900/30 blur-2xl pointer-events-none" />

      {/* Card */}
      <div
        className={`
          relative h-full w-full rounded-2xl overflow-hidden
          shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)]
          ${view.bgClass}
          text-white
        `}
      >
        {/* Decorative blurred orbs */}
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top-right plan badge */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <span
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-full
              text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em]
              ${view.badgeClass}
            `}
          >
            {view.BadgeIcon && <view.BadgeIcon className="h-3 w-3" />}
            {view.badgeLabel}
          </span>
        </div>

        {/* Body */}
        <div className="relative z-10 h-full flex flex-col p-5 sm:p-7">
          {/* Brand row */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <img src={favicon} alt="Iwos" className="h-4 sm:h-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-semibold">
                Iwos
              </p>
              <p className="text-sm font-semibold tracking-tight">Workforce Suite</p>
            </div>
          </div>

          {/* Plan name */}
          <div className="mt-auto">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-semibold mb-1.5">
              {view.kind === "trial" ? "Trial Plan" : view.kind === "active" ? "Active Plan" : "Subscription"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {view.planName}
            </h2>
          </div>

          {/* Footer row */}
          <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-4 sm:gap-6">
            <CardField label="Card Holder" value={client?.name ?? "—"} />
            <CardField
              label={view.kind === "trial" ? "Valid Until" : "Member Since"}
              value={view.kind === "trial" ? view.validUntilLabel : view.startLabel ?? "—"}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Bottom strip — context info that doesn't belong on the card face */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        {view.kind === "trial" ? (
          <TrialProgressStrip view={view} />
        ) : view.kind === "active" ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            Full access · No scheduling cap
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
            <Lock className="h-4 w-4" />
            {view.message}
          </span>
        )}

        {client?.code && (
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono">
            <Hash className="h-3.5 w-3.5" /> {client.code}
          </span>
        )}
      </div>

      {/* Secondary metadata for trial — separate from the subscription countdown */}
      {view.kind === "trial" && view.planUpToLabel && (
        <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-600 dark:text-gray-300">
            Schedule planning window:
          </span>{" "}
          you may auto-schedule and assign shifts up to{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {view.planUpToLabel}
          </span>
          .
        </p>
      )}
    </motion.div>
  );
}

function CardField({ label, value, align = "left" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 font-semibold">
        {label}
      </p>
      <p className="text-sm sm:text-base font-semibold tracking-tight mt-0.5 truncate">
        {value}
      </p>
    </div>
  );
}

function TrialProgressStrip({ view }) {
  const lowOnDays = view.daysRemaining <= 7;
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {view.daysRemaining > 0
            ? `${view.daysRemaining} day${view.daysRemaining === 1 ? "" : "s"} remaining`
            : "Trial expired"}
        </span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400">
          {view.daysElapsed}/{view.totalDays}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            lowOnDays ? "bg-red-500" : view.percent >= 60 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, view.percent))}%` }}
        />
      </div>
    </div>
  );
}

// ── Client info card ─────────────────────────────────────────────────────────

function ClientInfoCard({ loading, client }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-blue-700 dark:text-blue-300" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
            Organisation
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Account contact and identity
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : (
        <dl className="space-y-3.5">
          <InfoRow icon={<Building2 className="h-4 w-4" />} label="Client" value={client?.name} />
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Contact email"
            value={
              client?.contactEmail ? (
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {client.contactEmail}
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Contact person" value={client?.contactPerson} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={client?.contactPhone} />
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={[client?.address, client?.country].filter(Boolean).join(", ")}
          />
        </dl>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ── Users card ───────────────────────────────────────────────────────────────

function UsersCard({ loading, users }) {
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <UsersIcon className="h-4 w-4 text-blue-700 dark:text-blue-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Application Users
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loading ? "Loading…" : `${activeCount} active · ${users.length} total`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="p-10 text-center">
          <UsersIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No application users registered yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Last login</th>
                <th className="px-5 py-3 font-semibold">Member since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({ user }) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const roleLabel = USER_TYPE_LABELS[user.type] ?? "User";
  const roleClass = USER_TYPE_BADGE[user.type] ?? "bg-gray-100 text-gray-700";

  return (
    <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials || <img src={defaultProfile} alt="" className="h-full w-full rounded-full" />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{user.username}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleClass}`}>
          {roleLabel}
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
            user.active
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              user.active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
          {user.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-3 py-3 text-gray-600 dark:text-gray-300 text-xs">
        {formatDateTime(user.lastLogin) ?? <span className="text-gray-400">Never</span>}
      </td>
      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs">
        {formatDateTime(user.createdOn) ?? "—"}
      </td>
    </tr>
  );
}

// ── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-full flex items-center justify-center p-10">
      <div className="max-w-md text-center">
        <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Couldn't load your account
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveSubscriptionView(subscription, maxPlannableDate) {
  if (!subscription) {
    return {
      kind: "blocked",
      planName: "No subscription",
      badgeLabel: "Locked",
      BadgeIcon: Lock,
      badgeClass: "bg-red-500/20 text-red-100 ring-1 ring-red-300/40",
      bgClass: "bg-gradient-to-br from-slate-800 via-slate-900 to-black",
      message: "Scheduling is unavailable for this client.",
    };
  }

  const start = parseDate(subscription.startDate);

  if (subscription.subscriptionPlanTypeCode === PLAN_CODES.TRIAL) {
    // The trial COUNTDOWN is driven by the subscription period (EndDate is
    // exclusive — the day after the last usable day). The PLANNING WINDOW
    // (maxPlannableDate) is shown separately as informational context.
    const subscriptionEnd = parseDate(subscription.endDate);
    const planUpTo = parseDate(maxPlannableDate);
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

    // EndDate is exclusive, so the LAST USABLE day is the day before it.
    const lastUsable = subscriptionEnd
      ? new Date(subscriptionEnd.getTime() - 86_400_000)
      : null;

    return {
      kind: "trial",
      planName: subscription.subscriptionPlanTypeName ?? "Trial",
      badgeLabel: "Trial",
      BadgeIcon: Rocket,
      badgeClass: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40",
      bgClass:
        "bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950",
      startLabel: formatDate(start),
      // Card face: "Valid Until <last usable day>" reads more intuitively
      // than the exclusive end date itself.
      validUntilLabel: formatDate(lastUsable),
      planUpToLabel: formatDate(planUpTo),
      totalDays,
      daysElapsed,
      daysRemaining,
      percent,
    };
  }

  if (subscription.subscriptionPlanTypeCode === PLAN_CODES.ACTIVE) {
    return {
      kind: "active",
      planName: subscription.subscriptionPlanTypeName ?? "Active",
      badgeLabel: "Active",
      BadgeIcon: ShieldCheck,
      badgeClass: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40",
      // Active: deep Iwos navy + blue, with subtle indigo for depth.
      bgClass:
        "bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950",
      startLabel: formatDate(start),
    };
  }

  return {
    kind: "blocked",
    planName: subscription.subscriptionPlanTypeName ?? "Unknown plan",
    badgeLabel: "Unknown",
    BadgeIcon: Lock,
    badgeClass: "bg-white/15 text-white ring-1 ring-white/30",
    bgClass: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
    message: "This subscription plan is not recognised.",
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
  if (!d) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

