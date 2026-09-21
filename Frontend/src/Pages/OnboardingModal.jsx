import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Star, Check, ChevronRight, ChevronLeft, Plus, X, Minus,
  Calendar, Users, Briefcase, Repeat, ShieldAlert, ShieldOff, ShieldCheck,
  ArrowRight, Clock, Building2, Info, UserPlus, FileUp,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { buildLocalConfig, DAY_LABELS, WEEKDAY_INDICES } from "../utils/shiftConfig";
import { favicon } from "../assets";

const SHIFT_ICONS = { Sun, Moon, Star };
const SHIFT_COLORS = {
  Morning:   { bg: "bg-amber-50",  icon: "text-amber-500",  ring: "ring-amber-300",  active: "bg-amber-500" },
  Afternoon: { bg: "bg-indigo-50", icon: "text-indigo-500", ring: "ring-indigo-300", active: "bg-indigo-500" },
  Night:     { bg: "bg-slate-100", icon: "text-slate-500",  ring: "ring-slate-300",  active: "bg-slate-500" },
};
const fallbackColors = { bg: "bg-gray-50", icon: "text-gray-500", ring: "ring-gray-300", active: "bg-gray-500" };

const STEPS = [
  { id: "welcome",       label: "Welcome"       },
  { id: "shifts",        label: "Shifts"        },
  { id: "hours",         label: "Hours"         },
  { id: "rules",         label: "Rules"         },
  { id: "departments",   label: "Departments"   },
  { id: "requirements",  label: "Requirements"  },
  { id: "rotations",     label: "Rotations"     },
  { id: "constraints",   label: "Constraints"   },
  { id: "employees",     label: "Team"          },
  { id: "done",          label: "Done"          },
];

function Toggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${enabled ? "bg-[#34C759]" : "bg-[#e5e5ea]"}`}
    >
      <span className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${enabled ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

export default function OnboardingModal({ onClose, onContinue }) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [config, setConfig] = useState(null);
  const [positions, setPositions] = useState([]); // existing DB positions for requirement step
  const [constraints, setConstraints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Onboarding-local state
  const [activeShiftIds, setActiveShiftIds] = useState(new Set());
  const [shiftHours, setShiftHours] = useState({}); // shiftId → { start, end }
  const [weekendsWorking, setWeekendsWorking] = useState(false);
  const [considerWeeklyHours, setConsiderWeeklyHours] = useState(true);
  const [departments, setDepartments] = useState([]); // [{ tempId, name, positions: [{ tempId, title }] }]
  const [positionRequirements, setPositionRequirements] = useState([]); // [{ shiftId, tempPositionIdx, deptIdx, requiredCount }]
  const [rotations, setRotations] = useState([]); // [{ name, daysOn, daysOff, isGlobal }]
  const [newRotName, setNewRotName] = useState("");
  const [newRotOn, setNewRotOn] = useState(6);
  const [newRotOff, setNewRotOff] = useState(2);
  const [newRotGlobal, setNewRotGlobal] = useState(false);
  const [employeeMode, setEmployeeMode] = useState(null); // null | "manual" | "csv"

  useEffect(() => {
    // Seed default shifts for first-time tenants. Idempotent on the backend —
    // no-ops if any shifts already exist for the current client.
    api.post("/Shift/CreateDefaultShift").catch(() => { /* non-fatal */ })
      .then(() => Promise.all([
        api.get("/Shift/GetConfig"),
        api.get("/Shift/GetConstraints").catch(() => ({ data: [] })),
      ]))
      .then(([configRes, constraintsRes]) => {
      const cfg = buildLocalConfig(configRes.data);
      setConfig(cfg);
      const activeIds = new Set(cfg.shifts.filter((s) => s.isActive).map((s) => s.id));
      setActiveShiftIds(activeIds);
      const hours = {};
      cfg.shifts.forEach((s) => {
        hours[s.id] = { start: s.defaultStartTime, end: s.defaultEndTime };
      });
      setShiftHours(hours);
      setWeekendsWorking(cfg.weekendsWorking ?? false);
      setConsiderWeeklyHours(cfg.considerWeeklyHours ?? true);
      setConstraints(constraintsRes.data ?? []);
    })
      .catch(() => toast.error("Failed to load configuration."))
      .finally(() => setLoading(false));
  }, []);

  const currentStep = STEPS[stepIdx].id;
  const progressSteps = STEPS.slice(1, -1); // exclude welcome + done from progress bar

  const goNext = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  // ── Shift helpers ─────────────────────────────────────────────────────────

  const toggleShift = (id) => {
    setActiveShiftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) { toast.error("At least one shift must remain active."); return prev; }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const activeShifts = config?.shifts.filter((s) => activeShiftIds.has(s.id)) ?? [];

  // ── Department helpers ────────────────────────────────────────────────────

  const addDepartment = (name) => {
    if (!name.trim()) return;
    setDepartments((prev) => [...prev, { tempId: Date.now(), name: name.trim(), positions: [] }]);
  };

  const removeDepartment = (tempId) =>
    setDepartments((prev) => prev.filter((d) => d.tempId !== tempId));

  const addPosition = (deptTempId, title) => {
    if (!title.trim()) return;
    setDepartments((prev) =>
      prev.map((d) =>
        d.tempId === deptTempId
          ? { ...d, positions: [...d.positions, { tempId: Date.now(), title: title.trim() }] }
          : d
      )
    );
  };

  const removePosition = (deptTempId, posTempId) =>
    setDepartments((prev) =>
      prev.map((d) =>
        d.tempId === deptTempId
          ? { ...d, positions: d.positions.filter((p) => p.tempId !== posTempId) }
          : d
      )
    );

  // ── Position-requirement helpers ──────────────────────────────────────────

  const allNewPositions = departments.flatMap((d) =>
    d.positions.map((p) => ({ ...p, deptTempId: d.tempId, deptName: d.name }))
  );

  const getReqCount = (shiftId, posTempId) =>
    positionRequirements.find((r) => r.shiftId === shiftId && r.posTempId === posTempId)?.count ?? 0;

  const setReqCount = (shiftId, posTempId, count) => {
    setPositionRequirements((prev) => {
      const exists = prev.some((r) => r.shiftId === shiftId && r.posTempId === posTempId);
      if (count === 0) return prev.filter((r) => !(r.shiftId === shiftId && r.posTempId === posTempId));
      if (exists) return prev.map((r) => r.shiftId === shiftId && r.posTempId === posTempId ? { ...r, count } : r);
      return [...prev, { shiftId, posTempId, count }];
    });
  };

  // ── CSV template download ─────────────────────────────────────────────────

  const handleDownloadCsvTemplate = () => {
    const rows = [
      ["FirstName", "LastName", "Email", "Phone", "Position", "Department"],
      ["John", "Doe", "john.doe@example.com", "+1234567890", "Nurse", "General"],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async (onSaved) => {
    if (!config) return;
    setSaving(true);
    try {
      // 1. Create departments + positions, collect real IDs
      const posIdMap = {}; // posTempId → real Guid from DB
      for (const dept of departments) {
        const { data } = await api.post("/Department/CreateDepartment", JSON.stringify(dept.name), {
          headers: { "Content-Type": "application/json" },
        });
        const deptId = data.id;
        for (const pos of dept.positions) {
          await api.post("/Department/CreatePosition", {
            departmentId: deptId,
            title: pos.title,
          });
          // We don't get position IDs back — resolve after save via GetPositions
        }
      }

      // 2. Save rotation patterns
      for (const rot of rotations) {
        await api.post("/Shift/SaveRotationPattern", {
          id: null,
          name: rot.name,
          daysOn: rot.daysOn,
          daysOff: rot.daysOff,
          isGlobal: rot.isGlobal ?? false,
        });
      }

      // 3. Build day schedules for all weekdays (+ weekends if enabled)
      const dayRange = weekendsWorking ? [0, 1, 2, 3, 4, 5, 6] : WEEKDAY_INDICES;
      const daySchedules = [];
      activeShifts.forEach((shift) => {
        const h = shiftHours[shift.id] ?? { start: shift.defaultStartTime, end: shift.defaultEndTime };
        dayRange.forEach((d) => {
          daySchedules.push({ shiftId: shift.id, dayOfWeek: d, startTime: h.start, endTime: h.end });
        });
      });

      // 4. Fetch fresh positions to map tempIds → real IDs for requirements
      let freshPositions = [];
      if (allNewPositions.length > 0) {
        try {
          const depts = await api.get("/Department/GetDepartmentsForSelect");
          for (const dept of depts.data) {
            const posRes = await api.get(`/Department/GetPositionsForSelectByDepartment?departmentId=${dept.value}`);
            freshPositions.push(...(posRes.data ?? []).map((p) => ({ id: p.value, title: p.label })));
          }
        } catch { /* positions will just be empty */ }
      }

      // Match requirements to real position IDs by title
      const builtReqs = positionRequirements
        .filter((r) => r.count > 0)
        .map((r) => {
          const posDef = allNewPositions.find((p) => p.tempId === r.posTempId);
          if (!posDef) return null;
          const real = freshPositions.find((p) => p.title === posDef.title);
          if (!real) return null;
          return { shiftId: r.shiftId, positionId: real.id, positionTitle: real.title, requiredCount: r.count };
        })
        .filter(Boolean);

      // 5. Save full config
      await api.post("/Shift/SaveConfig", {
        weekEndsWorking: weekendsWorking,
        considerWeeklyHours,
        shifts: config.shifts.map((s) => ({ id: s.id, isActive: activeShiftIds.has(s.id) })),
        daySchedules,
        positionRequirements: builtReqs,
        dayPositionRequirementOverrides: [],
      });

      localStorage.setItem("onboarding_completed", "1");
      toast.success("Setup complete! Your workspace is ready.");
      onContinue?.();
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? "Setup failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [config, departments, rotations, activeShifts, shiftHours, weekendsWorking,
    considerWeeklyHours, activeShiftIds, positionRequirements, allNewPositions, onContinue]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl">
          <svg className="w-6 h-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        {currentStep !== "welcome" && currentStep !== "done" && (
          <div className="px-6 pt-5 pb-0 shrink-0">
            <div className="flex items-center gap-1.5">
              {progressSteps.map((s, i) => {
                const stepPosition = progressSteps.indexOf(STEPS[stepIdx]) ;
                const done = i < stepIdx - 1;
                const active = s.id === currentStep;
                return (
                  <div key={s.id} className="flex items-center gap-1.5 flex-1">
                    <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${done || active ? "bg-[#007AFF]" : "bg-[#e5e5ea]"}`} />
                    {i < progressSteps.length - 1 && null}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1.5">
              Step {stepIdx} of {STEPS.length - 2}
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="p-6 space-y-5"
            >

              {/* ── Welcome ───────────────────────────────────────────── */}
              {currentStep === "welcome" && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-12 h-12 flex items-center justify-center mx-auto">
                    <img src={favicon} alt="Iwos" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="mb-12">
                    <h1 className="text-[26px] font-bold tracking-tight text-[#1d1d1f]">Welcome to Iwos</h1>
                    <p className="text-[15px] text-[#6e6e73] mt-2 max-w-md mx-auto leading-relaxed">
                      Let's get your workspace set up in a few quick steps. You'll define your shifts, schedule rules, positions, and rotation patterns.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
                    {[
                      { icon: Clock,    label: "Shift configuration" },
                      { icon: Calendar, label: "Schedule rules" },
                      { icon: Briefcase,label: "Positions & departments" },
                      { icon: Repeat,   label: "Rotation patterns" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 bg-[#F2F2F7] rounded-xl px-3 py-2.5">
                        <Icon className="w-4 h-4 text-[#007AFF] shrink-0" />
                        <span className="text-[13px] font-medium text-[#1d1d1f]">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-[#aeaeb2]">Everything can be changed later in Settings</p>
                </div>
              )}

              {/* ── Step 1: Active shifts ──────────────────────────────── */}
              {currentStep === "shifts" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Which shifts does your organisation use?</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">Select all that apply. At least one must remain active.</p>
                  </div>
                  <div className="space-y-2">
                    {config?.shifts.map((shift) => {
                      const Icon = SHIFT_ICONS[shift.iconName] ?? Sun;
                      const colors = SHIFT_COLORS[shift.label] ?? fallbackColors;
                      const active = activeShiftIds.has(shift.id);
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => toggleShift(shift.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                            active
                              ? "border-[#007AFF] bg-blue-50/50 shadow-sm"
                              : "border-[#e5e5ea] bg-white hover:border-[#c7c7cc]"
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${active ? "bg-[#007AFF]" : colors.bg}`}>
                            <Icon className={`w-5 h-5 ${active ? "text-white" : colors.icon}`} />
                          </div>
                          <div className="flex-1">
                            <p className={`text-[15px] font-semibold ${active ? "text-[#007AFF]" : "text-[#1d1d1f]"}`}>{shift.label} Shift</p>
                            <p className="text-[12px] text-[#8e8e93]">{shift.defaultStartTime} – {shift.defaultEndTime}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${active ? "bg-[#007AFF] border-[#007AFF]" : "border-[#c7c7cc]"}`}>
                            {active && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 2: Shift hours ────────────────────────────────── */}
              {currentStep === "hours" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Set default hours for each shift</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">These apply to all working days. You can fine-tune per day in Shift Configuration.</p>
                  </div>
                  <div className="space-y-3">
                    {activeShifts.map((shift) => {
                      const Icon = SHIFT_ICONS[shift.iconName] ?? Sun;
                      const colors = SHIFT_COLORS[shift.label] ?? fallbackColors;
                      const h = shiftHours[shift.id] ?? { start: shift.defaultStartTime, end: shift.defaultEndTime };
                      return (
                        <div key={shift.id} className="bg-white border border-[#e5e5ea] rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg}`}>
                              <Icon className={`w-4.5 h-4.5 ${colors.icon}`} />
                            </div>
                            <span className="text-[15px] font-semibold text-[#1d1d1f]">{shift.label} Shift</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-[11px] text-[#8e8e93] font-medium uppercase tracking-wide">Start</label>
                              <input
                                type="time"
                                value={h.start}
                                onChange={(e) => setShiftHours((prev) => ({ ...prev, [shift.id]: { ...h, start: e.target.value } }))}
                                className="mt-1 w-full px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] focus:ring-2 focus:ring-blue-500/40 outline-none border-0"
                              />
                            </div>
                            <span className="text-[#c7c7cc] mt-5">–</span>
                            <div className="flex-1">
                              <label className="text-[11px] text-[#8e8e93] font-medium uppercase tracking-wide">End</label>
                              <input
                                type="time"
                                value={h.end}
                                onChange={(e) => setShiftHours((prev) => ({ ...prev, [shift.id]: { ...h, end: e.target.value } }))}
                                className="mt-1 w-full px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] focus:ring-2 focus:ring-blue-500/40 outline-none border-0"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Step 3: Schedule rules ─────────────────────────────── */}
              {currentStep === "rules" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Schedule rules</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">These can be changed at any time in Shift Configuration.</p>
                  </div>
                  <div className="bg-white border border-[#e5e5ea] rounded-2xl divide-y divide-[#f2f2f7]">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#1d1d1f]">Weekend Working Days</p>
                          <p className="text-[12px] text-[#8e8e93]">
                            {weekendsWorking ? "Saturday and Sunday have scheduled shifts" : "Saturday and Sunday are non-working days"}
                          </p>
                        </div>
                      </div>
                      <Toggle enabled={weekendsWorking} onToggle={() => setWeekendsWorking((v) => !v)} />
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-[#1d1d1f]">Weekly Hours Cap</p>
                          <p className="text-[12px] text-[#8e8e93]">
                            {considerWeeklyHours ? "Scheduler respects each employee's contracted weekly hours" : "Shifts distributed equally, ignoring hour caps"}
                          </p>
                        </div>
                      </div>
                      <Toggle enabled={considerWeeklyHours} onToggle={() => setConsiderWeeklyHours((v) => !v)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Departments & positions ───────────────────── */}
              {currentStep === "departments" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Departments & positions</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">Optional — add departments and define positions within them. You can skip and configure later.</p>
                  </div>

                  {departments.length === 0 && (
                    <div className="bg-[#F2F2F7] rounded-2xl py-8 text-center">
                      <Building2 className="w-10 h-10 text-[#aeaeb2] mx-auto mb-2" />
                      <p className="text-[14px] font-medium text-[#3c3c43]">No departments yet</p>
                      <p className="text-[12px] text-[#8e8e93] mt-0.5">Add one below or use the "General" suggestion</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {departments.map((dept) => (
                      <DepartmentCard
                        key={dept.tempId}
                        dept={dept}
                        onRemove={() => removeDepartment(dept.tempId)}
                        onAddPosition={(title) => addPosition(dept.tempId, title)}
                        onRemovePosition={(posTempId) => removePosition(dept.tempId, posTempId)}
                      />
                    ))}
                  </div>

                  <AddDepartmentRow onAdd={addDepartment} />

                  {departments.length === 0 && (
                    <button
                      type="button"
                      onClick={() => addDepartment("General")}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-[#007AFF]/40 text-[#007AFF] text-[13px] font-medium hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add "General" department
                    </button>
                  )}
                </div>
              )}

              {/* ── Step 5: Position requirements ─────────────────────── */}
              {currentStep === "requirements" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Position requirements per shift</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">
                      {allNewPositions.length === 0
                        ? "No positions were created. You can skip this step and configure requirements later."
                        : "How many employees of each position are required per shift?"}
                    </p>
                  </div>

                  {allNewPositions.length === 0 ? (
                    <div className="bg-[#F2F2F7] rounded-2xl py-8 text-center">
                      <Briefcase className="w-10 h-10 text-[#aeaeb2] mx-auto mb-2" />
                      <p className="text-[13px] text-[#8e8e93]">No positions to configure — click Next to continue</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeShifts.map((shift) => {
                        const Icon = SHIFT_ICONS[shift.iconName] ?? Sun;
                        const colors = SHIFT_COLORS[shift.label] ?? fallbackColors;
                        return (
                          <div key={shift.id} className="bg-white border border-[#e5e5ea] rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#F9F9F9] border-b border-[#f2f2f7]">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
                              </div>
                              <span className="text-[14px] font-semibold text-[#1d1d1f]">{shift.label} Shift</span>
                            </div>
                            <div className="divide-y divide-[#f2f2f7]">
                              {allNewPositions.map((pos) => {
                                const count = getReqCount(shift.id, pos.tempId);
                                return (
                                  <div key={pos.tempId} className="flex items-center gap-3 px-4 py-3">
                                    <Briefcase className="w-3.5 h-3.5 text-[#aeaeb2] shrink-0" />
                                    <span className="text-[13px] text-[#1d1d1f] flex-1 truncate">
                                      {pos.title}
                                      <span className="text-[#8e8e93] ml-1 text-[11px]">· {pos.deptName}</span>
                                    </span>
                                    <div className="flex items-center bg-[#F2F2F7] rounded-xl overflow-hidden shrink-0">
                                      <button type="button" onClick={() => setReqCount(shift.id, pos.tempId, Math.max(0, count - 1))}
                                        disabled={count === 0}
                                        className="px-2.5 py-1.5 hover:bg-[#e5e5ea] transition-colors cursor-pointer disabled:opacity-30">
                                        <Minus className="w-3 h-3 text-[#3c3c43]" />
                                      </button>
                                      <span className="w-7 text-center text-[13px] font-semibold text-[#1d1d1f]">{count}</span>
                                      <button type="button" onClick={() => setReqCount(shift.id, pos.tempId, count + 1)}
                                        className="px-2.5 py-1.5 hover:bg-[#e5e5ea] transition-colors cursor-pointer">
                                        <Plus className="w-3 h-3 text-[#3c3c43]" />
                                      </button>
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
              )}

              {/* ── Step 6: Rotations ──────────────────────────────────── */}
              {currentStep === "rotations" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Rotation patterns</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">Optional — define templates like "6 on / 2 off". Assign them to employees later.</p>
                  </div>

                  {rotations.length > 0 && (
                    <div className="bg-white border border-[#e5e5ea] rounded-2xl divide-y divide-[#f2f2f7]">
                      {rotations.map((rot, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <Repeat className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{rot.name}</p>
                              {rot.isGlobal && (
                                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[#8e8e93]">{rot.daysOn} on / {rot.daysOff} off — {rot.daysOn + rot.daysOff}-day cycle</p>
                          </div>
                          <button type="button" onClick={() => setRotations((prev) => prev.filter((_, j) => j !== i))}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#aeaeb2] hover:text-red-500 transition-colors cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white border border-[#e5e5ea] rounded-2xl p-4 space-y-3">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Add a pattern</p>
                    <input
                      type="text"
                      value={newRotName}
                      onChange={(e) => setNewRotName(e.target.value)}
                      placeholder="Pattern name (e.g. 6/2)"
                      className="w-full px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8e8e93] uppercase tracking-wide font-medium">Days on</label>
                        <input type="number" min="1" max="30" value={newRotOn} onChange={(e) => setNewRotOn(Number(e.target.value))}
                          className="mt-1 w-full px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-blue-500/40" />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#8e8e93] uppercase tracking-wide font-medium">Days off</label>
                        <input type="number" min="1" max="30" value={newRotOff} onChange={(e) => setNewRotOff(Number(e.target.value))}
                          className="mt-1 w-full px-3 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-blue-500/40" />
                      </div>
                    </div>
                    <p className="text-[12px] text-[#8e8e93]">Cycle length: {(Number(newRotOn) || 0) + (Number(newRotOff) || 0)} days</p>

                    {/* Default for new employees toggle */}
                    <button
                      type="button"
                      onClick={() => setNewRotGlobal((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-[#F2F2F7] rounded-xl transition-colors hover:bg-[#e5e5ea] cursor-pointer"
                    >
                      <div className="text-left">
                        <p className="text-[13px] font-medium text-[#1d1d1f]">Default for new employees</p>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5">Auto-assign this pattern when a new employee is created</p>
                      </div>
                      <Toggle enabled={newRotGlobal} onToggle={() => {}} />
                    </button>

                    <button
                      type="button"
                      disabled={!newRotName.trim()}
                      onClick={() => {
                        if (!newRotName.trim()) return;
                        // Ensure only one global pattern
                        const global = newRotGlobal;
                        setRotations((prev) => [
                          ...prev.map((r) => global ? { ...r, isGlobal: false } : r),
                          { name: newRotName.trim(), daysOn: Number(newRotOn), daysOff: Number(newRotOff), isGlobal: global },
                        ]);
                        setNewRotName(""); setNewRotOn(6); setNewRotOff(2); setNewRotGlobal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white text-[13px] font-medium rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add pattern
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 7: Constraints ────────────────────────────────── */}
              {currentStep === "constraints" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Scheduling constraints</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">These rules govern the automatic scheduler. Hard constraints can never be bypassed.</p>
                  </div>
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-blue-700">This is for your awareness only — constraints are pre-configured and cannot be changed here.</p>
                  </div>
                  {[
                    { label: "Hard", items: constraints.filter((c) => c.severity === "Hard"), icon: ShieldAlert, iconClass: "text-red-500", bg: "bg-red-50" },
                    { label: "Soft", items: constraints.filter((c) => c.severity === "Soft"), icon: ShieldOff, iconClass: "text-slate-400", bg: "bg-slate-100" },
                  ].map(({ label, items, icon: Icon, iconClass, bg }) => items.length > 0 && (
                    <div key={label}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73] px-1 mb-2">{label} Constraints</p>
                      <div className="bg-white border border-[#e5e5ea] rounded-2xl divide-y divide-[#f2f2f7] overflow-hidden">
                        {items.map((c) => (
                          <ConstraintRow key={c.name} constraint={c} icon={Icon} iconClass={iconClass} bg={bg} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Step 8: Team ──────────────────────────────────────── */}
              {currentStep === "employees" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[20px] font-bold tracking-tight text-[#1d1d1f]">Add your team</h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">
                      Employees must be added before you can plan your first schedule.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEmployeeMode((m) => m === "manual" ? null : "manual")}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        employeeMode === "manual"
                          ? "border-[#007AFF] bg-blue-50/50 shadow-sm"
                          : "border-[#e5e5ea] bg-white hover:border-[#c7c7cc]"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${employeeMode === "manual" ? "bg-[#007AFF]" : "bg-[#F2F2F7]"}`}>
                        <UserPlus className={`w-6 h-6 ${employeeMode === "manual" ? "text-white" : "text-[#8e8e93]"}`} />
                      </div>
                      <div>
                        <p className={`text-[14px] font-semibold ${employeeMode === "manual" ? "text-[#007AFF]" : "text-[#1d1d1f]"}`}>Add manually</p>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5">Create employee profiles one by one</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmployeeMode((m) => m === "csv" ? null : "csv")}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                        employeeMode === "csv"
                          ? "border-[#007AFF] bg-blue-50/50 shadow-sm"
                          : "border-[#e5e5ea] bg-white hover:border-[#c7c7cc]"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${employeeMode === "csv" ? "bg-[#007AFF]" : "bg-[#F2F2F7]"}`}>
                        <FileUp className={`w-6 h-6 ${employeeMode === "csv" ? "text-white" : "text-[#8e8e93]"}`} />
                      </div>
                      <div>
                        <p className={`text-[14px] font-semibold ${employeeMode === "csv" ? "text-[#007AFF]" : "text-[#1d1d1f]"}`}>Import CSV</p>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5">Bulk import from a spreadsheet</p>
                      </div>
                    </button>
                  </div>

                  {employeeMode === "csv" && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] text-blue-700 font-medium">CSV import coming soon</p>
                        <p className="text-[12px] text-blue-600 mt-0.5">
                          Prepare your data using the template — you'll be able to import it from the Employees page.{" "}
                          <button type="button" onClick={handleDownloadCsvTemplate} className="underline cursor-pointer font-medium">
                            Download template
                          </button>
                        </p>
                      </div>
                    </div>
                  )}

                  {!employeeMode && (
                    <p className="text-center text-[12px] text-[#aeaeb2]">You can also skip and add employees later from the Employees page.</p>
                  )}
                </div>
              )}

              {/* ── Done ──────────────────────────────────────────────── */}
              {currentStep === "done" && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-20 h-20 rounded-full bg-[#34C759] flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-[24px] font-bold tracking-tight text-[#1d1d1f]">You're all set!</h1>
                    <p className="text-[15px] text-[#6e6e73] mt-2 max-w-sm mx-auto">
                      Your workspace is configured. Add your team to start planning schedules.
                    </p>
                  </div>
                  <div className="bg-[#F2F2F7] rounded-2xl p-4 text-left max-w-sm mx-auto space-y-2">
                    <SummaryRow icon={Clock}     label="Active shifts" value={`${activeShiftIds.size} shift${activeShiftIds.size !== 1 ? "s" : ""}`} />
                    <SummaryRow icon={Building2} label="Departments"   value={departments.length > 0 ? `${departments.length} created` : "Skipped"} />
                    <SummaryRow icon={Repeat}    label="Rotations"     value={rotations.length > 0 ? `${rotations.length} pattern${rotations.length !== 1 ? "s" : ""}` : "Skipped"} />
                    <SummaryRow icon={Users}     label="Employees"     value={employeeMode === "manual" ? "Adding manually" : employeeMode === "csv" ? "Via CSV import" : "Add after setup"} />
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-6 py-4 border-t border-[#f2f2f7] flex items-center justify-between gap-3">
          {currentStep === "welcome" ? (
            <>
              <button type="button" onClick={onClose} className="text-[14px] text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer">
                Skip setup
              </button>
              <button type="button" onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white text-[14px] font-semibold rounded-xl hover:bg-blue-600 transition-colors cursor-pointer">
                Get started <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : currentStep === "employees" ? (
            <>
              <button type="button" onClick={goBack}
                className="flex items-center gap-1.5 text-[14px] text-[#3c3c43] hover:text-[#1d1d1f] transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={goNext} className="text-[13px] text-[#8e8e93] hover:text-[#3c3c43] transition-colors cursor-pointer px-2">
                  Skip
                </button>
                <button
                  type="button"
                  disabled={!employeeMode || saving}
                  onClick={() => {
                    if (employeeMode === "manual") handleComplete(() => navigate("/employee/new"));
                    else if (employeeMode === "csv") handleComplete(() => navigate("/employees"));
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white text-[14px] font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {saving ? "Saving…" : employeeMode === "manual" ? "Add employees" : "Continue"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : currentStep === "done" ? (
            <button type="button" onClick={() => handleComplete()} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#34C759] text-white text-[15px] font-semibold rounded-2xl hover:bg-emerald-500 disabled:opacity-60 transition-colors cursor-pointer">
              {saving ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg> Saving…</>
              ) : (
                <><Check className="w-4 h-4" /> Complete setup</>
              )}
            </button>
          ) : (
            <>
              <button type="button" onClick={goBack}
                className="flex items-center gap-1.5 text-[14px] text-[#3c3c43] hover:text-[#1d1d1f] transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex items-center gap-2">
                {(currentStep === "departments" || currentStep === "requirements" || currentStep === "rotations" || currentStep === "constraints") && (
                  <button type="button" onClick={goNext} className="text-[13px] text-[#8e8e93] hover:text-[#3c3c43] transition-colors cursor-pointer px-2">
                    Skip
                  </button>
                )}
                <button type="button"
                  disabled={currentStep === "shifts" && activeShiftIds.size === 0}
                  onClick={goNext}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white text-[14px] font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CONSTRAINT_META = {
  Absence:         { label: "Absence",         description: "Blocks assignment when the employee has an approved absence on the target date." },
  ConsecutiveHours:{ label: "Consecutive Hours",description: "Prevents exceeding 48 consecutive working hours (≈ 6 × 8 h shifts) without a day off." },
  RestPeriod:      { label: "Rest Period",      description: "Enforces a minimum 12-hour rest gap between the end of one shift and the start of the next." },
  Rotation:        { label: "Rotation Pattern", description: "Restricts assignment to days within the employee's working block defined by their rotation pattern." },
  Overtime:        { label: "Overtime / Weekly Cap", description: "Prevents the employee from exceeding their contracted weekly hours." },
  PinnedShift:     { label: "Pinned Shift",     description: "Blocks assignment to any shift other than the one the employee is pinned to." },
  ShiftVariety:    { label: "Shift Variety",    description: "Adds a soft penalty when an employee would work the same shift three or more consecutive days." },
};

function ConstraintRow({ constraint: c, icon: Icon, iconClass, bg }) {
  const meta = CONSTRAINT_META[c.name] ?? { label: c.name, description: "" };
  const isHard = c.severity === "Hard";
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1d1d1f]">{meta.label}</p>
        <p className="text-[12px] text-[#8e8e93] mt-0.5 leading-relaxed">{meta.description}</p>
      </div>
      {isHard && (
        <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${c.isUserOverridable ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
          {c.isUserOverridable ? <><ShieldCheck className="w-3 h-3" /> Overridable</> : <><ShieldAlert className="w-3 h-3" /> Blocking</>}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[13px] text-[#3c3c43]">
        <Icon className="w-3.5 h-3.5 text-[#8e8e93]" />
        {label}
      </div>
      <span className="text-[13px] font-medium text-[#1d1d1f]">{value}</span>
    </div>
  );
}

function DepartmentCard({ dept, onRemove, onAddPosition, onRemovePosition }) {
  const [newTitle, setNewTitle] = useState("");
  return (
    <div className="bg-white border border-[#e5e5ea] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F9F9F9] border-b border-[#f2f2f7]">
        <Building2 className="w-4 h-4 text-[#007AFF] shrink-0" />
        <span className="text-[14px] font-semibold text-[#1d1d1f] flex-1">{dept.name}</span>
        <button type="button" onClick={onRemove} className="p-1 rounded-lg hover:bg-red-50 text-[#aeaeb2] hover:text-red-500 transition-colors cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {dept.positions.map((pos) => (
        <div key={pos.tempId} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f2f2f7]">
          <Briefcase className="w-3.5 h-3.5 text-[#aeaeb2] shrink-0" />
          <span className="text-[13px] text-[#1d1d1f] flex-1">{pos.title}</span>
          <button type="button" onClick={() => onRemovePosition(pos.tempId)} className="p-1 rounded hover:text-red-500 text-[#c7c7cc] cursor-pointer transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 px-4 py-2.5">
        <Plus className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) { onAddPosition(newTitle); setNewTitle(""); } }}
          placeholder="Add position… (Enter to add)"
          className="flex-1 text-[13px] text-[#1d1d1f] bg-transparent outline-none placeholder:text-[#aeaeb2]"
        />
        {newTitle.trim() && (
          <button type="button" onClick={() => { onAddPosition(newTitle); setNewTitle(""); }}
            className="text-[#007AFF] text-[12px] font-medium cursor-pointer hover:text-blue-700">
            Add
          </button>
        )}
      </div>
    </div>
  );
}

function AddDepartmentRow({ onAdd }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-2xl px-4 py-3">
      <Building2 className="w-4 h-4 text-[#007AFF] shrink-0" />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onAdd(name); setName(""); } }}
        placeholder="New department name… (Enter to add)"
        className="flex-1 text-[13px] text-[#1d1d1f] bg-transparent outline-none placeholder:text-[#aeaeb2]"
      />
      {name.trim() && (
        <button type="button" onClick={() => { onAdd(name); setName(""); }}
          className="text-[#007AFF] text-[12px] font-medium cursor-pointer hover:text-blue-700">
          Add
        </button>
      )}
    </div>
  );
}
