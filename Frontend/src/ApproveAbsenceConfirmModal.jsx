import { useEffect, useState } from "react";
import { CalendarClock, ShieldAlert, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";
import { formatDate } from "./utils/dateFormatter";
import AbsenceImpactPreview from "./AbsenceImpactPreview";

/**
 * Confirmation modal shown when a manager clicks Approve on a pending request.
 * Loads the latest impact (the schedule may have moved since the request) and
 * lists every shift that will be released. Approval here is the explicit
 * release-on-confirm action.
 */
export default function ApproveAbsenceConfirmModal({ request, onClose, onApproved }) {
  const [impact, setImpact] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      const promise = api.patch(`/Absence/ApproveAbsence?absenceId=${request.id}`);
      const res = await toast.promise(promise, {
        pending: "Approving and releasing assignments…",
        success: "Absence approved",
        error: "Could not approve absence",
      });
      const released = res?.data?.releasedAssignments?.length ?? 0;
      if (released > 0) {
        toast.info(`${released} shift slot${released === 1 ? "" : "s"} released — visible on the planner.`);
      }
      onApproved?.(res?.data);
    } finally {
      setSubmitting(false);
    }
  };

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const conflictCount = impact?.conflicts?.length ?? 0;
  const coverageCount = impact?.coverageWarnings?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Approve absence request
            </h3>
            <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
              {request.employeeFullName} · {formatDate(request.start)}{" "}
              <span className="mx-1 text-gray-300">→</span> {formatDate(request.end)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <AbsenceImpactPreview
            absenceId={request.id}
            onLoaded={setImpact}
            compact
          />

          {impact && (conflictCount > 0 || coverageCount > 0) && (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-[12px] text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                On confirm:
              </div>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {conflictCount > 0 && (
                  <li>
                    <span className="font-semibold">{conflictCount}</span>{" "}
                    shift assignment{conflictCount === 1 ? "" : "s"} will be released and the slot{conflictCount === 1 ? "" : "s"} marked unfilled on the planner.
                  </li>
                )}
                {coverageCount > 0 && (
                  <li>
                    <span className="font-semibold">{coverageCount}</span>{" "}
                    coverage warning{coverageCount === 1 ? "" : "s"} — affected slots drop below the required headcount.
                  </li>
                )}
                <li>The employee's vacation balance will be deducted as shown above.</li>
              </ul>
            </div>
          )}

          {impact && conflictCount === 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-[12px] text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800">
              <CalendarClock className="mt-0.5 h-4 w-4" />
              <span>No existing assignments fall inside this range — approval will not change the schedule.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || (impact && impact.sufficient === false)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {submitting ? "Approving…" : "Confirm approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
