import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  CalendarDays,
  CheckCircle2,
  UserPlus,
  Users,
  Activity,
  Inbox,
  Scale,
} from "lucide-react";
import api from "../utils/axiosInstance";
import { getUser } from "../utils/authService";
import { getFormattedDateRange } from "../utils/dateFormatter";
import KpiTile from "./DashboardV2/KpiTile";
import QuickAction from "./DashboardV2/QuickAction";
import TodayCoverageCard from "./DashboardV2/sections/TodayCoverageCard";
import WeekCoverageCard from "./DashboardV2/sections/WeekCoverageCard";
import UnfilledSlotsCard from "./DashboardV2/sections/UnfilledSlotsCard";
import HoursVarianceCard from "./DashboardV2/sections/HoursVarianceCard";
import ScheduleHealthCard from "./DashboardV2/sections/ScheduleHealthCard";
import PendingApprovalsCard from "./DashboardV2/sections/PendingApprovalsCard";
import UpcomingAbsencesCard from "./DashboardV2/sections/UpcomingAbsencesCard";
import SubscriptionCard from "./DashboardV2/sections/SubscriptionCard";

export default function DashboardV2() {
  const navigate = useNavigate();
  const user = getUser();
  const [kpis, setKpis] = useState(null);
  const [today, setToday] = useState(null);
  const [config, setConfig] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [hours, setHours] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch the three KPI / today / config endpoints in parallel on mount.
  // Coverage + hours wait for KPIs to resolve so they can use the same week
  // anchor the backend just computed.
  const fetchInitial = useCallback((signal) => {
    setErrors({});
    Promise.all([
      api.get("/Dashboard/GetOverviewKpis", { signal }),
      api.get("/Dashboard/GetTodayShiftCoverage", { signal }),
      api.get("/Dashboard/GetConfigurationSnapshot", { signal }),
    ])
      .then(([k, t, c]) => {
        setKpis(k.data);
        setToday(t.data ?? []);
        setConfig(c.data);
      })
      .catch((e) => {
        if (e.code === "ERR_CANCELED") return;
        setErrors((prev) => ({ ...prev, primary: e.message ?? "Failed to load" }));
      });
  }, []);

  const fetchCoverageAndHours = useCallback((weekStart, signal) => {
    Promise.all([
      api.get("/Dashboard/GetWeekCoverageBreakdown", { params: { weekStart }, signal }),
      api.get("/Dashboard/GetWorkingHoursSummary", { params: { weekStart }, signal }),
    ])
      .then(([c, h]) => {
        setCoverage(c.data);
        setHours(h.data);
      })
      .catch((e) => {
        if (e.code === "ERR_CANCELED") return;
        setErrors((prev) => ({ ...prev, secondary: e.message ?? "Failed to load" }));
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchInitial(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchInitial]);

  useEffect(() => {
    if (!kpis?.currentWeek?.weekStart) return;
    const ctrl = new AbortController();
    fetchCoverageAndHours(kpis.currentWeek.weekStart, ctrl.signal);
    return () => ctrl.abort();
  }, [kpis?.currentWeek?.weekStart, fetchCoverageAndHours]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const weekRangeLabel = useMemo(() => {
    if (!kpis?.currentWeek) return "";
    return getFormattedDateRange(kpis.currentWeek.weekStart, kpis.currentWeek.weekEnd);
  }, [kpis?.currentWeek]);

  const totalPendingApprovals =
    kpis?.pendingAbsenceApprovals ?? 0;

  const hoursTone =
    Math.abs(kpis?.weekHoursVariance?.averageDeviationHours ?? 0) < 2
      ? "positive"
      : Math.abs(kpis?.weekHoursVariance?.averageDeviationHours ?? 0) < 5
      ? "warning"
      : "critical";

  const todayCoverageTone =
    (kpis?.todayCoverage?.percent ?? 0) >= 100
      ? "positive"
      : (kpis?.todayCoverage?.percent ?? 0) >= 60
      ? "warning"
      : "critical";

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto space-y-4 sm:space-y-6">
        {/* Row 1 — Welcome strip */}
        <WelcomeStrip
          greeting={greeting}
          name={user?.firstName ?? ""}
          weekRange={weekRangeLabel}
          isPublished={kpis?.currentWeek?.isPublished}
          firstUnscheduledMonth={kpis?.firstUnscheduledMonthStart}
          firstUnscheduledWeek={kpis?.firstUnscheduledWeekStart}
          pendingCount={totalPendingApprovals}
          onNavigate={navigate}
        />

        {/* Row 2 — KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <KpiTile
            label="Active employees"
            value={kpis?.activeEmployees ?? "—"}
            sub="On the roster"
            icon={<Users className="h-3.5 w-3.5" />}
            loading={!kpis}
            delay={0}
          />
          <KpiTile
            label="Today's coverage"
            value={`${kpis?.todayCoverage?.percent ?? 0}%`}
            sub={
              kpis
                ? `${kpis.todayCoverage.filled} / ${kpis.todayCoverage.required} slots filled`
                : null
            }
            icon={<Activity className="h-3.5 w-3.5" />}
            tone={kpis ? todayCoverageTone : "neutral"}
            loading={!kpis}
            delay={0.04}
          />
          <KpiTile
            label="Pending approvals"
            value={totalPendingApprovals}
            sub={
              kpis
                ? `${kpis.pendingAbsenceApprovals} absence · ${kpis.pendingSwapApprovals} swap`
                : null
            }
            icon={<Inbox className="h-3.5 w-3.5" />}
            tone={totalPendingApprovals > 0 ? "warning" : "positive"}
            loading={!kpis}
            delay={0.08}
            onClick={() => navigate("/absences")}
          />
          <KpiTile
            label="Hours balance"
            value={
              kpis
                ? `${kpis.weekHoursVariance.averageDeviationHours > 0 ? "+" : ""}${kpis.weekHoursVariance.averageDeviationHours}h`
                : "—"
            }
            sub={
              kpis
                ? `${kpis.weekHoursVariance.overUtilizedCount} over · ${kpis.weekHoursVariance.underUtilizedCount} under`
                : null
            }
            icon={<Scale className="h-3.5 w-3.5" />}
            tone={kpis ? hoursTone : "neutral"}
            loading={!kpis}
            delay={0.12}
          />
        </div>

        {/* Row 3 — Week coverage (8) | Today's coverage (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          <div className="lg:col-span-8 h-full">
            <WeekCoverageCard
              data={coverage}
              error={errors.secondary}
              onRetry={() =>
                kpis?.currentWeek?.weekStart &&
                fetchCoverageAndHours(kpis.currentWeek.weekStart)
              }
            />
          </div>
          <div className="lg:col-span-4 h-full">
            <TodayCoverageCard
              data={today}
              error={errors.primary}
              onRetry={() => fetchInitial()}
            />
          </div>
        </div>

        {/* Row 4 — Unfilled slots */}
        <UnfilledSlotsCard
          data={coverage}
          error={errors.secondary}
          onRetry={() =>
            kpis?.currentWeek?.weekStart &&
            fetchCoverageAndHours(kpis.currentWeek.weekStart)
          }
        />

        {/* Row 5 — Hours variance (6) | Schedule health (3) | Subscription (3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          <div className="lg:col-span-6 h-full">
            <HoursVarianceCard
              data={hours}
              error={errors.secondary}
              onRetry={() =>
                kpis?.currentWeek?.weekStart &&
                fetchCoverageAndHours(kpis.currentWeek.weekStart)
              }
            />
          </div>
          <div className="lg:col-span-3 h-full">
            <ScheduleHealthCard
              data={config}
              error={errors.primary}
              onRetry={() => fetchInitial()}
            />
          </div>
          <div className="lg:col-span-3 h-full">
            <SubscriptionCard />
          </div>
        </div>

        {/* Row 6 — Pending approvals | Upcoming absences (lazy-mounted) */}
        <LazyMount>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-stretch">
            <PendingApprovalsCard />
            <UpcomingAbsencesCard />
          </div>
        </LazyMount>
      </div>
    </div>
  );
}

// ── Welcome strip ────────────────────────────────────────────────────────────

function WelcomeStrip({
  greeting,
  name,
  weekRange,
  isPublished,
  firstUnscheduledMonth,
  firstUnscheduledWeek,
  pendingCount,
  onNavigate,
}) {
  return (
    <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}{name ? `, ${name}` : ""}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          {weekRange && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Week of {weekRange}</p>
          )}
          {isPublished !== undefined && weekRange && (
            <span
              className={`
                text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded
                ${isPublished ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}
              `}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <QuickAction
          icon={<CalendarRange className="h-4 w-4" />}
          label="Schedule next month"
          disabledLabel="All months scheduled"
          disabled={!firstUnscheduledMonth}
          onClick={() =>
            firstUnscheduledMonth &&
            onNavigate(`/shifts?view=month&date=${firstUnscheduledMonth}`)
          }
          variant="primary"
        />
        <QuickAction
          icon={<CalendarDays className="h-4 w-4" />}
          label="Schedule next week"
          disabledLabel="All weeks scheduled"
          disabled={!firstUnscheduledWeek}
          onClick={() =>
            firstUnscheduledWeek &&
            onNavigate(`/shifts?view=week&date=${firstUnscheduledWeek}`)
          }
        />
        <QuickAction
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Approve"
          badge={pendingCount}
          onClick={() => onNavigate("/absences")}
        />
        <QuickAction
          icon={<UserPlus className="h-4 w-4" />}
          label="Add employee"
          onClick={() => onNavigate("/employee/new")}
        />
      </div>
    </section>
  );
}

// ── Lazy-mount helper ────────────────────────────────────────────────────────

function LazyMount({ children, rootMargin = "200px" }) {
  const [shouldMount, setShouldMount] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (shouldMount) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldMount(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldMount, rootMargin]);

  return (
    <div ref={ref} className="min-h-[180px]">
      {shouldMount ? children : null}
    </div>
  );
}
