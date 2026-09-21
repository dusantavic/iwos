import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarOff, ArrowRight } from "lucide-react";
import api from "../../../utils/axiosInstance";
import DashboardCard from "../DashboardCard";
import { defaultProfile } from "../../../assets";
import { EVENT_COLORS, EVENT_ICONS } from "../../../config/events.config";
import { getFormattedDateRange } from "../../../utils/dateFormatter";

export default function UpcomingAbsencesCard() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get("/Employee/GetUpcomingAbsences", { signal: ctrl.signal })
      .then((r) => setItems(r.data ?? []))
      .catch((e) => {
        if (e.code !== "ERR_CANCELED") setError(e.message ?? "Failed to load");
      });
    return () => ctrl.abort();
  }, []);

  const loading = items == null && !error;
  const isEmpty = !loading && !error && items?.length === 0;
  const baseUrl = import.meta.env?.VITE_ASSETS_BASE_URL ?? "";

  return (
    <DashboardCard
      title="Upcoming absences"
      subtitle="Approved leave on the horizon"
      icon={<CalendarOff className="h-4 w-4" />}
      loading={loading}
      error={error}
      action={
        <Link
          to="/absences"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 inline-flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      }
      empty={
        isEmpty
          ? {
              icon: <CalendarOff className="h-5 w-5" />,
              title: "No upcoming absences",
              description: "Nobody is scheduled to be away in the near future.",
            }
          : null
      }
    >
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
        {(items ?? []).map((item, i) => (
          <li
            key={`${item.employeeId}_${item.start}_${i}`}
            className="flex items-center gap-2 sm:gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition rounded"
          >
            <Link to={`/employee/${item.employeeId}`} className="relative flex-shrink-0">
              <img
                src={item.profilePictureSrc ? `${baseUrl}/${item.profilePictureSrc}` : defaultProfile}
                alt={item.fullName}
                className="h-9 w-9 rounded-full object-cover"
              />
              <span
                className={`
                  absolute -bottom-0.5 -right-0.5
                  flex h-4 w-4 items-center justify-center
                  rounded-full text-white ring-2 ring-white dark:ring-gray-800
                  ${EVENT_COLORS[item.type] ?? "bg-gray-500"}
                `}
              >
                <span className="scale-[0.65]">{EVENT_ICONS[item.type]}</span>
              </span>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{item.fullName}</p>
                {item.label && (
                  <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${labelTone(item.label)}`}>
                    {item.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate tabular-nums">
                {item.type} · {getFormattedDateRange(item.start, item.end)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}

function labelTone(label) {
  if (label === "Current") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (label === "Upcoming next week") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
}
