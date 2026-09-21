import { useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, press } from "framer-motion";
import { ChevronLeft, ChevronRight, User, Search, Check, Minus } from "lucide-react";
import { toYyyyMmDd } from "./utils/dateFormatter";
import { EVENT_ICONS, EVENT_COLORS } from "./config/events.config";
import { BiFilter } from "react-icons/bi";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";
import { Link } from "react-router-dom";
import AbsenceDetailsModal from "./AbsenceDetailsModal";
import PressureRibbon from "./PressureRibbon";

const dayWidth = 48;
const sidebarW = 256;

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getDayName = (date) =>
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

// Today-column treatment: a faint blue tint paints the entire column without
// adding hard borders, so the highlight stays soft and doesn't fight weekend
// tint or heatmap colors.
const TODAY_TINT_LIGHT = "rgba(37, 99, 235, 0.08)";

function HeatCell({ pressure, date, showHeatmap, isToday, isScheduled, showScheduling }) {
  const heatBg = showHeatmap ? pressureToColor(pressure) : undefined;
  const schedulingBg =
    showScheduling && !showHeatmap
      ? isScheduled
        ? "rgba(220,252,231,0.25)"
        : "rgba(254,242,242,0.25)"
      : undefined;
  const cellBg = heatBg ?? schedulingBg ?? (isToday ? TODAY_TINT_LIGHT : undefined);

  return (
    <div
      style={{
        width: dayWidth,
        backgroundColor: cellBg,
        transition: "background-color 0.4s ease",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {isToday && (showHeatmap || showScheduling) && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: TODAY_TINT_LIGHT }}
        />
      )}
    </div>
  );
}

export default function AbsenceCalendar({
  setLoading,
  refreshPendingFlag,
  setRefreshPendingFlag,
}) {
  const [absences, setAbsences] = useState([]);
  const [absencesStats, setAbsencesStats] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const scrollContainerRef = useRef(null);
  const isInitialMount = useRef(true);
  const shouldScrollToToday = useRef(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  const [departmentsFilter, setDepartmentFilter] = useState(false);
  const [departmentsOptions, setDepartmentsOptions] = useState([]);
  const [currentDepartmentFilter, setCurrentDepartmentFilter] = useState(null);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  const [eventsForDetails, setEventsForDetails] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const [scheduledDays, setScheduledDays] = useState(new Set());

  const density = useMemo(
    () => buildDensityMap(absences, year, month, daysInMonth),
    [year, month, daysInMonth, absences],
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

  const daysArray = useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) => new Date(year, month, i + 1),
      ),
    [year, month, daysInMonth],
  );

  // Single source of truth for "is this date today?" — avoids recomputing the
  // string per cell and keeps every row aligned on the same column.
  const todayKey = toYyyyMmDd(new Date());

  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    absences?.forEach((item) => {
      if (!map.has(item.employeeId)) {
        map.set(item.employeeId, {
          id: item.employeeId,
          name: item.employeeFullName,
          position: item.employeePosition,
        });
      }
    });

    return Array.from(map.values()).filter((emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [absences, searchTerm]);

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

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await api.get("/Department/GetDepartmentsForSelect");
        setDepartmentsOptions(response.data);
      } catch (err) {
        toast.error("Error while fetching departments.");
      }
    };

    loadDepartments();
  }, []);

  const fetchAbsences = async () => {
    try {
      const start = firstDayOfMonth(currentDate);
      const end = lastDayOfMonth(currentDate);
      if (selectedDepartmentId) {
        var response = await api.get(
          `/Absence/GetAllAbsences?start=${toYyyyMmDd(start)}&end=${toYyyyMmDd(end)}&departmentId=${selectedDepartmentId}`,
        );
      } else {
        var response = await api.get(
          `/Absence/GetAllAbsences?start=${toYyyyMmDd(start)}&end=${toYyyyMmDd(end)}`,
        );
      }

      setAbsences(response.data);
    } catch (err) {
      toast.error("Error while fetching absences.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    await toast.promise(downloadExcel(), {
      pending: "Preparing Excel file...",
      success: "Excel file downloaded successfully!",
      error: "Failed to download Excel file.",
    });
  };

  const downloadExcel = async () => {
    const start = firstDayOfMonth(currentDate);
    const end = lastDayOfMonth(currentDate);
    const result = await api.get(
      `/Absence/GetExcelData?startDate=${toYyyyMmDd(start)}&endDate=${toYyyyMmDd(end)}`,
      {
        responseType: "blob",
      },
    );

    const url = window.URL.createObjectURL(new Blob([result.data]));
    const link = document.createElement("a");
    link.href = url;

    const monthName = start.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    link.setAttribute("download", `Absences Report (${monthName}).xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    fetchAbsences();
  }, [currentDate, selectedDepartmentId, refreshPendingFlag]);

  const fetchAbsencesStats = async () => {
    try {
      if (selectedDepartmentId) {
        var response = await api.get(
          `/Absence/GetAbsencesStats?departmentId=${selectedDepartmentId}`,
        );
      } else {
        var response = await api.get("/Absence/GetAbsencesStats");
      }
      setAbsencesStats(response.data);
    } catch (err) {
      toast.error("Error while fetching absences stats.");
    }
  };

  useEffect(() => {
    fetchAbsencesStats();
  }, [selectedDepartmentId, refreshPendingFlag]);

  const fetchScheduledDays = async () => {
    try {
      const start = firstDayOfMonth(currentDate);
      const end = lastDayOfMonth(currentDate);
      const response = await api.get(
        `/Shift/GetScheduledDays?start=${toYyyyMmDd(start)}&end=${toYyyyMmDd(end)}`
      );
      setScheduledDays(new Set(response.data));
    } catch {
      setScheduledDays(new Set());
    }
  };

  useEffect(() => {
    if (showScheduling) fetchScheduledDays();
    else setScheduledDays(new Set());
  }, [showScheduling, currentDate]);

  const handleDepartmentFilterClick = (
    departmentId = null,
    departmentName = null,
  ) => {
    setSelectedDepartmentId(departmentId);
    setCurrentDepartmentFilter(departmentName);
    setDepartmentFilter(false);
  };

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

  const handleApprove = async (id) => {
    var approvePromise = api.patch(`/Absence/ApproveAbsence?absenceId=${id}`);

    await toast.promise(approvePromise, {
      pending: "Absence approving...",
      success: "Absence approved",
      error: "Error while approving the absence",
    });
    fetchAbsences();
    fetchAbsencesStats();
    setRefreshPendingFlag(!refreshPendingFlag);
  };

  const handleReject = async (id) => {
    var approvePromise = api.patch(`/Absence/RejectAbsence?absenceId=${id}`);

    await toast.promise(approvePromise, {
      pending: "Absence rejecting...",
      success: "Absence rejected",
      error: "Error while rejecting the absence",
    });
    fetchAbsences();
    fetchAbsencesStats();
    setRefreshPendingFlag(!refreshPendingFlag);
  };

  function parseYMDLocal(ymd) {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function atLocalMidnigth(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isWithinInclusive(dayDate, startStr, endStr) {
    const day = atLocalMidnigth(dayDate);
    const start = parseYMDLocal(startStr);
    const end = endStr ? parseYMDLocal(endStr) : start;

    const rangeStart = start <= end ? start : end;
    const rangeEnd = start <= end ? end : start;

    return day >= rangeStart && day <= rangeEnd;
  }

  function onDayClick(clickedDay) {
    const matches = absences.filter((e) =>
      isWithinInclusive(clickedDay, e.start, e.end),
    );
    setEventsForDetails(matches);
  }

  function onAbsenceClick(absence) {
    setEventsForDetails([absence]);
  }

  const handleCloseDetailsModal = () => {
    setEventsForDetails(null);
    fetchAbsences();
    fetchAbsencesStats();
    setRefreshPendingFlag(!refreshPendingFlag);
  };

  const patternIdModerate = useMemo(() => `pat-moderate-${Math.random()}`, []);
  const patternIdCritical = useMemo(() => `pat-critical-${Math.random()}`, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 text-slate-900">
      <div className="max-w-[1600px] space-y-6">
        {eventsForDetails && (
          <AbsenceDetailsModal
            events={eventsForDetails}
            closeModal={handleCloseDetailsModal}
          />
        )}

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex justify-center items-center">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Absence Calendar
              </h1>
              <span
                className="ml-2 text-blue-700 hover:underline cursor-pointer mt-1 flex items-center justify-center"
                onClick={handleExport}
              >
                <svg
                  class="w-4.5 h-4.5 mr-1 text-blue-700 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill-rule="evenodd"
                    d="M13 11.15V4a1 1 0 1 0-2 0v7.15L8.78 8.374a1 1 0 1 0-1.56 1.25l4 5a1 1 0 0 0 1.56 0l4-5a1 1 0 1 0-1.56-1.25L13 11.15Z"
                    clip-rule="evenodd"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M9.657 15.874 7.358 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.358l-2.3 2.874a3 3 0 0 1-4.685 0ZM17 16a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H17Z"
                    clip-rule="evenodd"
                  />
                </svg>
                Export to Excel
              </span>
            </div>

            <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
              Manage team calendar and capacity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {departmentsOptions && (
              <div>
                <button
                  id="dropdownActionButton"
                  data-dropdown-toggle="dropdownAction"
                  className="inline-flex items-center text-gray-500 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1.5 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 cursor-pointer"
                  type="button"
                  onClick={() => setDepartmentFilter((prev) => !prev)}
                >
                  <span className="sr-only">Department button</span>
                  <span className="flex justify-center items-center gap-1">
                    <BiFilter className="text-[1rem]" />
                    {currentDepartmentFilter
                      ? currentDepartmentFilter
                      : "Department"}
                  </span>
                  <svg
                    className="w-2.5 h-2.5 ms-2.5 mt-[2px]"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 10 6"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 4 4 4-4"
                    />
                  </svg>
                </button>

                {departmentsOptions && (
                  <div
                    id="dropdownAction"
                    className={`${
                      departmentsFilter ? "" : "hidden"
                    } z-100 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600 right-[18px]`}
                    onMouseLeave={() => setDepartmentFilter(false)}
                  >
                    <ul
                      className="py-1 text-sm text-gray-700 dark:text-gray-200"
                      aria-labelledby="dropdownActionButton"
                    >
                      {departmentsOptions.map((opt) => (
                        <li>
                          <span
                            className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                            onClick={() =>
                              handleDepartmentFilterClick(opt.value, opt.label)
                            }
                          >
                            {opt.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="py-1">
                      <span
                        className="flex items-center gap-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white cursor-pointer"
                        onClick={() => handleDepartmentFilterClick(null, null)}
                      >
                        <svg
                          class="mt-[2px] w-4 h-4 text-gray-600 dark:text-white"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-width="2"
                            d="m6 6 12 12m3-6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          />
                        </svg>
                        Remove filter
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Calendar Navigation & Legend */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold min-w-[180px] text-gray-900 dark:text-white">
              {currentDate.toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex gap-1">
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

          <div className="hidden md:flex flex-wrap items-center gap-4">
            {Object.entries(EVENT_COLORS).map(([type, color]) => {

              if (type == "Birthday" || type == "Employment Anniversary") { 
                return;
              }

            return(
              <div
                key={type}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400"
              >
                <div
                  className={`w-2 h-2 rounded-full flex items-center justify-center text-white ${color}`}
                ></div>
                {type}
              </div>
            )}
            )}
          
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

          <button
            onClick={() => setShowScheduling((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 500,
              padding: "7px 16px",
              borderRadius: 20,
              border: `1.5px solid ${showScheduling ? "#2563EB" : "#E2E8F0"}`,
              background: showScheduling ? "#EFF6FF" : "#fff",
              color: showScheduling ? "#1D4ED8" : "#64748B",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: showScheduling
                ? "0 0 0 3px rgba(37,99,235,0.12)"
                : "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: showScheduling
                  ? "linear-gradient(135deg,#93C5FD,#2563EB)"
                  : "#CBD5E1",
                transition: "all 0.2s",
              }}
            />
            Schedule
          </button>
          </div>
        </div>

        {/* Timeline View */}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(226,232,240,0.8)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="overflow-x-auto scrollbar-hide"
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
                        const isToday = toYyyyMmDd(date) === todayKey;
                        const p = smoothed[idx] ?? 0;
                        const heatBg = showHeatmap ? pressureToColor(p) : undefined;
                        const cellBg = heatBg ?? (isToday ? TODAY_TINT_LIGHT : undefined);
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
                              borderRight: "1px solid rgba(226,232,240,0.4)",
                              backgroundColor: cellBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background-color 0.4s ease",
                              position: "relative",
                            }}
                          >
                            {isToday && heatBg && (
                              <div
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  backgroundColor: TODAY_TINT_LIGHT,
                                  pointerEvents: "none",
                                }}
                              />
                            )}
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
                                  color: "#E2E8F0",
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

              {/* ── Scheduling Progress Row ── */}
              {showScheduling && (
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid rgba(226,232,240,0.6)",
                    height: 44,
                  }}
                >
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
                        color: "#2563EB",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Schedule
                    </span>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    {daysArray.map((date, idx) => {
                      const dateKey = toYyyyMmDd(date);
                      const isToday = dateKey === todayKey;
                      const isScheduled = scheduledDays.has(dateKey);
                      const bg = isScheduled
                        ? "rgba(220,252,231,0.6)"
                        : "rgba(254,242,242,0.6)";
                      const iconColor = isScheduled ? "#16A34A" : "#DC2626";

                      return (
                        <div
                          key={idx}
                          style={{
                            width: dayWidth,
                            minWidth: dayWidth,
                            height: 44,
                            borderRight: "1px solid rgba(226,232,240,0.4)",
                            backgroundColor: bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            transition: "background-color 0.3s ease",
                          }}
                        >
                          {isToday && (
                            <div
                              aria-hidden
                              style={{
                                position: "absolute",
                                inset: 0,
                                backgroundColor: TODAY_TINT_LIGHT,
                                pointerEvents: "none",
                              }}
                            />
                          )}
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.012, duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                            style={{ display: "flex", color: iconColor, position: "relative", zIndex: 1 }}
                          >
                            {isScheduled
                              ? <Check size={12} strokeWidth={3} />
                              : <Minus size={12} strokeWidth={2.5} />}
                          </motion.span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Date Header Row ── */}
              <div className="flex border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div
                  style={{ width: sidebarW }}
                  className="p-4 border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 font-semibold text-slate-400 dark:text-gray-500 text-xs uppercase tracking-wider"
                >
                  Employees
                </div>
                {daysArray.map((date, idx) => {
                  const weekend = isWeekend(date);
                  const isToday = toYyyyMmDd(date) === todayKey;
                  const isPast = date < new Date(new Date().setHours(0, 0, 0, 0)) && !isToday;
                  return (
                    <div
                      key={idx}
                      aria-current={isToday ? "date" : undefined}
                      style={{
                        boxShadow: isToday ? "inset 0 -2px 0 0 #2563EB" : undefined,
                        opacity: isPast ? 0.4 : 1,
                      }}
                      className={`w-12 py-2.5 flex flex-col items-center justify-center border-r border-slate-50 dark:border-gray-700 text-[10px] ${
                        weekend && !isToday ? "bg-slate-50/80 dark:bg-gray-900/50" : ""
                      } ${isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <span
                        className={`font-medium ${
                          isToday
                            ? "text-blue-600 dark:text-blue-300"
                            : weekend
                            ? "text-slate-300"
                            : "text-slate-500 dark:text-gray-400"
                        }`}
                      >
                        {getDayName(date)}
                      </span>
                      {isToday ? (
                        <span
                          title="Today"
                          className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[12px] font-bold shadow-sm"
                        >
                          {date.getDate()}
                        </span>
                      ) : (
                        <span className="mt-0.5 text-sm font-bold text-slate-800 dark:text-white">
                          {date.getDate()}
                        </span>
                      )}
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
                    <Link
                      to={`/employee/${employee.id}`}
                      className="w-64 p-4 border-r border-slate-100 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-slate-50 dark:group-hover:bg-gray-700/80 z-20 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-600">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-semibold truncate text-slate-800 dark:text-white">
                          {employee.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-gray-500 font-medium uppercase truncate">
                          {employee.position}
                        </div>
                      </div>
                    </Link>

                    <div className="flex relative">
                      {daysArray.map((date, idx) => (
                        <HeatCell
                          key={idx}
                          pressure={showHeatmap ? smoothed[idx] : 0}
                          date={date}
                          showHeatmap={showHeatmap}
                          isToday={toYyyyMmDd(date) === todayKey}
                          isScheduled={scheduledDays.has(toYyyyMmDd(date))}
                          showScheduling={showScheduling}
                        />
                      ))}

                      {absences
                        ?.filter((item) => item.employeeId === employee.id)
                        .map((absence) => {
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
                              {pending && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                              )}
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
                              {pending ? (
                                <div
                                  className={`
                                          absolute bottom-full left-1/2 -translate-x-1/2
                                          z-[100] transition-all duration-200
                                          opacity-0 invisible
                                          -translate-y-3
                                          group-hover/bar:opacity-100
                                          group-hover/bar:visible
                                          group-hover/bar:-translate-y-2
                                        `}
                                >
                                  <div className="w-44 text-sm bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg dark:border-gray-600 dark:bg-gray-700 text-center">
                                      <p className="font-semibold text-gray-900 dark:text-white text-[11px] truncate">
                                        {absence.type}
                                      </p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {absence.start} — {absence.end}
                                      </p>
                                    </div>

                                    <div className="flex divide-x divide-gray-200 dark:divide-gray-600">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReject(absence.id);
                                        }}
                                        className="flex-1 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-gray-700 transition-colors rounded-br-lg"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApprove(absence.id);
                                        }}
                                        className="flex-1 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-gray-700 transition-colors rounded-bl-lg"
                                      >
                                        Approve
                                      </button>
                                    </div>

                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45 dark:bg-gray-800 dark:border-gray-600" />
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg pointer-events-none z-50 whitespace-nowrap shadow-xl">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold">{absence.type}</p>
                                  </div>
                                  <p className="opacity-80 text-[9px]">
                                    {absence.start} to {absence.end}
                                  </p>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                                </div>
                              )}
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

          {selectedDepartmentId && (
            <div class="flex items-center p-4 text-xs text-blue-800 gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full  text-white bg-blue-800 mt-[1px]`}
              ></div>
              <span>Filters are applied.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
