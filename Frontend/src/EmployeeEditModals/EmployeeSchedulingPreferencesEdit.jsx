import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";

const NONE = { value: "", label: "None" };

export default function EmployeeSchedulingPreferencesEdit({
  employeeId,
  weeklyHours,
  weeklyDays,
  rotationPatternId,
  pinnedShiftId,
  rotationAnchorDate,
  closeModal,
}) {
  const inputFieldClassName =
    "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    weeklyHours: weeklyHours ?? 40,
    weeklyDays: weeklyDays ?? 5,
    rotationPatternId: rotationPatternId ?? "",
    pinnedShiftId: pinnedShiftId ?? "",
    rotationAnchorDate: rotationAnchorDate ?? "",
  });

  useEffect(() => {
    api
      .get("/Shift/GetConfig")
      .then(({ data }) => {
        setPatterns(data?.rotationPatterns ?? []);
        setShifts((data?.shifts ?? []).filter((s) => s.isActive));
      })
      .catch(() => toast.error("Failed to load scheduling config."))
      .finally(() => setLoading(false));
  }, []);

  const patternOptions = useMemo(
    () => [
      NONE,
      ...patterns.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.daysOn} on / ${p.daysOff} off)`,
      })),
    ],
    [patterns]
  );

  const shiftOptions = useMemo(
    () => [NONE, ...shifts.map((s) => ({ value: s.id, label: s.label }))],
    [shifts]
  );

  const selectedPattern = patternOptions.find((o) => o.value === form.rotationPatternId) ?? NONE;
  const selectedShift = shiftOptions.find((o) => o.value === form.pinnedShiftId) ?? NONE;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const wd = Number(form.weeklyDays);
    if (!Number.isFinite(wd) || wd < 1 || wd > 7) {
      toast.error("Working days per week must be between 1 and 7.");
      return;
    }

    setSaving(true);
    try {
      await toast.promise(
        api.patch("/Employee/EditEmployeeSchedulingPreferences", {
          employeeId,
          weeklyHours: Number(form.weeklyHours) || 0,
          weeklyDays: wd,
          rotationPatternId: form.rotationPatternId || null,
          pinnedShiftId: form.pinnedShiftId || null,
          rotationAnchorDate: form.rotationAnchorDate || null,
        }),
        {
          pending: "Saving scheduling preferences…",
          success: "Scheduling preferences updated",
          error: "Failed to save scheduling preferences",
        }
      );
      closeModal();
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50">
      <div className="relative w-full max-w-2xl p-4">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800">
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Scheduling Preferences</h3>
            <button
              type="button"
              className="text-gray-400 hover:bg-gray-200 rounded-lg w-8 h-8 flex items-center justify-center"
              onClick={closeModal}
            >
              <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Weekly hours</label>
              <input
                type="number"
                min="0"
                max="80"
                value={form.weeklyHours}
                onChange={(e) => setForm((p) => ({ ...p, weeklyHours: e.target.value }))}
                className={inputFieldClassName}
              />
              <p className="mt-1 text-[11px] text-gray-500">Contracted hours per week. Default 40.</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Working days per week</label>
              <input
                type="number"
                min="1"
                max="7"
                value={form.weeklyDays}
                onChange={(e) => setForm((p) => ({ ...p, weeklyDays: e.target.value }))}
                className={inputFieldClassName}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Used to approximate vacation days when an absence is requested before the schedule
                is generated (7-day operations only). Approximated days = calendar days × this / 7.
                Default 5.
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Pinned shift</label>
              <Select
                options={shiftOptions}
                value={selectedShift}
                onChange={(opt) => setForm((p) => ({ ...p, pinnedShiftId: opt?.value ?? "" }))}
                isDisabled={loading}
              />
              <p className="mt-1 text-[11px] text-gray-500">If set, employee only works this shift.</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Rotation pattern</label>
              <Select
                options={patternOptions}
                value={selectedPattern}
                onChange={(opt) =>
                  setForm((p) => ({
                    ...p,
                    rotationPatternId: opt?.value ?? "",
                    rotationAnchorDate: opt?.value ? p.rotationAnchorDate : "",
                  }))
                }
                isDisabled={loading}
              />
              <p className="mt-1 text-[11px] text-gray-500">
                No pattern = no rotation enforced.
              </p>
            </div>

            {form.rotationPatternId && (
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  On-block started <span className="font-normal text-gray-500">(cycle anchor date)</span>
                </label>
                <input
                  type="date"
                  value={form.rotationAnchorDate}
                  onChange={(e) => setForm((p) => ({ ...p, rotationAnchorDate: e.target.value }))}
                  className={inputFieldClassName}
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  The first calendar day of this employee's current working on-block. The scheduling engine
                  uses this to continue the rotation seamlessly — critical when migrating from an existing schedule.
                  Leave blank to let the system auto-stagger this employee within their pattern group.
                </p>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={closeModal}
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
