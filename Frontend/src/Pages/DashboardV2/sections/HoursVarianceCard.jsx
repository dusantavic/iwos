import { Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";
import DashboardCard from "../DashboardCard";
import { defaultProfile } from "../../../assets";

const BUCKET_LABELS = ["<-10", "-10..-6", "-6..-3", "-3..0", "0..+3", "+3..+6", "+6..+10", ">+10"];

export default function HoursVarianceCard({ data, error, onRetry }) {
  const loading = data == null && !error;
  const dist = data?.distribution ?? [];
  const maxBucket = Math.max(1, ...dist);
  const totalEmployees = dist.reduce((sum, n) => sum + n, 0);
  const isEmpty = !loading && !error && totalEmployees === 0;

  return (
    <DashboardCard
      title="Hours balance"
      subtitle={
        data ? `Scheduled vs contracted · ${totalEmployees} employees` : "Loading…"
      }
      icon={<Scale className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={
        isEmpty
          ? {
              icon: <Scale className="h-5 w-5" />,
              title: "No employees yet",
              description: "Add active employees to see the weekly hours balance.",
            }
          : null
      }
    >
      {/* Sparkbar distribution */}
      <div className="mb-4 sm:mb-5">
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5 items-end h-10 sm:h-12">
          {dist.map((n, i) => {
            const heightPct = (n / maxBucket) * 100;
            const isUnder = i < 4;
            const isExtreme = i === 0 || i === 7;
            const tone = isExtreme
              ? isUnder
                ? "bg-red-500"
                : "bg-amber-500"
              : isUnder
              ? "bg-blue-300"
              : "bg-emerald-400";
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full" title={`${BUCKET_LABELS[i]}h: ${n} employees`}>
                <div
                  className={`w-full rounded ${tone} transition-all`}
                  style={{ height: n > 0 ? `${Math.max(8, heightPct)}%` : "2px" }}
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-8 mt-1.5 text-[7px] sm:text-[9px] text-gray-400 dark:text-gray-500 text-center tabular-nums">
          {BUCKET_LABELS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>

      {/* Variance lists */}
      <div className="space-y-4 overflow-y-auto max-h-72">
        <VarianceList
          title="Most over-utilized"
          icon={<ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />}
          rows={data?.topOverUtilized ?? []}
          emptyText="No employees over their contract."
          tone="over"
        />
        <VarianceList
          title="Most under-utilized"
          icon={<ArrowDownRight className="h-3.5 w-3.5 text-blue-600" />}
          rows={data?.topUnderUtilized ?? []}
          emptyText="No employees under their contract."
          tone="under"
        />
      </div>
    </DashboardCard>
  );
}

function VarianceList({ title, icon, rows, emptyText, tone }) {
  const baseUrl = import.meta.env?.VITE_ASSETS_BASE_URL ?? "";

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</h4>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const maxAbs = Math.max(1, ...rows.map((x) => Math.abs(x.variance)));
            const widthPct = (Math.abs(r.variance) / maxAbs) * 100;
            return (
              <li key={r.employeeId} className="flex items-center gap-2 sm:gap-3">
                <img
                  src={r.profilePictureSrc ? `${baseUrl}/${r.profilePictureSrc}` : defaultProfile}
                  alt={r.fullName}
                  className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{r.fullName}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
                      {r.scheduledHours}h / {r.contractedHours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full ${tone === "over" ? "bg-amber-500" : "bg-blue-500"} transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                        tone === "over" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {r.variance > 0 ? "+" : ""}
                      {r.variance}h
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
