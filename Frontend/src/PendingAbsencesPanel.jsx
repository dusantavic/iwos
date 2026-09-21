import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import api from "./utils/axiosInstance";
import { defaultProfile } from "./assets";
import { formatDate } from "./utils/dateFormatter";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";
import AbsenceImpactPreview from "./AbsenceImpactPreview";
import ApproveAbsenceConfirmModal from "./ApproveAbsenceConfirmModal";

/**
 * Manager-facing pending list. Each row is an expandable card with the full
 * AbsenceImpactPreview inline so the manager can see consequences before acting.
 * Approve flow: click Approve → confirmation modal lists released shifts → confirm.
 */
export default function PendingAbsencesPanel({ refreshFlag, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmFor, setConfirmFor] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get("/Absence/GetPendingRequests");
      setRequests(res.data ?? []);
    } catch {
      toast.error("Could not load pending requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [refreshFlag]);

  const handleReject = async (id) => {
    const p = api.patch(`/Absence/RejectAbsence?absenceId=${id}`);
    await toast.promise(p, {
      pending: "Rejecting absence…",
      success: "Absence rejected",
      error: "Could not reject absence",
    });
    await fetchPending();
    onChanged?.();
  };

  const handleApproved = async () => {
    setConfirmFor(null);
    await fetchPending();
    onChanged?.();
  };

  const empty = !loading && requests.length === 0;
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!loading) setCollapsed(requests.length === 0);
  }, [loading, requests.length]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Pending absence requests
          </h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {requests.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>

      {!collapsed && (
        <>
          {loading && (
            <div className="px-5 py-6 text-sm text-gray-500">Loading…</div>
          )}
          {empty && (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              All caught up — no requests waiting on you.
            </div>
          )}

          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {requests.map((r) => (
              <PendingRow
                key={r.id}
                row={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                onApprove={() => setConfirmFor(r)}
                onReject={() => handleReject(r.id)}
              />
            ))}
          </ul>
        </>
      )}

      {confirmFor && (
        <ApproveAbsenceConfirmModal
          request={confirmFor}
          onClose={() => setConfirmFor(null)}
          onApproved={handleApproved}
        />
      )}
    </div>
  );
}

function PendingRow({ row, expanded, onToggle, onApprove, onReject }) {
  const typeColor = EVENT_COLORS[row.type] ?? "bg-gray-500";
  const typeIcon = EVENT_ICONS[row.type] ?? null;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Link to={`employee/${row.employeeId}`}>
            <img
              className="h-9 w-9 rounded-full object-cover"
              src={
                row.profilePictureSrc
                  ? `${import.meta.env.VITE_ASSETS_BASE_URL}/${row.profilePictureSrc}`
                  : defaultProfile
              }
              alt=""
            />
          </Link>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {row.employeeFullName}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {formatDate(row.start)}{" "}
              <span className="mx-1 text-gray-300">→</span>{" "}
              {formatDate(row.end)}
              <span className="mx-1.5 text-gray-300">·</span>
              Requested {formatDate(row.requestedDateTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`${typeColor} flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white`}
          >
            {typeIcon} {row.type}
          </span>
          <button
            onClick={onApprove}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          <AbsenceImpactPreview absenceId={row.id} compact />
        </div>
      )}
    </li>
  );
}
