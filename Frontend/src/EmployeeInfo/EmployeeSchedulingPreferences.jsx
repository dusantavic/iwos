import { useEffect, useState } from "react";
import { Clock, Pin, Repeat, CalendarClock, CalendarDays } from "lucide-react";
import api from "../utils/axiosInstance";
import EmployeeSchedulingPreferencesEdit from "../EmployeeEditModals/EmployeeSchedulingPreferencesEdit";

export default function EmployeeSchedulingPreferences({
  employeeId,
  weeklyHours,
  weeklyDays,
  rotationPatternId,
  pinnedShiftId,
  rotationAnchorDate,
  refresh,
}) {
  const [editing, setEditing] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    api
      .get("/Shift/GetConfig")
      .then(({ data }) => {
        setPatterns(data?.rotationPatterns ?? []);
        setShifts(data?.shifts ?? []);
      })
      .catch(() => {
        setPatterns([]);
        setShifts([]);
      });
  }, []);

  const handleCloseModal = () => {
    setEditing(false);
    refresh();
  };

  const pattern = patterns.find((p) => p.id === rotationPatternId);
  const pinnedShift = shifts.find((s) => s.id === pinnedShiftId);

  const patternLabel = pattern
    ? `${pattern.name} (${pattern.daysOn} on / ${pattern.daysOff} off)`
    : "No rotation";
  const pinnedLabel = pinnedShift ? pinnedShift.label : "Rotates across shifts";

  return (
    <>
      {editing && (
        <EmployeeSchedulingPreferencesEdit
          employeeId={employeeId}
          weeklyHours={weeklyHours}
          weeklyDays={weeklyDays}
          rotationPatternId={rotationPatternId}
          pinnedShiftId={pinnedShiftId}
          rotationAnchorDate={rotationAnchorDate}
          closeModal={handleCloseModal}
        />
      )}

      <div className="bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase mb-4 tracking-wide">
          Scheduling Preferences
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 border-b border-t border-gray-200 py-4 dark:border-gray-700 md:py-8">
          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Weekly hours</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              <Clock className="h-4 w-4 text-gray-400" />
              {weeklyHours ?? 40}h
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Weekly working days</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              {weeklyDays ?? 5} day{(weeklyDays ?? 5) === 1 ? "" : "s"} / week
            </dd>
            <dd className="mt-1 text-[11px] text-gray-400">
              Used to approximate vacation days when an absence is requested before the schedule is generated.
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Pinned shift</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              <Pin className="h-4 w-4 text-gray-400" />
              {pinnedLabel}
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Rotation pattern</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              <Repeat className="h-4 w-4 text-gray-400" />
              {patternLabel}
            </dd>
          </dl>

          {rotationPatternId && (
            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">On-block anchor date</dt>
              <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
                <CalendarClock className="h-4 w-4 text-gray-400" />
                {rotationAnchorDate ?? <span className="italic text-gray-400">Auto (epoch stagger)</span>}
              </dd>
            </dl>
          )}

        </div>

        <button
          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
          onClick={() => setEditing(true)}
        >
          <svg
            className="mr-1 w-[16px] h-[16px] text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z"
              clipRule="evenodd"
            />
          </svg>
          Edit
        </button>
      </div>
    </>
  );
}
