/**
 * Unavailability is now stored in the backend via ShiftController.
 * This file is kept only so old imports don't break during migration.
 * All functions are no-ops; data comes from the WeeklySchedule API response.
 */

/** @deprecated Use buildWeeklyMaps(weeklySchedule).unavail from shiftConfig.js */
export function getShiftUnavailableReports(unavailabilityMap, date, shiftId) {
  if (!unavailabilityMap || !date || !shiftId) return [];
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
  return unavailabilityMap[`${dateStr}_${shiftId}`] ?? [];
}
