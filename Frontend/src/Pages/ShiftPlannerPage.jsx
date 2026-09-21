import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  ChevronLeft, ChevronRight, Search, Plus, Minus, X, Clock,
  Sun, Moon, Star, Users, Check, AlertCircle, Settings,
  Pencil, Send, UserX, UserMinus, LayoutGrid, Layers, CalendarRange,
  PanelRightClose, PanelRightOpen, ShieldAlert, TriangleAlert, Wand2,
  Calendar, CalendarDays, ChevronDown, Download, CalendarOff,
  CheckCheckIcon, Repeat2, Lock,
  CheckCheck,
  ArrowDownUp,
  CirclePlay
} from "lucide-react";
import XLSX from "xlsx-js-style";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { toYyyyMmDd } from "../utils/dateFormatter";
import { defaultProfile } from "../assets";
import {
  buildLocalConfig, buildWeeklyMaps, getShiftTime, getActiveShifts,
  getPositionRequirements, getPositionRequirementsForDay, getShiftHours,
} from "../utils/shiftConfig";
import { getShiftUnavailableReports } from "../utils/shiftUnavailability";
import { EVENT_ICONS, EVENT_COLORS } from "../config/events.config";
import OnboardingFirstScheduleModal from "./OnboardingFirstScheduleModal";

const VITE_ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL;
const SHIFT_ICONS = { Sun, Moon, Star };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ABSENCE_TYPE_DISPLAY = {
  Vacation: "Vacation",
  SickLeave: "Sick Leave",
  "Sick Leave": "Sick Leave",
  JustifiedAbsence: "Justified Absence",
  "Justified Absence": "Justified Absence",
};

// ── Pure utilities (module-level — no closure dependencies) ──────────────────

function formatReportedAt(isoString) {
  const d = new Date(isoString);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const shiftKey = (date, shiftId) => `${toYyyyMmDd(date)}_${shiftId}`;

// ── EmpRow ────────────────────────────────────────────────────────────────────

const EmpRow = memo(function EmpRow({ emp, mode, onRemove, compact = false, fullyAllocated = false, overtime = false, considerWeeklyHours = true }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.13 }}
      className={`flex items-center justify-between gap-2 rounded-lg bg-white/70 hover:bg-white transition-colors group ${
        compact ? "py-1 px-1.5 mb-0.5" : "py-1.5 px-2 mb-1"
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <img
          src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
          alt=""
          className={`rounded-full object-cover shrink-0 ${compact ? "w-5 h-5" : "w-6 h-6"}`}
        />
        <div className="min-w-0">
          <span className={`font-medium text-gray-800 truncate block ${compact ? "text-[11px]" : "text-xs"}`}>
            {emp.fullName}
          </span>
          {!compact && (
            <span className="text-[10px] text-slate-400 truncate block">{emp.position}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {emp.isSwapped && (
          <span title="Shift assigned via voluntary swap" className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none inline-flex items-center gap-0.5">
            <Repeat2 className="w-2.5 h-2.5" strokeWidth={2} />Swapped
          </span>
        )}
        {considerWeeklyHours && mode === "edit" && overtime && (
          <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full leading-none">OT</span>
        )}
        {considerWeeklyHours && mode === "edit" && !overtime && fullyAllocated && (
          <span className="text-[9px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full leading-none">Full</span>
        )}
        {mode === "edit" && (
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all">
            <X className={`text-red-500 ${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
});

// ── PositionSlot ──────────────────────────────────────────────────────────────

const PositionSlot = memo(function PositionSlot({ req, assigned, mode, searchTerm, onAssign, onRemove, isFullyAllocated, isOvertime, considerWeeklyHours }) {
  const posAssigned = assigned.filter((e) => e.positionId === req.positionId);
  const actual = posAssigned.length;
  const met = actual >= req.requiredCount;
  const needMore = actual < req.requiredCount;

  const displayList = searchTerm
    ? posAssigned.filter((e) => e.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
    : posAssigned;

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-2 transition-colors ${
        mode === "edit" && needMore
          ? "border-red-200 bg-red-50/20"
          : met
          ? "border-emerald-200 bg-emerald-50/20"
          : "border-slate-200 bg-slate-50/10"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate pr-1">
          {req.positionTitle}
        </span>
        <span className={`flex items-center gap-1 text-[10px] font-medium tabular-nums shrink-0 ${needMore ? "text-red-600" : met ? "text-emerald-600" : "text-gray-600"}`}>
          {needMore && (
            <TriangleAlert
              className="w-3 h-3 text-red-600"
              aria-label="Slot under required headcount — needs assignment"
              title={`${req.requiredCount - actual} more needed`}
            />
          )}
          {actual}/{req.requiredCount}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {displayList.map((emp) => (
          <EmpRow
            key={emp.id}
            emp={emp}
            mode={mode}
            onRemove={() => onRemove(emp.id)}
            compact
            fullyAllocated={isFullyAllocated(emp)}
            overtime={isOvertime(emp)}
            considerWeeklyHours={considerWeeklyHours}
          />
        ))}
      </AnimatePresence>

      {mode === "edit" && needMore && (
        <button onClick={onAssign} className="w-full mt-0.5 py-1 rounded-lg flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 hover:bg-white/70 transition-colors cursor-pointer">
          <Plus className="w-2.5 h-2.5" />
          Assign {req.positionTitle}
        </button>
      )}
      {mode === "edit" && met && (
        <button onClick={onAssign} className="w-full mt-0.5 py-0.5 rounded flex items-center justify-center gap-1 text-[10px] text-slate-300 hover:text-slate-500 transition-colors cursor-pointer">
          <Plus className="w-2.5 h-2.5" />
          Add more
        </button>
      )}
    </div>
  );
});

// ── ShiftCard ─────────────────────────────────────────────────────────────────
// Extracted as a memo component so only the card whose data changed re-renders
// when activeSlot, expandedUnavailPanel, etc. change.

const ShiftCard = memo(function ShiftCard({
  day, shift, mode, assigned, posReqs,
  unavailReports, isPanelExpanded, searchTerm, isActiveSlot, shiftTime,
  onToggleUnavailPanel, onOpenAssignModal,
  onRemoveEmployee, isFullyAllocated, isOvertime, considerWeeklyHours,
}) {
  const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;

  const hasPositionShortfall = useMemo(() =>
    posReqs.some((req) => assigned.filter((e) => e.positionId === req.positionId).length < req.requiredCount),
    [posReqs, assigned]
  );

  const filteredAssigned = useMemo(() =>
    searchTerm
      ? assigned.filter((e) => e.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
      : assigned,
    [assigned, searchTerm]
  );

  const positionedIds = useMemo(() => new Set(posReqs.map((r) => r.positionId)), [posReqs]);

  const unpositioned = useMemo(
    () => filteredAssigned.filter((e) => !positionedIds.has(e.positionId)),
    [filteredAssigned, positionedIds]
  );

  const isAlert = mode === "edit" && hasPositionShortfall;

  // Per-card stable callbacks — day and shift.id are stable within a week
  const handleTogglePanel = useCallback(() => onToggleUnavailPanel(day, shift.id), [onToggleUnavailPanel, day, shift.id]);
  const handleAssignAny = useCallback(() => onOpenAssignModal(day, shift.id), [onOpenAssignModal, day, shift.id]);
  const handleRemove = useCallback((empId) => onRemoveEmployee(day, shift.id, empId), [onRemoveEmployee, day, shift.id]);

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        isActiveSlot
          ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400 ring-offset-1"
          : isAlert
          ? "bg-red-50/50 border-red-200"
          : shift.color
      }`}
    >
      {/* Shift header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShiftIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 shrink-0">{shift.label}</span>
          <span className="text-[10px] text-slate-400 truncate">{shiftTime}</span>
        </div>
        <div className="flex items-center gap-1">
          {unavailReports.length > 0 && (
            <button
              onClick={handleTogglePanel}
              className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                isPanelExpanded ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              <UserMinus className="w-2.5 h-2.5" />
              {unavailReports.length}
            </button>
          )}
        </div>
      </div>

      {/* Unavailability panel */}
      <AnimatePresence>
        {isPanelExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mb-2 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Reported unavailable</p>
              {unavailReports.map((r) => (
                <div key={r.employeeId} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 truncate">{r.fullName}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatReportedAt(r.reportedAt)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Position slots OR flat list */}
      {posReqs.length > 0 ? (
        <div className="space-y-1.5">
          {posReqs.map((req) => (
            <PositionSlot
              key={req.positionId}
              req={req}
              assigned={assigned}
              mode={mode}
              searchTerm={searchTerm}
              onAssign={() => onOpenAssignModal(day, shift.id, req.positionId, req.positionTitle)}
              onRemove={handleRemove}
              isFullyAllocated={isFullyAllocated}
              isOvertime={isOvertime}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}

          {unpositioned.length > 0 && (
            <div className="pt-0.5">
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-0.5">Other</p>
              <AnimatePresence mode="popLayout">
                {unpositioned.map((emp) => (
                  <EmpRow
                    key={emp.id}
                    emp={emp}
                    mode={mode}
                    onRemove={() => handleRemove(emp.id)}
                    compact
                    fullyAllocated={isFullyAllocated(emp)}
                    overtime={isOvertime(emp)}
                    considerWeeklyHours={considerWeeklyHours}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {mode === "edit" && (
            <button
              onClick={handleAssignAny}
              className="w-full py-1 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white/40 transition-all flex items-center justify-center gap-1 text-[10px] text-slate-300 hover:text-slate-500"
            >
              <Plus className="w-2.5 h-2.5" />
              Assign any
            </button>
          )}

          {mode === "view" && assigned.length === 0 && (
            <div className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-300">
              <UserX className="w-3.5 h-3.5" />
              <span className="text-[10px]">No one assigned</span>
            </div>
          )}
        </div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {filteredAssigned.map((emp) => (
              <EmpRow
                key={emp.id}
                emp={emp}
                mode={mode}
                onRemove={() => handleRemove(emp.id)}
                fullyAllocated={isFullyAllocated(emp)}
                overtime={isOvertime(emp)}
                considerWeeklyHours={considerWeeklyHours}
              />
            ))}
          </AnimatePresence>

          {mode === "view" && filteredAssigned.length === 0 && (
            <div className="flex flex-col items-center justify-center py-3 gap-1 text-gray-400">
              <UserX className="w-4 h-4" />
              <span className="text-[10px]">No one assigned yet</span>
            </div>
          )}

          {mode === "edit" && (
            <button
              onClick={handleAssignAny}
              className={`w-full mt-1 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center gap-1 text-xs ${
                isActiveSlot
                  ? "border-blue-300 bg-blue-50 text-blue-500 hover:bg-blue-100"
                  : "border-slate-300 hover:border-slate-400 hover:bg-white/50 text-slate-400 hover:text-slate-600"
              }`}
            >
              <Plus className="w-3 h-3" />
              {isActiveSlot ? "Select from roster →" : "Assign"}
            </button>
          )}
        </>
      )}
    </div>
  );
});

// ── ByRoleShiftSlot ───────────────────────────────────────────────────────────
// Mini shift card used in the By Role view — only shows one position's employees.

const ByRoleShiftSlot = memo(function ByRoleShiftSlot({
  shift, positionId, positionTitle, assigned, requiredCount,
  mode, searchTerm, onOpenAssignModal, onRemoveEmployee,
  isFullyAllocated, isOvertime, considerWeeklyHours,
}) {
  const ShiftIcon = SHIFT_ICONS[shift.iconName] ?? Sun;
  const posAssigned = useMemo(
    () => assigned.filter((e) => e.positionId === positionId),
    [assigned, positionId]
  );
  const actual = posAssigned.length;
  const met = actual >= requiredCount;

  const filteredPos = useMemo(() =>
    searchTerm
      ? posAssigned.filter((e) => e.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
      : posAssigned,
    [posAssigned, searchTerm]
  );

  const handleAssign = useCallback(
    () => onOpenAssignModal(positionId, positionTitle),
    [onOpenAssignModal, positionId, positionTitle]
  );

  return (
    <div
      className={`rounded-xl border p-2.5 transition-all ${
        mode === "edit" && !met ? "bg-red-50/40 border-red-200" : shift.color
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <ShiftIcon className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] font-semibold text-slate-600">{shift.label}</span>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-medium tabular-nums ${!met ? "text-red-600" : "text-emerald-600"}`}>
          {!met && (
            <TriangleAlert
              className="w-3 h-3 text-red-600"
              aria-label="Slot under required headcount — needs assignment"
              title={`${requiredCount - actual} more needed`}
            />
          )}
          {actual}/{requiredCount}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredPos.map((emp) => (
          <EmpRow
            key={emp.id}
            emp={emp}
            mode={mode}
            onRemove={() => onRemoveEmployee(emp.id)}
            compact
            fullyAllocated={isFullyAllocated(emp)}
            overtime={isOvertime(emp)}
            considerWeeklyHours={considerWeeklyHours}
          />
        ))}
      </AnimatePresence>

      {mode === "view" && filteredPos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-300">
          <UserX className="w-3.5 h-3.5" />
          <span className="text-[10px]">Unassigned</span>
        </div>
      )}

      {mode === "edit" && (
        <button
          onClick={handleAssign}
          className={`w-full mt-1 py-1 rounded-lg border-2 border-dashed flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer ${
            !met
              ? "border-red-200 text-red-300 hover:border-red-300 hover:text-red-500 hover:bg-red-50/20"
              : "border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-500 hover:bg-white/40"
          }`}
        >
          <Plus className="w-2.5 h-2.5" />
          Assign
        </button>
      )}
    </div>
  );
});

// ── DayHeader ─────────────────────────────────────────────────────────────────

const DayHeader = memo(function DayHeader({ day, today, weekendsWorking, compact = false }) {
  const isToday = isSameDay(day, today);
  const weekend = isWeekend(day);
  const isNonWorkingWeekend = weekend && !weekendsWorking;
  return (
    <div className={`px-3 border-b flex items-center justify-between ${compact ? "py-2" : "px-4 py-3"} ${isToday ? "border-blue-200" : "border-slate-200"}`}>
      <div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
          isToday ? "text-blue-600" : isNonWorkingWeekend ? "text-slate-300" : weekend ? "text-slate-400" : "text-slate-500"
        }`}>{DAY_NAMES[day.getDay()]}</span>
        <p className={`font-bold ${compact ? "text-base" : "text-lg"} ${isToday ? "text-blue-700" : isNonWorkingWeekend ? "text-slate-300" : "text-gray-900"}`}>
          {day.getDate()}
        </p>
      </div>
      {isToday && <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">Today</span>}
    </div>
  );
});

// ── Roster sub-components ─────────────────────────────────────────────────────

const RosterEmployeeRow = memo(function RosterEmployeeRow({
  emp, status, getScheduledHours,
  // onAssign(emp) and onRemove(empId) — stable refs passed from parent
  onAssign, onRemove, absenceType, considerWeeklyHours = true,
}) {
  const scheduled = getScheduledHours(emp.id);
  const rawPct = Math.round((scheduled / (emp.weeklyHours || 40)) * 100);
  const pctCapped = Math.min(100, rawPct);
  const barColor = rawPct > 100 ? "bg-red-500" : rawPct >= 100 ? "bg-orange-400" : rawPct >= 80 ? "bg-amber-400" : "bg-emerald-400";

  const isClickable = status === "available" || status === "lowHours" || status === "fullyAllocated" || status === "overtime";

  const rowClass = {
    assigned:       "bg-emerald-50 border border-emerald-100",
    available:      "bg-white border border-slate-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer group",
    lowHours:       "bg-amber-50/60 border border-amber-100 hover:bg-amber-50 cursor-pointer group",
    fullyAllocated: "bg-orange-50 border border-orange-100 hover:bg-orange-100 cursor-pointer opacity-80 group",
    overtime:       "bg-red-50 border border-red-100 hover:bg-red-100 cursor-pointer opacity-80 group",
    onLeave:        "bg-slate-50 border border-slate-100 opacity-60",
    unavailable:    "bg-slate-50 border border-slate-100 opacity-60",
    workingToday:   "bg-indigo-50/60 border border-indigo-100 opacity-60",
  }[status] ?? "bg-white border border-slate-100";

  return (
    <div
      onClick={isClickable && onAssign ? () => onAssign(emp) : undefined}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${rowClass}`}
    >
      <img
        src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
        alt="" className="w-7 h-7 rounded-full object-cover shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-xs font-medium text-gray-900 truncate leading-none">{emp.fullName}</span>
          {status === "assigned" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
          {status === "onLeave" && (
            <span className="text-[9px] font-semibold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0 leading-none">{absenceType}</span>
          )}
          {status === "unavailable" && (
            <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0 leading-none">Unavailable</span>
          )}
          {considerWeeklyHours && status === "fullyAllocated" && (
            <span className="text-[9px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full shrink-0 leading-none">Full</span>
          )}
          {considerWeeklyHours && status === "overtime" && (
            <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0 leading-none">Overtime</span>
          )}
          {status === "workingToday" && (
            <span className="text-[9px] font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0 leading-none">Today</span>
          )}
        </div>
        {considerWeeklyHours ? (
          <div className="flex items-center gap-1.5">
            <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pctCapped}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{scheduled}/{emp.weeklyHours ?? 40}h</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 tabular-nums">{scheduled > 0 ? `${scheduled}h this week` : "Not scheduled"}</span>
        )}
      </div>
      {status === "assigned" && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(emp.id); }}
          className="p-0.5 hover:bg-red-100 rounded transition-colors shrink-0"
        >
          <X className="w-3 h-3 text-red-400" />
        </button>
      )}
      {isClickable && !onRemove && (
        <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
      )}
    </div>
  );
});

function RosterSection({ label, count, color, children }) {
  if (count === 0) return null;
  return (
    <section>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-0.5 ${color}`}>
        {label} <span className="opacity-60">({count})</span>
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

const RosterPanel = memo(function RosterPanel({
  employees, activeSlot, assignedToSlot, activeSlotAbsences, activeSlotUnavailReports,
  assignedElsewhereToday,
  // onAssign(emp) and onRemove(empId) are stable useCallback refs from the main component
  onAssign, onRemove, getScheduledHours, shiftLabel, shiftHours, search, onSearchChange, onClose,
  considerWeeklyHours,
}) {
  const filtered = useMemo(() => {
    if (!employees) return [];
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter((e) => e.fullName.toLowerCase().includes(s) || e.position.toLowerCase().includes(s));
  }, [employees, search]);

  const grouped = useMemo(() => {
    const assigned = [], workingToday = [], available = [], lowHours = [], fullyAllocated = [], overtime = [], onLeave = [], unavailable = [];
    filtered.forEach((emp) => {
      if (assignedToSlot?.some((e) => e.id === emp.id)) { assigned.push(emp); return; }
      if (activeSlotAbsences?.[emp.id])                 { onLeave.push(emp); return; }
      if (activeSlotUnavailReports?.find((r) => r.employeeId === emp.id)) { unavailable.push(emp); return; }
      if (assignedElsewhereToday?.has(emp.id))          { workingToday.push(emp); return; }
      if (!considerWeeklyHours)                         { available.push(emp); return; }
      const scheduled = getScheduledHours(emp.id);
      const weekly = emp.weeklyHours ?? 40;
      if (scheduled > weekly)                           { overtime.push(emp); return; }
      if (scheduled === weekly)                         { fullyAllocated.push(emp); return; }
      if (weekly - scheduled < (shiftHours ?? 8))       { lowHours.push(emp); return; }
      available.push(emp);
    });
    return { assigned, workingToday, available, lowHours, fullyAllocated, overtime, onLeave, unavailable };
  }, [filtered, assignedToSlot, activeSlotAbsences, activeSlotUnavailReports, getScheduledHours, shiftHours, assignedElsewhereToday, considerWeeklyHours]);

  // Pass stable parent callbacks directly; RosterEmployeeRow calls onAssign(emp) / onRemove(empId)
  const activeOnAssign = activeSlot ? onAssign : undefined;
  const activeOnRemove = activeSlot ? onRemove : undefined;

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ maxHeight: "calc(100vh - 140px)" }}>
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">Team Roster</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <PanelRightClose className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {activeSlot ? (
          <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-0.5">Assigning to</p>
            <p className="text-xs font-semibold text-blue-800 truncate">
              {shiftLabel} · {activeSlot.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
            {activeSlot.filterPositionTitle && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                <Users className="w-2.5 h-2.5" /> {activeSlot.filterPositionTitle}
              </span>
            )}
          </div>
        ) : (
          <div className="mb-3 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
            <p className="text-[11px] text-slate-400">Click a shift slot to start assigning</p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text" placeholder="Search by name or role..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
            value={search} onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-3 space-y-4">
        <RosterSection label="Assigned" count={grouped.assigned.length} color="text-emerald-600">
          {grouped.assigned.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="assigned"
              getScheduledHours={getScheduledHours} onRemove={activeOnRemove}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Working today" count={grouped.workingToday.length} color="text-indigo-500">
          {grouped.workingToday.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="workingToday"
              getScheduledHours={getScheduledHours}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Available" count={grouped.available.length} color="text-slate-500">
          {grouped.available.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="available"
              getScheduledHours={getScheduledHours} onAssign={activeOnAssign}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Low remaining hours" count={grouped.lowHours.length} color="text-amber-600">
          {grouped.lowHours.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="lowHours"
              getScheduledHours={getScheduledHours} onAssign={activeOnAssign}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Fully Allocated" count={grouped.fullyAllocated.length} color="text-orange-500">
          {grouped.fullyAllocated.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="fullyAllocated"
              getScheduledHours={getScheduledHours} onAssign={activeOnAssign}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Overtime" count={grouped.overtime.length} color="text-red-500">
          {grouped.overtime.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="overtime"
              getScheduledHours={getScheduledHours} onAssign={activeOnAssign}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="On Leave" count={grouped.onLeave.length} color="text-slate-400">
          {grouped.onLeave.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="onLeave"
              getScheduledHours={getScheduledHours}
              absenceType={activeSlotAbsences?.[emp.id]}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        <RosterSection label="Unavailable" count={grouped.unavailable.length} color="text-slate-400">
          {grouped.unavailable.map((emp) => (
            <RosterEmployeeRow key={emp.id} emp={emp} status="unavailable"
              getScheduledHours={getScheduledHours}
              considerWeeklyHours={considerWeeklyHours}
            />
          ))}
        </RosterSection>

        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">No employees match your search.</div>
        )}
      </div>
    </div>
  );
});

// ── Month view week badge styles ─────────────────────────────────────────────

const WEEK_BADGE_STYLES = [
  { label: "Week 1" },
  { label: "Week 2" }, 
  { label: "Week 3" }, 
  { label: "Week 4" }, 
  { label: "Week 5" }, 
];

// ── Weekly Hours Overview ─────────────────────────────────────────────────────

const ABSENCE_WEEK_STYLES = {
  "Vacation":          { dot: "bg-blue-400",   text: "text-blue-600" },
  "Sick Leave":        { dot: "bg-red-400",    text: "text-red-500"  },
  "Justified Absence": { dot: "bg-orange-400", text: "text-orange-500" },
};

// ── WeekAbsenceBanner ─────────────────────────────────────────────────────────

const ABSENCE_BANNER_COLORS = {
  "Vacation":          { pill: "bg-blue-50 border-blue-100",     badge: "bg-blue-100 text-blue-700"   },
  "Sick Leave":        { pill: "bg-red-50 border-red-100",       badge: "bg-red-100 text-red-600"     },
  "Justified Absence": { pill: "bg-orange-50 border-orange-100", badge: "bg-orange-100 text-orange-600" },
};

function formatDayRange(days) {
  if (!days.length) return "";
  const fmt = (d) => d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  if (days.length === 1) return fmt(days[0]);
  return `${fmt(days[0])} – ${fmt(days[days.length - 1])}`;
}

const WeekAbsenceBanner = memo(function WeekAbsenceBanner({ weekAbsences, employees, visibleDays }) {
  const weekKey = visibleDays.length > 0 ? toYyyyMmDd(visibleDays[0]) : "";
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { setDismissed(false); }, [weekKey]);

  const entries = useMemo(() => {
    if (!employees?.length || !Object.keys(weekAbsences).length) return [];
    const empMap = new Map(employees.map((e) => [e.id, e]));
    const byEmp = {};
    visibleDays.forEach((day) => {
      const dayStr = toYyyyMmDd(day);
      employees.forEach(({ id }) => {
        const type = weekAbsences[`${id}|${dayStr}`];
        if (!type) return;
        if (!byEmp[id]) byEmp[id] = { type, days: [] };
        byEmp[id].days.push(day);
      });
    });
    return Object.entries(byEmp)
      .map(([id, { type, days }]) => ({ emp: empMap.get(id), type, days }))
      .filter((e) => e.emp);
  }, [weekAbsences, employees, visibleDays]);

  if (!entries.length || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-700">Absences this week</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 tabular-nums">
            {entries.length}
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Dismiss">
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {entries.map(({ emp, type, days }) => {
          const style = ABSENCE_BANNER_COLORS[type] ?? ABSENCE_BANNER_COLORS["Justified Absence"];
          return (
            <div
              key={emp.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 ${style.pill}`}
            >
              <img
                src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
                alt=""
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
              <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">{emp.fullName}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${style.badge}`}>
                {type}
              </span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDayRange(days)}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

const WeeklyHoursOverview = memo(function WeeklyHoursOverview({
  employees, getScheduledHours, getScheduledDays, weekAbsences, weekAbsenceHours = {}, visibleDays, considerWeeklyHours = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  // null = all positions shown; otherwise a Set of selected positionIds
  const [selectedPositionIds, setSelectedPositionIds] = useState(null);

  // Group employees by position, preserving insertion order.
  const positionGroups = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (!map.has(emp.positionId))
        map.set(emp.positionId, { id: emp.positionId, title: emp.position, employees: [] });
      map.get(emp.positionId).employees.push(emp);
    });
    return [...map.values()];
  }, [employees]);

  const filteredGroups = useMemo(() => {
    if (!selectedPositionIds || selectedPositionIds.size === 0) return positionGroups;
    return positionGroups.filter((g) => selectedPositionIds.has(g.id));
  }, [positionGroups, selectedPositionIds]);

  const togglePosition = useCallback((id) => {
    setSelectedPositionIds((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearPositionFilter = useCallback(() => setSelectedPositionIds(null), []);

  const isFiltered = selectedPositionIds && selectedPositionIds.size > 0;

  // Absent days per employee for this visible week, grouped by type.
  // Also computes total absence hours (from chargedWorkingHours / workingDays per absence).
  const absenceSummary = useMemo(() => {
    const out = {};
    employees.forEach((emp) => {
      const byType = {};
      let totalHours = 0;
      visibleDays.forEach((day) => {
        const key = `${emp.id}|${toYyyyMmDd(day)}`;
        const t = weekAbsences[key];
        if (t) {
          byType[t] = (byType[t] || 0) + 1;
          totalHours += weekAbsenceHours[key] ?? 0;
        }
      });
      if (Object.keys(byType).length) out[emp.id] = { byType, totalHours };
    });
    return out;
  }, [employees, weekAbsences, weekAbsenceHours, visibleDays]);

  if (!employees.length) return null;

  const title = considerWeeklyHours ? "Team Hours This Week" : "Team Schedule This Week";

  const headerAndFilter = (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-50/60 transition-colors"
      >
        <Users className="w-4 h-4 text-slate-400 shrink-0" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {isFiltered && (
          <span className="ml-1 inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {selectedPositionIds.size} filtered
          </span>
        )}
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
          {filteredGroups.reduce((n, g) => n + g.employees.length, 0)}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && positionGroups.length > 1 && (
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={clearPositionFilter}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              !isFiltered
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          {positionGroups.map((g) => {
            const active = selectedPositionIds?.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => togglePosition(g.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  // ── Simple schedule table (considerWeeklyHours = false) ──────────────────
  if (!considerWeeklyHours) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {headerAndFilter}

        {isOpen && (
        <div className="divide-y divide-slate-50">
          {filteredGroups.map((group) => (
            <div key={group.title} className="px-5 py-4">
              <div className="mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-1 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Employee</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 text-right">Hours</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 text-right w-10">Days</span>
              </div>

              <div className="space-y-0.5">
                {[...group.employees].sort((a, b) => getScheduledHours(b.id) - getScheduledHours(a.id)).map((emp) => {
                  const scheduled = getScheduledHours(emp.id);
                  const scheduledDays = getScheduledDays(emp.id);

                  return (
                    <div key={emp.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-1 py-1.5">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
                          alt="" className="w-5 h-5 rounded-full object-cover shrink-0 opacity-80"
                        />
                        <span className="text-[11px] font-medium text-gray-700 truncate">
                          {emp.fullName}
                        </span>
                      </div>

                      {/* Scheduled hours */}
                      <span className={`text-[11px] tabular-nums font-semibold text-right ${
                        scheduled > 0 ? "text-slate-700" : "text-slate-300"
                      }`}>
                        {scheduled > 0 ? `${scheduled}h` : "—"}
                      </span>

                      {/* Scheduled days */}
                      <span className={`text-[11px] tabular-nums text-right w-10 ${
                        scheduled > 0 ? "text-slate-500" : "text-slate-300"
                      }`}>
                        {scheduled > 0 ? `${scheduledDays}d` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  }

  // ── Progress bar view ───────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {headerAndFilter}

      {/* Position groups */}
      {isOpen && (
      <div className="divide-y divide-slate-50">
        {filteredGroups.map((group) => {
          const fullyCount = group.employees.filter((emp) => {
            const s = getScheduledHours(emp.id);
            const absHours = absenceSummary[emp.id]?.totalHours ?? 0;
            return s + absHours >= (emp.weeklyHours ?? 40);
          }).length;
          const allReady = fullyCount === group.employees.length;

          return (
            <div key={group.title} className="px-5 py-4">
              {/* Position header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </span>
                <span className={`text-[11px] font-semibold tabular-nums ${
                  allReady ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {fullyCount}/{group.employees.length} ready
                </span>
              </div>

              {/* Employee rows */}
              <div className="space-y-0.5">
                {group.employees.map((emp) => {
                  const scheduled = getScheduledHours(emp.id);
                  const weekly = emp.weeklyHours ?? 40;
                  const empAbsence = absenceSummary[emp.id];
                  const absHours = empAbsence?.totalHours ?? 0;
                  const total = scheduled + absHours;

                  const overtime = scheduled > weekly;
                  const fullyAllocated = !overtime && total >= weekly;

                  const scheduledPct = Math.min(100, (scheduled / weekly) * 100);
                  const absencePct  = Math.min(100 - scheduledPct, (absHours / weekly) * 100);

                  const scheduledBarColor = overtime
                    ? "bg-red-400"
                    : fullyAllocated
                    ? "bg-emerald-400"
                    : "bg-slate-300";

                  const otherAbsences = empAbsence
                    ? Object.entries(empAbsence.byType).filter(([t]) => t !== "Vacation")
                    : [];

                  return (
                    <div key={emp.id} className="flex items-center gap-2.5 px-1 py-1.5">
                      {/* Avatar */}
                      <img
                        src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
                        alt="" className="w-5 h-5 rounded-full object-cover shrink-0 opacity-80"
                      />

                      {/* Name */}
                      <span className="w-28 text-[11px] font-medium text-gray-700 truncate shrink-0">
                        {emp.fullName}
                      </span>

                      {/* Composite bar: scheduled + absence (blue) */}
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-0 flex">
                        <div
                          className={`h-full transition-all duration-300 ${scheduledBarColor} ${absencePct > 0 ? "" : "rounded-full"}`}
                          style={{ width: `${scheduledPct}%` }}
                        />
                        {absencePct > 0 && (
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${absencePct}%` }}
                            title={`${absHours}h covered by absence`}
                          />
                        )}
                      </div>

                      {/* Hours label */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[11px] tabular-nums font-semibold ${
                          overtime ? "text-red-500" : fullyAllocated ? "text-emerald-600" : "text-slate-500"
                        }`}>
                          {scheduled}h
                        </span>
                        {absHours > 0 && (
                          <span className="text-[11px] tabular-nums font-semibold text-blue-600">
                            +{absHours}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-300">/</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">{weekly}h</span>
                      </div>

                      {/* Status indicator */}
                      <div className="w-5 shrink-0 flex items-center justify-center">
                        {fullyAllocated ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : otherAbsences.length > 0 ? (
                          <div className="flex gap-0.5">
                            {otherAbsences.map(([type]) => {
                              const s = ABSENCE_WEEK_STYLES[type] ?? { dot: "bg-slate-300" };
                              return <span key={type} className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />;
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
});

// ── WeekGrid (shared by WeekPlannerView + MonthWeekCard) ─────────────────────

function WeekGrid({
  visibleDays, activeShifts, positionGroups, config, today,
  planView, mode, searchTerm,
  getShiftEmployees, isFullyAllocated, isOvertime,
  unavailability, expandedUnavailPanel, activeSlot,
  toggleUnavailPanel, onOpenAssignModal, onRemoveEmployee,
  loading, currentMonth, currentYear,
}) {
  const gridCols = visibleDays.length;

  return (
    <div className={`space-y-6 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>

      {/* Combined view */}
      {planView === "combined" && (
        <div className="scroll-grid-container overflow-x-auto">
          <div className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(${visibleDays.length > 5 ? "220px" : "0"}, 1fr))` }}
          >
            {visibleDays.map((day) => {
              const isToday = isSameDay(day, today);
              const weekend = isWeekend(day);
              const isNonWorkingWeekend = weekend && !config?.weekendsWorking;
              const isOutOfMonth = currentMonth != null && currentYear != null &&
                (day.getMonth() !== currentMonth || day.getFullYear() !== currentYear);
              return (
                <div key={toYyyyMmDd(day)}
                  {...(isToday ? { "data-today-col": true } : {})}
                  className={`rounded-2xl border transition-all ${
                    isOutOfMonth ? "border-slate-100 bg-slate-50/40 opacity-40 pointer-events-none"
                      : isNonWorkingWeekend ? "border-slate-100 bg-slate-50/30"
                      : isToday ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <DayHeader day={day} today={today} weekendsWorking={config?.weekendsWorking} />
                  {isNonWorkingWeekend && !isOutOfMonth ? (
                    <div className="p-4 text-center"><p className="text-xs text-slate-300 font-medium">Non-working</p></div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {activeShifts.map((shift) => (
                        <ShiftCard key={shift.id} day={day} shift={shift} mode={mode}
                          assigned={getShiftEmployees(day, shift.id)}
                          posReqs={getPositionRequirementsForDay(config, shift.id, day.getDay()).filter(r => r.requiredCount > 0)}
                          unavailReports={getShiftUnavailableReports(unavailability, toYyyyMmDd(day), shift.id)}
                          isPanelExpanded={expandedUnavailPanel === shiftKey(day, shift.id)}
                          searchTerm={searchTerm}
                          isActiveSlot={Boolean(activeSlot && isSameDay(activeSlot.date, day) && activeSlot.shiftId === shift.id)}
                          shiftTime={getShiftTime(config, day.getDay(), shift.id)}
                          onToggleUnavailPanel={toggleUnavailPanel ?? (() => {})}
                          onOpenAssignModal={onOpenAssignModal ?? (() => {})}
                          onRemoveEmployee={onRemoveEmployee ?? (() => {})}
                          isFullyAllocated={isFullyAllocated}
                          isOvertime={isOvertime}
                          considerWeeklyHours={config?.considerWeeklyHours ?? true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Role view */}
      {planView === "byRole" && (
        <div className="space-y-10">
          {positionGroups.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No position requirements configured</p>
              <p className="text-xs text-slate-400 mt-1">Add requirements in <Link to="/shifts/configure" className="text-blue-500 hover:underline">Shift Configuration</Link>.</p>
            </div>
          )}
          {positionGroups.map((pg) => {
            const relevantShifts = activeShifts.filter((s) =>
              getPositionRequirements(config, s.id).some((r) => r.positionId === pg.positionId)
            );
            return (
              <div key={pg.positionId}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 rounded-full">
                    <Users className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-xs font-semibold text-white tracking-wide">{pg.positionTitle}</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="scroll-grid-container overflow-x-auto">
                  <div className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(${visibleDays.length > 5 ? "220px" : "0"}, 1fr))` }}
                  >
                    {visibleDays.map((day) => {
                      const isToday = isSameDay(day, today);
                      const weekend = isWeekend(day);
                      const isNonWorkingWeekend = weekend && !config?.weekendsWorking;
                      return (
                        <div key={toYyyyMmDd(day)}
                          {...(isToday ? { "data-today-col": true } : {})}
                          className={`rounded-2xl border transition-all ${
                            isNonWorkingWeekend ? "border-slate-100 bg-slate-50/30"
                              : isToday ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-200"
                              : "border-slate-100 bg-white"
                          }`}
                        >
                          <DayHeader day={day} today={today} weekendsWorking={config?.weekendsWorking} compact />
                          {isNonWorkingWeekend ? (
                            <div className="p-3 text-center"><p className="text-xs text-slate-300 font-medium">Non-working</p></div>
                          ) : (
                            <div className="p-2 space-y-2">
                              {relevantShifts.map((shift) => {
                                const req = getPositionRequirementsForDay(config, shift.id, day.getDay()).find((r) => r.positionId === pg.positionId);
                                if (!req || req.requiredCount === 0) return null;
                                return (
                                  <ByRoleShiftSlot key={shift.id} shift={shift}
                                    positionId={pg.positionId} positionTitle={pg.positionTitle}
                                    assigned={getShiftEmployees(day, shift.id)}
                                    requiredCount={req.requiredCount} mode={mode}
                                    searchTerm={searchTerm}
                                    onOpenAssignModal={(posId, posTitle) => onOpenAssignModal(day, shift.id, posId, posTitle)}
                                    onRemoveEmployee={(empId) => onRemoveEmployee(day, shift.id, empId)}
                                    isFullyAllocated={isFullyAllocated} isOvertime={isOvertime}
                                    considerWeeklyHours={config?.considerWeeklyHours ?? true}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ── WeekPlannerView ───────────────────────────────────────────────────────────

function WeekPlannerView({
  weekLabel, onNavigateWeek, onGoToToday, today, loadingSchedule,
  config, activeShifts, positionGroups, hasPositionRequirements,
  employees, weekAbsences, weekAbsenceHours, unavailability, visibleDays,
  mode, planView, rosterOpen, rosterSearch, activeSlot, expandedUnavailPanel, searchTerm,
  smartGenerating, weekStats, uniqueAssignedCount,
  getScheduledHours, getScheduledDays, getShiftEmployees,
  isFullyAllocated, isOvertime, toggleUnavailPanel,
  rosterFilteredEmployees, assignedToSlot, activeSlotAbsences, activeSlotUnavailReports,
  activeSlotAssignedElsewhereToday, activeSlotShift, activeSlotShiftHours,
  onPlanViewChange, onSearchChange, onRosterToggle, onRosterClose, onRosterSearchChange,
  onEdit, onPublish, onGenerateSmart, onOpenAssignModal,
  onRemoveEmployee, onAssignFromRoster, onRemoveFromRoster,
  onClearConfirmOpen,
  isLocked = false, lockTooltip = "",
}) {
  return (
    <div className="space-y-6">

      {/* ── Nav bar ── */}
      <div className="flex flex-col gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex gap-1">
              <button onClick={() => onNavigateWeek(-1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={onGoToToday} className="px-2 sm:px-3 py-2 text-xs font-medium hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors text-slate-600">
                Today
              </button>
              <button onClick={() => onNavigateWeek(1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{weekLabel}</h2>
            {loadingSchedule && (
              <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
              </svg>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-3">
              {activeShifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${shift.dotColor}`} />
                  <span className="font-medium">{shift.label}</span>
                </div>
              ))}
            </div>

            {hasPositionRequirements && (
              <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                {[
                  { v: "combined", label: "Grid", icon: LayoutGrid },
                  { v: "byRole", label: "By Role", icon: Layers },
                ].map(({ v, label, icon: Icon }) => (
                  <button key={v} onClick={() => onPlanViewChange(v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      planView === v ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {(!rosterOpen || mode === "view") && (
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" placeholder="Search employees..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-44 md:w-56 shadow-sm text-gray-900"
                  value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={onGenerateSmart}
              disabled={isLocked || smartGenerating || loadingSchedule || !config}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors cursor-pointer"
              title={isLocked ? lockTooltip : "Preview an auto-generated schedule. Nothing is saved until you review and apply."}
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : smartGenerating ? (
                <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
              ) : <CalendarRange className="w-4 h-4" />}
              <span className="hidden sm:inline">{smartGenerating ? "Generating…" : "Auto-schedule"}</span>
            </button>

            {mode === "edit" && (
              <>
                <button
                  onClick={onRosterToggle}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer border ${
                    rosterOpen ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-700" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {rosterOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  <span className="hidden sm:inline">Roster</span>
                </button>
                <button onClick={onClearConfirmOpen} className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                  <Minus className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear week</span>
                </button>
                <button onClick={onPublish} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Publish</span>
                </button>
              </>
            )}

            {mode === "view" && (
              <button
                onClick={onEdit}
                disabled={isLocked}
                title={isLocked ? lockTooltip : "Plan this week"}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:hover:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-sm"
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                <span className="hidden sm:inline">Plan Week</span>
                <span className="sm:hidden">Plan</span>
              </button>
            )}
          </div>
        </div>

        {mode === "edit" && (
          <div className="flex items-center gap-5 pt-2 border-t border-slate-50 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${weekStats.coverage >= 80 ? "bg-emerald-400" : weekStats.coverage >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${weekStats.coverage}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">{weekStats.coverage}%</span>
              <span className="text-xs text-slate-400">coverage</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums font-medium">{weekStats.filledSlots}/{weekStats.totalSlots}</span>
              <span className="text-slate-400">slots filled</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span className="tabular-nums font-medium">{uniqueAssignedCount}</span>
              <span className="text-slate-400">scheduled</span>
            </div>
            {weekStats.understaffed > 0 ? (
              <div className="flex items-center gap-1 text-xs font-medium text-red-500">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{weekStats.understaffed} understaffed</span>
              </div>
            ) : weekStats.totalSlots > 0 ? (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                <span>Fully staffed</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Subscription lock banner ── */}
      {isLocked && (
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 text-xs sm:text-sm">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{lockTooltip}</span>
        </div>
      )}

      {/* ── Absence banner ── */}
      <WeekAbsenceBanner
        weekAbsences={weekAbsences}
        employees={employees}
        visibleDays={visibleDays}
      />

      {/* ── Planning area ── */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">

          <WeekGrid
            visibleDays={visibleDays}
            activeShifts={activeShifts}
            positionGroups={positionGroups}
            config={config}
            today={today}
            planView={planView}
            mode={mode}
            searchTerm={searchTerm}
            getShiftEmployees={getShiftEmployees}
            isFullyAllocated={isFullyAllocated}
            isOvertime={isOvertime}
            unavailability={unavailability}
            expandedUnavailPanel={expandedUnavailPanel}
            activeSlot={activeSlot}
            toggleUnavailPanel={toggleUnavailPanel}
            onOpenAssignModal={onOpenAssignModal}
            onRemoveEmployee={onRemoveEmployee}
            loading={loadingSchedule}
          />

          {/* Weekly Hours Overview */}
          <WeeklyHoursOverview
            employees={employees}
            getScheduledHours={getScheduledHours}
            getScheduledDays={getScheduledDays}
            weekAbsences={weekAbsences}
            weekAbsenceHours={weekAbsenceHours}
            visibleDays={visibleDays}
            considerWeeklyHours={config?.considerWeeklyHours ?? true}
          />

        </div>

        {/* Roster panel — desktop side rail, mobile bottom sheet */}
        <AnimatePresence>
          {mode === "edit" && rosterOpen && (
            <>
              {/* Mobile backdrop */}
              <motion.div
                key="roster-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden fixed inset-0 bg-black/40 z-40"
                onClick={onRosterClose}
              />
              <motion.div key="roster"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}
                className="
                  fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto
                  rounded-t-2xl bg-white shadow-2xl
                  lg:static lg:max-h-none lg:overflow-visible
                  lg:rounded-none lg:shadow-none lg:bg-transparent
                  lg:w-80 lg:shrink-0 lg:sticky lg:top-4 lg:z-auto
                "
              >
              <RosterPanel
                employees={rosterFilteredEmployees}
                activeSlot={activeSlot}
                assignedToSlot={assignedToSlot}
                activeSlotAbsences={activeSlotAbsences}
                activeSlotUnavailReports={activeSlotUnavailReports}
                assignedElsewhereToday={activeSlotAssignedElsewhereToday}
                onAssign={onAssignFromRoster}
                onRemove={onRemoveFromRoster}
                getScheduledHours={getScheduledHours}
                shiftLabel={activeSlotShift?.label ?? ""}
                shiftHours={activeSlotShiftHours}
                search={rosterSearch}
                onSearchChange={onRosterSearchChange}
                onClose={onRosterClose}
                considerWeeklyHours={config?.considerWeeklyHours ?? true}
              />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── MonthWeekCard ─────────────────────────────────────────────────────────────

const MonthWeekCard = memo(function MonthWeekCard({
  weekIdx, days, style, monthShiftData, activeShifts, positionGroups, config, today,
  isExpanded, onToggle, onNavigateToWeek, currentMonth, currentYear,
}) {
  const getShiftEmployees = useCallback(
    (date, shiftId) => monthShiftData[toYyyyMmDd(date)]?.[shiftId] ?? [],
    [monthShiftData]
  );

  const alwaysFalse = useCallback(() => false, []);

  const rangeLabel = `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const weekCoverage = useMemo(() => {
    let filled = 0, total = 0;
    days.forEach((day) => {
      if (currentMonth != null && currentYear != null &&
          (day.getMonth() !== currentMonth || day.getFullYear() !== currentYear)) return;
      if (!config?.weekendsWorking && isWeekend(day)) return;
      const dateStr = toYyyyMmDd(day);
      activeShifts.forEach((shift) => {
        total++;
        const assigned = monthShiftData[dateStr]?.[shift.id] ?? [];
        const posReqs = getPositionRequirementsForDay(config, shift.id, day.getDay()).filter((r) => r.requiredCount > 0);
        if (posReqs.length > 0) {
          const allMet = posReqs.every(
            (req) => assigned.filter((e) => e.positionId === req.positionId).length >= req.requiredCount
          );
          if (allMet) filled++;
        } else {
          if (assigned.length > 0) filled++;
        }
      });
    });
    return { filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
  }, [days, monthShiftData, activeShifts, config, currentMonth, currentYear]);

  return (
    // Apple card: soft layered shadow, neutral border at systemSeparator opacity, no color accent stripe
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-black/[.06] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-[11px] hover:bg-black/[.03] active:bg-black/[.05] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Apple tinted label: Caption 2 spec — 11pt, Regular, tracking +0.066em, 10% fill */}
          <span
            className={`shrink-0 text-[11px] font-normal tracking-[0.066em] px-2 py-[3px] rounded-full bg-blue-600 text-white cursor-pointer hover:bg-blue-700 active:bg-blue-800 transition-colors`}
            title="Open in week view"
            onClick={(e) => { e.stopPropagation(); onNavigateToWeek(days[0]); }}
          >
            {style.label}
          </span>
          <span className="text-[13px] font-normal text-slate-700 truncate">{rangeLabel}</span>
          {weekCoverage.total > 0 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="w-16 h-[3px] bg-black/[.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${weekCoverage.pct >= 80 ? "bg-[#34C759]" : weekCoverage.pct >= 50 ? "bg-[#FF9500]" : "bg-[#FF3B30]"}`}
                  style={{ width: `${weekCoverage.pct}%` }}
                />
              </div>
              <span className="text-[11px] font-normal tracking-[0.066em] text-black/40 tabular-nums">{weekCoverage.pct}%</span>
              <span className="text-[11px] text-black/20">·</span>
              <span className="text-[11px] font-normal tracking-[0.066em] text-black/40 tabular-nums">{weekCoverage.filled}/{weekCoverage.total}</span>
            </div>
          )}
        </div>
        {/* Apple chevron: secondary label color = rgba(60,60,67,0.6) */}
        <ChevronDown className={`w-[15px] h-[15px] text-black/40 transition-transform duration-200 shrink-0 ml-3 ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expandable week grid — separator at systemSeparator opacity */}
      {isExpanded && (
        <div className="border-t border-black/[.06] p-4">
          <WeekGrid
            visibleDays={days}
            activeShifts={activeShifts}
            positionGroups={positionGroups}
            config={config}
            today={today}
            planView="combined"
            mode="view"
            searchTerm=""
            getShiftEmployees={getShiftEmployees}
            isFullyAllocated={alwaysFalse}
            isOvertime={alwaysFalse}
            unavailability={{}}
            expandedUnavailPanel={null}
            activeSlot={null}
            currentMonth={currentMonth}
            currentYear={currentYear}
          />
        </div>
      )}
    </div>
  );
});

// ── MonthPlannerView ──────────────────────────────────────────────────────────

const MonthPlannerView = memo(function MonthPlannerView({
  currentDate, config, monthShiftData, activeShifts, positionGroups, employees, today,
  loadingMonthData, monthGenerating,
  onNavigateMonth, onGenerateMonth, onNavigateToWeek,
  isLocked = false, lockTooltip = "",
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const weekRows = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const rows = [];
    let cursor = getWeekStart(firstOfMonth);
    while (cursor <= lastOfMonth) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(cursor); d.setDate(cursor.getDate() + i); return d;
      });
      rows.push(days);
      const next = new Date(cursor); next.setDate(next.getDate() + 7); cursor = next;
    }
    return rows;
  }, [year, month]);

  // Reset expansion when month changes: expand week containing today (or first week)
  const [expandedWeeks, setExpandedWeeks] = useState(() => {
    const todayIdx = weekRows.findIndex((days) => days.some((d) => isSameDay(d, today)));
    return new Set([todayIdx >= 0 ? todayIdx : 0]);
  });

  useEffect(() => {
    const todayIdx = weekRows.findIndex((days) => days.some((d) => isSameDay(d, today)));
    setExpandedWeeks(new Set([todayIdx >= 0 ? todayIdx : 0]));
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWeek = useCallback((idx) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const monthStats = useMemo(() => {
    let filled = 0, total = 0;
    const empSet = new Set();
    weekRows.flat().forEach((day) => {
      if (day.getMonth() !== month || day.getFullYear() !== year) return;
      const dow = day.getDay();
      if (!config?.weekendsWorking && (dow === 0 || dow === 6)) return;
      const dateStr = toYyyyMmDd(day);
      const dayData = monthShiftData[dateStr] ?? {};
      activeShifts.forEach((shift) => {
        total++;
        const emps = dayData[shift.id] ?? [];
        emps.forEach((e) => empSet.add(typeof e === "string" ? e : e.id));
        const posReqs = getPositionRequirementsForDay(config, shift.id, dow).filter((r) => r.requiredCount > 0);
        if (posReqs.length > 0) {
          const allMet = posReqs.every(
            (req) => emps.filter((e) => e.positionId === req.positionId).length >= req.requiredCount
          );
          if (allMet) filled++;
        } else {
          if (emps.length > 0) filled++;
        }
      });
    });
    return { filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0, uniqueEmployees: empSet.size };
  }, [weekRows, monthShiftData, month, year, config, activeShifts]);

  const handleExport = useCallback(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });

    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { dateStr: toYyyyMmDd(d), dayNum: i + 1, dow: d.getDay() };
    });

    // Build shift lookup: shiftId → { num (1-based), label }
    const shiftLookup = {};
    (config?.shifts ?? []).forEach((s) => {
      shiftLookup[s.id] = { num: (s.sortOrder ?? 0) + 1, label: s.label ?? "" };
    });

    const getShiftValue = (dateStr, employeeId) => {
      const dayData = monthShiftData[dateStr] ?? {};
      for (const [shiftId, assignees] of Object.entries(dayData)) {
        const found = assignees.some((a) => (typeof a === "string" ? a : a.employeeId ?? a.id) === employeeId);
        if (found) return shiftLookup[shiftId]?.num ?? 1;
      }
      return "";
    };

    // ── Style palette ────────────────────────────────────────────────────────
    const COLOR = {
      headerDark:   "1B2A4A",  // deep navy  – title row
      headerMid:    "2563EB",  // blue-600   – day number row
      headerLight:  "DBEAFE",  // blue-100   – day name row
      headerText:   "FFFFFF",
      headerDarkText: "1E40AF",
      weekendDark:  "DC2626",  // red-600    – weekend day numbers
      weekendLight: "FEE2E2",  // red-100    – weekend day names
      weekendCell:  "FFF5F5",  // faint red  – weekend employee cells
      nameCol:      "F0F4FF",  // soft blue  – employee name cells
      row0:         "FFFFFF",
      row1:         "F8FAFC",
      shift1bg:     "FFFBEB", shift1fg: "92400E",  // amber  – Morning
      shift2bg:     "EEF2FF", shift2fg: "3730A3",  // indigo – Afternoon
      shift3bg:     "F0FDF4", shift3fg: "14532D",  // green  – Night
      offFg:        "CBD5E1",
      border:       "E2E8F0",
      borderDark:   "94A3B8",
    };

    const thin = (rgb) => ({ style: "thin", color: { rgb } });

    const cellStyle = (fill, fontColor, bold = false, hAlign = "center", sz = 9) => ({
      fill: { patternType: "solid", fgColor: { rgb: fill } },
      font: { color: { rgb: fontColor }, bold, sz, name: "Calibri" },
      alignment: { horizontal: hAlign, vertical: "center", wrapText: false },
      border: {
        top: thin(COLOR.border), bottom: thin(COLOR.border),
        left: thin(COLOR.border), right: thin(COLOR.border),
      },
    });

    const shiftStyle = (num, isWeekend) => {
      if (num === 1) return cellStyle(isWeekend ? "FEF3C7" : COLOR.shift1bg, COLOR.shift1fg, true);
      if (num === 2) return cellStyle(isWeekend ? "E0E7FF" : COLOR.shift2bg, COLOR.shift2fg, true);
      if (num === 3) return cellStyle(isWeekend ? "DCFCE7" : COLOR.shift3bg, COLOR.shift3fg, true);
      return cellStyle(isWeekend ? COLOR.weekendCell : COLOR.row0, COLOR.offFg);
    };

    const wb = XLSX.utils.book_new();

    const groups = positionGroups?.length > 0
      ? positionGroups.map((g) => ({
          ...g,
          groupEmployees: employees.filter((e) => e.positionId === g.positionId),
        }))
      : [{ positionId: null, positionTitle: "All", groupEmployees: employees }];

    groups.forEach(({ positionTitle, groupEmployees }) => {
      if (!groupEmployees?.length) return;

      const totalCols = 1 + calendarDays.length;
      const enc = (r, c) => XLSX.utils.encode_cell({ r, c });

      const ws = {};

      // ── Row 0: title ────────────────────────────────────────────────────
      const title = `${monthName} ${year}  ·  ${positionTitle ?? "All Employees"}`;
      ws[enc(0, 0)] = {
        v: title, t: "s",
        s: {
          fill: { patternType: "solid", fgColor: { rgb: COLOR.headerDark } },
          font: { color: { rgb: COLOR.headerText }, bold: true, sz: 13, name: "Calibri" },
          alignment: { horizontal: "left", vertical: "center" },
          border: { bottom: thin(COLOR.borderDark) },
        },
      };
      for (let c = 1; c < totalCols; c++) {
        ws[enc(0, c)] = {
          v: "", t: "s",
          s: {
            fill: { patternType: "solid", fgColor: { rgb: COLOR.headerDark } },
            border: { bottom: thin(COLOR.borderDark) },
          },
        };
      }

      // ── Row 1: "Employee" header + day numbers ───────────────────────────
      ws[enc(1, 0)] = {
        v: "Employee", t: "s",
        s: cellStyle(COLOR.headerDark, COLOR.headerText, true, "left", 10),
      };
      calendarDays.forEach(({ dayNum, dow }, i) => {
        const isWeekend = dow === 0 || dow === 6;
        ws[enc(1, i + 1)] = {
          v: dayNum, t: "n",
          s: cellStyle(
            isWeekend ? COLOR.weekendDark : COLOR.headerMid,
            COLOR.headerText, true, "center", 9,
          ),
        };
      });

      // ── Row 2: day-of-week abbreviations ────────────────────────────────
      ws[enc(2, 0)] = {
        v: positionTitle ?? "All", t: "s",
        s: cellStyle(COLOR.headerLight, COLOR.headerDarkText, false, "left", 8),
      };
      calendarDays.forEach(({ dow }, i) => {
        const isWeekend = dow === 0 || dow === 6;
        ws[enc(2, i + 1)] = {
          v: DAY_NAMES[dow], t: "s",
          s: cellStyle(
            isWeekend ? COLOR.weekendLight : COLOR.headerLight,
            isWeekend ? COLOR.weekendDark : COLOR.headerDarkText,
            false, "center", 8,
          ),
        };
      });

      // ── Employee rows ───────────────────────────────────────────────────
      groupEmployees.forEach((emp, rowOffset) => {
        const r = 3 + rowOffset;
        const id = emp.id ?? emp.employeeId;
        const isAlt = rowOffset % 2 === 1;

        ws[enc(r, 0)] = {
          v: emp.fullName, t: "s",
          s: {
            fill: { patternType: "solid", fgColor: { rgb: COLOR.nameCol } },
            font: { bold: true, sz: 9, name: "Calibri", color: { rgb: "1E293B" } },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: thin(COLOR.border), bottom: thin(COLOR.border),
              left: thin(COLOR.borderDark), right: thin(COLOR.border),
            },
          },
        };

        calendarDays.forEach(({ dateStr, dow }, i) => {
          const isWeekend = dow === 0 || dow === 6;
          const val = getShiftValue(dateStr, id);
          ws[enc(r, i + 1)] = {
            v: val === "" ? "" : val,
            t: val === "" ? "s" : "n",
            s: shiftStyle(val, isWeekend),
          };
          // Override alternating row bg when cell is empty and not weekend
          if (val === "" && !isWeekend) {
            ws[enc(r, i + 1)].s.fill.fgColor.rgb = isAlt ? "F8FAFC" : "FFFFFF";
          }
        });
      });

      // ── Sheet range, column widths, row heights, freeze panes ───────────
      const lastRow = 3 + groupEmployees.length - 1;
      ws["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: lastRow, c: totalCols - 1 });

      ws["!cols"] = [
        { wch: 24 },
        ...calendarDays.map(() => ({ wch: 4.2 })),
      ];

      ws["!rows"] = [
        { hpt: 28 },  // title
        { hpt: 22 },  // day numbers
        { hpt: 16 },  // day names
        ...groupEmployees.map(() => ({ hpt: 18 })),
      ];

      // Merge title row across all columns
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

      // Freeze first column + first 3 rows
      ws["!freeze"] = { xSplit: 1, ySplit: 3 };

      const sheetName = (positionTitle ?? "All").slice(0, 31).replace(/[\\/*?[\]:]/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // ── Legend sheet ──────────────────────────────────────────────────────
    const enc = (r, c) => XLSX.utils.encode_cell({ r, c });
    const legendWs = {};
    const legendRows = [
      ["Legend", ""],
      ["Shift", "Value"],
      ...(config?.shifts ?? []).map((s) => [s.label, (s.sortOrder ?? 0) + 1]),
      ["Not scheduled", ""],
    ];
    legendRows.forEach(([label, val], r) => {
      const isTitleRow = r === 0;
      const isHeaderRow = r === 1;
      legendWs[enc(r, 0)] = {
        v: label, t: "s",
        s: cellStyle(
          isTitleRow ? COLOR.headerDark : isHeaderRow ? COLOR.headerMid : COLOR.nameCol,
          isTitleRow || isHeaderRow ? COLOR.headerText : "1E293B",
          isTitleRow || isHeaderRow, "left", isTitleRow ? 11 : 9,
        ),
      };
      legendWs[enc(r, 1)] = {
        v: val ?? "", t: val && typeof val === "number" ? "n" : "s",
        s: cellStyle(
          isTitleRow ? COLOR.headerDark : isHeaderRow ? COLOR.headerMid : COLOR.row0,
          isTitleRow || isHeaderRow ? COLOR.headerText : "1E293B",
          false, "center", 9,
        ),
      };
    });
    legendWs["!ref"] = XLSX.utils.encode_range({ r: 0, c: 0 }, { r: legendRows.length - 1, c: 1 });
    legendWs["!cols"] = [{ wch: 20 }, { wch: 10 }];
    legendWs["!rows"] = legendRows.map((_, i) => ({ hpt: i === 0 ? 24 : 18 }));
    legendWs["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, legendWs, "Legend");

    XLSX.writeFile(wb, `Schedule_${monthName}_${year}.xlsx`);
  }, [year, month, monthShiftData, config, positionGroups, employees]);

  return (
    <div className="space-y-4">

      {/* Month nav bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex gap-1">
              <button onClick={() => onNavigateMonth(-1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={() => onNavigateMonth(0)} className="px-2 sm:px-3 py-2 text-xs font-medium hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors text-slate-600">
                Today
              </button>
              <button onClick={() => onNavigateMonth(1)} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{monthLabel}</h2>
            {loadingMonthData && (
              <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
              </svg>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            {/* Stats */}
            {monthStats.total > 0 && (
              <div className="hidden sm:flex items-center gap-4 mr-1">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${monthStats.pct >= 80 ? "bg-emerald-400" : monthStats.pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${monthStats.pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 tabular-nums">{monthStats.pct}%</span>
                  <span className="text-xs text-slate-400">{monthStats.filled}/{monthStats.total} slots</span>
                </div>
                {monthStats.uniqueEmployees > 0 && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span className="tabular-nums font-medium">{monthStats.uniqueEmployees}</span>
                    <span className="text-slate-400">scheduled</span>
                  </div>
                )}
              </div>
            )}

            {/* Shift legend */}
            <div className="hidden md:flex items-center gap-3">
              {activeShifts.map((shift) => (
                <div key={shift.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className={`w-2 h-2 rounded-full ${shift.dotColor}`} />
                  <span className="font-medium">{shift.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onGenerateMonth}
              disabled={isLocked || monthGenerating || loadingMonthData}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors cursor-pointer"
              title={isLocked ? lockTooltip : "Generate the entire month using rotation patterns and pinned shifts."}
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : monthGenerating ? (
                <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
              ) : <CalendarRange className="w-4 h-4" />}
              <span className="hidden sm:inline">{monthGenerating ? "Generating…" : "Auto-generate"}</span>
            </button>

            <button
              onClick={handleExport}
              disabled={loadingMonthData}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors cursor-pointer"
              title="Export month schedule to Excel — one sheet per position."
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

          </div>
        </div>
      </div>

      {/* Collapsible week cards */}
      <div className="space-y-3">
        {weekRows.map((days, weekIdx) => {
          const style = WEEK_BADGE_STYLES[weekIdx] ?? WEEK_BADGE_STYLES[4];
          return (
            <MonthWeekCard
              key={weekIdx}
              weekIdx={weekIdx}
              days={days}
              style={style}
              monthShiftData={monthShiftData}
              activeShifts={activeShifts}
              positionGroups={positionGroups}
              config={config}
              today={today}
              isExpanded={expandedWeeks.has(weekIdx)}
              onToggle={() => toggleWeek(weekIdx)}
              onNavigateToWeek={onNavigateToWeek}
              currentMonth={month}
              currentYear={year}
            />
          );
        })}
      </div>

      {/* Monthly hours overview */}
      <MonthlyHoursOverview
        employees={employees}
        monthShiftData={monthShiftData}
        config={config}
        currentDate={currentDate}
      />
    </div>
  );
});

// ── MonthlyHoursOverview ──────────────────────────────────────────────────────

const MonthlyHoursOverview = memo(function MonthlyHoursOverview({
  employees, monthShiftData, config, currentDate,
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const considerWeeklyHours = config?.considerWeeklyHours ?? true;
  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "long" });

  // Total hours per employee — current month only
  const monthlyHoursMap = useMemo(() => {
    const map = {};
    Object.entries(monthShiftData).forEach(([dateStr, shiftMap]) => {
      const d = new Date(dateStr + "T00:00:00");
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      const dow = d.getDay();
      Object.entries(shiftMap).forEach(([shiftId, emps]) => {
        const h = getShiftHours(config, dow, shiftId);
        emps.forEach((emp) => { map[emp.id] = (map[emp.id] ?? 0) + h; });
      });
    });
    return map;
  }, [monthShiftData, config, month, year]);

  // Distinct days scheduled per employee — current month only
  const monthlyDaysMap = useMemo(() => {
    const map = {};
    Object.entries(monthShiftData).forEach(([dateStr, shiftMap]) => {
      const d = new Date(dateStr + "T00:00:00");
      if (d.getMonth() !== month || d.getFullYear() !== year) return;
      Object.values(shiftMap).forEach((emps) => {
        emps.forEach((emp) => {
          if (!map[emp.id]) map[emp.id] = new Set();
          map[emp.id].add(dateStr);
        });
      });
    });
    const out = {};
    Object.entries(map).forEach(([id, s]) => { out[id] = s.size; });
    return out;
  }, [monthShiftData, month, year]);

  // Working weeks in this month (basis for monthly hour target)
  const workingWeeksInMonth = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (config?.weekendsWorking || (dow !== 0 && dow !== 6)) workingDays++;
    }
    return workingDays / (config?.weekendsWorking ? 7 : 5);
  }, [year, month, config]);

  // Group employees by position (same order as WeeklyHoursOverview)
  const positionGroups = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      if (!map.has(emp.positionId))
        map.set(emp.positionId, { title: emp.position, employees: [] });
      map.get(emp.positionId).employees.push(emp);
    });
    return [...map.values()];
  }, [employees]);

  const getHours = useCallback((empId) => Math.round((monthlyHoursMap[empId] ?? 0) * 10) / 10, [monthlyHoursMap]);
  const getDays  = useCallback((empId) => monthlyDaysMap[empId] ?? 0, [monthlyDaysMap]);

  if (!employees.length) return null;

  // ── Simple table for working hours in month ────────────────────────────
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-900">Team Schedule — {monthLabel}</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {positionGroups.map((group) => (
            <div key={group.title} className="px-5 py-4">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {group.title}
              </span>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-1 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Employee</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 text-right">Hours</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 text-right w-10">Days</span>
              </div>
              <div className="space-y-0.5">
                {[...group.employees].sort((a, b) => getHours(b.id) - getHours(a.id)).map((emp) => {
                  const hours = getHours(emp.id);
                  const days = getDays(emp.id);
                  return (
                    <div key={emp.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-1 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={emp.profilePictureSrc ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}` : defaultProfile}
                          alt="" className="w-5 h-5 rounded-full object-cover shrink-0 opacity-80" />
                        <span className="text-[11px] font-medium text-gray-700 truncate">{emp.fullName}</span>
                      </div>
                      <span className={`text-[11px] tabular-nums font-semibold text-right ${hours > 0 ? "text-slate-700" : "text-slate-300"}`}>
                        {hours > 0 ? `${hours}h` : "—"}
                      </span>
                      <span className={`text-[11px] tabular-nums text-right w-10 ${hours > 0 ? "text-slate-500" : "text-slate-300"}`}>
                        {hours > 0 ? `${days}d` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
});

// ── Main page ────────────────────────────────────────────────────────────────

export default function ShiftPlannerPage() {
  const [searchParams] = useSearchParams();
  // Initialize from ?date=YYYY-MM-DD if present so deep-links from the dashboard
  // (e.g. "Schedule next week") land directly on the right week/month.
  const initialDate = useMemo(() => {
    const param = searchParams.get("date");
    if (!param) return new Date();
    const parsed = new Date(`${param}T00:00:00`);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialView = useMemo(() => {
    const v = searchParams.get("view");
    return v === "month" || v === "week" ? v : "week";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [employees, setEmployees] = useState([]);

  const [config, setConfig] = useState(null);

  const [shifts, setShifts] = useState({});
  const [unavailability, setUnavailability] = useState({});

  // Pre-fetched absences for the entire visible week, keyed by "employeeId|dateStr".
  // Loaded once on week change so modals and the roster panel always have instant data.
  const [weekAbsences, setWeekAbsences] = useState({});
  // Hours each absence day contributes, keyed identically to weekAbsences.
  const [weekAbsenceHours, setWeekAbsenceHours] = useState({});

  const [assignModal, setAssignModal] = useState(null);
  const [constraintError, setConstraintError] = useState(null); // { blocking, overridable, pendingAssign } | null
  const [searchTerm, setSearchTerm] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [expandedUnavailPanel, setExpandedUnavailPanel] = useState(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [mode, setMode] = useState("view");
  const [planView, setPlanView] = useState("combined"); // "combined" | "byRole"

  // ── Smart scheduling state ────────────────────────────────────────────────
  const [smartGenerating, setSmartGenerating] = useState(false);
  const [smartResult, setSmartResult] = useState(null); // backend GenerateScheduleRangeResponseDto
  const [monthGenerating, setMonthGenerating] = useState(false);
  const [monthResult, setMonthResult] = useState(null); // backend GenerateScheduleRangeResponseDto
  const [reoptimizing, setReoptimizing] = useState(false);
  // Hard-constraint registry for the override panel. Loaded once — the registry
  // is static per release. The IsUserOverridable flag returned by the backend is
  // authoritative; the UI uses it to decide which toggles are interactive.
  const [availableConstraints, setAvailableConstraints] = useState([]);

  // ── Onboarding state ──────────────────────────────────────────────────────
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [pendingGenerateAction, setPendingGenerateAction] = useState(null); // "week" | "month"

  // ── Scheduling access policy ──────────────────────────────────────────────
  // Backend is the authority; this hook only mirrors the policy so the UI can
  // pre-disable controls and explain why. The 403 handlers below catch races.
  const [schedulingPolicy, setSchedulingPolicy] = useState(null);
  useEffect(() => {
    api.get("/Shift/GetSchedulingPolicy")
      .then(({ data }) => setSchedulingPolicy(data))
      .catch(() => setSchedulingPolicy({ isBlocked: true, isTrial: false, blockedReasonCode: "SCHEDULING_NOT_ALLOWED" }));
  }, []);

  const TRIAL_LOCK_MSG = "You can plan only next two months with current subscription";
  const BLOCKED_MSG = "Scheduling is not available with your current subscription";

  const maxPlannableDate = useMemo(() => {
    if (!schedulingPolicy?.maxPlannableDate) return null;
    const d = new Date(`${schedulingPolicy.maxPlannableDate}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }, [schedulingPolicy]);

  const isDateBeyondPlanWindow = useCallback((date) => {
    if (!schedulingPolicy?.isTrial) return false;
    if (!maxPlannableDate) return true;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > maxPlannableDate;
  }, [schedulingPolicy, maxPlannableDate]);

  const handleSchedulingAccessError = useCallback((err, fallbackMsg) => {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    if (status === 403 && code === "SCHEDULING_WINDOW_EXCEEDED") {
      toast.error(TRIAL_LOCK_MSG);
      return true;
    }
    if (status === 403 && (code === "SCHEDULING_NOT_ALLOWED" || code === "SCHEDULING_TENANT_UNKNOWN")) {
      toast.error(BLOCKED_MSG);
      return true;
    }
    if (fallbackMsg) toast.error(fallbackMsg);
    return false;
  }, []);

  // ── View mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(initialView); // "week" | "month"
  const [monthShiftData, setMonthShiftData] = useState({}); // dateStr → { shiftId → Employee[] }
  const [loadingMonthData, setLoadingMonthData] = useState(false);

  // ── Roster panel state ────────────────────────────────────────────────────
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");
  const [activeSlot, setActiveSlot] = useState(null); // { date, shiftId, filterPositionId, filterPositionTitle }

  // ── Refs for latest state snapshot (allows stable async callbacks) ─────────
  const shiftsRef = useRef(shifts);
  const weekAbsencesRef = useRef(weekAbsences);
  useEffect(() => { shiftsRef.current = shifts; }, [shifts]);
  useEffect(() => { weekAbsencesRef.current = weekAbsences; }, [weekAbsences]);

  // ── Stable reference for today ────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const activeShifts = useMemo(() => getActiveShifts(config ?? {}), [config]);
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekKey = useMemo(() => toYyyyMmDd(weekStart), [weekStart]);
  const weekEndKey = useMemo(() => toYyyyMmDd(new Date(weekStart.getTime() + 6 * 864e5)), [weekStart]);

  const visibleDays = useMemo(() => {
    if (!config) return weekDays;
    if (config.weekendsWorking) return weekDays;
    return weekDays.filter((d) => !isWeekend(d));
  }, [weekDays, config]);

  const positionGroups = useMemo(() => {
    const seen = new Map();
    (config?.positionRequirements ?? []).forEach((r) => {
      if (!seen.has(r.positionId))
        seen.set(r.positionId, { positionId: r.positionId, positionTitle: r.positionTitle });
    });
    return [...seen.values()];
  }, [config]);

  const hasPositionRequirements = positionGroups.length > 0;

  // ── Load config ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/Shift/GetConfig")
      .then(({ data }) => setConfig(buildLocalConfig(data)))
      .catch(() => toast.error("Failed to load shift configuration."))
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => {
    const onFocus = () => {
      api.get("/Shift/GetConfig")
        .then(({ data }) => setConfig(buildLocalConfig(data)))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ── Load employees ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/Employee/GetEmployeesForShift")
      .then(({ data }) => setEmployees(data))
      .catch(() => toast.error("Failed to load employees."));
  }, []);

  // ── Load constraint registry (for the override panel) ─────────────────────
  useEffect(() => {
    api.get("/Shift/GetConstraints")
      .then(({ data }) => setAvailableConstraints(Array.isArray(data) ? data : []))
      .catch(() => setAvailableConstraints([]));
  }, []);

  // ── Load weekly schedule ──────────────────────────────────────────────────
  const loadSchedule = useCallback(() => {
    setLoadingSchedule(true);
    api.get("/Shift/GetWeeklySchedule", { params: { weekStart: weekKey } })
      .then(({ data }) => {
        const { shifts: s, unavail } = buildWeeklyMaps(data);
        setShifts(s);
        setUnavailability(unavail);
      })
      .catch(() => toast.error("Failed to load schedule."))
      .finally(() => setLoadingSchedule(false));
  }, [weekKey]);

  useEffect(() => {
    loadSchedule();
    setMode("view");
  }, [weekKey]);

  // ── Pre-fetch absences for the entire week ────────────────────────────────
  // Keyed by "employeeId|dateStr" so any modal or panel can look up instantly
  // without firing a separate API call on every open.
  useEffect(() => {
    const start = weekKey;
    const end = toYyyyMmDd(new Date(weekStart.getTime() + 6 * 864e5));
    api.get("/Absence/GetAllAbsences", { params: { start, end } })
      .then(({ data }) => {
        const map = {};
        const hoursMap = {};
        data.forEach((a) => {
          if (a.status !== "Approved") return;
          const displayKey = ABSENCE_TYPE_DISPLAY[a.type];
          if (!displayKey) return;
          // Per-day hours: use actual charged hours if available, else fall back to 8h.
          const hoursPerDay = a.workingDays > 0
            ? Number((a.workingHours / a.workingDays).toFixed(2))
            : 8;
          weekDays.forEach((day) => {
            const dayStr = toYyyyMmDd(day);
            if (a.start <= dayStr && a.end >= dayStr) {
              map[`${a.employeeId}|${dayStr}`] = displayKey;
              hoursMap[`${a.employeeId}|${dayStr}`] = hoursPerDay;
            }
          });
        });
        setWeekAbsences(map);
        setWeekAbsenceHours(hoursMap);
      })
      .catch(() => {});
  }, [weekKey]);

  // ── Load month data when in month view ───────────────────────────────────
  const monthYear = currentDate.getFullYear();
  const monthMonth = currentDate.getMonth();

  const loadMonthData = useCallback(async () => {
    const monthStart = new Date(monthYear, monthMonth, 1);
    const monthEnd = new Date(monthYear, monthMonth + 1, 0);
    const weekStarts = [];
    let cursor = getWeekStart(monthStart);
    while (cursor <= monthEnd) {
      weekStarts.push(toYyyyMmDd(new Date(cursor)));
      cursor.setDate(cursor.getDate() + 7);
    }
    setLoadingMonthData(true);
    try {
      const results = await Promise.all(
        weekStarts.map((ws) => api.get("/Shift/GetWeeklySchedule", { params: { weekStart: ws } }))
      );
      const data = {};
      results.forEach(({ data: wd }) => {
        (wd.assignments ?? []).forEach((a) => {
          if (!data[a.date]) data[a.date] = {};
          if (!data[a.date][a.shiftId]) data[a.date][a.shiftId] = [];
          data[a.date][a.shiftId].push(a.employee);
        });
      });
      setMonthShiftData(data);
    } catch {
      toast.error("Failed to load month schedule data.");
    } finally {
      setLoadingMonthData(false);
    }
  }, [monthYear, monthMonth]);

  useEffect(() => {
    if (viewMode === "month") loadMonthData();
  }, [viewMode, monthYear, monthMonth]);

  // ── Clear roster state when leaving edit mode or navigating weeks ─────────
  useEffect(() => {
    if (mode === "view") {
      setActiveSlot(null);
      setRosterOpen(false);
    }
  }, [mode]);

  useEffect(() => { setActiveSlot(null); }, [weekKey]);

  useEffect(() => {
    if (!rosterOpen) setActiveSlot(null);
  }, [rosterOpen]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getShiftEmployees = useCallback(
    (date, shiftId) => shifts[shiftKey(date, shiftId)] || [],
    [shifts]
  );

  const toggleUnavailPanel = useCallback((date, shiftId) => {
    const key = shiftKey(date, shiftId);
    setExpandedUnavailPanel((prev) => (prev === key ? null : key));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const assignEmployee = useCallback(async (date, shiftId, employee, forceOverride = false) => {
    const key = shiftKey(date, shiftId);
    try {
      await api.post("/Shift/AssignEmployee", {
        shiftId, employeeId: employee.id, date: toYyyyMmDd(date), forceOverride,
      });
      // Success — apply the update and close modals.
      setShifts((prev) => {
        const current = prev[key] || [];
        if (current.some((e) => e.id === employee.id)) return prev;
        return { ...prev, [key]: [...current, employee] };
      });
      setConstraintError(null);
      setAssignModal(null);
      setModalSearch("");
    } catch (err) {
      if (err.response?.status === 422) {
        const d = err.response.data ?? {};
        const blocking = Array.isArray(d.blockingViolations) ? d.blockingViolations : [];
        const overridable = Array.isArray(d.overridableViolations) ? d.overridableViolations : [];
        if (blocking.length === 0 && overridable.length === 0) {
          toast.error("This assignment would violate a scheduling constraint.");
          return;
        }
        setConstraintError({ blocking, overridable, pendingAssign: { date, shiftId, employee } });
      } else {
        toast.error("Failed to assign employee.");
      }
    }
  }, []);

  // Uses shiftsRef so this callback stays stable (no shifts dep) while still
  // reading the latest snapshot at call time for the optimistic rollback.
  const removeEmployee = useCallback(async (date, shiftId, employeeId) => {
    const key = shiftKey(date, shiftId);
    const snapshot = shiftsRef.current[key] || [];
    setShifts((prev) => {
      const updated = (prev[key] || []).filter((e) => e.id !== employeeId);
      if (updated.length === 0) { const n = { ...prev }; delete n[key]; return n; }
      return { ...prev, [key]: updated };
    });
    try {
      await api.delete("/Shift/RemoveAssignment", { params: { shiftId, employeeId, date: toYyyyMmDd(date) } });
    } catch {
      setShifts((prev) => ({ ...prev, [key]: snapshot }));
      toast.error("Failed to remove assignment.");
    }
  }, []); // stable — reads shifts via ref

  const handlePublish = useCallback(async () => {
    try {
      // await api.post("/Shift/PublishWeek", null, { params: { weekStart: weekKey } });
      setMode("view");
      toast.success("Schedule published.");
    } catch {
      toast.error("Failed to publish schedule.");
    }
  }, [weekKey]);

    // ── Month-range scheduling ────────────────────────────────────────────────
  // Generates a full month of schedules in one call, respecting each employee's
  // rotation pattern and pinned shift. Preview-only until the manager applies.
  const monthRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { startDate: toYyyyMmDd(start), endDate: toYyyyMmDd(end) };
  }, [currentDate]);

  // Called when the onboarding modal is dismissed (either "start fresh" or after importing)
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboardingModal(false);
    const action = pendingGenerateAction;
    setPendingGenerateAction(null);
    if (action === "week") {
      setSmartGenerating(true);
      api.post("/Shift/GenerateScheduleRange", { startDate: weekKey, endDate: weekEndKey, persist: false })
        .then(({ data }) => setSmartResult(data))
        .catch(() => toast.error("Failed to generate smart schedule."))
        .finally(() => setSmartGenerating(false));
    } else if (action === "month") {
      setMonthGenerating(true);
      api.post("/Shift/GenerateScheduleRange", { startDate: monthRange.startDate, endDate: monthRange.endDate, persist: false })
        .then(({ data }) => setMonthResult(data))
        .catch(() => toast.error("Failed to generate monthly schedule."))
        .finally(() => setMonthGenerating(false));
    }
  }, [pendingGenerateAction, weekKey, weekEndKey, monthRange]);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearWeek = useCallback(async () => {
    setClearing(true);
    try {
      await api.delete("/Shift/ClearWeek", { params: { weekStart: weekKey } });
      setShifts({});
      setClearConfirmOpen(false);
      toast.success("Week schedule cleared.");
    } catch {
      toast.error("Failed to clear schedule.");
    } finally {
      setClearing(false);
    }
  }, [weekKey]);

  const handleEdit = useCallback(() => { setMode("edit"); setRosterOpen(true); }, []);
  

  // ── Smart scheduling ──────────────────────────────────────────────────────
  // Preview only — nothing is persisted until the manager reviews the result
  // and explicitly clicks "Apply to draft" in the result modal.
  const handleGenerateSmart = useCallback(async () => {
    try {
      const { data: check } = await api.get("/Shift/HasAnySchedule");
      if (!check.hasSchedule) {
        setPendingGenerateAction("week");
        setShowOnboardingModal(true);
        return;
      }
    } catch { /* if check fails, proceed normally */ }

    setSmartGenerating(true);
    try {
      const { data } = await api.post("/Shift/GenerateScheduleRange", {
        startDate: weekKey,
        endDate: weekEndKey,
        persist: false,
      });
      setSmartResult(data);
    } catch (err) {
      handleSchedulingAccessError(err, "Failed to generate smart schedule.");
    } finally {
      setSmartGenerating(false);
    }
  }, [weekKey, weekEndKey, handleSchedulingAccessError]);

  // Re-runs the engine with persist=true so the proposals the manager just
  // reviewed are written as a draft. The week still has to be published
  // explicitly via the existing "Publish" button.
  const handleApplySmartDraft = useCallback(async () => {
    setSmartGenerating(true);
    try {
      // If the user re-optimized the preview, re-running greedy here would
      // discard the CP-SAT proposal they just accepted. Route the apply
      // through the optimizer endpoint instead so the persisted draft
      // matches what's on screen.
      const isReoptimized = !!smartResult?.reoptimized;
      const endpoint = isReoptimized ? "/Shift/ReoptimizeSchedule" : "/Shift/GenerateScheduleRange";
      const payload = {
        startDate: weekKey,
        endDate: weekEndKey,
        persist: true,
      };
      // Replay the same override set that produced the preview the manager
      // just approved. Otherwise the solver re-runs without overrides and the
      // persisted draft no longer matches the on-screen preview.
      if (isReoptimized) {
        payload.disabledConstraints = smartResult?.reoptimizeDisabledConstraints ?? [];
      }

      await api.post(endpoint, payload);
      loadSchedule();
      setMode("edit");
      setRosterOpen(false);
      setSmartResult(null);
      toast.success("Draft applied — review and publish when ready.");
    } catch (err) {
      handleSchedulingAccessError(err, "Failed to apply smart schedule draft.");
    } finally {
      setSmartGenerating(false);
    }
  }, [weekKey, weekEndKey, smartResult, loadSchedule, handleSchedulingAccessError]);

  /**
   * Triggers the CP-SAT re-optimization for an arbitrary date range without
   * dismissing the preview modal that initiated it. On success, the modal's
   * own result state is mutated in-place — assignments, fill counts, unfilled
   * slots, and a short summary line — so the user can review the new layout
   * inside the same surface they were already looking at. The underlying
   * grid (week or month view) is reloaded silently because the optimizer
   * persists in the same call.
   */
  const handleReoptimize = useCallback(async (range, prevResult, setResult, disabledConstraints = []) => {
    setReoptimizing(true);
    try {
      const { data } = await api.post("/Shift/ReoptimizeSchedule", {
        startDate: range.startDate,
        endDate: range.endDate,
        // Preview only — the user still has to click "Apply to draft" to
        // commit. Mirrors the initial smart-schedule flow.
        persist: false,
        // The backend silently drops any name that isn't a user-overridable hard
        // constraint, so non-overridable rules can never be bypassed even if a
        // tampered client sends them. Non-overridable toggles in the UI are
        // already read-only, so this list normally only carries safe names.
        disabledConstraints: Array.isArray(disabledConstraints) ? disabledConstraints : [],
      });

      // Mark that the user has now attempted at least one re-optimization for
      // this preview. The override-constraints panel is gated on this flag.
      const baseUpdate = { reoptimizeAttempted: true };

      if (data.validationPassed) {
        const before = prevResult?.unfilledSlots?.length ?? 0;
        const after = data.unfilledSlots?.length ?? 0;

        // Only replace the proposal when the solver strictly improved coverage.
        // Equal-or-worse results would just churn the modal without giving the
        // user anything new — keep the existing preview untouched.
        if (after >= before) {
          toast.info(
            before === 0
              ? "Solver couldn't find a better layout — every slot the engine could fill is already covered."
              : `Solver couldn't improve coverage (${before} unfilled remain). Preview unchanged.`
          );
          setResult({ ...prevResult, ...baseUpdate });
          return;
        }

        const summary = `${before} unfilled slot${before === 1 ? "" : "s"} dropped to ${after}.`;

        setResult({
          ...prevResult,
          ...baseUpdate,
          filledSlots: data.filledSlotsAfter,
          totalSlots: data.totalSlots,
          proposedAssignments: data.proposedAssignments,
          unfilledSlots: data.unfilledSlots,
          // CP-SAT doesn't surface soft-violations the same way greedy does;
          // hide the now-stale list from the preview rather than pretending
          // it still applies.
          acceptedSoftViolations: [],
          optimization: null,
          reoptimizeSummary: summary,
          reoptimizeDurationMs: data.solverDurationMs,
          reoptimized: true,
          // Remember the override set that produced this preview so the apply
          // call can re-solve with identical inputs. Without this, apply would
          // land on a different (constraint-respecting but unrelated) layout
          // than what the manager just reviewed.
          reoptimizeDisabledConstraints: Array.isArray(disabledConstraints) ? [...disabledConstraints] : [],
        });
        return;
      }

      if (data.violations?.length > 0) {
        toast.error(
          `Re-optimization rejected: ${data.violations.length} hard constraint violation${data.violations.length === 1 ? "" : "s"} detected. Preview not updated.`
        );
      } else {
        toast.warn(`Solver returned ${data.solverStatus} — preview not updated.`);
      }
      setResult({ ...prevResult, ...baseUpdate });
    } catch (err) {
      handleSchedulingAccessError(err, "Re-optimization failed.");
    } finally {
      setReoptimizing(false);
    }
  }, [handleSchedulingAccessError]);

  const handleGenerateMonth = useCallback(async () => {
    try {
      const { data: check } = await api.get("/Shift/HasAnySchedule");
      if (!check.hasSchedule) {
        setPendingGenerateAction("month");
        setShowOnboardingModal(true);
        return;
      }
    } catch { /* if check fails, proceed normally */ }

    setMonthGenerating(true);
    try {
      const { data } = await api.post("/Shift/GenerateScheduleRange", {
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        persist: false,
      });
      setMonthResult(data);
    } catch (err) {
      handleSchedulingAccessError(err, "Failed to generate monthly schedule.");
    } finally {
      setMonthGenerating(false);
    }
  }, [monthRange, handleSchedulingAccessError]);

  const handleApplyMonthDraft = useCallback(async () => {
    setMonthGenerating(true);
    try {
      const isReoptimized = !!monthResult?.reoptimized;
      const endpoint = isReoptimized ? "/Shift/ReoptimizeSchedule" : "/Shift/GenerateScheduleRange";
      const payload = {
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        persist: true,
      };
      if (isReoptimized) {
        payload.disabledConstraints = monthResult?.reoptimizeDisabledConstraints ?? [];
      }

      await api.post(endpoint, payload);
      loadSchedule();
      loadMonthData();
      setMode("edit");
      setRosterOpen(false);
      setMonthResult(null);
      toast.success("Month draft applied — review and publish each week when ready.");
    } catch {
      toast.error("Failed to apply monthly schedule draft.");
    } finally {
      setMonthGenerating(false);
    }
  }, [monthRange, monthResult, loadSchedule, loadMonthData]);

  const navigateWeek = useCallback((direction) => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + direction * 7); return d; });
  }, []);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const navigateMonth = useCallback((direction) => {
    if (direction === 0) { setCurrentDate(new Date()); return; }
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  // Clicking a day in month view switches to week view for that week
  const handleMonthDayClick = useCallback((day) => {
    setCurrentDate(day);
    setViewMode("week");
  }, []);

  const openAssignModal = useCallback((date, shiftId, filterPositionId = null, filterPositionTitle = null) => {
    if (rosterOpen) {
      setActiveSlot({ date, shiftId, filterPositionId, filterPositionTitle });
    } else {
      setAssignModal({ date, shiftId, filterPositionId, filterPositionTitle });
    }
  }, [rosterOpen]);

  // assignFromRoster and removeFromRoster are passed as onAssign/onRemove to RosterPanel
  // and forwarded directly to RosterEmployeeRow — must match (emp) / (empId) signature.
  const assignFromRoster = useCallback((employee) => {
    if (!activeSlot) return;
    assignEmployee(activeSlot.date, activeSlot.shiftId, employee);
  }, [activeSlot, assignEmployee]);

  const removeFromRoster = useCallback((employeeId) => {
    if (!activeSlot) return;
    removeEmployee(activeSlot.date, activeSlot.shiftId, employeeId);
  }, [activeSlot, removeEmployee]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    let totalSlots = 0, filledSlots = 0, understaffed = 0;
    visibleDays.forEach((day) => {
      if (!config?.weekendsWorking && isWeekend(day)) return;
      activeShifts.forEach((shift) => {
        totalSlots++;
        const assigned = getShiftEmployees(day, shift.id);
        if (assigned.length > 0) filledSlots++;
        const posReqs = getPositionRequirementsForDay(config, shift.id, day.getDay()).filter(r => r.requiredCount > 0);
        if (posReqs.length > 0) {
          const hasShortfall = posReqs.some(
            (req) => assigned.filter((e) => e.positionId === req.positionId).length < req.requiredCount
          );
          if (hasShortfall) understaffed++;
        }
      });
    });
    return { totalSlots, filledSlots, coverage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0, understaffed };
  }, [visibleDays, config, activeShifts, shifts, getShiftEmployees]);

  const uniqueAssignedCount = useMemo(() => {
    const ids = new Set();
    weekDays.forEach((day) => activeShifts.forEach((shift) => getShiftEmployees(day, shift.id).forEach((e) => ids.add(e.id))));
    return ids.size;
  }, [weekDays, activeShifts, shifts, getShiftEmployees]);

  // ── Weekly hours tracking ─────────────────────────────────────────────────
  const employeeScheduledHoursMap = useMemo(() => {
    const map = {};
    Object.entries(shifts).forEach(([key, emps]) => {
      const dateStr = key.substring(0, 10);
      const shiftId = key.substring(11);
      const dayOfWeek = new Date(dateStr).getDay();
      const hours = getShiftHours(config, dayOfWeek, shiftId);
      emps.forEach((emp) => { map[emp.id] = (map[emp.id] ?? 0) + hours; });
    });
    return map;
  }, [shifts, config]);

  const getScheduledHours = useCallback(
    (empId) => Math.round((employeeScheduledHoursMap[empId] ?? 0) * 10) / 10,
    [employeeScheduledHoursMap]
  );

  const employeeScheduledDaysMap = useMemo(() => {
    const map = {};
    Object.keys(shifts).forEach((key) => {
      const dateStr = key.substring(0, 10);
      const emps = shifts[key];
      emps.forEach((emp) => {
        if (!map[emp.id]) map[emp.id] = new Set();
        map[emp.id].add(dateStr);
      });
    });
    const result = {};
    Object.entries(map).forEach(([id, dates]) => { result[id] = dates.size; });
    return result;
  }, [shifts]);

  const getScheduledDays = useCallback(
    (empId) => employeeScheduledDaysMap[empId] ?? 0,
    [employeeScheduledDaysMap]
  );

  const getRemainingHours = useCallback(
    (emp) => Math.round((emp.weeklyHours - getScheduledHours(emp.id)) * 10) / 10,
    [getScheduledHours]
  );

  const isOvertime = useCallback(
    (emp) => getScheduledHours(emp.id) > (emp.weeklyHours ?? 40),
    [getScheduledHours]
  );

  const isFullyAllocated = useCallback(
    (emp) => getScheduledHours(emp.id) === (emp.weeklyHours ?? 40),
    [getScheduledHours]
  );

  // ── Modal derived values ──────────────────────────────────────────────────
  const filteredModalEmployees = useMemo(() => {
    if (!employees) return [];
    let list = employees;
    if (assignModal?.filterPositionId)
      list = list.filter((e) => e.positionId === assignModal.filterPositionId);
    if (modalSearch)
      list = list.filter((e) => e.fullName.toLowerCase().includes(modalSearch.toLowerCase()));
    return list;
  }, [employees, modalSearch, assignModal]);

  const modalUnavailReports = useMemo(
    () => assignModal ? getShiftUnavailableReports(unavailability, toYyyyMmDd(assignModal.date), assignModal.shiftId) : [],
    [assignModal, unavailability]
  );

  // ── Roster panel derived values ───────────────────────────────────────────
  const rosterFilteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!activeSlot?.filterPositionId) return employees;
    return employees.filter((e) => e.positionId === activeSlot.filterPositionId);
  }, [employees, activeSlot]);

  const assignedToSlot = useMemo(() => {
    if (!activeSlot) return [];
    return shifts[shiftKey(activeSlot.date, activeSlot.shiftId)] ?? [];
  }, [activeSlot, shifts]);

  const activeSlotUnavailReports = useMemo(() => {
    if (!activeSlot) return [];
    return getShiftUnavailableReports(unavailability, toYyyyMmDd(activeSlot.date), activeSlot.shiftId);
  }, [activeSlot, unavailability]);

  const activeSlotShiftHours = useMemo(() => {
    if (!activeSlot) return 8;
    return getShiftHours(config, activeSlot.date.getDay(), activeSlot.shiftId);
  }, [activeSlot, config]);

  const activeSlotShift = useMemo(() => {
    if (!activeSlot) return null;
    return activeShifts.find((s) => s.id === activeSlot.shiftId) ?? null;
  }, [activeSlot, activeShifts]);

  // Derived from the week-level cache — no extra API call needed.
  const activeSlotAbsences = useMemo(() => {
    if (!activeSlot) return {};
    const dateStr = toYyyyMmDd(activeSlot.date);
    const result = {};
    (employees ?? []).forEach((e) => {
      const a = weekAbsences[`${e.id}|${dateStr}`];
      if (a) result[e.id] = a;
    });
    return result;
  }, [activeSlot, weekAbsences, employees]);

  // Employees assigned to other shifts on the active slot's date (roster panel).
  const activeSlotAssignedElsewhereToday = useMemo(() => {
    if (!activeSlot) return new Set();
    const dateStr = toYyyyMmDd(activeSlot.date);
    const currentKey = shiftKey(activeSlot.date, activeSlot.shiftId);
    const ids = new Set();
    Object.entries(shifts).forEach(([key, emps]) => {
      if (key.startsWith(dateStr) && key !== currentKey)
        emps.forEach((e) => ids.add(e.id));
    });
    return ids;
  }, [activeSlot, shifts]);

  // Employees assigned to other shifts on the assign modal's date.
  const modalAssignedElsewhereToday = useMemo(() => {
    if (!assignModal) return new Set();
    const dateStr = toYyyyMmDd(assignModal.date);
    const currentKey = shiftKey(assignModal.date, assignModal.shiftId);
    const ids = new Set();
    Object.entries(shifts).forEach(([key, emps]) => {
      if (key.startsWith(dateStr) && key !== currentKey)
        emps.forEach((e) => ids.add(e.id));
    });
    return ids;
  }, [assignModal, shifts]);

  const weekLabel = useMemo(() => {
    const start = weekDays[0], end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = sameMonth ? end.getDate().toString() : end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr} - ${endStr}, ${end.getFullYear()}`;
  }, [weekDays]);

  // Scroll to today column on week change / view change (only when >5 days visible)
  useEffect(() => {
    if (visibleDays.length <= 5) return;
    const timer = setTimeout(() => {
      document.querySelectorAll(".scroll-grid-container").forEach((container) => {
        const todayEl = container.querySelector("[data-today-col]");
        if (!todayEl) return;
        const offset = todayEl.offsetLeft - container.clientWidth / 2 + todayEl.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [weekKey, planView, visibleDays.length]);

  // ── Subscription locks ────────────────────────────────────────────────────
  // Computed late so weekStart / monthRange are in scope.
  const policyBlocked = !!schedulingPolicy?.isBlocked;
  const isWeekLocked = policyBlocked || isDateBeyondPlanWindow(weekStart);
  const monthEndDate = useMemo(() => {
    if (!monthRange?.endDate) return null;
    const d = new Date(`${monthRange.endDate}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }, [monthRange]);
  const isMonthLocked = policyBlocked || (monthEndDate ? isDateBeyondPlanWindow(monthEndDate) : false);
  const lockTooltip = policyBlocked ? BLOCKED_MSG : TRIAL_LOCK_MSG;

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="max-w-[1600px] space-y-4 sm:space-y-6">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                Shift Planner
              </h1>
              {mode === "edit" && viewMode === "week" && (
                <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-100 text-amber-700">
                  Editing
                </span>
              )}
            </div>
            <p className="hidden sm:block text-slate-500 text-sm mt-1">
              {viewMode === "week"
                ? "Plan and manage employee shifts across the week."
                : "Overview and auto-scheduling for the full month."}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-center gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {[
                { v: "week", label: "Week", icon: CalendarDays },
                { v: "month", label: "Month", icon: Calendar },
              ].map(({ v, label, icon: Icon }) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === v
                      ? "bg-white text-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <Link
              to="/shifts/configure"
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </header>

        {/* ── Week view ── */}
        {viewMode === "week" && (
          <WeekPlannerView
            weekLabel={weekLabel}
            onNavigateWeek={navigateWeek}
            onGoToToday={goToToday}
            today={today}
            loadingSchedule={loadingSchedule}
            config={config}
            activeShifts={activeShifts}
            positionGroups={positionGroups}
            hasPositionRequirements={hasPositionRequirements}
            employees={employees}
            weekAbsences={weekAbsences}
            weekAbsenceHours={weekAbsenceHours}
            unavailability={unavailability}
            visibleDays={visibleDays}
            mode={mode}
            planView={planView}
            rosterOpen={rosterOpen}
            rosterSearch={rosterSearch}
            activeSlot={activeSlot}
            expandedUnavailPanel={expandedUnavailPanel}
            searchTerm={searchTerm}
            smartGenerating={smartGenerating}
            weekStats={weekStats}
            uniqueAssignedCount={uniqueAssignedCount}
            getScheduledHours={getScheduledHours}
            getScheduledDays={getScheduledDays}
            getShiftEmployees={getShiftEmployees}
            isFullyAllocated={isFullyAllocated}
            isOvertime={isOvertime}
            toggleUnavailPanel={toggleUnavailPanel}
            rosterFilteredEmployees={rosterFilteredEmployees}
            assignedToSlot={assignedToSlot}
            activeSlotAbsences={activeSlotAbsences}
            activeSlotUnavailReports={activeSlotUnavailReports}
            activeSlotAssignedElsewhereToday={activeSlotAssignedElsewhereToday}
            activeSlotShift={activeSlotShift}
            activeSlotShiftHours={activeSlotShiftHours}
            onPlanViewChange={setPlanView}
            onSearchChange={setSearchTerm}
            onRosterToggle={() => setRosterOpen((v) => !v)}
            onRosterClose={() => setRosterOpen(false)}
            onRosterSearchChange={setRosterSearch}
            onEdit={handleEdit}
            onPublish={handlePublish}
            onGenerateSmart={handleGenerateSmart}
            onOpenAssignModal={openAssignModal}
            onRemoveEmployee={removeEmployee}
            onAssignFromRoster={assignFromRoster}
            onRemoveFromRoster={removeFromRoster}
            onClearConfirmOpen={() => setClearConfirmOpen(true)}
            isLocked={isWeekLocked}
            lockTooltip={lockTooltip}
          />
        )}

        {/* ── Month view ── */}
        {viewMode === "month" && (
          <MonthPlannerView
            currentDate={currentDate}
            config={config}
            monthShiftData={monthShiftData}
            activeShifts={activeShifts}
            positionGroups={positionGroups}
            employees={employees}
            today={today}
            loadingMonthData={loadingMonthData}
            monthGenerating={monthGenerating}
            onNavigateMonth={navigateMonth}
            onGenerateMonth={handleGenerateMonth}
            onNavigateToWeek={(monday) => { setCurrentDate(monday); setViewMode("week"); }}
            isLocked={isMonthLocked}
            lockTooltip={lockTooltip}
          />
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div
          // initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setAssignModal(null);
            setModalSearch("");
          }}
        >
          <div
            // initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            // exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Assign Employee
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {assignModal.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    &middot;{" "}
                    {
                      activeShifts.find((s) => s.id === assignModal.shiftId)
                        ?.label
                    }{" "}
                    Shift
                  </p>
                  {assignModal.filterPositionTitle && (
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />
                      {assignModal.filterPositionTitle}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setAssignModal(null);
                    setModalSearch("");
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {filteredModalEmployees.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  {assignModal.filterPositionId
                    ? `No ${assignModal.filterPositionTitle} employees found.`
                    : "No employees found."}
                </div>
              ) : (
                filteredModalEmployees.map((emp) => {
                  const alreadyAssigned = getShiftEmployees(
                    assignModal.date,
                    assignModal.shiftId,
                  ).some((e) => e.id === emp.id);
                  const absenceType = assignModal
                    ? weekAbsences[`${emp.id}|${toYyyyMmDd(assignModal.date)}`]
                    : undefined;
                  const isAbsent = Boolean(absenceType);
                  const unavailReport = modalUnavailReports.find(
                    (r) => r.employeeId === emp.id,
                  );
                  const isShiftUnavailable = Boolean(unavailReport);
                  const empOvertime = isOvertime(emp);
                  const fullyAllocated = isFullyAllocated(emp);
                  const remainingHours = getRemainingHours(emp);
                  const worksToday =
                    !alreadyAssigned && modalAssignedElsewhereToday.has(emp.id);
                  const isDisabled =
                    alreadyAssigned ||
                    isAbsent ||
                    isShiftUnavailable ||
                    worksToday;

                  return (
                    <button
                      key={emp.id}
                      disabled={isDisabled}
                      onClick={() =>
                        assignEmployee(
                          assignModal.date,
                          assignModal.shiftId,
                          emp,
                        )
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <img
                        src={
                          emp.profilePictureSrc
                            ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}`
                            : defaultProfile
                        }
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {emp.fullName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {emp.position}
                        </p>
                      </div>

                      {isShiftUnavailable && (
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            <UserMinus className="w-3 h-3" /> Unavailable
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatReportedAt(unavailReport.reportedAt)}
                          </span>
                        </div>
                      )}
                      {isAbsent && !isShiftUnavailable && (
                        <span
                          className={`flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full shrink-0 ${EVENT_COLORS[absenceType]}`}
                        >
                          {EVENT_ICONS[absenceType]} {absenceType}
                        </span>
                      )}
                      {alreadyAssigned && !isAbsent && !isShiftUnavailable && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                          Assigned
                        </span>
                      )}
                      {worksToday && (
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full shrink-0">
                          Today
                        </span>
                      )}

                      {!isDisabled &&
                        (config?.considerWeeklyHours ? (
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {empOvertime ? (
                              <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                Overtime
                              </span>
                            ) : fullyAllocated ? (
                              <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                Fully Allocated
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  remainingHours <= 8
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {remainingHours}h left
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {getScheduledHours(emp.id)}/{emp.weeklyHours}h
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            {getScheduledHours(emp.id)}h
                          </span>
                        ))}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Last Week Modal */}
      {showOnboardingModal && (
        <OnboardingFirstScheduleModal
          onClose={() => setShowOnboardingModal(false)}
          onContinue={handleOnboardingComplete}
        />
      )}

      {/* Clear Week Confirmation */}
      {clearConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !clearing && setClearConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-xl shrink-0">
                <TriangleAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Clear week schedule?
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  All assignments for{" "}
                  <span className="font-semibold text-slate-700">
                    {weekLabel}
                  </span>{" "}
                  will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setClearConfirmOpen(false)}
                disabled={clearing}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearWeek}
                disabled={clearing}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {clearing && (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z"
                    />
                  </svg>
                )}
                {clearing ? "Clearing…" : "Clear schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart schedule result */}
      <AnimatePresence>
        {smartResult && (
          <SmartScheduleResultModal
            result={smartResult}
            shifts={activeShifts}
            employees={employees}
            positionRequirements={config?.positionRequirements ?? []}
            applying={smartGenerating}
            onApply={handleApplySmartDraft}
            onClose={() => setSmartResult(null)}
            tryingOptimize={reoptimizing}
            availableConstraints={availableConstraints}
            onTryOptimize={(disabledConstraints = []) => handleReoptimize(
              { startDate: smartResult.startDate, endDate: smartResult.endDate },
              smartResult,
              setSmartResult,
              disabledConstraints,
            )}
          />
        )}
      </AnimatePresence>

      {/* Month schedule result */}
      <AnimatePresence>
        {monthResult && (
          <MonthScheduleResultModal
            result={monthResult}
            shifts={activeShifts}
            employees={employees}
            positionRequirements={config?.positionRequirements ?? []}
            applying={monthGenerating}
            onApply={handleApplyMonthDraft}
            onClose={() => setMonthResult(null)}
            tryingOptimize={reoptimizing}
            availableConstraints={availableConstraints}
            onTryOptimize={(disabledConstraints = []) => handleReoptimize(
              { startDate: monthResult.startDate, endDate: monthResult.endDate },
              monthResult,
              setMonthResult,
              disabledConstraints,
            )}
          />
        )}
      </AnimatePresence>

      {/* Constraint violation alert */}
      {constraintError && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => setConstraintError(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                constraintError.blocking.length > 0 ? "bg-red-50" : "bg-amber-50"
              }`}>
                <ShieldAlert className={`w-5 h-5 ${
                  constraintError.blocking.length > 0 ? "text-red-500" : "text-amber-500"
                }`} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  {constraintError.blocking.length > 0 ? "Cannot Assign Employee" : "Constraint Warning"}
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  {constraintError.blocking.length > 0
                    ? "This assignment violates mandatory scheduling rules."
                    : "This assignment violates scheduling rules, but you may proceed."}
                </p>
              </div>
            </div>

            {/* Blocking violations */}
            {constraintError.blocking.length > 0 && (
              <ul className="space-y-1.5">
                {constraintError.blocking.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 bg-red-50 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            )}

            {/* Overridable violations */}
            {constraintError.overridable.length > 0 && (
              <ul className="space-y-1.5">
                {constraintError.overridable.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 bg-amber-50 rounded-xl px-3 py-2">
                    <TriangleAlert className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            )}

            {/* Actions */}
            <div className={`flex gap-2 ${constraintError.blocking.length === 0 ? "flex-col-reverse sm:flex-row" : ""}`}>
              <button
                onClick={() => setConstraintError(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {constraintError.blocking.length === 0 ? "Cancel" : "Got it"}
              </button>
              {constraintError.blocking.length === 0 && constraintError.pendingAssign && (
                <button
                  onClick={() => {
                    const { date, shiftId, employee } = constraintError.pendingAssign;
                    setConstraintError(null);
                    assignEmployee(date, shiftId, employee, true);
                  }}
                  className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer"
                >
                  Assign anyway
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Optimization info banner ──────────────────────────────────────────────────
// Shown inside both result modals whenever the engine's post-pass local-search
// optimizer produced a summary (it always does — greedy never ships alone).

const OptimizationInfoBanner = memo(function OptimizationInfoBanner({ optimization }) {
  const filled = optimization.slotsFilledByOptimizer ?? 0;
  const iters = optimization.iterations ?? 0;
  const ms = optimization.durationMs ?? 0;
  const remaining = optimization.remainingUnfilled ?? 0;
  const changes = optimization.changes ?? [];

  return (
    <section className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
      <CheckCheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">Optimization ran</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Local-search post-pass filled {filled} additional slot{filled === 1 ? "" : "s"} in {iters} iteration{iters === 1 ? "" : "s"}
          {ms > 0 && <> · {ms} ms</>}
          {remaining > 0 && <> · {remaining} still need manual review</>}.
        </p>
        {changes.length > 0 && (
          <details className="mt-2 group">
            <summary className="text-xs font-medium text-indigo-700 hover:text-indigo-800 cursor-pointer select-none">
              View changes ({changes.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {changes.map((c, i) => (
                <li key={i} className="text-xs text-slate-700 pl-3 border-l-2 border-indigo-200">
                  {c.description}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
});

// ── Constraint override panel ─────────────────────────────────────────────────
// Shown after the manager has tried the unrestricted optimizer once and there
// are still unfilled slots. Lists every hard constraint registered with the
// engine. Mandatory (non-overridable) ones are read-only locks; the rest are
// toggles. The names of disabled constraints are passed up to the caller.
//
// SECURITY NOTE: Even if the UI were tampered with to enable a non-overridable
// toggle, the backend strips non-overridable names from the request before
// running the solver and re-validates the result against the full hard-
// constraint pipeline. The toggle below is convenience, not a security gate.

const CONSTRAINT_DESCRIPTIONS = {
  Absence: "Approved time-off and vacation",
  ConsecutiveHours: "48-hour cap on continuous work without a day off",
  RestPeriod: "Minimum 12-hour rest between consecutive shifts",
  Overtime: "Weekly contracted-hours cap",
  PinnedShift: "Employees pinned to a single shift only fill that shift",
  Rotation: "Employee rotation pattern (e.g. 5 on / 2 off)",
  ShiftVariety: "Avoid 3+ consecutive days on the same shift",
  Availability: "Employee self-reported unavailability",
};

const ConstraintOverridePanel = memo(function ConstraintOverridePanel({
  availableConstraints, disabledConstraints, onToggle, onRun, running, disabled,
}) {
  // Show every hard constraint, sorted by overridable-first then priority. The
  // engine returns the registry already sorted by priority; we just promote
  // overridable ones so users can see what they can actually change up top.
  const rows = useMemo(() => {
    const hard = (availableConstraints ?? []).filter((c) => c.severity === "Hard");
    return [...hard].sort((a, b) => {
      if (a.isUserOverridable !== b.isUserOverridable) return a.isUserOverridable ? -1 : 1;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  }, [availableConstraints]);

  const overridableCount = rows.filter((r) => r.isUserOverridable).length;
  const disabledCount = rows.filter((r) => r.isUserOverridable && disabledConstraints.has(r.name)).length;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
      <header className="px-4 py-3 border-b border-amber-100 bg-amber-50/80">
        <div className="flex items-start gap-2.5">
          <Settings className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900">Loosen constraints and try again</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Some slots remain unfilled. You can disable individual rules below and re-run the solver.
              Mandatory rules — like absences and the legal rest period — can never be turned off.
            </p>
          </div>
        </div>
      </header>

      <ul className="divide-y divide-amber-100">
        {rows.length === 0 && (
          <li className="px-4 py-3 text-xs text-slate-500">No hard constraints to display.</li>
        )}
        {rows.map((c) => {
          const isDisabled = disabledConstraints.has(c.name);
          const description = CONSTRAINT_DESCRIPTIONS[c.name] ?? "";
          return (
            <li
              key={c.name}
              className={`px-4 py-2.5 flex items-center justify-between gap-3 ${c.isUserOverridable ? "bg-white" : "bg-slate-50/60"}`}
            >
              <div className="min-w-0 flex items-start gap-2.5">
                {c.isUserOverridable ? (
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" aria-hidden />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{c.name}</span>
                    {!c.isUserOverridable && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        Mandatory
                      </span>
                    )}
                    {c.isUserOverridable && isDisabled && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                        Off
                      </span>
                    )}
                  </div>
                  {description && (
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  )}
                </div>
              </div>

              <ConstraintToggle
                checked={c.isUserOverridable ? !isDisabled : true}
                disabled={!c.isUserOverridable || running || disabled}
                title={c.isUserOverridable
                  ? (isDisabled ? "Currently OFF — re-enable to enforce this rule" : "Currently ON — turn off to let the solver bypass it")
                  : "Mandatory — cannot be disabled"}
                onChange={() => c.isUserOverridable && onToggle(c.name)}
              />
            </li>
          );
        })}
      </ul>

      <footer className="px-4 py-3 border-t border-amber-100 bg-white flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {overridableCount === 0
            ? "No constraints can be loosened in this configuration."
            : disabledCount === 0
              ? "All rules are on. Toggle one or more to give the solver more room."
              : `${disabledCount} rule${disabledCount === 1 ? "" : "s"} will be skipped on the next run.`}
        </p>
        <button
          onClick={onRun}
          disabled={running || disabled}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white shadow-sm"
          title="Re-run the constraint solver with the toggled rules disabled. Updates this preview only — nothing is saved yet."
        >
          {running ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
            </svg>
          ) : (
            <CirclePlay className="w-3.5 h-3.5" />
          )}
          {running ? "Optimizing…" : "Re-optimize"}
        </button>
      </footer>
    </section>
  );
});

const ConstraintToggle = memo(function ConstraintToggle({ checked, disabled, onChange, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      title={title}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors
        ${checked ? "bg-emerald-500" : "bg-slate-300"}
        ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
          ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
});

// ── Smart schedule result modal ───────────────────────────────────────────────

const SmartScheduleResultModal = memo(function SmartScheduleResultModal({
  result, shifts, employees, positionRequirements, applying, onApply, onClose,
  tryingOptimize = false, onTryOptimize, availableConstraints = [],
}) {
  // Toggles for the override panel. Names of HARD + IsUserOverridable=true
  // constraints the user has chosen to skip on the next solve. The panel
  // itself disables interaction for non-overridable constraints, and the
  // backend is the final authority — anything we send that isn't overridable
  // will be ignored server-side.
  const [disabledConstraints, setDisabledConstraints] = useState(() => new Set());
  const toggleConstraint = useCallback((name) => {
    setDisabledConstraints((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);
  const shiftMap = useMemo(() => {
    const m = new Map();
    shifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts]);

  const employeeMap = useMemo(() => {
    const m = new Map();
    (employees ?? []).forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const positionMap = useMemo(() => {
    const m = new Map();
    (positionRequirements ?? []).forEach((r) => {
      if (!m.has(r.positionId)) m.set(r.positionId, r.positionTitle);
    });
    return m;
  }, [positionRequirements]);

  const filled = result?.filledSlots ?? 0;
  const total = result?.totalSlots ?? 0;
  const coverage = total > 0 ? Math.round((filled / total) * 100) : 0;
  const unfilled = result?.unfilledSlots ?? [];
  const soft = result?.acceptedSoftViolations ?? [];
  const proposed = result?.proposedAssignments?.length ?? 0;

  // Group proposed assignments by date for a clearer per-day breakdown.
  const proposedByDate = useMemo(() => {
    const groups = new Map();
    (result?.proposedAssignments ?? []).forEach((p) => {
      if (!groups.has(p.date)) groups.set(p.date, []);
      groups.get(p.date).push(p);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [result]);

  const formatDate = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Smart Schedule Preview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposal for week of {formatDate(result.startDate)} — nothing saved yet. Review below and apply when ready.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Coverage</p>
            <p className={`text-xl font-bold tabular-nums ${coverage >= 80 ? "text-emerald-600" : coverage >= 50 ? "text-amber-600" : "text-red-600"}`}>{coverage}%</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Slots Filled</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{filled}<span className="text-sm text-slate-400">/{total}</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Proposed</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{proposed}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Needs Review</p>
            <p className={`text-xl font-bold tabular-nums ${unfilled.length > 0 ? "text-red-600" : "text-emerald-600"}`}>{unfilled.length}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {result?.reoptimizeSummary && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <CheckCheck className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-semibold">Re-optimized preview</span>
                {result.reoptimizeDurationMs ? (
                  <span className="text-blue-700/70">
                    {" "}in {(result.reoptimizeDurationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
                <span className="text-blue-700/70">. </span>
                {result.reoptimizeSummary}{" "}
                <span className="text-blue-700/70">
                  Still a preview — click <span className="font-semibold">Apply to draft</span> to save.
                </span>
              </div>
            </div>
          )}

          {/* Top-of-modal optimizer call-to-action — first pass.
              No constraint overrides are sent on this call. Per product
              requirement, Iwos must NEVER skip a hard rule on its own. */}
          {onTryOptimize && unfilled.length > 0 && !result?.reoptimizeAttempted && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Try the advanced optimizer</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Hand the schedule to a constraint solver. It searches for a layout that fills more slots while still respecting every hard rule.
                </p>
              </div>
              <button
                onClick={() => onTryOptimize([])}
                disabled={tryingOptimize || applying}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Search for a better assignment using the constraint solver. Updates this preview only — nothing is saved yet."
              >
                {tryingOptimize ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                  </svg>
                ) : (
                  <CirclePlay className="w-3.5 h-3.5" />
                )}
                {tryingOptimize ? "Optimizing…" : "Try to optimize"}
              </button>
            </div>
          )}

          {/* Second-pass: override panel.
              Visible only after the unrestricted pass has been attempted and
              there are still unfilled slots. Lets the manager loosen the
              constraints they're allowed to loosen and re-run the solver. */}
          {onTryOptimize && unfilled.length > 0 && result?.reoptimizeAttempted && (
            <ConstraintOverridePanel
              availableConstraints={availableConstraints}
              disabledConstraints={disabledConstraints}
              onToggle={toggleConstraint}
              onRun={() => onTryOptimize(Array.from(disabledConstraints))}
              running={tryingOptimize}
              disabled={applying}
            />
          )}

          {unfilled.length === 0 && soft.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">All constraints satisfied</p>
                <p className="text-xs text-emerald-700 mt-0.5">Every required slot can be filled without breaking any rule.</p>
              </div>
            </div>
          )}

          {/* Proposed assignments grouped by date — what the engine wants to add */}
          {proposedByDate.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-700" />
                <h4 className="text-sm font-semibold text-slate-800">Proposed assignments</h4>
                <span className="text-xs font-semibold text-blue-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">{proposed}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                These assignments will be saved as a draft when you click <span className="font-semibold text-slate-700">Apply to draft</span>.
              </p>
              <ul className="space-y-2">
                {proposedByDate.map(({ date, items }) => (
                  <li key={date} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">{formatDate(date)}</span>
                      <span className="text-[10px] text-slate-500 tabular-nums">{items.length} assignment{items.length === 1 ? "" : "s"}</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {items.map((p, i) => {
                        const emp = employeeMap.get(p.employeeId);
                        const shift = shiftMap.get(p.shiftId);
                        return (
                          <li key={`${p.employeeId}_${p.shiftId}_${i}`} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${shift?.dotColor ?? "bg-slate-300"}`} />
                              <span className="text-sm text-slate-800 truncate">{emp?.fullName ?? "Employee"}</span>
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">{shift?.label ?? "Shift"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Unfilled slots — hard blockers that need human verification */}
          {unfilled.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-semibold text-slate-800">Slots requiring human verification</h4>
                <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{unfilled.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                The engine could not fill these slots without breaking a hard rule (absence, overtime cap, or no candidate matched the position).
                Assign someone manually, adjust availability, or reduce staffing requirements for the affected shift.
              </p>
              <ul className="space-y-1.5">
                {unfilled.map((slot, i) => {
                  const shift = shiftMap.get(slot.shiftId);
                  const posTitle = slot.requiredPositionId ? positionMap.get(slot.requiredPositionId) : null;
                  return (
                    <li key={`${slot.date}_${slot.shiftId}_${slot.requiredPositionId ?? i}`}
                        className="flex items-start gap-3 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                      <TriangleAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(slot.date)} · {shift?.label ?? "Shift"}
                          {posTitle && <span className="text-slate-500 font-normal"> · {posTitle}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{slot.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Soft violations — engine proceeded but flagged them */}
          {soft.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-slate-800">Soft-rule overrides</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{soft.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                These assignments were kept because no better option existed, but they bend a soft rule (e.g. the employee reported themselves unavailable).
                Consider reviewing or swapping them.
              </p>
              <ul className="space-y-1.5">
                {soft.map((v, i) => {
                  const emp = employeeMap.get(v.employeeId);
                  const shift = shiftMap.get(v.shiftId);
                  return (
                    <li key={`${v.employeeId}_${v.shiftId}_${v.date}_${i}`}
                        className="flex items-start gap-3 p-3 bg-amber-50/40 border border-amber-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {emp?.fullName ?? "Employee"} — {formatDate(v.date)} · {shift?.label ?? "Shift"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-amber-700">{v.constraintName}</span>
                          <span className="text-slate-300 mx-1">·</span>
                          {v.reason}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {result?.optimization && <OptimizationInfoBanner optimization={result.optimization} />}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 w-1/2">
            Preview only — nothing is saved until you apply. Publishing remains a separate step.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={applying || tryingOptimize}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              disabled={applying || tryingOptimize || proposed === 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white inline-flex items-center gap-2"
              title={
                proposed === 0
                  ? "No proposed assignments to apply."
                  : "Save these proposals as a draft. The week still has to be published."
              }
            >
              {applying ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {applying ? "Applying…" : "Apply to draft"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ── Month schedule result modal ───────────────────────────────────────────────

const MonthScheduleResultModal = memo(function MonthScheduleResultModal({
  result, shifts, employees, positionRequirements, applying, onApply, onClose,
  tryingOptimize = false, onTryOptimize, availableConstraints = [],
}) {
  const [disabledConstraints, setDisabledConstraints] = useState(() => new Set());
  const toggleConstraint = useCallback((name) => {
    setDisabledConstraints((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);
  const shiftMap = useMemo(() => {
    const m = new Map();
    shifts.forEach((s) => m.set(s.id, s));
    return m;
  }, [shifts]);

  const employeeMap = useMemo(() => {
    const m = new Map();
    (employees ?? []).forEach((e) => m.set(e.id, e));
    return m;
  }, [employees]);

  const positionMap = useMemo(() => {
    const m = new Map();
    (positionRequirements ?? []).forEach((r) => {
      if (!m.has(r.positionId)) m.set(r.positionId, r.positionTitle);
    });
    return m;
  }, [positionRequirements]);

  const filled = result?.filledSlots ?? 0;
  const total = result?.totalSlots ?? 0;
  const coverage = total > 0 ? Math.round((filled / total) * 100) : 0;
  const unfilled = result?.unfilledSlots ?? [];
  const soft = result?.acceptedSoftViolations ?? [];
  const proposed = result?.proposedAssignments?.length ?? 0;
  const weeks = result?.weekBreakdown ?? [];

  const formatDate = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatRange = (startIso, endIso) => {
    const s = new Date(startIso + "T00:00:00");
    const e = new Date(endIso + "T00:00:00");
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    const left = s.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const right = sameMonth
      ? e.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })
      : e.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `${left} – ${right}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Monthly Schedule Preview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Proposal for {formatRange(result.startDate, result.endDate)} — nothing saved yet. Review below and apply when ready.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Coverage</p>
            <p className={`text-xl font-bold tabular-nums ${coverage >= 80 ? "text-emerald-600" : coverage >= 50 ? "text-amber-600" : "text-red-600"}`}>{coverage}%</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Slots Filled</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{filled}<span className="text-sm text-slate-400">/{total}</span></p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Proposed</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{proposed}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Needs Review</p>
            <p className={`text-xl font-bold tabular-nums ${unfilled.length > 0 ? "text-red-600" : "text-emerald-600"}`}>{unfilled.length}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {result?.reoptimizeSummary && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <CheckCheck className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-semibold">Re-optimized preview</span>
                {result.reoptimizeDurationMs ? (
                  <span className="text-blue-700/70">
                    {" "}in {(result.reoptimizeDurationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
                <span className="text-blue-700/70">. </span>
                {result.reoptimizeSummary}{" "}
                <span className="text-blue-700/70">
                  Still a preview — click <span className="font-semibold">Apply to draft</span> to save.
                </span>
              </div>
            </div>
          )}

          {/* Top-of-modal optimizer call-to-action — first pass (no overrides). */}
          {onTryOptimize && unfilled.length > 0 && !result?.reoptimizeAttempted && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Try the advanced optimizer</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Hand the schedule to a constraint solver. It searches for a layout that fills more slots while still respecting every hard rule.
                </p>
              </div>
              <button
                onClick={() => onTryOptimize([])}
                disabled={tryingOptimize || applying}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-blue-200 hover:bg-blue-100 text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Search for a better assignment using the constraint solver. Updates this preview only — nothing is saved yet."
              >
                {tryingOptimize ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                  </svg>
                ) : (
                  <CirclePlay className="w-3.5 h-3.5" />
                )}
                {tryingOptimize ? "Optimizing…" : "Try to optimize"}
              </button>
            </div>
          )}

          {/* Second-pass: override panel — see SmartScheduleResultModal for rationale. */}
          {onTryOptimize && unfilled.length > 0 && result?.reoptimizeAttempted && (
            <ConstraintOverridePanel
              availableConstraints={availableConstraints}
              disabledConstraints={disabledConstraints}
              onToggle={toggleConstraint}
              onRun={() => onTryOptimize(Array.from(disabledConstraints))}
              running={tryingOptimize}
              disabled={applying}
            />
          )}

          {/* Week breakdown */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CalendarRange className="w-4 h-4 text-blue-700" />
              <h4 className="text-sm font-semibold text-slate-800">Weekly coverage</h4>
              <span className="text-xs font-semibold text-blue-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">{weeks.length} week{weeks.length === 1 ? "" : "s"}</span>
            </div>
            <ul className="space-y-1.5">
              {weeks.map((w) => {
                const weekCoverage = w.totalSlots > 0 ? Math.round((w.filledSlots / w.totalSlots) * 100) : 0;
                return (
                  <li key={w.weekStart} className="flex items-center gap-3 px-3 py-2 border border-slate-200 rounded-lg">
                    <span className="text-xs font-medium text-slate-700 w-40 shrink-0">{formatDate(w.weekStart)}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${weekCoverage >= 80 ? "bg-emerald-500" : weekCoverage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${weekCoverage}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-slate-600 w-20 text-right">
                      {w.filledSlots}/{w.totalSlots}
                    </span>
                    <span className={`text-xs font-semibold tabular-nums w-10 text-right ${weekCoverage >= 80 ? "text-emerald-600" : weekCoverage >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {weekCoverage}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {unfilled.length === 0 && soft.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">All constraints satisfied</p>
                <p className="text-xs text-emerald-700 mt-0.5">Every required slot can be filled without breaking any rule.</p>
              </div>
            </div>
          )}

          {/* Unfilled */}
          {unfilled.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-semibold text-slate-800">Slots requiring human verification</h4>
                <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{unfilled.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                The engine could not fill these without breaking a hard rule (absence, rotation off-day, overtime, or pinned-shift mismatch).
              </p>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {unfilled.map((slot, i) => {
                  const shift = shiftMap.get(slot.shiftId);
                  const posTitle = slot.requiredPositionId ? positionMap.get(slot.requiredPositionId) : null;
                  return (
                    <li key={`${slot.date}_${slot.shiftId}_${slot.requiredPositionId ?? i}`}
                        className="flex items-start gap-3 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                      <TriangleAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(slot.date)} · {shift?.label ?? "Shift"}
                          {posTitle && <span className="text-slate-500 font-normal"> · {posTitle}</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{slot.reason}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Soft violations */}
          {soft.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-slate-800">Soft-rule overrides</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{soft.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                These were kept because no better option existed, but they bend a soft rule (availability, 2-day shift pairing).
              </p>
              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {soft.map((v, i) => {
                  const emp = employeeMap.get(v.employeeId);
                  const shift = shiftMap.get(v.shiftId);
                  return (
                    <li key={`${v.employeeId}_${v.shiftId}_${v.date}_${i}`}
                        className="flex items-start gap-3 p-3 bg-amber-50/40 border border-amber-100 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {emp?.fullName ?? "Employee"} — {formatDate(v.date)} · {shift?.label ?? "Shift"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-amber-700">{v.constraintName}</span>
                          <span className="text-slate-300 mx-1">·</span>
                          {v.reason}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {result?.optimization && <OptimizationInfoBanner optimization={result.optimization} />}

          {/* Employee distribution */}
          {(result.employeeSummaries?.length ?? 0) > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h4 className="text-sm font-semibold text-slate-800">Employee distribution</h4>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {result.employeeSummaries.length} employee{result.employeeSummaries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Proposed shifts only — does not include assignments already on the schedule before generation.
              </p>
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Employee</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Days</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.employeeSummaries.map((s) => (
                      <tr key={s.employeeId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-800 font-medium">{s.fullName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{s.daysWorked}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{s.hoursWorked}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 w-1/2">
            Preview only — nothing is saved until you apply. Each week still has to be published separately.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={applying || tryingOptimize}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              disabled={applying || tryingOptimize || proposed === 0}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white inline-flex items-center gap-2"
              title={
                proposed === 0
                  ? "No proposed assignments to apply."
                  : "Save these proposals as a draft across the month."
              }
            >
              {applying ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {applying ? "Applying…" : "Apply to draft"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
