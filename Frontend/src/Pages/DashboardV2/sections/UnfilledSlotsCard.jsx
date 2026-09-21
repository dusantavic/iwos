import { useNavigate } from "react-router-dom";
import { ListChecks, CheckCircle2, ArrowRight } from "lucide-react";
import DashboardCard from "../DashboardCard";

export default function UnfilledSlotsCard({ data, error, onRetry }) {
  const navigate = useNavigate();
  const loading = data == null && !error;
  const slots = data?.unfilledSlots ?? [];
  const isEmpty = !loading && !error && slots.length === 0;

  return (
    <DashboardCard
      title="Open shifts this week"
      subtitle={slots.length > 0 ? `${slots.length} slot${slots.length === 1 ? "" : "s"} need attention` : "All required slots filled"}
      icon={<ListChecks className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={
        isEmpty
          ? {
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
              title: "All shifts covered",
              description: "Every required slot in this week has at least one assignment.",
            }
          : null
      }
    >
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 -mx-1 overflow-y-auto max-h-64">
        {slots.map((slot, i) => (
          <li
            key={`${slot.date}_${slot.shiftId}_${slot.requiredPositionId ?? "any"}_${i}`}
            className="flex items-center justify-between gap-2 sm:gap-3 px-1 py-2.5"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 flex-shrink-0">
                <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">
                  {formatDay(slot.date).dow}
                </span>
                <span className="text-sm font-bold leading-none mt-0.5 tabular-nums">
                  {formatDay(slot.date).day}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                  {slot.shiftLabel}
                  {slot.requiredPositionTitle && (
                    <span className="text-gray-500 dark:text-gray-400 font-normal"> · {slot.requiredPositionTitle}</span>
                  )}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  Missing {slot.missingCount} {slot.missingCount === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/shifts?view=week&date=${slot.date}`)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition flex-shrink-0"
            >
              Assign <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}

function formatDay(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return {
    dow: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.getDate(),
  };
}
