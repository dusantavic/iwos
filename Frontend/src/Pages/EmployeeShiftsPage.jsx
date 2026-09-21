import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Star,
  UserX,
  UserMinus,
  ArrowLeftRight,
  X,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Users,
  CalendarDays,
  Repeat2,
  CalendarCheck,
  Coffee,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import portalApi from "../EmployeePortal/utils/portalAxiosInstance";
import { toYyyyMmDd } from "../utils/dateFormatter";
import { defaultProfile } from "../assets";
import {
  buildLocalConfig,
  buildWeeklyMaps,
  getActiveShifts,
  getShiftTime,
} from "../utils/shiftConfig";
import { getShiftUnavailableReports } from "../utils/shiftUnavailability";
import { EVENT_ICONS, EVENT_COLORS } from "../config/events.config";
import { getUser } from "../EmployeePortal/utils/portalAuthService";

const VITE_ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL;
const SHIFT_ICONS = { Sun, Moon, Star };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BLOCKING_ABSENCE_TYPES = {
  Vacation: "Vacation",
  SickLeave: "Sick Leave",
  "Sick Leave": "Sick Leave",
  JustifiedAbsence: "Justified Absence",
  "Justified Absence": "Justified Absence",
};

// Refined gradient palette — soft, premium, not loud
const SHIFT_THEMES = {
  Sun: { gradient: "from-amber-400 to-orange-500", chip: "bg-white/15", icon: "text-white" },
  Moon: { gradient: "from-indigo-500 to-blue-700", chip: "bg-white/15", icon: "text-white" },
  Star: { gradient: "from-violet-500 to-fuchsia-600", chip: "bg-white/15", icon: "text-white" },
};

// ── Utilities ─────────────────────────────────────────────────────────────

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatReportedAt(isoString) {
  const d = new Date(isoString);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

function parseShiftTime(t) {
  if (!t || typeof t !== "string") return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h + m / 60;
}

function formatSwapDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeUntil(startHour) {
  const now = new Date();
  const currentH = now.getHours() + now.getMinutes() / 60;
  if (currentH >= startHour) return null;
  const diff = startHour - currentH;
  const h = Math.floor(diff);
  const m = Math.round((diff - h) * 60);
  if (h === 0) return `in ${m} min`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}

function shiftDuration(startStr, endStr) {
  const s = parseShiftTime(startStr);
  const e = parseShiftTime(endStr);
  if (s == null || e == null) return null;
  const dur = e > s ? e - s : 24 - s + e;
  return dur;
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function EmployeeShiftsPage() {
  const currentUser = getUser();

  const [view, setView] = useState("home");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [config, setConfig] = useState(null);
  const [shifts, setShifts] = useState({});
  const [unavailability, setUnavailability] = useState({});
  const [myAbsences, setMyAbsences] = useState([]);
  const [swapTarget, setSwapTarget] = useState(null);
  const [swapRequests, setSwapRequests] = useState([]);
  const [selectedTeamDay, setSelectedTeamDay] = useState(null);

  const activeShifts = useMemo(() => getActiveShifts(config), [config]);
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekKey = useMemo(() => toYyyyMmDd(weekStart), [weekStart]);
  const today = useMemo(() => new Date(), []);

  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
  const visibleDays = useMemo(() => {
    if (!config || config.weekendsWorking) return weekDays;
    return weekDays.filter((d) => !isWeekend(d));
  }, [weekDays, config]);

  useEffect(() => { setSelectedTeamDay(null); }, [weekKey]);

  const activeTeamDay = useMemo(() => {
    if (selectedTeamDay) {
      const match = visibleDays.find((d) => isSameDay(d, selectedTeamDay));
      if (match) return match;
    }
    return visibleDays.find((d) => isSameDay(d, today)) ?? visibleDays[0];
  }, [selectedTeamDay, visibleDays, today]);

  useEffect(() => {
    portalApi
      .get("/EmployeePortal/ShiftConfig")
      .then(({ data }) => setConfig(buildLocalConfig(data)))
      .catch(() => {});
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const { data } = await portalApi.get("/EmployeePortal/MyWeeklySchedule", {
        params: { weekStart: weekKey },
      });
      const { shifts: s, unavail: u } = buildWeeklyMaps(data);
      setShifts(s);
      setUnavailability(u);
    } catch {
      // silent
    }
  }, [weekKey]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  useEffect(() => {
    window.addEventListener("focus", loadSchedule);
    return () => window.removeEventListener("focus", loadSchedule);
  }, [loadSchedule]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const start = toYyyyMmDd(weekDays[0]);
    const end = toYyyyMmDd(weekDays[6]);
    portalApi
      .get("/EmployeePortal/MyAbsences", { params: { startDate: start, endDate: end } })
      .then(({ data }) => setMyAbsences(data))
      .catch(() => {});
  }, [weekKey]);

  const loadSwapRequests = useCallback(async () => {
    try {
      const { data } = await portalApi.get("/EmployeePortal/MySwapRequests");
      setSwapRequests(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadSwapRequests(); }, [loadSwapRequests]);

  const navigateWeek = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  // Helpers
  const getShiftEmployees = (date, shiftId) =>
    shifts[`${toYyyyMmDd(date)}_${shiftId}`] || [];

  const isAssignedToShift = (date, shiftId) =>
    getShiftEmployees(date, shiftId).some((e) => e.id === currentUser?.id);

  const isAssignedShiftSwapped = (date, shiftId) =>
    getShiftEmployees(date, shiftId).some((e) => e.id === currentUser?.id && e.isSwapped);

  const getMyUnavailReport = (date, shiftId) =>
    getShiftUnavailableReports(unavailability, toYyyyMmDd(date), shiftId).find(
      (r) => r.employeeId === currentUser?.id
    );

  const getMyAbsenceForDay = (date) => {
    const ds = toYyyyMmDd(date);
    return myAbsences.find(
      (a) =>
        a.status === "Approved" &&
        a.start <= ds &&
        a.end >= ds &&
        BLOCKING_ABSENCE_TYPES[a.type]
    );
  };

  const canReportUnavailability = (date, shiftId) => {
    if (date < today && !isSameDay(date, today)) return false;
    const otherUnavailCount = activeShifts.filter((s) => {
      if (s.id === shiftId) return false;
      return getShiftUnavailableReports(unavailability, toYyyyMmDd(date), s.id).some(
        (r) => r.employeeId === currentUser?.id
      );
    }).length;
    return activeShifts.length - otherUnavailCount - 1 >= 1;
  };

  const handleReport = async (date, shiftId) => {
    const dateStr = toYyyyMmDd(date);
    const key = `${dateStr}_${shiftId}`;
    const report = {
      employeeId: currentUser.id,
      fullName: `${currentUser.firstName} ${currentUser.lastName}`,
      reportedAt: new Date().toISOString(),
    };
    const prevUnavail = unavailability;
    setUnavailability((prev) => ({ ...prev, [key]: [...(prev[key] || []), report] }));
    try {
      await portalApi.post("/EmployeePortal/ReportUnavailability", { shiftId, date: dateStr });
      toast.success("Unavailability reported.");
    } catch {
      setUnavailability(prevUnavail);
      toast.error("Failed to report unavailability.");
    }
  };

  const handleCancelReport = async (date, shiftId) => {
    const dateStr = toYyyyMmDd(date);
    const key = `${dateStr}_${shiftId}`;
    const prevUnavail = unavailability;
    setUnavailability((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((r) => r.employeeId !== currentUser?.id),
    }));
    try {
      await portalApi.delete("/EmployeePortal/CancelUnavailability", { params: { shiftId, date: dateStr } });
      toast.info("Report cancelled.");
    } catch {
      setUnavailability(prevUnavail);
      toast.error("Failed to cancel report.");
    }
  };

  const myAssignedShifts = useMemo(() => {
    const result = [];
    visibleDays.forEach((day) => {
      activeShifts.forEach((shift) => {
        const key = `${toYyyyMmDd(day)}_${shift.id}`;
        if ((shifts[key] || []).some((e) => e.id === currentUser?.id)) {
          result.push({ date: day, shiftId: shift.id, shift });
        }
      });
    });
    return result;
  }, [visibleDays, activeShifts, shifts, currentUser]);

  const currentUserPosition = useMemo(() => {
    for (const key of Object.keys(shifts)) {
      const emp = (shifts[key] || []).find((e) => e.id === currentUser?.id);
      if (emp?.position) return emp.position;
    }
    return null;
  }, [shifts, currentUser]);

  // Week summary stats for the My Shifts header
  const weekStats = useMemo(() => {
    let shiftCount = 0;
    let totalHours = 0;
    visibleDays.forEach((day) => {
      activeShifts.forEach((shift) => {
        if (!isAssignedToShift(day, shift.id)) return;
        shiftCount += 1;
        const sched = config?.days?.[day.getDay()]?.shifts?.[shift.id];
        if (sched) {
          const dur = shiftDuration(sched.start, sched.end);
          if (dur != null) totalHours += dur;
        }
      });
    });
    return { shiftCount, totalHours: Math.round(totalHours * 10) / 10 };
  }, [visibleDays, activeShifts, config, shifts, currentUser]);

  const handleSwapRequest = async (offeredShiftId, offeredDate) => {
    if (!swapTarget) return;
    try {
      await portalApi.post("/EmployeePortal/RequestShiftSwap", {
        targetEmployeeId: swapTarget.employee.id,
        requestedShiftId: swapTarget.shiftId,
        requestedDate: toYyyyMmDd(swapTarget.date),
        offeredShiftId,
        offeredDate: toYyyyMmDd(offeredDate),
      });
      toast.success("Swap request sent.");
      setSwapTarget(null);
      loadSwapRequests();
    } catch {
      toast.error("Failed to send swap request.");
    }
  };

  const handleRespondToSwap = async (swapId, accept) => {
    try {
      await portalApi.post(`/EmployeePortal/RespondToSwapRequest/${swapId}`, { accept });
      toast.success(accept ? "Swap accepted." : "Swap declined.");
      loadSwapRequests();
      loadSchedule();
    } catch {
      toast.error("Failed to respond to swap request.");
    }
  };

  const handleCancelSwap = async (swapId) => {
    try {
      await portalApi.post(`/EmployeePortal/CancelSwapRequest/${swapId}`);
      toast.info("Swap request cancelled.");
      loadSwapRequests();
    } catch {
      toast.error("Failed to cancel swap request.");
    }
  };

  const pendingSwapsByKey = useMemo(() => {
    const map = {};
    swapRequests
      .filter((r) => r.status === "Pending" && r.requesterId === currentUser?.id)
      .forEach((r) => {
        map[`${r.requestedDate}_${r.requestedShiftId}_${r.targetEmployeeId}`] = r;
      });
    return map;
  }, [swapRequests, currentUser]);

  const getOutgoingSwap = (date, shiftId, employeeId) =>
    pendingSwapsByKey[`${toYyyyMmDd(date)}_${shiftId}_${employeeId}`] || null;

  const incomingSwapsByShift = useMemo(() => {
    const map = {};
    swapRequests
      .filter((r) => r.status === "Pending" && r.targetEmployeeId === currentUser?.id)
      .forEach((r) => {
        const key = `${r.requestedDate}_${r.requestedShiftId}`;
        if (!map[key]) map[key] = [];
        map[key].push(r);
      });
    return map;
  }, [swapRequests, currentUser]);

  const getIncomingSwapsForShift = (date, shiftId) =>
    incomingSwapsByShift[`${toYyyyMmDd(date)}_${shiftId}`] || [];

  const incomingSwaps = useMemo(
    () => swapRequests.filter((r) => r.targetEmployeeId === currentUser?.id && r.status === "Pending"),
    [swapRequests, currentUser]
  );

  const outgoingSwaps = useMemo(
    () => swapRequests.filter((r) => r.requesterId === currentUser?.id),
    [swapRequests, currentUser]
  );

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr =
      start.getMonth() === end.getMonth()
        ? end.getDate().toString()
        : end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  const isCurrentWeek = isSameDay(weekStart, getWeekStart(today));

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-28">
      {/* Sticky week navigator */}
      {view !== "swaps" && (
        <div className="sticky top-0 z-30 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2.5 -ml-2.5 rounded-full text-slate-500 hover:bg-slate-200/60 active:bg-slate-200 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>

            <div className="flex items-center gap-2.5">
              <p className="text-[15px] font-medium text-slate-900 tracking-tight">{weekLabel}</p>
              {!isCurrentWeek && (
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-[12px] font-medium text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors px-2 py-0.5 -my-0.5 rounded-full"
                >
                  Today
                </button>
              )}
            </div>

            <button
              onClick={() => navigateWeek(1)}
              className="p-2.5 -mr-2.5 rounded-full text-slate-500 hover:bg-slate-200/60 active:bg-slate-200 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="max-w-2xl mx-auto px-4 pt-5 pb-2">
        {view === "home" && (
          <HomeView
            visibleDays={visibleDays}
            activeShifts={activeShifts}
            today={today}
            config={config}
            currentUser={currentUser}
            isAssignedToShift={isAssignedToShift}
            isAssignedShiftSwapped={isAssignedShiftSwapped}
            getMyUnavailReport={getMyUnavailReport}
            getMyAbsenceForDay={getMyAbsenceForDay}
            canReportUnavailability={canReportUnavailability}
            onReport={handleReport}
            onCancelReport={handleCancelReport}
            getShiftEmployees={getShiftEmployees}
            weekStats={weekStats}
          />
        )}
        {view === "team" && (
          <TeamView
            visibleDays={visibleDays}
            activeShifts={activeShifts}
            today={today}
            config={config}
            currentUser={currentUser}
            currentUserPosition={currentUserPosition}
            getShiftEmployees={getShiftEmployees}
            isAssignedToShift={isAssignedToShift}
            getOutgoingSwap={getOutgoingSwap}
            getIncomingSwapsForShift={getIncomingSwapsForShift}
            activeTeamDay={activeTeamDay}
            onSelectDay={setSelectedTeamDay}
            onSwapClick={(employee, shiftId, date) =>
              setSwapTarget({ employee, shiftId, date })
            }
          />
        )}
        {view === "timeline" && (
          <CalendarView
            visibleDays={weekDays}
            activeShifts={activeShifts}
            today={today}
            config={config}
            isAssignedToShift={isAssignedToShift}
            getMyAbsenceForDay={getMyAbsenceForDay}
          />
        )}
        {view === "swaps" && (
          <SwapsView
            incomingSwaps={incomingSwaps}
            outgoingSwaps={outgoingSwaps}
            onRespond={handleRespondToSwap}
            onCancel={handleCancelSwap}
          />
        )}
      </main>

      <BottomNav view={view} setView={setView} incomingCount={incomingSwaps.length} />

      {swapTarget && (
        <SwapRequestModal
          target={swapTarget}
          config={config}
          myAssignedShifts={myAssignedShifts}
          activeShifts={activeShifts}
          onSubmit={handleSwapRequest}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  );
}

// ── Bottom Navigation ─────────────────────────────────────────────────────

function BottomNav({ view, setView, incomingCount }) {
  const tabs = [
    { id: "home", label: "Today", icon: CalendarCheck },
    { id: "team", label: "Team", icon: Users },
    { id: "timeline", label: "Timeline", icon: CalendarDays },
    { id: "swaps", label: "Swaps", icon: Repeat2, badge: incomingCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-slate-200/50">
      <div className="max-w-2xl mx-auto flex pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ id, label, icon: Icon, badge }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                active ? "text-blue-600" : "text-slate-400 active:text-slate-600"
              }`}
            >
              <div className="relative">
                <Icon className="w-[23px] h-[23px]" strokeWidth={active ? 2 : 1.6} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center leading-none ring-2 ring-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight font-medium`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Section Header (Apple-style) ──────────────────────────────────────────

function SectionLabel({ children, action }) {
  return (
    <div className="flex items-end justify-between px-1 mb-2.5">
      <h2 className="text-[13px] font-medium tracking-tight text-slate-500">
        {children}
      </h2>
      {action}
    </div>
  );
}

// ── Home View ─────────────────────────────────────────────────────────────

function HomeView({
  visibleDays,
  activeShifts,
  today,
  config,
  currentUser,
  isAssignedToShift,
  isAssignedShiftSwapped,
  getMyUnavailReport,
  getMyAbsenceForDay,
  canReportUnavailability,
  onReport,
  onCancelReport,
  getShiftEmployees,
  weekStats,
}) {
  const todayDate = visibleDays.find((d) => isSameDay(d, today)) ?? null;
  const absence = todayDate ? getMyAbsenceForDay(todayDate) : null;
  const absenceKey = absence ? BLOCKING_ABSENCE_TYPES[absence.type] : null;

  const todayAssigned = useMemo(() => {
    if (!todayDate || absenceKey) return [];
    return activeShifts.filter((s) => isAssignedToShift(todayDate, s.id));
  }, [todayDate, absenceKey, activeShifts, isAssignedToShift]);

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <header className="px-1 pt-1">
        <p className="text-[15px] text-slate-500 tracking-tight">{getGreeting()},</p>
        <h1 className="text-[32px] font-semibold text-slate-900 tracking-[-0.02em] leading-[1.1] mt-0.5">
          {currentUser?.firstName ?? "there"}
        </h1>
      </header>

      {/* Today section */}
      <section>
        <SectionLabel>
          {todayDate ? `Today · ${todayDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}` : "Today"}
        </SectionLabel>

        {!todayDate && (
          <NotScheduledCard title="Day off" body="No shifts scheduled today — enjoy your rest." />
        )}

        {todayDate && absenceKey && (
          <AbsenceHeroCard absenceKey={absenceKey} />
        )}

        {todayDate && !absenceKey && todayAssigned.length > 0 && (
          <div className="space-y-3">
            {todayAssigned.map((shift) => (
              <TodayShiftHero
                key={shift.id}
                shift={shift}
                day={todayDate}
                config={config}
                getShiftEmployees={getShiftEmployees}
                currentUser={currentUser}
                isSwapped={isAssignedShiftSwapped(todayDate, shift.id)}
                getMyUnavailReport={getMyUnavailReport}
                canReportUnavailability={canReportUnavailability}
                onReport={onReport}
                onCancelReport={onCancelReport}
              />
            ))}
          </div>
        )}

        {todayDate && !absenceKey && todayAssigned.length === 0 && (
          <NotScheduledCard title="No shift today" body="You aren't assigned to any shift today." />
        )}
      </section>

      {/* Week stats */}
      {weekStats.shiftCount > 0 && (
        <section>
          <SectionLabel>This week</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Shifts" value={weekStats.shiftCount} />
            <StatCard label="Hours" value={weekStats.totalHours} suffix="h" />
          </div>
        </section>
      )}

      {/* Schedule list */}
      <section>
        <SectionLabel>Schedule</SectionLabel>
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {visibleDays.map((day) => (
              <WeekDayRow
                key={toYyyyMmDd(day)}
                day={day}
                today={today}
                activeShifts={activeShifts}
                config={config}
                isAssignedToShift={isAssignedToShift}
                isAssignedShiftSwapped={isAssignedShiftSwapped}
                getMyUnavailReport={getMyUnavailReport}
                getMyAbsenceForDay={getMyAbsenceForDay}
                canReportUnavailability={canReportUnavailability}
                onReport={onReport}
                onCancelReport={onCancelReport}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, suffix }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 px-4 py-3.5">
      <p className="text-[12px] font-medium text-slate-500 tracking-tight">{label}</p>
      <p className="text-[28px] font-medium text-slate-900 tracking-[-0.02em] leading-tight mt-1">
        {value}
        {suffix && <span className="text-[16px] text-slate-400 font-normal ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

function NotScheduledCard({ title, body }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <Coffee className="w-[18px] h-[18px] text-slate-400" strokeWidth={1.6} />
      </div>
      <div>
        <p className="text-[16px] font-medium text-slate-900 tracking-tight">{title}</p>
        <p className="text-[13px] text-slate-500 mt-0.5 tracking-tight">{body}</p>
      </div>
    </div>
  );
}

function AbsenceHeroCard({ absenceKey }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-[0_4px_16px_-6px_rgba(0,0,0,0.18)] ${EVENT_COLORS[absenceKey] ?? "bg-slate-700"}`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          {EVENT_ICONS[absenceKey]}
        </div>
        <div>
          <p className="text-[12px] font-medium tracking-tight text-white/70">Approved absence</p>
          <p className="text-[22px] font-medium tracking-[-0.01em] mt-0.5">{absenceKey}</p>
        </div>
      </div>
      <p className="text-[14px] text-white/75 mt-3 tracking-tight">You're not scheduled to work today. Enjoy your time off.</p>
    </div>
  );
}

function TodayShiftHero({
  shift,
  day,
  config,
  getShiftEmployees,
  currentUser,
  isSwapped,
  getMyUnavailReport,
  canReportUnavailability,
  onReport,
  onCancelReport,
}) {
  const [showUnavail, setShowUnavail] = useState(false);
  const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;
  const theme = SHIFT_THEMES[shift.iconName] ?? SHIFT_THEMES.Sun;
  const time = getShiftTime(config, day.getDay(), shift.id);
  const sched = config?.days?.[day.getDay()]?.shifts?.[shift.id];
  const startH = sched ? parseShiftTime(sched.start) : null;
  const dur = sched ? shiftDuration(sched.start, sched.end) : null;
  const countDown = startH != null ? getTimeUntil(startH) : null;
  const isOnShift = startH != null && !countDown;

  const colleagues = getShiftEmployees(day, shift.id).filter((e) => e.id !== currentUser?.id);
  const unavailReport = getMyUnavailReport(day, shift.id);
  const canReport = canReportUnavailability(day, shift.id);

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${theme.gradient} p-5 text-white shadow-[0_6px_20px_-8px_rgba(0,0,0,0.22)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <ShiftIcon className={`w-[18px] h-[18px] ${theme.icon}`} strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium tracking-tight text-white/70">
              You're working
            </p>
            <p className="text-[19px] font-medium tracking-[-0.01em] leading-tight truncate">
              {shift.label}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {isSwapped && (
            <span
              title="This shift was changed by a voluntary swap"
              className="text-[11px] font-medium px-2 py-1 rounded-full bg-white/20 text-white tracking-tight inline-flex items-center gap-1"
            >
              <Repeat2 className="w-3 h-3" strokeWidth={1.8} />
              Swapped
            </span>
          )}
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${theme.chip} text-white tracking-tight`}>
            {isOnShift ? "On shift now" : countDown ? `Starts ${countDown}` : "Today"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <p className="text-[34px] font-medium tracking-[-0.02em] leading-none">{time}</p>
        {dur != null && (
          <p className="text-[13px] text-white/70 tracking-tight">· {Math.round(dur * 10) / 10}h</p>
        )}
      </div>

      {colleagues.length > 0 && (
        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {colleagues.slice(0, 4).map((emp) => (
              <img
                key={emp.id}
                src={
                  emp.profilePictureSrc
                    ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}`
                    : defaultProfile
                }
                alt={emp.fullName}
                className="w-7 h-7 rounded-full border-[1.5px] border-white/40 object-cover"
              />
            ))}
          </div>
          <p className="text-[13px] text-white/80 tracking-tight">
            {colleagues.length === 1
              ? `with ${colleagues[0].fullName}`
              : `with ${colleagues.length} teammates`}
          </p>
        </div>
      )}

      

      {(canReport || unavailReport) && (
        <div className="mt-4 pt-4 border-t border-white/15">
          {unavailReport ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-white/75 tracking-tight min-w-0 truncate">
                Unavailability reported · {formatReportedAt(unavailReport.reportedAt)}
              </p>
              <button
                onClick={() => onCancelReport(day, shift.id)}
                className="text-[12px] font-medium text-white/90 hover:text-white shrink-0 tracking-tight"
              >
                Undo
              </button>
            </div>
          ) : showUnavail ? (
            <div className="flex items-center gap-2">
              <p className="text-[12px] text-white/75 flex-1 tracking-tight">
                Notify your manager you can't make it?
              </p>
              <button
                onClick={() => setShowUnavail(false)}
                className="text-[12px] text-white/60 hover:text-white px-2 py-1.5 transition-colors tracking-tight"
              >
                No
              </button>
              <button
                onClick={() => { onReport(day, shift.id); setShowUnavail(false); }}
                className="text-[12px] font-medium bg-white/20 hover:bg-white/30 active:bg-white/40 px-3 py-1.5 rounded-full transition-colors tracking-tight"
              >
                Confirm
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUnavail(true)}
              className="flex items-center gap-1.5 text-[12px] text-white/75 hover:text-white transition-colors tracking-tight"
            >
              <UserMinus className="w-3.5 h-3.5" strokeWidth={1.6} />
              Can't make it?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WeekDayRow({
  day,
  today,
  activeShifts,
  config,
  isAssignedToShift,
  isAssignedShiftSwapped,
  getMyUnavailReport,
  getMyAbsenceForDay,
  canReportUnavailability,
  onReport,
  onCancelReport,
}) {
  const [expanded, setExpanded] = useState(false);
  const isToday = isSameDay(day, today);
  const isPast = day < today && !isToday;
  const isFutureOrToday = !isPast;
  const absence = getMyAbsenceForDay(day);
  const absenceKey = absence ? BLOCKING_ABSENCE_TYPES[absence.type] : null;

  const assignedShifts = absenceKey
    ? []
    : activeShifts.filter((s) => isAssignedToShift(day, s.id));

  const unavailShifts = activeShifts.filter((s) => getMyUnavailReport(day, s.id) != null);
  const hasAction = isFutureOrToday && (assignedShifts.some((s) => canReportUnavailability(day, s.id)) || unavailShifts.length > 0);

  const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div>
      <button
        className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors ${
          hasAction ? "active:bg-slate-50" : "cursor-default"
        }`}
        onClick={() => hasAction && setExpanded((v) => !v)}
      >
        {/* Day badge */}
        <div className="w-11 shrink-0 text-center">
          <span className={`text-[11px] font-medium tracking-tight block ${
            isToday ? "text-blue-600" : isPast ? "text-slate-300" : "text-slate-500"
          }`}>
            {dayLabel}
          </span>
          <span className={`text-[22px] font-medium tracking-[-0.01em] leading-tight ${
            isToday ? "text-blue-600" : isPast ? "text-slate-300" : "text-slate-900"
          }`}>
            {day.getDate()}
          </span>
        </div>

        {/* Status content */}
        <div className="flex-1 min-w-0">
          {absenceKey ? (
            <div className="flex items-center gap-2">
              <span className={`text-[15px] font-medium tracking-tight ${isPast ? "text-slate-300" : "text-slate-700"}`}>
                {absenceKey}
              </span>
              <span className={`text-[12px] tracking-tight ${isPast ? "text-slate-300" : "text-slate-400"}`}>· Absence</span>
            </div>
          ) : assignedShifts.length > 0 ? (
            <div className="space-y-1">
              {assignedShifts.map((shift) => {
                const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;
                const time = getShiftTime(config, day.getDay(), shift.id);
                const unavail = getMyUnavailReport(day, shift.id);
                const swapped = isAssignedShiftSwapped?.(day, shift.id);
                return (
                  <div key={shift.id} className="flex items-center gap-2 flex-wrap">
                    <ShiftIcon className={`w-3.5 h-3.5 shrink-0 ${isPast ? "text-slate-300" : "text-slate-400"}`} strokeWidth={1.6} />
                    <span className={`text-[15px] font-medium tracking-tight ${isPast ? "text-slate-300" : "text-slate-900"}`}>
                      {shift.label}
                    </span>
                    <span className={`text-[13px] tracking-tight ${isPast ? "text-slate-200" : "text-slate-400"}`}>{time}</span>
                    {swapped && (
                      <span
                        title="This shift was changed by a voluntary swap"
                        className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md tracking-tight inline-flex items-center gap-1 ${
                          isPast ? "text-slate-300 bg-slate-50" : "text-blue-700 bg-blue-50"
                        }`}
                      >
                        <Repeat2 className="w-3 h-3" strokeWidth={1.8} />
                        Swapped
                      </span>
                    )}
                    {unavail && (
                      <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md tracking-tight">
                        Unavailable
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : unavailShifts.length > 0 ? (
            <span className={`text-[15px] font-medium tracking-tight ${isPast ? "text-slate-300" : "text-amber-600"}`}>
              Unavailability reported
            </span>
          ) : (
            <span className={`text-[15px] tracking-tight ${isPast ? "text-slate-300" : "text-slate-400"}`}>
              Day off
            </span>
          )}
        </div>

        {/* Right element */}
        <div className="shrink-0 flex items-center gap-2">
          {isToday && (
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full tracking-tight">
              Today
            </span>
          )}
          {hasAction && (
            <ChevronDown
              className={`w-[18px] h-[18px] text-slate-300 transition-transform ${expanded ? "rotate-180" : ""}`}
              strokeWidth={1.8}
            />
          )}
        </div>
      </button>

      {expanded && hasAction && (
        <div className="px-4 pb-4 pt-1 space-y-2 bg-slate-50/50">
          {assignedShifts.map((shift) => {
            const unavail = getMyUnavailReport(day, shift.id);
            const canRep = canReportUnavailability(day, shift.id);
            const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;
            const time = getShiftTime(config, day.getDay(), shift.id);
            if (!canRep && !unavail) return null;

            return (
              <div
                key={shift.id}
                className={`rounded-xl border p-3.5 ${
                  unavail
                    ? "bg-amber-50/70 border-amber-100"
                    : "bg-white border-slate-200/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShiftIcon className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
                  <span className="text-[13px] font-medium text-slate-700 tracking-tight">{shift.label}</span>
                  <span className="text-[12px] text-slate-400 tracking-tight">{time}</span>
                </div>
                {unavail ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] text-amber-700 tracking-tight">
                      Reported {formatReportedAt(unavail.reportedAt)}
                    </p>
                    <button
                      onClick={() => { onCancelReport(day, shift.id); setExpanded(false); }}
                      className="text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors shrink-0 tracking-tight"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { onReport(day, shift.id); setExpanded(false); }}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-amber-600 hover:text-amber-700 active:text-amber-800 transition-colors tracking-tight"
                  >
                    <UserMinus className="w-3.5 h-3.5" strokeWidth={1.6} />
                    Mark as unavailable
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Team View ─────────────────────────────────────────────────────────────

function TeamView({
  visibleDays,
  activeShifts,
  today,
  config,
  currentUser,
  currentUserPosition,
  getShiftEmployees,
  isAssignedToShift,
  getOutgoingSwap,
  getIncomingSwapsForShift,
  activeTeamDay,
  onSelectDay,
  onSwapClick,
}) {
  return (
    <div className="space-y-5 pt-1">
      {/* Day picker */}
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 p-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {visibleDays.map((day) => {
            const isSelected = isSameDay(day, activeTeamDay);
            const isToday = isSameDay(day, today);
            return (
              <button
                key={toYyyyMmDd(day)}
                onClick={() => onSelectDay(day)}
                className={`flex flex-col items-center shrink-0 flex-1 min-w-[44px] py-2.5 rounded-xl transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.35)]"
                    : "hover:bg-slate-50 active:bg-slate-100"
                }`}
              >
                <span className={`text-[10px] font-medium tracking-tight ${
                  isSelected ? "text-white/80" : isToday ? "text-blue-600" : "text-slate-500"
                }`}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <span className={`text-[17px] font-medium tracking-[-0.01em] mt-0.5 ${
                  isSelected ? "text-white" : isToday ? "text-blue-600" : "text-slate-900"
                }`}>
                  {day.getDate()}
                </span>
                <span className={`mt-1 w-1 h-1 rounded-full ${
                  isToday && !isSelected ? "bg-blue-500" : "bg-transparent"
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900 tracking-[-0.01em] leading-tight">
            {activeTeamDay ? activeTeamDay.toLocaleDateString("en-US", { weekday: "long" }) : ""}
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5 tracking-tight">
            {activeTeamDay ? activeTeamDay.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : ""}
          </p>
        </div>
        {activeTeamDay && isSameDay(activeTeamDay, today) && (
          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full tracking-tight">
            Today
          </span>
        )}
      </div>

      {/* Shift sections */}
      {activeTeamDay && (
        <div className="space-y-4">
          {activeShifts.map((shift) => {
            const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;
            const time = getShiftTime(config, activeTeamDay.getDay(), shift.id);
            const assigned = getShiftEmployees(activeTeamDay, shift.id);
            const isFutureOrToday = activeTeamDay >= today || isSameDay(activeTeamDay, today);

            return (
              <div key={shift.id} className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${shift.color}`}>
                    <ShiftIcon className="w-4 h-4 text-slate-600" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-slate-900 tracking-tight leading-tight">
                      {shift.label}
                    </p>
                    <p className="text-[13px] text-slate-500 tracking-tight">{time}</p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full tracking-tight shrink-0">
                    {assigned.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {assigned.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[13px] text-slate-400 tracking-tight">No one assigned</p>
                    </div>
                  ) : (
                    assigned.map((emp) => {
                      const isMe = emp.id === currentUser?.id;
                      const iAlsoHere = isAssignedToShift(activeTeamDay, shift.id);
                      const samePos = !currentUserPosition || emp.position === currentUserPosition;
                      const pending = getOutgoingSwap(activeTeamDay, shift.id, emp.id);
                      const incoming = isMe ? getIncomingSwapsForShift(activeTeamDay, shift.id) : [];
                      const canSwap = !isMe && isFutureOrToday && !iAlsoHere && samePos && !pending;

                      return (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                          <img
                            src={
                              emp.profilePictureSrc
                                ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}`
                                : defaultProfile
                            }
                            alt=""
                            className={`w-10 h-10 rounded-full object-cover shrink-0 ${
                              isMe ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : ""
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[15px] font-medium text-slate-900 tracking-tight truncate">
                                {emp.fullName}
                              </span>
                              {isMe && (
                                <span className="text-[10px] font-medium text-blue-600 tracking-tight shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-slate-500 truncate tracking-tight">
                              {pending ? (
                                <span className="text-amber-600 font-medium inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" strokeWidth={1.6} />
                                  Swap requested
                                </span>
                              ) : incoming.length > 0 ? (
                                <span className="text-blue-600 font-medium inline-flex items-center gap-1">
                                  <Inbox className="w-3 h-3" strokeWidth={1.6} />
                                  {incoming.length} swap request{incoming.length > 1 ? "s" : ""}
                                </span>
                              ) : (
                                emp.position
                              )}
                            </p>
                          </div>
                          {canSwap && (
                            <button
                              onClick={() => onSwapClick(emp, shift.id, activeTeamDay)}
                              className="flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 px-3 py-2 rounded-full transition-colors shrink-0 tracking-tight"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                              Swap
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Calendar / Timeline View ──────────────────────────────────────────────

function CalendarView({
  visibleDays,
  activeShifts,
  today,
  config,
  isAssignedToShift,
  getMyAbsenceForDay,
}) {
  const HOUR_HEIGHT = 38;

  const blocks = useMemo(() => {
    if (!config) return [];
    const result = [];
    visibleDays.forEach((day, dayIndex) => {
      activeShifts.forEach((shift) => {
        if (!isAssignedToShift(day, shift.id)) return;
        const sched = config.days?.[day.getDay()]?.shifts?.[shift.id];
        if (!sched) return;
        const startH = parseShiftTime(sched.start);
        const endH = parseShiftTime(sched.end);
        if (startH == null || endH == null) return;
        const timeLabel = `${sched.start} – ${sched.end}`;

        if (endH > startH) {
          result.push({ dayIndex, shift, startH, endH, timeLabel });
        } else if (endH === 0) {
          result.push({ dayIndex, shift, startH, endH: 24, timeLabel });
        } else {
          result.push({ dayIndex, shift, startH, endH: 24, timeLabel, continuesNext: true });
          if (dayIndex + 1 < visibleDays.length) {
            result.push({
              dayIndex: dayIndex + 1,
              shift,
              startH: 0,
              endH,
              timeLabel,
              continuedFromPrev: true,
            });
          }
        }
      });
    });
    return result;
  }, [visibleDays, activeShifts, config, isAssignedToShift]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (blocks.length === 0) return { rangeStart: 8, rangeEnd: 18 };
    let min = 24, max = 0;
    blocks.forEach(({ startH, endH }) => {
      if (startH < min) min = startH;
      if (endH > max) max = endH;
    });
    return {
      rangeStart: Math.max(0, Math.floor(min - 1)),
      rangeEnd: Math.min(24, Math.ceil(max + 1)),
    };
  }, [blocks]);

  const hours = useMemo(() => {
    const result = [];
    for (let h = rangeStart; h <= rangeEnd; h++) result.push(h);
    return result;
  }, [rangeStart, rangeEnd]);

  const totalHeight = (rangeEnd - rangeStart) * HOUR_HEIGHT;

  const absenceByDayIndex = useMemo(() => {
    const map = {};
    visibleDays.forEach((day, i) => {
      const absence = getMyAbsenceForDay?.(day);
      if (absence) map[i] = BLOCKING_ABSENCE_TYPES[absence.type] || "Absence";
    });
    return map;
  }, [visibleDays, getMyAbsenceForDay]);

  const minWidth = 56 + visibleDays.length * 100;

  return (
    <div className="space-y-3">
      <SectionLabel>Week timeline</SectionLabel>
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>
            {/* Day headers */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <div className="w-14 shrink-0" />
              {visibleDays.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={toYyyyMmDd(day)}
                    className={`flex-1 min-w-[100px] py-3 text-center ${isToday ? "bg-blue-50/60" : ""}`}
                  >
                    <div className={`text-[10px] font-medium tracking-tight ${isToday ? "text-blue-600" : "text-slate-500"}`}>
                      {DAY_NAMES[day.getDay()]}
                    </div>
                    <div className={`text-[17px] font-medium tracking-[-0.01em] mt-0.5 ${isToday ? "text-blue-600" : "text-slate-900"}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Body */}
            {blocks.length > 0 ? (
              <div className="flex">
                {/* Hour gutter */}
                <div className="w-14 shrink-0 relative" style={{ height: totalHeight }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 text-[10px] text-slate-400 font-medium px-2 tracking-tight"
                      style={{ top: (h - rangeStart) * HOUR_HEIGHT, transform: i === 0 ? "none" : "translateY(-50%)" }}
                    >
                      {`${String(h).padStart(2, "0")}:00`}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div className="flex-1 flex" style={{ height: totalHeight }}>
                  {visibleDays.map((day, dayIndex) => {
                    const isToday = isSameDay(day, today);
                    const weekend = day.getDay() === 0 || day.getDay() === 6;
                    const dayBlocks = blocks.filter((b) => b.dayIndex === dayIndex);
                    const absenceLabel = absenceByDayIndex[dayIndex];

                    return (
                      <div
                        key={toYyyyMmDd(day)}
                        className={`flex-1 min-w-[100px] relative border-l border-slate-100 ${
                          isToday ? "bg-blue-50/30" : weekend ? "bg-slate-50/40" : ""
                        }`}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-slate-100"
                            style={{ top: (h - rangeStart) * HOUR_HEIGHT }}
                          />
                        ))}

                        {isToday && (() => {
                          const now = new Date();
                          const nowH = now.getHours() + now.getMinutes() / 60;
                          if (nowH < rangeStart || nowH > rangeEnd) return null;
                          return (
                            <div
                              className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                              style={{ top: (nowH - rangeStart) * HOUR_HEIGHT }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-[3px] shrink-0" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          );
                        })()}

                        {absenceLabel && (
                          <div
                            className={`absolute inset-x-1.5 rounded-xl flex flex-col items-center justify-center text-white shadow-sm ${EVENT_COLORS[absenceLabel] ?? "bg-slate-500"}`}
                            style={{ top: 4, height: totalHeight - 8 }}
                          >
                            <div>{EVENT_ICONS[absenceLabel]}</div>
                            <p className="text-[12px] font-medium tracking-tight mt-1">{absenceLabel}</p>
                          </div>
                        )}

                        {!absenceLabel &&
                          dayBlocks.map((b, i) => {
                            const ShiftIcon = SHIFT_ICONS[b.shift.iconName];
                            const top = (b.startH - rangeStart) * HOUR_HEIGHT;
                            const height = Math.max(32, (b.endH - b.startH) * HOUR_HEIGHT - 4);
                            return (
                              <div
                                key={`${dayIndex}-${b.shift.id}-${i}`}
                                className={`absolute inset-x-1.5 rounded-xl border p-2 overflow-hidden ${b.shift.color}`}
                                style={{ top: top + 2, height }}
                              >
                                <div className="flex items-center gap-1.5">
                                  {ShiftIcon && <ShiftIcon className="w-3 h-3 text-slate-600 shrink-0" strokeWidth={1.8} />}
                                  <span className="text-[12px] font-medium text-slate-800 truncate tracking-tight">
                                    {b.shift.label}
                                  </span>
                                </div>
                                {height > 40 && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 truncate tracking-tight">{b.timeLabel}</div>
                                )}
                                {b.continuedFromPrev && height > 56 && (
                                  <p className="text-[9px] text-slate-400 italic mt-0.5">cont. from yesterday</p>
                                )}
                                {b.continuesNext && height > 56 && (
                                  <p className="text-[9px] text-slate-400 italic mt-0.5">cont. tomorrow</p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <CalendarDays className="w-9 h-9" strokeWidth={1.4} />
                <p className="text-[15px] font-medium tracking-tight">No shifts scheduled</p>
                <p className="text-[13px] text-center px-6 max-w-xs tracking-tight">
                  Your timeline will fill in once your manager publishes the week.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Swaps View ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Pending: { icon: Clock, color: "text-amber-600", label: "Awaiting" },
  Accepted: { icon: CheckCircle2, color: "text-emerald-600", label: "Accepted" },
  Declined: { icon: XCircle, color: "text-red-500", label: "Declined" },
  Cancelled: { icon: XCircle, color: "text-slate-400", label: "Cancelled" },
};

function SwapsView({ incomingSwaps, outgoingSwaps, onRespond, onCancel }) {
  const [activeTab, setActiveTab] = useState(incomingSwaps.length > 0 ? "incoming" : "outgoing");

  return (
    <div className="space-y-5 pt-3">
      <header className="px-1">
        <h1 className="text-[32px] font-semibold text-slate-900 tracking-[-0.02em] leading-[1.1]">
          Shift Swaps
        </h1>
        <p className="text-[15px] text-slate-500 mt-1.5 tracking-tight">
          Trade shifts with your colleagues.
        </p>
      </header>

      {/* Apple-style segmented control */}
      <div className="flex bg-slate-200/60 rounded-xl p-[3px] gap-0.5">
        <SegmentedTab
          active={activeTab === "incoming"}
          onClick={() => setActiveTab("incoming")}
          icon={Inbox}
          label="Incoming"
          badge={incomingSwaps.length}
        />
        <SegmentedTab
          active={activeTab === "outgoing"}
          onClick={() => setActiveTab("outgoing")}
          icon={Send}
          label="Sent"
        />
      </div>

      {activeTab === "incoming" && (
        <div className="space-y-3">
          {incomingSwaps.length === 0 ? (
            <SwapEmptyState icon={Inbox} title="No incoming requests" body="When colleagues ask to swap shifts, they'll appear here." />
          ) : (
            incomingSwaps.map((swap) => (
              <IncomingSwapCard key={swap.id} swap={swap} onRespond={onRespond} />
            ))
          )}
        </div>
      )}
      {activeTab === "outgoing" && (
        <div className="space-y-3">
          {outgoingSwaps.length === 0 ? (
            <SwapEmptyState icon={Send} title="No sent requests" body="Open the Team tab, tap a colleague, and request a swap." />
          ) : (
            outgoingSwaps.map((swap) => (
              <OutgoingSwapCard key={swap.id} swap={swap} onCancel={onCancel} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SegmentedTab({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium tracking-tight transition-all ${
        active
          ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          : "text-slate-500 active:text-slate-700"
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.6} />
      {label}
      {badge > 0 && (
        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium flex items-center justify-center ${
          active ? "bg-red-500 text-white" : "bg-slate-300 text-slate-700"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SwapEmptyState({ icon: Icon, title, body }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 py-14 px-6 flex flex-col items-center text-center gap-2">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-1">
        <Icon className="w-5 h-5 text-slate-400" strokeWidth={1.5} />
      </div>
      <p className="text-[16px] font-medium text-slate-900 tracking-tight">{title}</p>
      <p className="text-[13px] text-slate-500 max-w-xs tracking-tight">{body}</p>
    </div>
  );
}

function SwapPair({ left, right, leftLabel, rightLabel, leftTone = "neutral" }) {
  const leftBg =
    leftTone === "want"
      ? "bg-blue-50/70"
      : leftTone === "give"
      ? "bg-amber-50/70"
      : "bg-slate-50";
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2.5">
      <div className={`rounded-xl px-3.5 py-3 ${leftBg}`}>
        <p className="text-[10px] font-medium tracking-tight text-slate-500 mb-1">{leftLabel}</p>
        <p className="text-[14px] font-medium text-slate-900 tracking-tight leading-tight">{left.shift}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 tracking-tight">{left.date}</p>
      </div>
      <div className="flex items-center justify-center">
        <ArrowLeftRight className="w-4 h-4 text-slate-300" strokeWidth={1.6} />
      </div>
      <div className="rounded-xl bg-emerald-50/70 px-3.5 py-3">
        <p className="text-[10px] font-medium tracking-tight text-emerald-600 mb-1">{rightLabel}</p>
        <p className="text-[14px] font-medium text-slate-900 tracking-tight leading-tight">{right.shift}</p>
        <p className="text-[12px] text-slate-500 mt-0.5 tracking-tight">{right.date}</p>
      </div>
    </div>
  );
}

function IncomingSwapCard({ swap, onRespond }) {
  const [responding, setResponding] = useState(false);

  const handleRespond = async (accept) => {
    setResponding(true);
    await onRespond(swap.id, accept);
    setResponding(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <img
          src={
            swap.requesterProfilePictureSrc
              ? `${VITE_ASSETS_BASE_URL}/${swap.requesterProfilePictureSrc}`
              : defaultProfile
          }
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-slate-900 tracking-tight truncate">{swap.requesterName}</p>
          <p className="text-[12px] text-slate-500 tracking-tight">wants to swap shifts</p>
        </div>
        <p className="text-[11px] text-slate-400 shrink-0 tracking-tight">{formatReportedAt(swap.createdAt)}</p>
      </div>

      <div className="px-4 pb-4">
        <SwapPair
          leftLabel="Wants your"
          left={{ shift: swap.requestedShiftLabel, date: formatSwapDate(swap.requestedDate) }}
          rightLabel="Offers"
          right={{ shift: swap.offeredShiftLabel, date: formatSwapDate(swap.offeredDate) }}
          leftTone="give"
        />
      </div>

      <div className="px-4 pb-4 flex gap-2.5">
        <button
          onClick={() => handleRespond(false)}
          disabled={responding}
          className="flex-1 py-3 text-[15px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-full transition-colors disabled:opacity-40 tracking-tight"
        >
          Decline
        </button>
        <button
          onClick={() => handleRespond(true)}
          disabled={responding}
          className="flex-1 py-3 text-[15px] font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full transition-colors disabled:opacity-40 tracking-tight shadow-[0_2px_8px_-2px_rgba(37,99,235,0.35)]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function OutgoingSwapCard({ swap, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const statusCfg = STATUS_CONFIG[swap.status] ?? STATUS_CONFIG.Pending;
  const StatusIcon = statusCfg.icon;

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(swap.id);
    setCancelling(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <img
          src={
            swap.targetEmployeeProfilePictureSrc
              ? `${VITE_ASSETS_BASE_URL}/${swap.targetEmployeeProfilePictureSrc}`
              : defaultProfile
          }
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-slate-900 tracking-tight truncate">{swap.targetEmployeeName}</p>
          <p className="text-[12px] text-slate-500 tracking-tight">{formatReportedAt(swap.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${statusCfg.color} shrink-0 tracking-tight`}>
          <StatusIcon className="w-3.5 h-3.5" strokeWidth={1.6} />
          {statusCfg.label}
        </span>
      </div>

      <div className="px-4 pb-4">
        <SwapPair
          leftLabel="You offer"
          left={{ shift: swap.offeredShiftLabel, date: formatSwapDate(swap.offeredDate) }}
          rightLabel="You want"
          right={{ shift: swap.requestedShiftLabel, date: formatSwapDate(swap.requestedDate) }}
        />
      </div>

      {swap.status === "Pending" && (
        <div className="px-4 pb-4">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 text-[15px] font-medium text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-full transition-colors disabled:opacity-40 tracking-tight"
          >
            {cancelling ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      )}
      {swap.respondedAt && swap.status !== "Pending" && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-[11px] text-slate-400 text-center tracking-tight">
            Responded {formatReportedAt(swap.respondedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Swap Request Modal (sheet) ────────────────────────────────────────────

function SwapRequestModal({ target, config, myAssignedShifts, activeShifts, onSubmit, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  const availableOffers = myAssignedShifts.filter(
    (s) => !(s.shiftId === target.shiftId && toYyyyMmDd(s.date) === toYyyyMmDd(target.date))
  );
  const defaultOffer =
    availableOffers.find((s) => toYyyyMmDd(s.date) === toYyyyMmDd(target.date)) ?? null;
  const [selectedOffer, setSelectedOffer] = useState(defaultOffer);

  const requestedShift = activeShifts.find((s) => s.id === target.shiftId);
  const requestedTime = getShiftTime(config, target.date.getDay(), target.shiftId);
  const requestedDateStr = target.date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const ShiftIcon = requestedShift ? SHIFT_ICONS[requestedShift.iconName] : null;

  const handleSubmit = async () => {
    if (!selectedOffer || submitting) return;
    setSubmitting(true);
    await onSubmit(selectedOffer.shiftId, selectedOffer.date);
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0 border-b border-slate-100">
          <button
            onClick={onClose}
            className="text-[15px] font-normal text-blue-600 active:text-blue-700 transition-colors tracking-tight"
          >
            Cancel
          </button>
          <h3 className="text-[15px] font-medium text-slate-900 tracking-tight">Request Swap</h3>
          <button
            onClick={handleSubmit}
            disabled={!selectedOffer || submitting}
            className="text-[15px] font-medium text-blue-600 active:text-blue-700 transition-colors disabled:text-slate-300 tracking-tight"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0 px-4 pt-4 pb-5 space-y-5">
          {/* Target shift */}
          <div>
            <SectionLabel>You want to take</SectionLabel>
            <div className={`rounded-2xl border border-slate-200/50 p-4 ${requestedShift?.color ?? "bg-slate-50"}`}>
              <div className="flex items-center gap-2.5">
                {ShiftIcon && <ShiftIcon className="w-4 h-4 text-slate-600" strokeWidth={1.6} />}
                <span className="text-[15px] font-medium text-slate-900 tracking-tight">{requestedShift?.label}</span>
                <span className="text-[13px] text-slate-500 ml-auto tracking-tight">{requestedTime}</span>
              </div>
              <p className="text-[13px] text-slate-500 mt-1 tracking-tight">{requestedDateStr}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/40">
                <img
                  src={
                    target.employee.profilePictureSrc
                      ? `${VITE_ASSETS_BASE_URL}/${target.employee.profilePictureSrc}`
                      : defaultProfile
                  }
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-[13px] text-slate-600 tracking-tight">
                  Currently <span className="font-medium text-slate-900">{target.employee.fullName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Offer selection */}
          <div>
            <SectionLabel>Offer one of yours</SectionLabel>
            {availableOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <AlertCircle className="w-5 h-5 text-slate-300 mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-[13px] text-slate-500 tracking-tight">You have no shifts to offer this week.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/50 overflow-hidden divide-y divide-slate-100">
                {availableOffers.map((offer) => {
                  const shift = activeShifts.find((s) => s.id === offer.shiftId);
                  const OfferIcon = shift ? SHIFT_ICONS[shift.iconName] : null;
                  const time = getShiftTime(config, offer.date.getDay(), offer.shiftId);
                  const dateStr = offer.date.toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  });
                  const key = `${toYyyyMmDd(offer.date)}_${offer.shiftId}`;
                  const isSelected =
                    selectedOffer &&
                    selectedOffer.shiftId === offer.shiftId &&
                    toYyyyMmDd(selectedOffer.date) === toYyyyMmDd(offer.date);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedOffer(offer)}
                      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-slate-50 transition-colors ${
                        isSelected ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${shift?.color ?? "bg-slate-100"}`}>
                        {OfferIcon && <OfferIcon className="w-4 h-4 text-slate-600" strokeWidth={1.6} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-slate-900 tracking-tight">{shift?.label}</p>
                        <p className="text-[13px] text-slate-500 tracking-tight">{dateStr} · {time}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600 shrink-0" strokeWidth={2} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
