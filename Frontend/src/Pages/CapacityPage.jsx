import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { Users, Layers, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import api from "../utils/axiosInstance";
import KpiTile from "./DashboardV2/KpiTile";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLES = {
  Understaffed: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    bar: "#EF4444",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
  },
  Overstaffed: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    bar: "#F59E0B",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  Balanced: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    bar: "#10B981",
    icon: <Minus className="w-3.5 h-3.5" />,
  },
};

function statusMessage(position) {
  if (position.status === "Understaffed") {
    return `Short by ${Math.abs(position.deltaSlots)} shift slot${Math.abs(position.deltaSlots) === 1 ? "" : "s"}/week (~${Math.abs(position.deltaEmployees)} employee${Math.abs(position.deltaEmployees) === 1 ? "" : "s"})`;
  }
  if (position.status === "Overstaffed") {
    return `Surplus of ${position.deltaSlots} shift slot${position.deltaSlots === 1 ? "" : "s"}/week (~${position.deltaEmployees} employee${position.deltaEmployees === 1 ? "" : "s"})`;
  }
  return "Required coverage exactly matched by current staff";
}

function PositionCard({ position }) {
  const style = STATUS_STYLES[position.status] ?? STATUS_STYLES.Balanced;

  const chartOptions = useMemo(
    () => ({
      colors: ["#6366F1", style.bar],
      chart: {
        type: "bar",
        height: 140,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        background: "none",
      },
      plotOptions: {
        bar: { horizontal: true, barHeight: "55%", borderRadius: 6 },
      },
      dataLabels: { enabled: true, style: { fontSize: "11px" } },
      grid: { show: false },
      xaxis: { categories: ["Required", "Actual"], labels: { show: false } },
      yaxis: { labels: { style: { fontFamily: "Inter, sans-serif" } } },
      legend: { show: false },
      tooltip: { enabled: false },
    }),
    [style.bar]
  );

  const chartSeries = [
    {
      name: "Slots/week",
      data: [position.totalRequiredWeeklySlots, position.actualWeeklyCapacity],
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{position.title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {position.employeeCount} employee{position.employeeCount === 1 ? "" : "s"} assigned
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}
        >
          {style.icon}
          {position.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <Chart options={chartOptions} series={chartSeries} type="bar" height={140} />
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 sm:pt-2">
          <p className="font-medium text-gray-800 dark:text-gray-100">{statusMessage(position)}</p>
          <p>
            Actual capacity = {position.employeeCount} employees × 5 shifts/week ={" "}
            <span className="font-semibold">{position.actualWeeklyCapacity}</span>
          </p>
          <p>
            Required ={" "}
            {position.requirementRows.map((row, i) => (
              <span key={i}>
                {i > 0 && " + "}({row.staffPerShift} staff × {row.shiftsCount} shift
                {row.shiftsCount === 1 ? "" : "s"} × {row.daysPerWeek} day
                {row.daysPerWeek === 1 ? "" : "s"})
              </span>
            ))}
            {" = "}
            <span className="font-semibold">{position.totalRequiredWeeklySlots}</span>
          </p>
        </div>
      </div>

      {position.requirementRows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3 font-medium">Shift(s)</th>
                <th className="py-2 pr-3 font-medium">Staff</th>
                <th className="py-2 pr-3 font-medium">Shifts</th>
                <th className="py-2 pr-3 font-medium">Days/Week</th>
                <th className="py-2 pr-3 font-medium">Active Days</th>
                <th className="py-2 pr-3 font-medium">Weekly Slots</th>
              </tr>
            </thead>
            <tbody>
              {position.requirementRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.shiftLabels.join(", ")}</td>
                  <td className="py-2 pr-3">{row.staffPerShift}</td>
                  <td className="py-2 pr-3">{row.shiftsCount}</td>
                  <td className="py-2 pr-3">{row.daysPerWeek}</td>
                  <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">
                    {row.activeDaysOfWeek.map((d) => DAY_SHORT[d]).join(", ")}
                  </td>
                  <td className="py-2 pr-3 font-semibold text-gray-900 dark:text-white">{row.weeklyRequiredSlots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {position.requirementRows.length === 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 italic">
          No staffing requirement configured for this position — any assigned employees represent pure surplus.
        </p>
      )}
    </div>
  );
}

const STATUS_FILTERS = ["All", "Understaffed", "Overstaffed", "Balanced"];

export default function CapacityPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    api
      .get("/Capacity/GetOverview", { signal: ctrl.signal })
      .then((res) => setOverview(res.data))
      .catch((e) => {
        if (e.code === "ERR_CANCELED") return;
        setError(e.message ?? "Failed to load capacity overview");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const overviewChartOptions = useMemo(
    () => ({
      colors: ["#6366F1", "#16BDCA"],
      chart: {
        type: "bar",
        height: 320,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        background: "none",
      },
      plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 6 } },
      tooltip: { shared: true, intersect: false, style: { fontFamily: "Inter, sans-serif" } },
      grid: { show: false, strokeDashArray: 4, padding: { left: 2, right: 2, top: -14 } },
      dataLabels: { enabled: false },
      legend: { show: true, fontFamily: "Inter, sans-serif" },
      xaxis: {
        categories: overview?.positions?.map((p) => p.title) ?? [],
        labels: { style: { fontFamily: "Inter, sans-serif" } },
      },
      yaxis: { show: true },
    }),
    [overview]
  );

  const overviewChartSeries = [
    { name: "Required (slots/week)", data: overview?.positions?.map((p) => p.totalRequiredWeeklySlots) ?? [] },
    { name: "Actual capacity (slots/week)", data: overview?.positions?.map((p) => p.actualWeeklyCapacity) ?? [] },
  ];

  const netDelta = (overview?.totalActualWeeklyCapacity ?? 0) - (overview?.totalRequiredWeeklySlots ?? 0);

  const statusCounts = useMemo(() => {
    const counts = { All: overview?.positions?.length ?? 0, Understaffed: 0, Overstaffed: 0, Balanced: 0 };
    overview?.positions?.forEach((p) => {
      if (counts[p.status] !== undefined) counts[p.status] += 1;
    });
    return counts;
  }, [overview]);

  const filteredPositions = useMemo(() => {
    if (!overview?.positions) return [];
    if (statusFilter === "All") return overview.positions;
    return overview.positions.filter((p) => p.status === statusFilter);
  }, [overview, statusFilter]);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Capacity</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Required staffing coverage vs. actual employee capacity, by position.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiTile
          label="Positions"
          value={overview?.positions?.length ?? "—"}
          icon={<Layers className="w-3.5 h-3.5" />}
          loading={loading}
        />
        <KpiTile
          label="Required Slots/Week"
          value={overview?.totalRequiredWeeklySlots ?? "—"}
          icon={<Layers className="w-3.5 h-3.5" />}
          loading={loading}
        />
        <KpiTile
          label="Actual Capacity/Week"
          value={overview?.totalActualWeeklyCapacity ?? "—"}
          icon={<Users className="w-3.5 h-3.5" />}
          loading={loading}
        />
        <KpiTile
          label="Net Surplus/Deficit"
          value={overview ? `${netDelta >= 0 ? "+" : ""}${netDelta}` : "—"}
          tone={netDelta < 0 ? "critical" : netDelta > 0 ? "warning" : "positive"}
          icon={netDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
          loading={loading}
        />
        <KpiTile
          label="Understaffed Positions"
          value={overview?.understaffedPositionCount ?? "—"}
          tone={(overview?.understaffedPositionCount ?? 0) > 0 ? "critical" : "positive"}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          loading={loading}
          onClick={() => setStatusFilter("Understaffed")}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Required vs. Actual by Position</h2>
        {loading ? (
          <div className="h-80 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ) : (
          <Chart options={overviewChartOptions} series={overviewChartSeries} type="bar" height={320} />
        )}
      </div>

      {!loading && overview?.positions?.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                statusFilter === status
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {loading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}

        {!loading && overview?.positions?.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            No positions found. Add positions under Departments to see capacity analysis here.
          </div>
        )}

        {!loading && overview?.positions?.length > 0 && filteredPositions.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            No positions match the "{statusFilter}" filter.
          </div>
        )}

        {!loading && filteredPositions.map((position) => (
          <PositionCard key={position.positionId} position={position} />
        ))}
      </div>
    </div>
  );
}
