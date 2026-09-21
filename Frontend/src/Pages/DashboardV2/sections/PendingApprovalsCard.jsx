import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, ArrowRightLeft, CheckCircle2, ArrowRight } from "lucide-react";
import api from "../../../utils/axiosInstance";
import DashboardCard from "../DashboardCard";
import { defaultProfile } from "../../../assets";
import { EVENT_COLORS } from "../../../config/events.config";

export default function PendingApprovalsCard() {
  const navigate = useNavigate();
  const [absences, setAbsences] = useState(null);
  const [swaps, setSwaps] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("absences");

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      api.get("/Absence/GetPendingRequests", { signal: ctrl.signal }),
      api.get("/Shift/GetPendingSwapRequests", { signal: ctrl.signal }),
    ])
      .then(([a, s]) => {
        setAbsences(a.data ?? []);
        setSwaps(s.data ?? []);
      })
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(e.message ?? "Failed to load");
      });
    return () => ctrl.abort();
  }, []);

  const loading = absences == null && swaps == null && !error;

  return (
    <DashboardCard
      title="Pending approvals"
      subtitle="Absences and shift swap requests"
      icon={<Inbox className="h-4 w-4" />}
      loading={loading}
      error={error}
      action={
        <button
          onClick={() => navigate("/absences")}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-3 sm:mb-4 border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={tab === "absences"}
          onClick={() => setTab("absences")}
          label="Absences"
          count={absences?.length ?? 0}
        />
        <TabButton
          active={tab === "swaps"}
          onClick={() => setTab("swaps")}
          label="Swap requests"
          count={swaps?.length ?? 0}
        />
      </div>

      {tab === "absences" ? (
        <AbsenceList items={absences} />
      ) : (
        <SwapList items={swaps} />
      )}
    </DashboardCard>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap flex-shrink-0
        ${active
          ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"}
      `}
    >
      {label}
      {count > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums ${active ? "bg-blue-600 text-white dark:bg-blue-500" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function AbsenceList({ items }) {
  if (!items) return null;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        title="No pending absences"
        description="Every absence request has been reviewed."
      />
    );
  }

  const baseUrl = import.meta.env?.VITE_ASSETS_BASE_URL ?? "";

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-72 overflow-y-auto">
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className="flex items-center gap-2 sm:gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition rounded"
        >
          <img
            src={item.profilePictureSrc ? `${baseUrl}/${item.profilePictureSrc}` : defaultProfile}
            alt={item.employeeFullName}
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{item.employeeFullName}</p>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate tabular-nums">
              {formatShort(item.start)}{item.end && item.end !== item.start ? ` – ${formatShort(item.end)}` : ""}
            </p>
          </div>
          {item.type && (
            <span className={`text-xs font-medium text-white px-2 py-0.5 rounded ${EVENT_COLORS[item.type] ?? "bg-gray-500"}`}>
              {item.type}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function SwapList({ items }) {
  if (!items) return null;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ArrowRightLeft className="h-5 w-5 text-emerald-600" />}
        title="No swap requests"
        description="There are no pending shift swap requests."
      />
    );
  }

  const baseUrl = import.meta.env?.VITE_ASSETS_BASE_URL ?? "";

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-72 overflow-y-auto">
      {items.map((s) => (
        <li key={s.id} className="flex items-center gap-2 sm:gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition rounded">
          <img
            src={s.requesterProfilePictureSrc ? `${baseUrl}/${s.requesterProfilePictureSrc}` : defaultProfile}
            alt={s.requesterName}
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
              {s.requesterName} <span className="text-gray-400 font-normal">→</span>{" "}
              <span className="text-gray-600 dark:text-gray-300">{s.targetEmployeeName}</span>
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate tabular-nums">
              {s.offeredShiftLabel} ({s.offeredDate}) ⇄ {s.requestedShiftLabel} ({s.requestedDate})
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatShort(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 px-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
        {icon}
      </span>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs">{description}</p>
    </div>
  );
}
