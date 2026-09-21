import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Plus,
  CheckCircle2,
  Info,
  LayoutGrid,
  Columns,
  ArrowUpRight,
  Briefcase,
  TrendingUp,
  Clock,
} from "lucide-react";
import portalApi from "../EmployeePortal/utils/portalAxiosInstance";
import { EVENT_COLORS, EVENT_ICONS } from "../config/events.config";
import { formatDate, toYyyyMmDd } from "../utils/dateFormatter";
import { getUser } from "../EmployeePortal/utils/portalAuthService";
import EmployeeAbsenceTimeline from "../EmployeeAbsenceTimeline";
import NewAbsenceModal from "../NewAbsenceModal";
import { toast } from "react-toastify";
import AbsencePolicyList from "../AbsencePolicyList";
import AbsenceDetailsModal from "../AbsenceDetailsModal";
import PressureRibbon from "../PressureRibbon";
import { LuMousePointer, LuMousePointer2, LuMousePointerClick } from "react-icons/lu";

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getDayName = (date) =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function EmployeePortalPage() {
  function useResponsiveSizes() {
    const [sizes, setSizes] = useState({
      dayWidth: 48,
      sidebarW: 256,
    });

    useEffect(() => {
      const update = () => {
        if (window.matchMedia("(min-width: 768px)").matches) {
          setSizes({ dayWidth: 48, sidebarW: 256 }); // md
        } else if (window.matchMedia("(min-width: 640px)").matches) {
          setSizes({ dayWidth: 48, sidebarW: 220 }); // sm
        } else {
          setSizes({ dayWidth: 48, sidebarW: 57 }); // base
        }
      };

      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }, []);

    return sizes;
  }

  const { dayWidth, sidebarW } = useResponsiveSizes();

  const [absences, setAbsences] = useState([]);
  const [departmentAbsences, setDepartmentAbsences] = useState([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [absenceStats, setAbsenceStats] = useState(null);

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [calendarOption, setCalendarOption] = useState("Me");

  const portalUser = getUser();
  const employeeId = portalUser?.employeeId ?? "";
  const departmentId = portalUser?.departmentId ?? "";
  const position = portalUser?.positionName ?? "";

  //remove this or implement search logic
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAbsences = async () => {
    try {
      const end = lastDayOfMonth(currentDate);

      var response = await portalApi.get(
        `/EmployeePortal/MyAbsences?startDate=${toYyyyMmDd(currentDate)}&endDate=${toYyyyMmDd(end)}`,
      );

      setAbsences(response.data);
    } catch (err) {
      toast.error("Error while fetching absences.");
    }
  };

  const fetchDepartmentAbsences = async () => {
    try {
      const end = lastDayOfMonth(currentDate);

      var response = await portalApi.get(
        `/EmployeePortal/MyTeamAbsences?start=${toYyyyMmDd(currentDate)}&end=${toYyyyMmDd(end)}`,
      );

      setDepartmentAbsences(response.data);
    } catch (err) {
      toast.error("Failed to load absences.");
    }
  };

  const onAbsenceClick = (absence) => {
    if (absence.employeeId != employeeId) {
      return;
    }

    setEventsForDetails([absence]);
  };

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    let meExists = false;

    departmentAbsences?.forEach((item) => {
      if (item.employeeId === employeeId) {
        meExists = true;
      }

      if (!map.has(item.employeeId)) {
        map.set(item.employeeId, {
          id: item.employeeId,
          name: item.employeeId === employeeId ? "Me" : item.employeeFullName,
          position: item.employeePosition,
          isMe: item.employeeId === employeeId,
        });
      }
    });

    let employees = Array.from(map.values());

    // inject "Me" if missing
    if (!meExists) {
      employees.unshift({
        id: employeeId,
        name: "Me",
        position: position, // ideally from user context
        isMe: true,
      });
    }

    return employees
      .sort((a, b) => {
        if (a.isMe) return -1;
        if (b.isMe) return 1;
        return a.name.localeCompare(b.name);
      })
      .filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [departmentAbsences, searchTerm]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  const density = useMemo(
    () => buildDensityMap(departmentAbsences, year, month, daysInMonth),
    [year, month, daysInMonth, departmentAbsences],
  );
  const pressures = useMemo(() => toPressure(density), [density]);
  const smoothed = useMemo(() => smooth(pressures), [pressures]);

  function buildDensityMap(absences, year, month, totalDays) {
    const counts = new Array(totalDays).fill(0);
    absences.forEach(({ start, end }) => {
      const s = new Date(start);
      const e = new Date(end);
      for (let d = 1; d <= totalDays; d++) {
        const cur = new Date(year, month, d);
        if (cur >= s && cur <= e) counts[d - 1]++;
      }
    });
    return counts;
  }

  // Map count → pressure level 0-1
  function toPressure(counts) {
    const max = Math.max(...counts, 1);
    return counts.map((c) => c / max);
  }

  function smooth(arr, radius = 2) {
    return arr.map((_, i) => {
      let sum = 0,
        weight = 0;
      for (let j = i - radius; j <= i + radius; j++) {
        if (j < 0 || j >= arr.length) continue;
        const w = 1 / (Math.abs(j - i) + 1);
        sum += arr[j] * w;
        weight += w;
      }
      return sum / weight;
    });
  }

  function pressureToColor(p) {
    // 0   = cool sky    (#EFF6FF)
    // 0.4 = warm honey  (#FFFBEB)
    // 1   = deep coral  (#FEE2E2 → #FECACA)
    if (p < 0.4) {
      const t = p / 0.4;
      const r = Math.round(239 + (255 - 239) * t);
      const g = Math.round(246 + (251 - 246) * t);
      const b = Math.round(255 + (235 - 255) * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (p - 0.4) / 0.6;
      const r = Math.round(255 + (254 - 255) * t);
      const g = Math.round(251 + (202 - 251) * t);
      const b = Math.round(235 + (202 - 235) * t);
      return `rgb(${r},${g},${b})`;
    }
  }

  function HeatCell({ pressure, date, showHeatmap, isMe }) {
    const bg = showHeatmap ? pressureToColor(pressure) : "#ffffff";
    const isWeekend = [0, 6].includes(date.getDay());
    const isToday = toYyyyMmDd(date) === toYyyyMmDd(new Date());

    if (isMe) {
      return (
        <div
          style={{
            width: dayWidth,
            backgroundColor: isWeekend ? undefined : bg,
            transition: "background-color 0.4s ease",
            position: "relative",
            flexShrink: 0,
          }}
          onClick={() => openReportModal(toYyyyMmDd(date))}
          className={`group/cell cursor-pointer hover:bg-blue-50 ${isWeekend ? "bg-slate-50/40" : ""}`}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group/cell hover:opacity-100">
            <Plus className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: dayWidth,
          backgroundColor: isWeekend ? undefined : bg,
          transition: "background-color 0.4s ease",
          position: "relative",
          flexShrink: 0,
        }}
        className={`${isWeekend ? "bg-slate-50/40" : ""}`}
      >
        {isToday && (
          <div className="absolute inset-0  rounded-sm pointer-events-none" />
        )}
      </div>
    );
  }

  const fecthEmployeeAbsenceStats = async () => {
    try {
      const result = await portalApi.get(
        `/EmployeePortal/MyAbsenceStats`,
      );
      setAbsenceStats(result.data);
    } catch (err) {
      toast.error("Error while fetching absence stats");
    }
  };

  useEffect(() => {
    fecthEmployeeAbsenceStats();
  }, []);

  useEffect(() => {
    if (showHeatmap || calendarOption == "My team") {
      fetchDepartmentAbsences();
    }
  }, [showHeatmap, calendarOption, currentDate]);

  useEffect(() => {
    fetchAbsences();
  }, [currentDate]);

  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("timeline"); // 'timeline' or 'standard'

  const scrollContainerRef = useRef(null);
  const isInitialMount = useRef(true);
  const shouldScrollToToday = useRef(false);

  const [modalFromDate, setModalFromDate] = useState(null);

  const [eventsForDetails, setEventsForDetails] = useState(null);

  const daysArray = useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) => new Date(year, month, i + 1),
      ),
    [year, month, daysInMonth],
  );

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const scrollToToday = (smooth = true) => {
    const today = new Date();
    const isCurrentMonth =
      today.getMonth() === month && today.getFullYear() === year;

    if (isCurrentMonth && scrollContainerRef.current) {
      const todayDate = today.getDate();
      const containerWidth = scrollContainerRef.current.offsetWidth;
      const scrollPosition =
        (todayDate - 1) * dayWidth - containerWidth / 2 + dayWidth / 2;

      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const openReportModal = (dateStr) => {
    setModalFromDate(dateStr);
    setShowModal(true);
  };

  const today = new Date();
  const expirationDate = new Date(today.getFullYear(), 5, 30);

  // Calendar Grid Logic for Standard View
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const calendarPadding = Array.from(
    { length: firstDayOfMonth },
    (_, i) => null,
  );

  // Scroll logic triggered by date changes when "Today" is requested
  useEffect(() => {
    if (shouldScrollToToday.current) {
      const timer = setTimeout(() => {
        scrollToToday(true);
        shouldScrollToToday.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [month, year]);

  // Initial mount scroll
  useEffect(() => {
    if (isInitialMount.current) {
      const timer = setTimeout(() => {
        scrollToToday(false);
        isInitialMount.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGoToToday = () => {
    const today = new Date();
    const isDifferentMonth =
      today.getMonth() !== month || today.getFullYear() !== year;

    if (isDifferentMonth) {
      shouldScrollToToday.current = true;
      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      scrollToToday(true);
    }
  };

  const handleCloseNewModal = () => {
    setShowModal(false);
    if(calendarOption == "Me") { 
      fetchAbsences(); 
    }
    else if (calendarOption == "My team") { 
      fetchDepartmentAbsences(); 
    }
    fecthEmployeeAbsenceStats();
  };

  const handleCloseDetailsModal = () => {
    setEventsForDetails(null);
        if(calendarOption == "Me") { 
      fetchAbsences(); 
    }
    else if (calendarOption == "My team") { 
      fetchDepartmentAbsences(); 
    }
    fecthEmployeeAbsenceStats();
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans px-4 py-4 sm:p-6 md:p-0 pb-24 md:pb-8">
      {eventsForDetails && (
        <AbsenceDetailsModal
          events={eventsForDetails}
          closeModal={handleCloseDetailsModal}
          employeePortal={true}
          employeeId={employeeId}
        />
      )}{" "}
      <div className="max-w-full p-2 md:p-6 mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {" "}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 text-center md:text-left">
              My Absence Portal
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 text-center md:text-left">
              Manage your time off and track request status.
            </p>
          </div>
          <div
            className="w-full sm:w-auto text-center text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 cursor-pointer"
            onClick={openReportModal}
          >
            + Request Absence
          </div>
        </header>

        {/* Calendar Navigation & Legend */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between w-full">
            <div className="flex flex-row items-center gap-12">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center md:text-left">
                {currentDate.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>

              <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg border border-slate-100 dark:border-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                </button>

                <button
                  onClick={handleGoToToday}
                  className="px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-100 dark:border-gray-700 rounded-lg transition-colors dark:text-white"
                >
                  Today
                </button>

                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg border border-slate-100 dark:border-gray-700 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* control buttons: calendar type, pressure (Desktop)*/}
            <div className="flex-row items-center gap-3 hidden md:flex">
              <div className="flex bg-white border-2 border-slate-200 rounded-full text-xs px-1 py-0.5">
                {["Me", "My team"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setCalendarOption(t)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                      calendarOption === t
                        ? "bg-blue-700 text-white"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowHeatmap((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "7px 16px",
                  borderRadius: 20,
                  border: `1.5px solid ${showHeatmap ? "#F97316" : "#E2E8F0"}`,
                  background: showHeatmap ? "#FFF7ED" : "#fff",
                  color: showHeatmap ? "#EA580C" : "#64748B",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: showHeatmap
                    ? "0 0 0 3px rgba(249,115,22,0.12)"
                    : "none",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: showHeatmap
                      ? "linear-gradient(135deg,#FDE68A,#EF4444)"
                      : "#CBD5E1",
                    transition: "all 0.2s",
                  }}
                />
                Pressure
              </button>
            </div>
          </div>
        </div>

        {/* control buttons: calendar type, pressure (Mobile)*/}
        <div className="w-full flex md:hidden items-center justify-between">
          <div className="flex w-fit bg-white border-2 border-slate-200 rounded-full text-xs px-1 py-0.5">
            {["Me", "My team"].map((t) => (
              <button
                key={t}
                onClick={() => setCalendarOption(t)}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                  calendarOption === t
                    ? "bg-blue-700 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 16px",
              borderRadius: 20,
              border: `1.5px solid ${showHeatmap ? "#F97316" : "#E2E8F0"}`,
              background: showHeatmap ? "#FFF7ED" : "#fff",
              color: showHeatmap ? "#EA580C" : "#64748B",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: showHeatmap
                ? "0 0 0 3px rgba(249,115,22,0.12)"
                : "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: showHeatmap
                  ? "linear-gradient(135deg,#FDE68A,#EF4444)"
                  : "#CBD5E1",
                transition: "all 0.2s",
              }}
            />
            Pressure
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden sm:overflow-visible">
              {/* Timeline View (Desktop) - My calendar*/}
              {viewMode === "timeline" && calendarOption == "Me" && (
                <div
                  className="hidden md:block overflow-x-auto scrollbar-hide scroll-smooth rounded-2xl"
                  ref={scrollContainerRef}
                >
                  <div style={{ minWidth: sidebarW + daysInMonth * dayWidth }}>
                    {showHeatmap && (
                      <div
                        style={{
                          display: "flex",
                          borderBottom: "1px solid rgba(226,232,240,0.6)",
                          position: "relative",
                          height: 52,
                        }}
                      >
                        {/* Sidebar spacer with label */}
                        <div
                          style={{
                            width: sidebarW,
                            minWidth: sidebarW,
                            borderRight: "1px solid rgba(226,232,240,0.8)",
                            position: "sticky",
                            left: 0,
                            background: "#fff",
                            zIndex: 30,
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 18,
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#F97316",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Pressure
                          </span>
                        </div>

                        {/* Ribbon canvas */}
                        <div
                          style={{
                            position: "relative",
                            width: sidebarW,
                            flexShrink: 0,
                          }}
                        >
                          <PressureRibbon
                            pressures={smoothed}
                            totalDays={daysInMonth}
                            DAY_W={dayWidth}
                          />
                        </div>
                      </div>
                    )}

                    {showHeatmap && (
                      <div
                        style={{
                          display: "flex",
                          borderBottom: "1px solid rgba(226,232,240,0.6)",
                          position: "relative",
                          height: 52,
                        }}
                      >
                        {/* Sidebar spacer with label */}
                        <div
                          style={{
                            width: sidebarW,
                            minWidth: sidebarW,
                            borderRight: "1px solid rgba(226,232,240,0.8)",
                            position: "sticky",
                            left: 0,
                            background: "#fff",
                            zIndex: 30,
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 18,
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "#F97316",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Absence Factor
                          </span>
                        </div>

                        {/* Ribbon canvas */}
                        <div
                          style={{
                            position: "relative",
                            width: sidebarW,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexShrink: 0,
                              position: "sticky",
                              left: sidebarW + daysInMonth * dayWidth,
                            }}
                          >
                            {daysArray.map((date, idx) => {
                              const count = density[idx] ?? 0;
                              const isWeekend = [0, 6].includes(date.getDay());
                              const p = smoothed[idx] ?? 0;
                              const bg =
                                showHeatmap && !isWeekend
                                  ? pressureToColor(p)
                                  : undefined;
                              const textColor =
                                count === 0
                                  ? "#CBD5E1"
                                  : p >= 0.75
                                    ? "#DC2626"
                                    : p >= 0.4
                                      ? "#D97706"
                                      : "#3B82F6";

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    width: dayWidth,
                                    minWidth: dayWidth,
                                    height: 56,
                                    borderRight:
                                      "1px solid rgba(226,232,240,0.4)",
                                    backgroundColor: isWeekend ? undefined : bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background-color 0.4s ease",
                                  }}
                                >
                                  {count > 0 ? (
                                    <motion.span
                                      initial={{ scale: 0.6, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{
                                        delay: idx * 0.015,
                                        duration: 0.25,
                                        ease: [0.34, 1.56, 0.64, 1],
                                      }}
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: textColor,
                                        fontFamily: "'Geist Mono', monospace",
                                        letterSpacing: "-0.02em",
                                      }}
                                    >
                                      {count}
                                    </motion.span>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: isWeekend
                                          ? "transparent"
                                          : "#E2E8F0",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex border-b border-slate-50">
                      <div
                        style={{ width: sidebarW }}
                        className="p-4 border-r border-slate-100 sticky left-0 bg-white font-bold text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-3"
                      >
                        <User className="w-4 h-4" /> My Calendar
                      </div>
                      {daysArray.map((date, idx) => {
                        const weekend = isWeekend(date);
                        const isToday =
                          toYyyyMmDd(date) === toYyyyMmDd(new Date());
                        return (
                          <div
                            key={idx}
                            className={`w-12 py-4 flex flex-col items-center justify-center border-r border-slate-50 dark:border-gray-700 text-[10px] ${
                              weekend
                                ? "bg-slate-50/80 dark:bg-gray-900/50"
                                : ""
                            } ${isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          >
                            <span className={`${weekend ? "text-slate-200" : "text-slate-400"} text-[10px] font-bold`}>
                              {getDayName(date).slice(0, 3)}
                            </span>
                            <span
                              className={`text-sm font-bold mt-0.5 flex flex-col items-center ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-white"}`}
                            >
                              {date.getDate()}
                              {isToday && (
                                <div
                                  className={`w-1 h-1 rounded-full  text-white bg-blue-700`}
                                ></div>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex h-32 relative group">
                      <div
                        style={{ width: sidebarW }}
                        className="p-4 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-20 flex flex-col justify-center"
                      >
                        <span className="text-sm font-bold text-slate-800">
                          Timeline
                        </span>
                      </div>
                      <div className="flex relative">
                        {showHeatmap ? (
                          <>
                            {daysArray.map((date, idx) => (
                              <HeatCell
                                key={idx}
                                pressure={showHeatmap ? smoothed[idx] : 0}
                                date={date}
                                showHeatmap={showHeatmap}
                                isMe={true}
                              />
                            ))}
                          </>
                        ) : (
                          <>
                            {" "}
                            {daysArray.map((date, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  openReportModal(toYyyyMmDd(date))
                                }
                                className={`w-12 border-r border-slate-50 h-full transition-colors relative group/cell hover:bg-blue-50`}
                              >
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group/cell hover:opacity-100">
                                  <Plus className="w-4 h-4 text-blue-400" />
                                </div>
                              </button>
                            ))}
                          </>
                        )}

                        {absences.map((absence) => {
                          const start = new Date(absence.start);
                          const end = new Date(absence.end);
                          if (
                            start.getMonth() !== month &&
                            end.getMonth() !== month
                          )
                            return null;

                          const startDay =
                            start.getMonth() === month ? start.getDate() : 1;
                          const endDay =
                            end.getMonth() === month
                              ? end.getDate()
                              : daysInMonth;
                          const duration = endDay - startDay + 1;

                          const colorClass =
                            EVENT_COLORS[absence.type] || "bg-gray-400";
                          const icon = EVENT_ICONS[absence.type];
                          const pending = absence.status === "Pending";

                          return (
                            //absence bar
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              key={absence.id}
                              style={{
                                left: `${(startDay - 1) * dayWidth + 4}px`,
                                width: `${duration * dayWidth - 8}px`,
                                top: "50%",
                                transform: "translateY(-50%)",
                              }}
                              className={`absolute h-8 rounded-lg flex items-center px-2 cursor-pointer z-10 transition-all group/bar 
                              ${
                                pending
                                  ? "bg-slate-100 border border-slate-200 text-slate-500 shadow-none font-medium"
                                  : `${colorClass} text-white shadow-sm hover:brightness-110 hover:scale-[1.02]`
                              }
                                  `}
                              onClick={() => onAbsenceClick(absence)}
                            >
                              <div className="flex-shrink-0 flex items-center justify-center">
                                {/* If pending, show a clock. Otherwise, show the default icon */}
                                {pending ? (
                                  <svg
                                    stroke="currentColor"
                                    fill="none"
                                    strokeWidth="2.5"
                                    viewBox="0 0 24 24"
                                    className="w-3.5 h-3.5"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                ) : (
                                  icon
                                )}
                              </div>

                              {duration > 1 && (
                                <span
                                  className={`text-[10px] font-bold ml-1.5 truncate`}
                                >
                                  {absence.type} {pending && "(Pending)"}
                                </span>
                              )}

                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg pointer-events-none z-50 whitespace-nowrap shadow-xl">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">{absence.type}</p>
                                  {pending && (
                                    <span className="bg-blue-700 text-[8px] px-1 rounded uppercase tracking-wider">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <p className="opacity-80 text-[9px]">
                                  {absence.start} to {absence.end}
                                </p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar View (Mobile) - My calendar */}
              {calendarOption == "Me" && (
                <div className="block md:hidden">
                  {/* ── Month navigation bar ── */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <span className="text-sm font-bold text-slate-700 tracking-wide">
                      {new Date(year, month).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  {/* ── Horizontal scrollable day strip ── */}
                  <div className="overflow-x-auto scrollbar-hide px-4 pb-1">
                    <div
                      className="flex gap-1.5"
                      style={{ width: "max-content" }}
                    >
                      {daysArray.map((date, idx) => {
                        const weekend = isWeekend(date);
                        const isToday =
                          toYyyyMmDd(date) === toYyyyMmDd(new Date());
                        const p = smoothed[idx] ?? 0;

                        const hasAbsence = absences.some((a) => {
                          const s = new Date(a.start);
                          const e = new Date(a.end);
                          return date >= s && date <= e;
                        });

                        const absence = absences.find((a) => {
                          const s = new Date(a.start);
                          const e = new Date(a.end);
                          return date >= s && date <= e;
                        });

                        const pending = absence?.status === "Pending";
                        const colorClass = absence
                          ? EVENT_COLORS[absence.type]
                          : null;

                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              !hasAbsence && openReportModal(toYyyyMmDd(date))
                            }
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: idx * 0.012,
                              duration: 0.2,
                              ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            className={`
                            relative flex flex-col items-center justify-center rounded-2xl 
                            ${
                              isToday
                                ? "bg-blue-600 shadow-md shadow-blue-200"
                                : hasAbsence
                                  ? pending
                                    ? "bg-slate-100 border border-slate-200"
                                    : `${colorClass} opacity-90`
                                  : weekend
                                    ? "bg-slate-50"
                                    : showHeatmap
                                      ? ""
                                      : "bg-white border border-slate-100 active:bg-blue-50"
                            }
                          `}
                            style={{
                              width: 44,
                              minWidth: 44,
                              height: 64,
                              backgroundColor:
                                !isToday &&
                                !hasAbsence &&
                                !weekend &&
                                showHeatmap
                                  ? pressureToColor(p)
                                  : undefined,
                            }}
                          >
                            {/* Day name */}
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wider ${
                                isToday
                                  ? "text-blue-100"
                                  : weekend
                                    ? "text-slate-200"
                                    : hasAbsence && !pending
                                      ? "text-white/70"
                                      : "text-slate-400"
                              }`}
                            >
                              {getDayName(date)}
                            </span>

                            {/* Day number */}
                            <span
                              className={`text-sm font-bold mt-0.5 ${
                                isToday
                                  ? "text-white"
                                  : weekend
                                    ? "text-slate-300"
                                    : hasAbsence && !pending
                                      ? "text-white"
                                      : pending
                                        ? "text-slate-500"
                                        : "text-slate-800"
                              }`}
                            >
                              {date.getDate()}
                            </span>

                            {/* Absence dot or today dot */}
                            {isToday && !hasAbsence && (
                              <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
                            )}

                            {/* Absence icon — only if short duration pill won't fit */}
                            {hasAbsence && (
                              <span className="text-[10px] mt-0.5 leading-none text-white">
                                {pending ? "⏳" : EVENT_ICONS[absence.type]}
                              </span>
                            )}

                            {/* Pending pulse ring */}
                            {pending && (
                              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Absence list for this month ── */}
                  <div className="px-4 mt-4 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      My Absences
                    </p>

                    {absences?.length == 0 && (
                      <motion.div
                        className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.06,
                          duration: 0.24,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      >
                        <span className="text-2xl mb-2">🏖</span>
                        <p className="text-xs text-slate-400 font-medium">
                          No absences this month
                        </p>
                      </motion.div>
                    )}

                    {absences
                      .filter((a) => {
                        const s = new Date(a.start);
                        const e = new Date(a.end);
                        return s.getMonth() === month || e.getMonth() === month;
                      })
                      .map((absence, i) => {
                        const pending = absence.status === "Pending";
                        const colorClass =
                          EVENT_COLORS[absence.type] || "bg-gray-400";
                        const start = new Date(absence.start);
                        const end = new Date(absence.end);

                        return (
                          <motion.div
                            key={absence.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: i * 0.06,
                              duration: 0.24,
                              ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            onClick={() => onAbsenceClick(absence)}
                            className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 active:bg-slate-50 cursor-pointer transition-colors"
                          >
                            {/* Color stripe */}
                            <div
                              className={`w-1 self-stretch rounded-full ${pending ? "bg-slate-200" : colorClass}`}
                            />

                            {/* Icon bubble */}
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 text-white ${
                                pending
                                  ? "bg-slate-100"
                                  : `${colorClass} bg-opacity-15`
                              }`}
                            >
                              {pending ? "⏳" : EVENT_ICONS[absence.type]}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800 truncate">
                                  {absence.type}
                                </span>
                                {pending && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 uppercase tracking-wide flex-shrink-0">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {formatDate(absence.start)} →{" "}
                                {formatDate(absence.end)}
                              </span>
                            </div>

                            {/* Chevron */}
                            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          </motion.div>
                        );
                      })}

                    {/* Add absence CTA — only if heatmap is off (same condition as desktop + button) */}
                    {!showHeatmap && (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openReportModal(toYyyyMmDd(new Date()))}
                        className="w-full mt-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 text-blue-500 text-sm font-semibold active:bg-blue-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Request New Absence
                      </motion.button>
                    )}
                  </div>

                  {/* ── Pressure summary strip (only when heatmap is on) ── */}
                  {showHeatmap && (
                    <div className="px-4 mt-4">
                      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50">
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                            Absence Factor
                          </span>
                        </div>
                        <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-0.5">
                          {daysArray.map((date, idx) => {
                            const count = density[idx] ?? 0;
                            const weekend = isWeekend(date);
                            const p = smoothed[idx] ?? 0;

                            const textColor =
                              count === 0
                                ? "#CBD5E1"
                                : p >= 0.75
                                  ? "#DC2626"
                                  : p >= 0.4
                                    ? "#D97706"
                                    : "#3B82F6";

                            return (
                              <div
                                key={idx}
                                style={{
                                  width: 36,
                                  minWidth: 36,
                                  height: 44,
                                  borderRadius: 10,
                                  backgroundColor: weekend
                                    ? "transparent"
                                    : pressureToColor(p),
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  gap: 2,
                                  transition: "background-color 0.4s ease",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 600,
                                    color: weekend ? "#E2E8F0" : "#94A3B8",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {date.getDate()}
                                </span>
                                {count > 0 ? (
                                  <motion.span
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                                      delay: idx * 0.015,
                                      duration: 0.25,
                                      ease: [0.34, 1.56, 0.64, 1],
                                    }}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: textColor,
                                      fontFamily: "'Geist Mono', monospace",
                                      letterSpacing: "-0.02em",
                                    }}
                                  >
                                    {count}
                                  </motion.span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: weekend
                                        ? "transparent"
                                        : "#E2E8F0",
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="h-6" />
                </div>
              )}

              {/* Timeline View (Desktop + Mobile) - My team*/}
              {viewMode === "timeline" && calendarOption == "My team" && (
                <>
                  <div className="flex md:hidden items-center justify-between px-4 pt-4 pb-2 mb-3">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <span className="text-sm font-bold text-slate-700 tracking-wide">
                      {new Date(year, month).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(226,232,240,0.8)",
                      overflow: "hidden",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
                    }}
                    className="md:rounded-xl"
                  >
                    <div
                      className="overflow-x-auto scrollbar-hide"
                      ref={scrollContainerRef}
                    >
                      <div
                        style={{ minWidth: sidebarW + daysInMonth * dayWidth }}
                      >
                        {showHeatmap && (
                          <div
                            style={{
                              display: "flex",
                              borderBottom: "1px solid rgba(226,232,240,0.6)",
                              position: "relative",
                              height: 52,
                            }}
                          >
                            {/* Sidebar spacer with label */}
                            <div
                              style={{
                                width: sidebarW,
                                minWidth: sidebarW,
                                borderRight: "1px solid rgba(226,232,240,0.8)",
                                position: "sticky",
                                left: 0,
                                background: "#fff",
                                zIndex: 30,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                              className="pl-0 justify-center md:justify-start md:pl-[18px]"
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "#F97316",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                }}
                                className="text-[9px] md:text-[10px]"
                              >
                                <span className="hidden md:block">
                                  Pressure
                                </span>
                                <span className="block md:hidden">Press.</span>
                              </span>
                            </div>

                            {/* Ribbon canvas */}
                            <div
                              style={{
                                position: "relative",
                                width: sidebarW,
                                flexShrink: 0,
                              }}
                            >
                              <PressureRibbon
                                pressures={smoothed}
                                totalDays={daysInMonth}
                                DAY_W={dayWidth}
                              />
                            </div>
                          </div>
                        )}

                        {showHeatmap && (
                          <div
                            style={{
                              display: "flex",
                              borderBottom: "1px solid rgba(226,232,240,0.6)",
                              position: "relative",
                              height: 52,
                            }}
                          >
                            {/* Sidebar spacer with label */}
                            <div
                              style={{
                                width: sidebarW,
                                minWidth: sidebarW,
                                borderRight: "1px solid rgba(226,232,240,0.8)",
                                position: "sticky",
                                left: 0,
                                background: "#fff",
                                zIndex: 30,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                              className="pl-0 justify-center md:justify-start md:pl-[18px]"
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "#F97316",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                }}
                                className="text-[9px] md:text-[10px]"
                              >
                                <span className="hidden md:block">
                                  Absence Factor
                                </span>
                                <span className="block md:hidden">Factor</span>
                              </span>
                            </div>

                            {/* Ribbon canvas */}
                            <div
                              style={{
                                position: "relative",
                                width: sidebarW,
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexShrink: 0,
                                  position: "sticky",
                                  left: sidebarW + daysInMonth * dayWidth,
                                }}
                              >
                                {daysArray.map((date, idx) => {
                                  const count = density[idx] ?? 0;
                                  const isWeekend = [0, 6].includes(
                                    date.getDay(),
                                  );
                                  const p = smoothed[idx] ?? 0;
                                  const bg =
                                    showHeatmap && !isWeekend
                                      ? pressureToColor(p)
                                      : undefined;
                                  const textColor =
                                    count === 0
                                      ? "#CBD5E1"
                                      : p >= 0.75
                                        ? "#DC2626"
                                        : p >= 0.4
                                          ? "#D97706"
                                          : "#3B82F6";

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        width: dayWidth,
                                        minWidth: dayWidth,
                                        height: 56,
                                        borderRight:
                                          "1px solid rgba(226,232,240,0.4)",
                                        backgroundColor: isWeekend
                                          ? undefined
                                          : bg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition:
                                          "background-color 0.4s ease",
                                      }}
                                    >
                                      {count > 0 ? (
                                        <motion.span
                                          initial={{ scale: 0.6, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{
                                            delay: idx * 0.015,
                                            duration: 0.25,
                                            ease: [0.34, 1.56, 0.64, 1],
                                          }}
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: textColor,
                                            fontFamily:
                                              "'Geist Mono', monospace",
                                            letterSpacing: "-0.02em",
                                          }}
                                        >
                                          {count}
                                        </motion.span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: 9,
                                            color: isWeekend
                                              ? "transparent"
                                              : "#E2E8F0",
                                          }}
                                        >
                                          —
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Date Header Row ── */}
                        <div className="flex border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                          <div
                            style={{ width: sidebarW }}
                            className="p-4 border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-slate-50 md:bg-white dark:bg-gray-800 font-semibold text-slate-400 dark:text-gray-500 text-xs uppercase tracking-wider"
                          >
                            <span className="hidden md:block">Employees</span>
                          </div>
                          {daysArray.map((date, idx) => {
                            const weekend = isWeekend(date);
                            const isToday =
                              toYyyyMmDd(date) === toYyyyMmDd(new Date());
                            return (
                              <div
                                key={idx}
                                className={`w-12 py-3 flex flex-col items-center justify-center border-r border-slate-50 dark:border-gray-700 text-[10px] ${
                                  weekend
                                    ? "bg-slate-50/80 dark:bg-gray-900/50"
                                    : ""
                                } ${isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                                // onClick={() => onDayClick(date)}
                              >
                                <span
                                  className={`font-medium ${weekend ? "text-slate-200" : "text-slate-500 dark:text-gray-400"}`}
                                >
                                  {getDayName(date)}
                                </span>
                                <span
                                  className={`text-sm font-bold mt-0.5 flex flex-col items-center ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-white"}`}
                                >
                                  {date.getDate()}
                                  {isToday && (
                                    <div
                                      className={`w-1 h-1 rounded-full  text-white bg-blue-700`}
                                    ></div>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── Employees ── */}
                        <div className="divide-y divide-slate-100 dark:divide-gray-700">
                          {uniqueEmployees.map((employee) => (
                            <div
                              key={employee.id}
                              className="flex transition-colors group"
                            >
                              <div
                                className="p-4 border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-slate-50 md:bg-white dark:bg-gray-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700/80 z-20 flex flex-col md:flex-row items-center gap-3"
                                style={{ width: sidebarW }}
                              >
                                <div className="w-4 h-4 md:w-8 md:h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex flex-col md:flex-row items-center justify-center text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-600">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="md:overflow-hidden">
                                  <div className="text-[9px] md:text-sm font-semibold text-center md:text-left md:truncate text-slate-800 dark:text-white">
                                    {employee.name}
                                  </div>
                                  <div className="hidden md:block text-[10px] text-slate-400 dark:text-gray-500 font-medium uppercase truncate">
                                    {employee.position}
                                  </div>
                                </div>
                              </div>

                              <div className="flex relative">
                                {daysArray.map((date, idx) => (
                                  <HeatCell
                                    key={idx}
                                    pressure={showHeatmap ? smoothed[idx] : 0}
                                    date={date}
                                    showHeatmap={showHeatmap}
                                    isMe={employee.id == employeeId}
                                  />
                                ))}

                                {departmentAbsences
                                  ?.filter(
                                    (item) => item.employeeId === employee.id,
                                  )
                                  .map((absence) => {
                                    const start = new Date(absence.start);
                                    const end = new Date(absence.end);
                                    if (
                                      start.getMonth() !== month &&
                                      end.getMonth() !== month
                                    )
                                      return null;

                                    const startDay =
                                      start.getMonth() === month
                                        ? start.getDate()
                                        : 1;
                                    const endDay =
                                      end.getMonth() === month
                                        ? end.getDate()
                                        : daysInMonth;
                                    const duration = endDay - startDay + 1;

                                    const colorClass =
                                      EVENT_COLORS[absence.type] ||
                                      "bg-gray-400";
                                    const icon = EVENT_ICONS[absence.type];
                                    const pending =
                                      absence.status === "Pending";

                                    return (
                                      // absence bar
                                      <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        key={absence.id}
                                        style={{
                                          left: `${(startDay - 1) * dayWidth + 4}px`,
                                          width: `${duration * dayWidth - 8}px`,
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                        }}
                                        className={`absolute h-8 rounded-lg flex items-center px-2 cursor-pointer z-10 transition-all group/bar 
                                                ${
                                                  pending
                                                    ? "bg-slate-100 border text-slate-500 shadow-none font-medium border-slate-200"
                                                    : `${colorClass} text-white shadow-sm hover:brightness-110 hover:scale-[1.02]`
                                                }
                                                    `}
                                        onClick={() => onAbsenceClick(absence)}
                                      >
                                        <div className="flex-shrink-0 flex items-center justify-center">
                                          {/* If pending, show a clock. Otherwise, show the default icon */}
                                          {pending ? (
                                            <svg
                                              stroke="currentColor"
                                              fill="none"
                                              strokeWidth="2.5"
                                              viewBox="0 0 24 24"
                                              className="w-3.5 h-3.5"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                              ></circle>
                                              <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                          ) : (
                                            icon
                                          )}
                                        </div>
                                        {duration > 1 && (
                                          <span
                                            className={`text-[10px] font-bold ml-1.5 truncate`}
                                          >
                                            {absence.type}{" "}
                                            {pending && "(Pending)"}
                                          </span>
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg pointer-events-none z-50 whitespace-nowrap shadow-xl">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold">
                                              {absence.type}{" "}
                                              {absence.status == "Pending" &&
                                                "(Pending)"}
                                            </p>
                                          </div>
                                          <p className="opacity-80 text-[9px]">
                                            {absence.start} to {absence.end}
                                          </p>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                              </div>
                            </div>
                          ))}

                          {uniqueEmployees.length === 0 && (
                            <div className="text-[14px] text-gray-400 text-base py-6 w-full flex items-center justify-center">
                              No absences to show.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <span className="inline-flex md:hidden items-center gap-2 px-3 py-3 text-[10px] font-bold text-slate-500">
                <LuMousePointerClick className="w-3.5 h-3.5" />
                Tap a day to add absence
              </span>

              {/* Standard Calendar Grid (Desktop Only) */}
              {viewMode === "standard" && (
                <div className="hidden md:block p-6">
                  <div className="grid grid-cols-7 border-t border-l border-slate-100">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div
                          key={day}
                          className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-b border-slate-100 bg-slate-50/50"
                        >
                          {day}
                        </div>
                      ),
                    )}
                    {calendarPadding.map((_, i) => (
                      <div
                        key={`pad-${i}`}
                        className="h-24 sm:h-32 border-r border-b border-slate-50 bg-slate-50/20"
                      />
                    ))}
                    {daysArray.map((date, idx) => {
                      const dateStr = toYyyyMmDd(date);
                      const dailyEvents = absences?.filter(
                        (a) => dateStr >= a.start && dateStr <= a.end,
                      );
                      const isToday = dateStr === toYyyyMmDd(new Date());

                      return (
                        <div
                          key={idx}
                          onClick={() => openReportModal(dateStr)}
                          className={`h-24 sm:h-32 border-r border-b border-slate-100 p-2 group cursor-pointer hover:bg-blue-50/30 transition-colors ${isWeekend(date) ? "bg-slate-50/30" : "bg-white"}`}
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className={`text-xs font-bold ${isToday ? "bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full" : "text-slate-400"}`}
                            >
                              {date.getDate()}
                            </span>
                            <Plus className="w-3 h-3 text-slate-200 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="mt-2 space-y-1">
                            {dailyEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className={`px-1.5 py-0.5 rounded-md ${ev.status === "Pending" ? "bg-slate-100 text-slate-500" : `${EVENT_COLORS[ev.type]} text-white `} text-[8px] font-bold truncate shadow-sm`}
                              >
                                {ev.type}{" "}
                                {ev.status === "Pending" && "(Pending)"}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Balance Stats*/}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Remaining */}
            <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                  YTD
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {absenceStats?.remainingVacationDays}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-1">
                  {absenceStats?.remainingVacationDays == 1 ? "Remaining Day" : "Remaining Days"}
                  {absenceStats?.remainingVacationDaysPending > 0 && (
                    <span class="bg-gray-100 ml-0 md:ml-2 gap-1 flex items-center text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300">
                      <Clock className="w-2.5 h-2.5 mt-[2px]" />
                      {absenceStats?.remainingVacationDaysPending}
                       {absenceStats?.remainingVacationDaysPending == 1 ? "day" : "days"} pending
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{
                      width: `${(absenceStats?.remainingVacationDays / absenceStats?.annualTotalAllowance) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400">
                    {(
                      (absenceStats?.remainingVacationDays /
                        absenceStats?.annualTotalAllowance) *
                      100
                    ).toFixed(0)}
                    % of total allowance
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {absenceStats?.annualTotalAllowance} total
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Carried Over */}
            <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-amber-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg dark:bg-amber-900/30">
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                  EXPIRES JUN 30
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {absenceStats?.remainingCarriedOverDays}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-1">
                  {absenceStats?.remainingCarriedOverDays == 1 ? "Carried Over Day" : "Carried Over Days"}
                  {absenceStats?.remainingCarriedOverDaysPending > 0 && (
                    <span class="bg-gray-100 ml-0 md:ml-2 gap-1 flex items-center text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300">
                      <Clock className="w-2.5 h-2.5 mt-[2px]" />
                      {absenceStats?.remainingCarriedOverDaysPending} 
                      {absenceStats?.remainingCarriedOverDaysPending == 1 ? "day" : "days"} pending
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full"
                    style={{
                      width: `${absenceStats?.carriedOverTotalAllowance == 0 ? 0 : (absenceStats?.remainingCarriedOverDays / absenceStats?.carriedOverTotalAllowance) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400">
                    {absenceStats?.carriedOverTotalAllowance == 0
                      ? 0
                      : (
                          (absenceStats?.remainingCarriedOverDays /
                            absenceStats?.carriedOverTotalAllowance) *
                          100
                        ).toFixed(0)}
                    % of total allowance
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {absenceStats?.carriedOverTotalAllowance} total
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Used */}
            <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-green-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 rounded-lg dark:bg-green-900/30">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                {/* <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold"
                    >
                      HR
                    </div>
                  ))}
                </div> */}
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {absenceStats?.pendingRequestsNumber}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-1">
                   {absenceStats?.pendingRequestsNumber == 1 ? "Pending Request" : "Pending Requests"}
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{
                      width: `${(absenceStats?.approvedRequestsNumber / (absenceStats?.approvedRequestsNumber + absenceStats?.pendingRequestsNumber)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {absenceStats?.approvedRequestsNumber} Approved
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {absenceStats?.pendingRequestsNumber} Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Allowance */}
            <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-extrabold">
                  {absenceStats?.annualTotalAllowance}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-1">
                  Total Allowance
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  Contract {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <EmployeeAbsenceTimeline employeeId={employeeId} refreshFlag={null} api={portalApi} />
          <AbsencePolicyList openReportModal={openReportModal} />
        </div>
      </div>
      <AnimatePresence>
        {showModal && (
          <NewAbsenceModal
            closeModal={handleCloseNewModal}
            employeeId={employeeId}
            from={modalFromDate}
            api={portalApi}
            absenceTypesRoute="/EmployeePortal/GetAbsenceTypesForSelect"
            createAbsenceRoute="/EmployeePortal/CreateAbsence"
            previewRoute="/EmployeePortal/PreviewAbsenceImpact"
            previewOmitEmployeeId={true}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
