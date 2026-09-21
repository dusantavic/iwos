// Day helpers
export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_INDICES = [1, 2, 3, 4, 5];
export const WEEKEND_INDICES = [0, 6];

/**
 * Frontend-only display definitions — keyed by shift label.
 * The backend stores label, time, and staffing data.
 * Icon names and Tailwind color classes live here only.
 */
export const SHIFT_DISPLAY = {
  Morning: {
    iconName: "Sun",
    color: "bg-amber-50 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-400",
    headerColor: "text-amber-700",
  },
  Afternoon: {
    iconName: "Moon",
    color: "bg-indigo-50 border-indigo-200",
    badgeColor: "bg-indigo-100 text-indigo-700",
    dotColor: "bg-indigo-400",
    headerColor: "text-indigo-700",
  },
  Night: {
    iconName: "Star",
    color: "bg-slate-100 border-slate-300",
    badgeColor: "bg-slate-200 text-slate-700",
    dotColor: "bg-slate-500",
    headerColor: "text-slate-700",
  },
};

const FALLBACK_DISPLAY = {
  iconName: "Sun",
  color: "bg-gray-50 border-gray-200",
  badgeColor: "bg-gray-100 text-gray-700",
  dotColor: "bg-gray-400",
  headerColor: "text-gray-700",
};

/**
 * Merges an API shift object with its frontend display properties.
 */
export function mergeShiftDisplay(apiShift) {
  return {
    ...apiShift,
    ...(SHIFT_DISPLAY[apiShift.label] ?? FALLBACK_DISPLAY),
  };
}

/**
 * Transforms the raw API config response into the local config shape used by
 * all shift pages:
 * {
 *   weekendsWorking: bool,
 *   shifts: [ { id, label, isActive, sortOrder, defaultStartTime, defaultEndTime, iconName, color, ... } ],
 *   days: { 0..6: { shifts: { [shiftId]: { start, end, hours } } } },
 *   positionRequirements: [ { shiftId, positionId, positionTitle, requiredCount } ]
 * }
 */
export function buildLocalConfig(apiConfig) {
  const shifts = (apiConfig.shifts ?? [])
    .map(mergeShiftDisplay)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const days = {};
  for (let d = 0; d < 7; d++) {
    days[d] = { shifts: {} };
    shifts.forEach((shift) => {
      const ds = (apiConfig.daySchedules ?? []).find(
        (x) => x.shiftId === shift.id && x.dayOfWeek === d
      );
      days[d].shifts[shift.id] = {
        start: ds?.startTime ?? shift.defaultStartTime,
        end: ds?.endTime ?? shift.defaultEndTime,
        hours: ds?.hours ?? shift.defaultHours ?? 8,
      };
    });
  }

  return {
    weekendsWorking: apiConfig.weekEndsWorking ?? false,
    considerWeeklyHours: apiConfig.considerWeeklyHours ?? true,
    shifts,
    days,
    positionRequirements: apiConfig.positionRequirements ?? [],
    dayPositionRequirementOverrides: apiConfig.dayPositionRequirementOverrides ?? [],
    rotationPatterns: apiConfig.rotationPatterns ?? [],
  };
}

/**
 * Returns position requirements for a specific shift.
 * Each entry: { shiftId, positionId, positionTitle, requiredCount }
 */
export function getPositionRequirements(config, shiftId) {
  return (config?.positionRequirements ?? []).filter((r) => r.shiftId === shiftId);
}

/**
 * Returns position requirements for a specific shift on a specific day of week,
 * with requiredCount overridden by any day-of-week override that applies.
 * dayOfWeek: 0 (Sunday) – 6 (Saturday), matching JS Date.getDay().
 */
export function getPositionRequirementsForDay(config, shiftId, dayOfWeek) {
  const reqs = getPositionRequirements(config, shiftId);
  const overrides = config?.dayPositionRequirementOverrides ?? [];
  return reqs.map((req) => {
    const ov = overrides.find(
      (o) => o.shiftId === shiftId && o.dayOfWeek === dayOfWeek && o.positionId === req.positionId
    );
    return ov ? { ...req, requiredCount: ov.requiredCount } : req;
  });
}

/**
 * Returns the effective required count for a (shift, dayOfWeek, position) triple,
 * applying the day-of-week override if one exists, else the default requirement count.
 */
export function getEffectiveDayRequiredCount(config, shiftId, dayOfWeek, positionId) {
  const override = (config?.dayPositionRequirementOverrides ?? []).find(
    (o) => o.shiftId === shiftId && o.dayOfWeek === dayOfWeek && o.positionId === positionId
  );
  if (override) return override.requiredCount;
  const req = (config?.positionRequirements ?? []).find(
    (r) => r.shiftId === shiftId && r.positionId === positionId
  );
  return req?.requiredCount ?? 0;
}

/**
 * Returns the active shifts from a local config object, already merged with
 * display info and sorted by sortOrder.
 */
export function getActiveShifts(config) {
  if (!config?.shifts) return [];
  return config.shifts.filter((s) => s.isActive);
}

/**
 * Returns the formatted time range string for a shift on a given day of week.
 */
export function getShiftTime(config, dayOfWeek, shiftId) {
  const dayShift = config?.days?.[dayOfWeek]?.shifts?.[shiftId];
  if (dayShift) return `${dayShift.start} - ${dayShift.end}`;
  const shift = config?.shifts?.find((s) => s.id === shiftId);
  return shift ? `${shift.defaultStartTime} - ${shift.defaultEndTime}` : "";
}

/**
 * Returns the duration in decimal hours for a shift on a given day of week.
 * Falls back to 8 if data is missing.
 */
export function getShiftHours(config, dayOfWeek, shiftId) {
  return config?.days?.[dayOfWeek]?.shifts?.[shiftId]?.hours ?? 8;
}

/**
 * Transforms the weekly schedule API response into the flat keyed maps used
 * by the planner and employee pages.
 */
export function buildWeeklyMaps(weeklySchedule) {
  const shifts = {};
  (weeklySchedule.assignments ?? []).forEach((a) => {
    const key = `${a.date}_${a.shiftId}`;
    if (!shifts[key]) shifts[key] = [];
    shifts[key].push({ ...a.employee, isSwapped: !!a.isSwapped });
  });

  const unavail = {};
  (weeklySchedule.unavailabilities ?? []).forEach((u) => {
    const key = `${u.date}_${u.shiftId}`;
    if (!unavail[key]) unavail[key] = [];
    unavail[key].push({
      employeeId: u.employeeId,
      fullName: u.fullName,
      reportedAt: u.reportedAt,
    });
  });

  return { shifts, unavail };
}
