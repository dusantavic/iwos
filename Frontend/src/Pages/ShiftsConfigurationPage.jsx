import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sun, Moon, Star, ChevronLeft, Save, Plus, Minus, Clock, Users, Calendar, X, Briefcase, Repeat, Pencil, Trash2,
  ShieldAlert, ShieldCheck, ShieldOff, Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import {
  buildLocalConfig, WEEKDAY_INDICES, WEEKEND_INDICES, DAY_LABELS, getPositionRequirements,
} from "../utils/shiftConfig";

const SHIFT_ICONS = { Sun, Moon, Star };

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer shrink-0 ${
        enabled ? "bg-[#34C759]" : "bg-[#e5e5ea]"
      }`}
    >
      <span
        className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          enabled ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export default function ShiftsConfigurationPage() {
  const [config, setConfig] = useState(null); // local config shape
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("shifts");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [positions, setPositions] = useState([]); // { id, title }[]

  useEffect(() => {
    Promise.all([
      api.get("/Shift/GetConfig"),
      api.get("/Shift/GetPositions"),
    ])
      .then(([configRes, posRes]) => {
        setConfig(buildLocalConfig(configRes.data));
        setPositions(posRes.data);
      })
      .catch(() => toast.error("Failed to load shift configuration."))
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = (updater) => {
    setConfig((prev) => (typeof updater === "function" ? updater(prev) : updater));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      // Build API payload from local config
      const daySchedules = [];
      for (let d = 0; d < 7; d++) {
        config.shifts.forEach((shift) => {
          const dayShift = config.days[d]?.shifts[shift.id];
          if (dayShift) {
            daySchedules.push({
              shiftId: shift.id,
              dayOfWeek: d,
              startTime: dayShift.start,
              endTime: dayShift.end,
            });
          }
        });
      }

      await api.post("/Shift/SaveConfig", {
        weekEndsWorking: config.weekendsWorking,
        considerWeeklyHours: config.considerWeeklyHours,
        shifts: config.shifts.map((s) => ({ id: s.id, isActive: s.isActive })),
        daySchedules,
        positionRequirements: (config.positionRequirements ?? []).filter((r) => r.requiredCount > 0),
        dayPositionRequirementOverrides: config.dayPositionRequirementOverrides ?? [],
      });

      setHasChanges(false);
      toast.success("Configuration saved.");
    } catch {
      toast.error("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const toggleShift = (shiftId) => {
    updateConfig((prev) => {
      const shift = prev.shifts.find((s) => s.id === shiftId);
      if (!shift) return prev;
      const activeCount = prev.shifts.filter((s) => s.isActive).length;
      if (shift.isActive && activeCount <= 1) {
        toast.error("At least one shift must remain enabled.");
        return prev;
      }
      return {
        ...prev,
        shifts: prev.shifts.map((s) =>
          s.id === shiftId ? { ...s, isActive: !s.isActive } : s
        ),
      };
    });
  };

  const toggleWeekendsWorking = () =>
    updateConfig((prev) => ({ ...prev, weekendsWorking: !prev.weekendsWorking }));

  const toggleConsiderWeeklyHours = () =>
    updateConfig((prev) => ({ ...prev, considerWeeklyHours: !prev.considerWeeklyHours }));

  const updateDayShift = (dayIndex, shiftId, field, value) => {
    updateConfig((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [dayIndex]: {
          ...prev.days[dayIndex],
          shifts: {
            ...prev.days[dayIndex].shifts,
            [shiftId]: { ...prev.days[dayIndex].shifts[shiftId], [field]: value },
          },
        },
      },
    }));
  };

  const applyDayToTargets = (sourceDay, targetDays) => {
    updateConfig((prev) => {
      const sourceDayData = prev.days[sourceDay];
      const sourceOverrides = (prev.dayPositionRequirementOverrides ?? []).filter(
        (o) => o.dayOfWeek === sourceDay
      );

      const next = { ...prev, days: { ...prev.days } };
      targetDays.forEach((d) => {
        if (d === sourceDay) return;
        next.days[d] = JSON.parse(JSON.stringify(sourceDayData));
      });

      // Replace overrides for all target days with copies from source day
      const kept = (prev.dayPositionRequirementOverrides ?? []).filter(
        (o) => !targetDays.includes(o.dayOfWeek) || o.dayOfWeek === sourceDay
      );
      const copied = targetDays
        .filter((d) => d !== sourceDay)
        .flatMap((d) => sourceOverrides.map((o) => ({ ...o, dayOfWeek: d })));

      next.dayPositionRequirementOverrides = [...kept, ...copied];
      return next;
    });
  };

  const applyToAllWeekdays = (sourceDay) => {
    applyDayToTargets(sourceDay, WEEKDAY_INDICES);
    toast.success("Applied to all weekdays.");
  };

  const applyToWeekend = (sourceDay) => {
    applyDayToTargets(sourceDay, WEEKEND_INDICES);
    toast.success("Applied to both weekend days.");
  };

  const addPositionRequirement = (shiftId, positionId) => {
    if (!positionId) return;
    updateConfig((prev) => {
      const reqs = prev.positionRequirements ?? [];
      if (reqs.some((r) => r.shiftId === shiftId && r.positionId === positionId)) return prev;
      const pos = positions.find((p) => p.id === positionId);
      return {
        ...prev,
        positionRequirements: [
          ...reqs,
          { shiftId, positionId, positionTitle: pos?.title ?? "", requiredCount: 1 },
        ],
      };
    });
  };

  const updatePositionRequirement = (shiftId, positionId, requiredCount) => {
    updateConfig((prev) => ({
      ...prev,
      positionRequirements: (prev.positionRequirements ?? []).map((r) =>
        r.shiftId === shiftId && r.positionId === positionId
          ? { ...r, requiredCount: Math.max(1, requiredCount) }
          : r
      ),
    }));
  };

  const removePositionRequirement = (shiftId, positionId) => {
    updateConfig((prev) => ({
      ...prev,
      positionRequirements: (prev.positionRequirements ?? []).filter(
        (r) => !(r.shiftId === shiftId && r.positionId === positionId)
      ),
      // Also remove any day overrides for this position
      dayPositionRequirementOverrides: (prev.dayPositionRequirementOverrides ?? []).filter(
        (o) => !(o.shiftId === shiftId && o.positionId === positionId)
      ),
    }));
  };

  const updateDayPositionOverride = (dayOfWeek, shiftId, positionId, requiredCount) => {
    updateConfig((prev) => {
      const overrides = prev.dayPositionRequirementOverrides ?? [];
      const exists = overrides.some(
        (o) => o.shiftId === shiftId && o.dayOfWeek === dayOfWeek && o.positionId === positionId
      );
      if (exists) {
        return {
          ...prev,
          dayPositionRequirementOverrides: overrides.map((o) =>
            o.shiftId === shiftId && o.dayOfWeek === dayOfWeek && o.positionId === positionId
              ? { ...o, requiredCount: Math.max(0, requiredCount) }
              : o
          ),
        };
      }
      return {
        ...prev,
        dayPositionRequirementOverrides: [
          ...overrides,
          { shiftId, dayOfWeek, positionId, requiredCount: Math.max(0, requiredCount) },
        ],
      };
    });
  };

  const removeDayPositionOverride = (dayOfWeek, shiftId, positionId) => {
    updateConfig((prev) => ({
      ...prev,
      dayPositionRequirementOverrides: (prev.dayPositionRequirementOverrides ?? []).filter(
        (o) => !(o.shiftId === shiftId && o.dayOfWeek === dayOfWeek && o.positionId === positionId)
      ),
    }));
  };

  const tabs = [
    { id: "shifts", label: "Shifts & Rules", icon: Clock },
    { id: "weekdays", label: "Weekdays", icon: Calendar },
    { id: "weekends", label: "Weekends", icon: Calendar },
    { id: "rotations", label: "Rotations", icon: Repeat },
    { id: "constraints", label: "Constraints", icon: ShieldAlert },
  ];

  if (loading) {
    return (
      <div className="max-w-[860px] space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!config) return null;

  const activeShifts = config.shifts.filter((s) => s.isActive);

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      <div className="space-y-5">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/shifts" className="p-2 hover:bg-black/[0.05] rounded-xl transition-colors">
              <ChevronLeft className="w-4.5 h-4.5 text-[#3c3c43]" />
            </Link>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
                Shift Configuration
              </h1>
              <p className="text-[13px] text-[#6e6e73] mt-0.5">
                Configure shift types, hours, and minimum staffing levels.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
              hasChanges && !saving
                ? "bg-[#007AFF] text-white hover:bg-blue-600 shadow-sm cursor-pointer"
                : "bg-[#e5e5ea] text-[#aeaeb2] cursor-not-allowed"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </header>

        {/* Tabs */}
        <div className="bg-[#e5e5ea] rounded-xl p-1 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-[#3c3c43] hover:text-[#1d1d1f]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Shifts & Rules */}
        {activeTab === "shifts" && (
          <motion.div key="shifts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
            <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider px-1">Active Shifts</p>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-black/[0.04] overflow-hidden">
              {config.shifts.map((shift) => {
                const enabled = shift.isActive;
                const Icon = SHIFT_ICONS[shift.iconName] ?? Sun;
                return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between px-5 py-4 transition-colors ${!enabled ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${enabled ? shift.color : "bg-[#F2F2F7]"}`}>
                        <Icon className={`w-4 h-4 ${enabled ? shift.headerColor : "text-[#aeaeb2]"}`} />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1d1d1f]">{shift.label} Shift</p>
                        <p className="text-[12px] text-[#8e8e93]">
                          Default {shift.defaultStartTime} – {shift.defaultEndTime}
                        </p>
                      </div>
                    </div>
                    <Toggle enabled={enabled} onToggle={() => toggleShift(shift.id)} />
                  </div>
                );
              })}
            </div>

            <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider px-1 pt-2">Schedule Rules</p>

            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-black/[0.04] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">Weekend Working Days</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {config.weekendsWorking
                        ? "Saturday and Sunday have scheduled shifts"
                        : "Saturday and Sunday are non-working days"}
                    </p>
                  </div>
                </div>
                <Toggle enabled={config.weekendsWorking} onToggle={toggleWeekendsWorking} />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">Weekly Hours Cap</p>
                    <p className="text-[12px] text-[#8e8e93]">
                      {config.considerWeeklyHours
                        ? "Scheduler respects each employee's contracted weekly hours"
                        : "Scheduler distributes shifts equally, ignoring hour caps"}
                    </p>
                  </div>
                </div>
                <Toggle enabled={config.considerWeeklyHours} onToggle={toggleConsiderWeeklyHours} />
              </div>
            </div>

            <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider px-1 pt-2">
              Position Requirements per Shift
            </p>
            <p className="text-[12px] text-[#8e8e93] px-1 -mt-1">
              Define how many employees of each position are required. These apply to every day the shift runs.
            </p>

            <div className="space-y-3">
              {activeShifts.map((shift) => {
                const Icon = SHIFT_ICONS[shift.iconName] ?? Sun;
                const shiftReqs = (config.positionRequirements ?? []).filter(
                  (r) => r.shiftId === shift.id
                );
                const usedPositionIds = shiftReqs.map((r) => r.positionId);
                const availablePositions = positions.filter(
                  (p) => !usedPositionIds.includes(p.id)
                );

                return (
                  <div
                    key={shift.id}
                    className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
                  >
                    {/* Shift header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.04]">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${shift.color}`}>
                        <Icon className={`w-3.5 h-3.5 ${shift.headerColor}`} />
                      </div>
                      <span className="text-[14px] font-semibold text-[#1d1d1f]">
                        {shift.label} Shift
                      </span>
                      {shiftReqs.length === 0 && (
                        <span className="text-[12px] text-[#aeaeb2] ml-1">No requirements set</span>
                      )}
                    </div>

                    {/* Existing requirements */}
                    {shiftReqs.length > 0 && (
                      <div className="divide-y divide-black/[0.03]">
                        {shiftReqs.map((req) => (
                          <div
                            key={req.positionId}
                            className="flex items-center gap-3 px-5 py-3"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-[#aeaeb2] shrink-0" />
                            <span className="text-[13px] text-[#1d1d1f] flex-1 truncate">
                              {req.positionTitle}
                            </span>
                            <div className="flex items-center bg-[#F2F2F7] rounded-xl overflow-hidden shrink-0">
                              <button
                                onClick={() =>
                                  updatePositionRequirement(shift.id, req.positionId, req.requiredCount - 1)
                                }
                                className="px-2.5 py-1.5 hover:bg-[#e5e5ea] transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3 text-[#3c3c43]" />
                              </button>
                              <span className="w-7 text-center text-[13px] font-semibold text-[#1d1d1f]">
                                {req.requiredCount}
                              </span>
                              <button
                                onClick={() =>
                                  updatePositionRequirement(shift.id, req.positionId, req.requiredCount + 1)
                                }
                                className="px-2.5 py-1.5 hover:bg-[#e5e5ea] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-[#3c3c43]" />
                              </button>
                            </div>
                            <button
                              onClick={() => removePositionRequirement(shift.id, req.positionId)}
                              className="p-1 rounded-lg hover:bg-red-50 text-[#aeaeb2] hover:text-red-500 transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add requirement */}
                    {availablePositions.length > 0 && (
                      <div className="px-5 py-3 border-t border-black/[0.03] flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addPositionRequirement(shift.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="flex-1 text-[13px] text-[#007AFF] bg-transparent outline-none cursor-pointer"
                        >
                          <option value="" disabled>Add position requirement…</option>
                          {availablePositions.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Weekdays */}
        {activeTab === "weekdays" && (
          <motion.div key="weekdays" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
            <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider px-1">Monday – Friday</p>
            {WEEKDAY_INDICES.map((dayIdx) => (
              <DayConfigCard
                key={dayIdx}
                dayIndex={dayIdx}
                dayLabel={DAY_LABELS[dayIdx]}
                config={config}
                activeShifts={activeShifts}
                onUpdate={updateDayShift}
                onApplyAll={() => applyToAllWeekdays(dayIdx)}
                applyLabel="Apply to all weekdays"
                onUpdateDayPositionOverride={updateDayPositionOverride}
                onRemoveDayPositionOverride={removeDayPositionOverride}
              />
            ))}
          </motion.div>
        )}

        {/* Rotations */}
        {activeTab === "rotations" && (
          <motion.div
            key="rotations"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            <RotationsTab
              patterns={config.rotationPatterns ?? []}
              onChange={(next) =>
                setConfig((prev) => ({ ...prev, rotationPatterns: next }))
              }
            />
          </motion.div>
        )}

        {/* Weekends */}
        {activeTab === "weekends" && (
          <motion.div key="weekends" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
            {!config.weekendsWorking ? (
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-[#aeaeb2]" />
                </div>
                <p className="text-[15px] font-medium text-[#3c3c43]">Weekends are non-working days</p>
                <p className="text-[13px] text-[#8e8e93] mt-1 max-w-[280px] mx-auto">
                  Enable "Weekend Working Days" in Shifts & Rules to configure weekend schedules.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider px-1">Saturday – Sunday</p>
                {WEEKEND_INDICES.map((dayIdx) => (
                  <DayConfigCard
                    key={dayIdx}
                    dayIndex={dayIdx}
                    dayLabel={DAY_LABELS[dayIdx]}
                    config={config}
                    activeShifts={activeShifts}
                    onUpdate={updateDayShift}
                    onApplyAll={() => applyToWeekend(dayIdx)}
                    applyLabel="Apply to both days"
                    onUpdateDayPositionOverride={updateDayPositionOverride}
                    onRemoveDayPositionOverride={removeDayPositionOverride}
                  />
                ))}
              </>
            )}
          </motion.div>
        )}
        {/* Constraints */}
        {activeTab === "constraints" && (
          <motion.div key="constraints" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-3">
            <ConstraintsTab />
          </motion.div>
        )}

      </div>
    </div>
  );
}

function DayConfigCard({
  dayIndex, dayLabel, config, activeShifts,
  onUpdate, onApplyAll, applyLabel,
  onUpdateDayPositionOverride, onRemoveDayPositionOverride,
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.04]">
        <span className="text-[15px] font-semibold text-[#1d1d1f]">{dayLabel}</span>
        <button
          onClick={onApplyAll}
          className="text-[13px] font-medium text-[#007AFF] hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          {applyLabel}
        </button>
      </div>

      <div className="divide-y divide-black/[0.03]">
        {activeShifts.map((shift) => {
          const dayShift = config.days[dayIndex]?.shifts[shift.id] ?? {
            start: shift.defaultStartTime,
            end: shift.defaultEndTime,
          };
          const Icon = { Sun, Moon, Star }[shift.iconName] ?? Sun;
          const posReqs = getPositionRequirements(config, shift.id);

          return (
            <div key={shift.id} className="px-5 py-4 space-y-3">
              {/* Shift label + time row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-[130px]">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${shift.color}`}>
                    <Icon className={`w-3.5 h-3.5 ${shift.headerColor}`} />
                  </div>
                  <span className="text-[14px] font-medium text-[#1d1d1f]">{shift.label}</span>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[12px] text-[#8e8e93] min-w-[32px]">Start</label>
                  <input
                    type="time"
                    value={dayShift.start}
                    onChange={(e) => onUpdate(dayIndex, shift.id, "start", e.target.value)}
                    className="px-3 py-2 bg-[#F2F2F7] border-0 rounded-xl text-[13px] focus:ring-2 focus:ring-blue-500/40 outline-none text-[#1d1d1f] w-[118px]"
                  />
                  <span className="text-[#c7c7cc] mx-0.5">–</span>
                  <label className="text-[12px] text-[#8e8e93] min-w-[24px]">End</label>
                  <input
                    type="time"
                    value={dayShift.end}
                    onChange={(e) => onUpdate(dayIndex, shift.id, "end", e.target.value)}
                    className="px-3 py-2 bg-[#F2F2F7] border-0 rounded-xl text-[13px] focus:ring-2 focus:ring-blue-500/40 outline-none text-[#1d1d1f] w-[118px]"
                  />
                </div>
              </div>

              {/* Per-position day overrides */}
              {posReqs.length > 0 && (
                <div className="ml-[38px] space-y-1.5">
                  {posReqs.map((req) => {
                    const override = (config.dayPositionRequirementOverrides ?? []).find(
                      (o) => o.shiftId === shift.id && o.dayOfWeek === dayIndex && o.positionId === req.positionId
                    );
                    const effectiveCount = override ? override.requiredCount : req.requiredCount;
                    const isOverridden = !!override && override.requiredCount !== req.requiredCount;
                    const isSuppressed = effectiveCount === 0;

                    return (
                      <div key={req.positionId} className={`flex items-center gap-2 ${isSuppressed ? "opacity-50" : ""}`}>
                        <Briefcase className="w-3 h-3 text-[#c7c7cc] shrink-0" />
                        <span className={`text-[12px] flex-1 truncate ${isSuppressed ? "line-through text-[#8e8e93]" : "text-[#3c3c43]"}`}>
                          {req.positionTitle}
                        </span>

                        {isOverridden && !isSuppressed && (
                          <span className="text-[11px] text-[#8e8e93] line-through mr-0.5">{req.requiredCount}</span>
                        )}

                        <div className={`flex items-center rounded-lg overflow-hidden shrink-0 ${
                          isSuppressed ? "bg-red-50 ring-1 ring-red-200" : isOverridden ? "bg-blue-50 ring-1 ring-blue-200" : "bg-[#F2F2F7]"
                        }`}>
                          <button
                            onClick={() => onUpdateDayPositionOverride(dayIndex, shift.id, req.positionId, effectiveCount - 1)}
                            disabled={effectiveCount === 0}
                            className={`px-2 py-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                              isSuppressed ? "hover:bg-red-100" : isOverridden ? "hover:bg-blue-100" : "hover:bg-[#e5e5ea]"
                            }`}
                          >
                            <Minus className={`w-2.5 h-2.5 ${isSuppressed ? "text-red-500" : isOverridden ? "text-blue-600" : "text-[#3c3c43]"}`} />
                          </button>
                          <span className={`w-6 text-center text-[12px] font-semibold ${
                            isSuppressed ? "text-red-600" : isOverridden ? "text-blue-700" : "text-[#1d1d1f]"
                          }`}>
                            {effectiveCount}
                          </span>
                          <button
                            onClick={() => onUpdateDayPositionOverride(dayIndex, shift.id, req.positionId, effectiveCount + 1)}
                            className={`px-2 py-1 transition-colors cursor-pointer ${
                              isSuppressed ? "hover:bg-red-100" : isOverridden ? "hover:bg-blue-100" : "hover:bg-[#e5e5ea]"
                            }`}
                          >
                            <Plus className={`w-2.5 h-2.5 ${isSuppressed ? "text-red-500" : isOverridden ? "text-blue-600" : "text-[#3c3c43]"}`} />
                          </button>
                        </div>

                        {isOverridden ? (
                          <button
                            onClick={() => onRemoveDayPositionOverride(dayIndex, shift.id, req.positionId)}
                            title="Reset to default"
                            className="p-1 rounded-md hover:bg-red-50 text-[#c7c7cc] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        ) : (
                          <div className="w-5 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Human-readable metadata for each constraint (keyed by backend Name) ──────
const CONSTRAINT_META = {
  Absence: {
    label: "Absence",
    description: "Blocks assignment when the employee has an approved absence on the target date.",
  },
  ConsecutiveHours: {
    label: "Consecutive Hours",
    description: "Prevents exceeding 48 consecutive working hours (≈ 6 × 8 h shifts) without a day off.",
  },
  RestPeriod: {
    label: "Rest Period",
    description: "Enforces a minimum 12-hour rest gap between the end of one shift and the start of the next.",
  },
  Rotation: {
    label: "Rotation Pattern",
    description: "Restricts assignment to days within the employee's working block defined by their rotation pattern.",
  },
  Overtime: {
    label: "Overtime / Weekly Cap",
    description: "Prevents the employee from exceeding their contracted weekly hours. Active only when 'Weekly Hours Cap' is enabled.",
  },
  PinnedShift: {
    label: "Pinned Shift",
    description: "Blocks assignment to any shift other than the one the employee is pinned to.",
  },
  ShiftVariety: {
    label: "Shift Variety",
    description: "Adds a soft penalty when an employee would work the same shift three or more consecutive days.",
  },
};

const PRIORITY_LABELS = {
  0: { label: "Critical", color: "text-red-600 bg-red-50" },
  1: { label: "High", color: "text-orange-600 bg-orange-50" },
  2: { label: "Medium", color: "text-amber-600 bg-amber-50" },
  4: { label: "Low", color: "text-slate-600 bg-slate-100" },
  5: { label: "Low", color: "text-slate-600 bg-slate-100" },
};

function ConstraintsTab() {
  const [constraints, setConstraints] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/Shift/GetConstraints")
      .then((r) => setConstraints(r.data))
      .catch(() => toast.error("Failed to load constraints."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!constraints) return null;

  const hard = constraints.filter((c) => c.severity === "Hard");
  const soft = constraints.filter((c) => c.severity === "Soft");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[13px] text-blue-700 leading-relaxed">
          These constraints govern automatic scheduling and manual assignment. Hard constraints block a candidate outright; soft constraints add a penalty score.
        </p>
      </div>

      <ConstraintGroup
        title="Hard Constraints"
        subtitle="Always enforced by the engine. Blocking violations cannot be bypassed in the UI."
        icon={ShieldAlert}
        iconClass="text-red-500"
        bgClass="bg-slate-50"
        items={hard}
      />

      <ConstraintGroup
        title="Soft Constraints"
        subtitle="Add a penalty score during scheduling. The engine prefers candidates with fewer soft violations but will still assign them over leaving a slot empty."
        icon={ShieldOff}
        iconClass="text-slate-400"
        bgClass="bg-slate-50"
        items={soft}
      />
    </div>
  );
}

function ConstraintGroup({ title, subtitle, icon: Icon, iconClass, bgClass, items }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6e6e73]">{title}</span>
      </div>
      <p className="text-[12px] text-[#8e8e93] mb-2 px-1">{subtitle}</p>
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-black/[0.04] overflow-hidden">
        {items.map((c) => {
          const meta = CONSTRAINT_META[c.name] ?? { label: c.name, description: "" };
          const priorityMeta = PRIORITY_LABELS[c.priority] ?? { label: `P${c.priority}`, color: "text-slate-500 bg-slate-100" };
          const isHard = c.severity === "Hard";

          return (
            <div key={c.name} className="flex items-start gap-3.5 px-5 py-4">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
                {isHard
                  ? <ShieldAlert className={`w-4 h-4 ${iconClass}`} />
                  : <ShieldOff className="w-4 h-4 text-slate-400" />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">{meta.label}</span>

                  {/* Priority badge */}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${priorityMeta.color}`}>
                    P{c.priority} · {priorityMeta.label}
                  </span>
                </div>

                <p className="text-[12px] text-[#8e8e93] mt-1 leading-relaxed">{meta.description}</p>
              </div>

              {/* Overridable badge — only meaningful for hard constraints */}
              {isHard && (
                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[12px] font-medium ${
                  c.isUserOverridable
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {c.isUserOverridable
                    ? <><ShieldCheck className="w-3.5 h-3.5" /> Overridable</>
                    : <><ShieldAlert className="w-3.5 h-3.5" /> Blocking</>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RotationsTab({ patterns, onChange }) {
  const [editing, setEditing] = useState(null); // pattern being edited
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleSaved = (saved) => {
    const exists = patterns.some((p) => p.id === saved.id);
    onChange(
      exists
        ? patterns.map((p) => (p.id === saved.id ? saved : p))
        : [...patterns, saved]
    );
    setEditing(null);
    setCreating(false);
  };

  const handleDeleted = (id) => {
    onChange(patterns.filter((p) => p.id !== id));
    setDeleting(null);
  };

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[12px] font-medium text-[#6e6e73] uppercase tracking-wider">
            Rotation Patterns
          </p>
          <p className="text-[12px] text-[#8e8e93] mt-0.5">
            Templates like "6 on / 2 off". Assign one to each employee to enforce their working rhythm.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007AFF] text-white text-[13px] font-medium hover:bg-blue-600 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New pattern
        </button>
      </div>

      {patterns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F2F2F7] flex items-center justify-center mx-auto mb-3">
            <Repeat className="w-6 h-6 text-[#aeaeb2]" />
          </div>
          <p className="text-[15px] font-medium text-[#3c3c43]">No rotation patterns yet</p>
          <p className="text-[13px] text-[#8e8e93] mt-1 max-w-[320px] mx-auto">
            Create a pattern to define how many days employees work before their off-block.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-black/[0.04] overflow-hidden">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Repeat className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{pattern.name}</p>
                    {pattern.isGlobal && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        Default for new employees
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8e8e93]">
                    {pattern.daysOn} on / {pattern.daysOff} off — cycle of {pattern.daysOn + pattern.daysOff} days
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(pattern)}
                  className="p-2 rounded-lg hover:bg-black/[0.05] text-[#3c3c43] transition-colors cursor-pointer"
                  title="Edit pattern"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleting(pattern)}
                  className="p-2 rounded-lg hover:bg-red-50 text-[#aeaeb2] hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete pattern"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RotationPatternModal
          pattern={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <DeleteRotationConfirmModal
          pattern={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

function RotationPatternModal({ pattern, onClose, onSaved }) {
  const isEdit = !!pattern;
  const [name, setName] = useState(pattern?.name ?? "");
  const [daysOn, setDaysOn] = useState(pattern?.daysOn ?? 6);
  const [daysOff, setDaysOff] = useState(pattern?.daysOff ?? 2);
  const [isGlobal, setIsGlobal] = useState(pattern?.isGlobal ?? false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (daysOn < 1 || daysOff < 1) {
      toast.error("Days on and days off must be at least 1.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/Shift/SaveRotationPattern", {
        id: pattern?.id ?? null,
        name: name.trim(),
        daysOn: Number(daysOn),
        daysOff: Number(daysOff),
        isGlobal: !isEdit && isGlobal,
      });
      if (isGlobal && data.employeesUpdated > 0) {
        toast.success(`Pattern saved and applied to ${data.employeesUpdated} employee${data.employeesUpdated !== 1 ? "s" : ""}.`);
      } else {
        toast.success(isEdit ? "Pattern updated." : "Pattern created.");
      }
      onSaved(data.pattern);
    } catch (err) {
      toast.error(err?.response?.data ?? "Failed to save pattern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div className="relative w-full max-w-md p-4">
        <div className="relative bg-white rounded-2xl shadow">
          <div className="flex items-start justify-between p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit rotation pattern" : "New rotation pattern"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:bg-gray-200 rounded-lg w-8 h-8 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-900">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 6/2"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-900">Days on</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={daysOn}
                  onChange={(e) => setDaysOn(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-900">Days off</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={daysOff}
                  onChange={(e) => setDaysOff(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <p className="text-[12px] text-gray-500">
              Cycle length: {Number(daysOn) + Number(daysOff)} days.
            </p>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsGlobal((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Default for new employees</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    Automatically assign this pattern to every new employee. Only one pattern can be the default.
                  </p>
                </div>
                <div
                  className={`relative ml-4 inline-flex h-[26px] w-[44px] items-center rounded-full transition-colors duration-200 shrink-0 ${
                    isGlobal ? "bg-[#34C759]" : "bg-[#e5e5ea]"
                  }`}
                >
                  <span
                    className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
                      isGlobal ? "translate-x-[20px]" : "translate-x-[2px]"
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm px-5 py-1.5"
              >
                Cancel
            </button>
              <button
                type="submit"
                disabled={saving}
                className="text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 rounded-lg text-sm px-5 py-1.5"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteRotationConfirmModal({ pattern, onCancel, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/Shift/DeleteRotationPattern/${pattern.id}`);
      toast.success("Pattern deleted.");
      onDeleted(pattern.id);
    } catch (err) {
      toast.error(err?.response?.data ?? "Failed to delete pattern.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div className="relative w-full max-w-sm p-4">
        <div className="relative bg-white rounded-2xl shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900">Delete pattern?</h3>
          <p className="text-sm text-gray-600 mt-2">
            Remove "<span className="font-medium">{pattern.name}</span>"? Any employees currently assigned to it will be unassigned.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={onCancel}
              className="text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm px-5 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg text-sm px-5 py-1.5"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
