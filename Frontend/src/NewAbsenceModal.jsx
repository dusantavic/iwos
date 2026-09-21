import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import defaultApi from "./utils/axiosInstance";
import AbsenceImpactPreview from "./AbsenceImpactPreview";

export default function NewAbsenceModal({
  closeModal,
  employeeId,
  from = null,
  api = defaultApi,
  absenceTypesRoute = "/Employee/GetAbsenceTypesForSelect",
  createAbsenceRoute = "/Absence/CreateAbsence",
  previewRoute = "/Absence/PreviewImpact",
  // When true, preview is fetched via portal route (employeeId comes from token).
  previewOmitEmployeeId = false,
}) {
  const [absenceTypes, setAbsenceTypes] = useState([]);
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(null);
  const [absenceType, setAbsenceType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(absenceTypesRoute);
        if (!cancelled) setAbsenceTypes(response.data);
      } catch {
        if (!cancelled) toast.error("Could not load absence types");
      }
    })();
    return () => { cancelled = true; };
  }, [absenceTypesRoute, api]);

  // Base preview params — null if incomplete / invalid range
  const previewParams = useMemo(() => {
    if (absenceType == null || !fromDate || !toDate) return null;
    if (toDate < fromDate) return null;
    return { employeeId, startDate: fromDate, endDate: toDate, type: absenceType };
  }, [absenceType, fromDate, toDate, employeeId]);

  // Debounce key so we don't remount AbsenceImpactPreview on every keystroke
  const [previewKey, setPreviewKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPreviewKey((k) => k + 1), 250);
    return () => clearTimeout(t);
  }, [previewParams?.startDate, previewParams?.endDate, previewParams?.type]);

  // Portal-specific preview fetch (employeeId is not passed in the URL)
  const [portalImpact, setPortalImpact] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  useEffect(() => {
    if (!previewOmitEmployeeId || !previewParams) {
      setPortalImpact(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setPortalLoading(true);
        const params = new URLSearchParams({
          startDate: previewParams.startDate,
          endDate: previewParams.endDate,
          type: String(previewParams.type),
        });
        const res = await api.get(`${previewRoute}?${params.toString()}`);
        if (!cancelled) setPortalImpact(res.data);
      } catch {
        if (!cancelled) setPortalImpact(null);
      } finally {
        if (!cancelled) setPortalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [
    previewOmitEmployeeId,
    previewParams?.startDate,
    previewParams?.endDate,
    previewParams?.type,
    previewRoute,
    api,
  ]);

  async function handleSubmit() {
    if (!fromDate || !toDate || absenceType == null) {
      toast.error("Pick an absence type and both dates.");
      return;
    }
    if (toDate < fromDate) {
      toast.error("End date must be on or after start date.");
      return;
    }
    const body = { employeeId, type: absenceType, startDate: fromDate, endDate: toDate };
    try {
      setSubmitting(true);
      await toast.promise(api.post(createAbsenceRoute, body), {
        pending: "Submitting absence request…",
        success: "Request submitted",
        error: {
          render({ data }) {
            return data?.response?.data?.detail || "Could not submit request";
          },
        },
      });
      closeModal();
    } finally {
      setSubmitting(false);
    }
  }

  const insufficient =
    (previewOmitEmployeeId ? portalImpact : null)?.sufficient === false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/60 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      {/* Bottom-sheet on mobile (matches RequestSwap), centered card on ≥sm. */}
      <div className="flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-3xl">
        {/* Mobile drag handle */}
        <div className="flex shrink-0 justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Request an absence
            </h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              Pick a type and date range — the impact preview updates automatically.
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Form + scrollable preview ───────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Form fields — not scrollable independently, part of the scroll area */}
          <div className="space-y-4 px-6 pt-5 pb-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                Absence type
              </label>
              <Select
                name="absenceType"
                options={absenceTypes}
                placeholder="Select type…"
                onChange={(e) => setAbsenceType(e?.value ?? null)}
                menuPosition="fixed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate ?? ""}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                  To
                </label>
                <input
                  type="date"
                  value={toDate ?? ""}
                  min={fromDate ?? undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Impact preview */}
          <div className="px-6 pb-5">
            {!previewParams ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[12px] text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                Pick a type and both dates to see the impact preview.
              </div>
            ) : previewOmitEmployeeId ? (
              <>
                <AbsenceImpactPreview
                  key={previewKey}
                  impact={portalImpact}
                  compact
                />
                {portalLoading && !portalImpact && (
                  <div className="mt-2 text-center text-[12px] text-gray-400">
                    Calculating impact…
                  </div>
                )}
              </>
            ) : (
              <AbsenceImpactPreview
                key={previewKey}
                request={previewParams}
                compact
              />
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <button
            onClick={closeModal}
            disabled={submitting}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || insufficient}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}
