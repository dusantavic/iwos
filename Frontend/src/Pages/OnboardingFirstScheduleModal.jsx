import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Play, SkipForward, ChevronLeft, ChevronRight, X, Info } from "lucide-react";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { toYyyyMmDd } from "../utils/dateFormatter";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

export default function OnboardingFirstScheduleModal({ onClose, onContinue }) {
  const [step, setStep] = useState("choice"); // "choice" | "prior-week"

  // Prior-week form state
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  // employeeRows: { employeeId, fullName, position, rotationPatternId, dailyShiftIds: [7 × Guid|null], anchorDate: string }
  const [employeeRows, setEmployeeRows] = useState([]);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [{ data: shiftData }, { data: empData }] = await Promise.all([
        api.get("/Shift/GetConfig"),
        api.get("/Employee/GetEmployeesForShift"),
      ]);
      const activeShifts = (shiftData?.shifts ?? []).filter((s) => s.isActive);
      setShifts(activeShifts);
      setPatterns(shiftData?.rotationPatterns ?? []);

      const emps = Array.isArray(empData) ? empData : [];
      setEmployees(emps);
      setEmployeeRows(
        emps.map((e) => ({
          employeeId: e.id,
          fullName: e.fullName,
          position: e.position ?? "",
          rotationPatternId: e.rotationPatternId ?? null,
          dailyShiftIds: Array(7).fill(null),
          anchorDate: "",
        }))
      );
    } catch {
      toast.error("Failed to load employees and shifts.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    if (step === "prior-week") loadConfig();
  }, [step, loadConfig]);

  const updateRow = (idx, field, value) => {
    setEmployeeRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const updateDailyShift = (rowIdx, dayIdx, shiftId) => {
    setEmployeeRows((rows) =>
      rows.map((r, i) => {
        if (i !== rowIdx) return r;
        const updated = [...r.dailyShiftIds];
        updated[dayIdx] = shiftId || null;
        return { ...r, dailyShiftIds: updated };
      })
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        weekStart: toYyyyMmDd(weekStart),
        employees: employeeRows
          .filter((r) => r.dailyShiftIds.some((id) => id !== null))
          .map((r) => ({
            employeeId: r.employeeId,
            dailyShiftIds: r.dailyShiftIds,
            anchorDate: r.anchorDate || null,
          })),
      };

      if (payload.employees.length === 0) {
        toast.warning("No shift entries to import. Assign at least one shift.");
        setSaving(false);
        return;
      }

      const { data } = await api.post("/Shift/ProvisionPriorWeek", payload);
      toast.success(
        `Imported ${data.assignmentsInserted} assignments, set ${data.anchorDatesSet} anchor dates.`
      );
      onContinue();
    } catch {
      toast.error("Failed to import prior week data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                First Schedule — Getting Started
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No assignments exist yet for your organisation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === "choice" && <ChoiceStep onContinue={() => setStep("prior-week")} onSkip={onContinue} />}
          {step === "prior-week" && (
            <PriorWeekStep
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              employees={employees}
              employeeRows={employeeRows}
              shifts={shifts}
              patterns={patterns}
              loadingConfig={loadingConfig}
              saving={saving}
              updateRow={updateRow}
              updateDailyShift={updateDailyShift}
              onBack={() => setStep("choice")}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceStep({ onContinue, onSkip }) {
  return (
    <div className="p-8">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
        Before generating your first automatic schedule, let the system know whether
        you're already mid-cycle from an existing schedule (e.g. an Excel file) or
        starting fresh. This ensures rotation patterns continue without interruption.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option A: Continue from existing */}
        <button
          onClick={onContinue}
          className="group text-left p-6 rounded-xl border-2 border-blue-200 hover:border-blue-500 bg-blue-50 hover:bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 dark:hover:border-blue-500 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Continue from existing schedule
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            You have an existing Excel schedule and employees are already mid-rotation.
            Enter last week's shifts and on-block start dates — the engine will continue
            patterns seamlessly from the next week.
          </p>
          <p className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
            Recommended for most organisations
          </p>
        </button>

        {/* Option B: Start fresh */}
        <button
          onClick={onSkip}
          className="group text-left p-6 rounded-xl border-2 border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500 transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <SkipForward className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Start fresh
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Generate the schedule from scratch. The engine will auto-stagger employees
            across rotation patterns from a fixed epoch. Rotation continuity with any
            prior schedule is not guaranteed.
          </p>
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Best when there is no existing schedule to migrate
          </p>
        </button>
      </div>

      <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          This prompt only appears once — when no assignments exist yet. After importing,
          future schedule generations proceed normally without this step.
        </p>
      </div>
    </div>
  );
}

function PriorWeekStep({
  weekStart, setWeekStart, employeeRows, shifts, patterns, loadingConfig,
  saving, updateRow, updateDailyShift, onBack, onSubmit,
}) {
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const patternMap = Object.fromEntries(patterns.map((p) => [p.id, p]));

  const shiftOptions = [
    { value: "", label: "— Off —" },
    ...shifts.map((s) => ({ value: s.id, label: s.label })),
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Week selector */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prior week start (Monday)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((d) => addWeeks(d, -1))}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <input
              type="date"
              value={toYyyyMmDd(weekStart)}
              onChange={(e) => {
                const d = new Date(`${e.target.value}T00:00:00`);
                if (!isNaN(d.getTime())) setWeekStart(getMondayOfWeek(d));
              }}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => setWeekStart((d) => addWeeks(d, 1))}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Week of {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Select the shift each employee worked each day last week. For employees with a rotation
          pattern, also enter the "On-block start" date — the first calendar day of their current
          working block. You can leave cells blank for days off.
        </p>
      </div>

      {loadingConfig ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading employees…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-3 py-2.5 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[180px]">
                  Employee
                </th>
                {weekDates.map((d, i) => (
                  <th key={i} className="px-2 py-2.5 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[110px]">
                    <span className="block">{DAY_LABELS[i]}</span>
                    <span className="block text-[10px] text-gray-400 font-normal">
                      {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[140px]">
                  On-block start
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {employeeRows.map((row, rowIdx) => {
                const hasPattern = !!row.rotationPatternId;
                const pattern = hasPattern ? patternMap[row.rotationPatternId] : null;
                return (
                  <tr key={row.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                        {row.fullName}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {row.position}
                        {pattern && (
                          <span className="ml-1 text-blue-500">
                            · {pattern.name} ({pattern.daysOn}/{pattern.daysOff})
                          </span>
                        )}
                      </p>
                    </td>
                    {Array.from({ length: 7 }, (_, dayIdx) => (
                      <td key={dayIdx} className="px-2 py-1.5">
                        <select
                          value={row.dailyShiftIds[dayIdx] ?? ""}
                          onChange={(e) => updateDailyShift(rowIdx, dayIdx, e.target.value || null)}
                          className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {shiftOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className="px-3 py-1.5">
                      {hasPattern ? (
                        <input
                          type="date"
                          value={row.anchorDate}
                          onChange={(e) => updateRow(rowIdx, "anchorDate", e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          title="First day of this employee's current working on-block"
                        />
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">No pattern</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-4 shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || loadingConfig}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
                Importing…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Import &amp; Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
