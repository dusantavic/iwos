import { Users, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import DashboardCard from "../DashboardCard";
import { defaultProfile } from "../../../assets";

export default function TodayCoverageCard({ data, error, onRetry }) {
  const loading = data == null && !error;
  const isEmpty = !loading && !error && (data?.length ?? 0) === 0;

  return (
    <DashboardCard
      title="Today's coverage"
      subtitle="Per active shift"
      icon={<Users className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={
        isEmpty
          ? {
              icon: <CheckCircle2 className="h-5 w-5" />,
              title: "No shifts today",
              description: "There are no active shifts scheduled for today.",
            }
          : null
      }
    >
      <ul className="divide-y divide-gray-200 dark:divide-gray-700 -mx-1 overflow-y-auto max-h-64 sm:max-h-80">
        {data?.map((row) => (
          <li key={row.shiftId} className="flex items-center justify-between gap-3 px-1 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <StatusBadge status={row.status} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {row.shiftLabel}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {row.assignedCount} / {row.requiredCount} assigned
                </p>
              </div>
            </div>
            <AssigneeStack assignees={row.assignees} total={row.assignedCount} />
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}

function StatusBadge({ status }) {
  const styles =
    status === "Covered"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : status === "Under"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  const Icon = status === "Covered" ? CheckCircle2 : status === "Under" ? AlertTriangle : ArrowUpRight;
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${styles}`}
      title={status}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function AssigneeStack({ assignees, total }) {
  const visible = assignees ?? [];
  const overflow = Math.max(0, total - visible.length);
  const baseUrl = import.meta.env?.VITE_ASSETS_BASE_URL ?? "";

  return (
    <div className="flex items-center -space-x-1.5 flex-shrink-0">
      {visible.map((a) => (
        <img
          key={a.employeeId}
          src={a.profilePictureSrc ? `${baseUrl}/${a.profilePictureSrc}` : defaultProfile}
          alt={a.fullName}
          title={`${a.fullName} · ${a.position}`}
          className="h-7 w-7 rounded-full object-cover border-2 border-white dark:border-gray-800"
        />
      ))}
      {overflow > 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
          +{overflow}
        </span>
      )}
      {visible.length === 0 && total === 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">unstaffed</span>
      )}
    </div>
  );
}
