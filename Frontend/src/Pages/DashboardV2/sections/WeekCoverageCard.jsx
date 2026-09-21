import { CalendarRange, CheckCircle2 } from "lucide-react";
import DashboardCard from "../DashboardCard";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeekCoverageCard({ data, error, onRetry }) {
  const loading = data == null && !error;
  const days = data?.days ?? [];
  const totalRequired = days.reduce((sum, d) => sum + d.requiredSlots, 0);
  const totalFilled = days.reduce((sum, d) => sum + Math.min(d.filledSlots, d.requiredSlots), 0);
  const overallPercent = totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;
  const isEmpty = !loading && !error && totalRequired === 0;

  return (
    <DashboardCard
      title="This week's coverage"
      subtitle={
        data
          ? `${formatRange(data.weekStart, data.weekEnd)} · ${overallPercent}% covered`
          : "Loading…"
      }
      icon={<CalendarRange className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={
        isEmpty
          ? {
              icon: <CheckCircle2 className="h-5 w-5" />,
              title: "No coverage targets",
              description: "Configure shift requirements to see week coverage here.",
            }
          : null
      }
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3 items-end h-36 sm:h-44">
        {days.map((d) => (
          <DayBar key={d.date} day={d} />
        ))}
      </div>
    </DashboardCard>
  );
}

function DayBar({ day }) {
  const percent = day.requiredSlots > 0 ? Math.min(100, day.percent) : 0;
  const tone =
    percent >= 100 ? "bg-emerald-500" : percent >= 60 ? "bg-blue-600" : percent > 0 ? "bg-amber-500" : "bg-gray-200 dark:bg-gray-600";
  const label = DAY_LABELS[day.dayOfWeek] ?? "";

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 group">
      <div className="relative w-full h-24 sm:h-32 flex items-end">
        <div className="absolute inset-0 rounded bg-gray-100 dark:bg-gray-700" />
        <div
          className={`relative w-full rounded ${tone} transition-all duration-500`}
          style={{ height: `${percent}%`, minHeight: percent > 0 ? "6px" : "0" }}
          title={`${day.filledSlots} / ${day.requiredSlots} (${percent}%)`}
        />
      </div>
      <div className="text-center">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
          {day.filledSlots}/{day.requiredSlots}
        </p>
      </div>
    </div>
  );
}

function formatRange(startStr, endStr) {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
