import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Search, CalendarDays, Download } from "lucide-react";
import api from "../utils/axiosInstance";
import { defaultProfile } from "../assets";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const VITE_ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL;

export default function WorkingTimePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payrollMonth, setPayrollMonth] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api
      .get(`/Shift/GetWorkingTimeOverview?year=${year}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const months = data?.months ?? [];

  useEffect(() => {
    if (months.length > 0) {
      setPayrollMonth(months[months.length - 1].key);
    } else {
      setPayrollMonth("");
    }
  }, [data]);

  const handleExportPayroll = async () => {
    if (!payrollMonth) return;
    const [y, m] = payrollMonth.split("-").map(Number);
    setExporting(true);
    try {
      const res = await api.get(
        `/Shift/ExportPayroll?year=${y}&month=${m}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payroll_${y}-${String(m).padStart(2, "0")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export payroll.");
    } finally {
      setExporting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.employees;
    return data.employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Working Times</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Worked hours per employee for each published month
          </p>
        </div>

        {/* Year switcher */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-xs">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-800 px-2 min-w-[48px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Search bar + payroll export ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        {months.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportPayroll}
              disabled={exporting || !payrollMonth}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3.5 py-2 transition"
            >
              <Download size={14} />
              {exporting ? "Exporting…" : "Export Payroll"}
            </button>
          </div>
        )}
      </div>

      {/* ── Table / states ────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : months.length === 0 ? (
        <EmptyState year={year} />
      ) : (
        <OverviewTable
          months={months}
          employees={filteredEmployees}
          allCount={data?.employees?.length ?? 0}
        />
      )}
    </div>
  );
}

// ── Overview table ────────────────────────────────────────────────────────────

function OverviewTable({ months, employees, allCount }) {
  return (
    <div className="rounded-xl border border-gray-200 shadow-xs overflow-hidden bg-white">
      {/* Summary strip */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <span className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{allCount}</span> employee
          {allCount !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{months.length}</span> published
          month{months.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {/* Sticky employee column header */}
              <th className="sticky left-0 z-10 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[220px] border-r border-gray-200">
                Employee
              </th>

              {months.map((m) => (
                <th
                  key={m.key}
                  className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right min-w-[140px]"
                >
                  {m.label}
                </th>
              ))}

              {/* Total */}
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right min-w-[130px] border-l border-gray-200">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={months.length + 2}
                  className="px-5 py-10 text-center text-sm text-gray-400"
                >
                  No employees match your search.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <EmployeeRow key={emp.employeeId} emp={emp} months={months} />
              ))
            )}
          </tbody>

          {/* Footer totals row */}
          {employees.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/60">
                <td className="sticky left-0 z-10 bg-gray-50/60 px-5 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200">
                  All employees
                </td>
                {months.map((m) => {
                  const total = employees.reduce(
                    (sum, e) => sum + (e.monthStats[m.key]?.hours ?? 0),
                    0
                  );
                  return (
                    <td key={m.key} className="px-5 py-3 text-right">
                      <span className="text-xs font-semibold text-gray-700">
                        {total.toFixed(0)} h
                      </span>
                    </td>
                  );
                })}
                <td className="px-5 py-3 text-right border-l border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">
                    {employees
                      .reduce(
                        (sum, e) =>
                          sum +
                          Object.values(e.monthStats).reduce(
                            (s, v) => s + (v?.hours ?? 0),
                            0
                          ),
                        0
                      )
                      .toFixed(0)}{" "}
                    h
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Employee row ──────────────────────────────────────────────────────────────

function EmployeeRow({ emp, months }) {
  const totalHours = Object.values(emp.monthStats).reduce(
    (sum, s) => sum + (s?.hours ?? 0),
    0
  );
  const totalDays = Object.values(emp.monthStats).reduce(
    (sum, s) => sum + (s?.days ?? 0),
    0
  );

  // Expected monthly hours (approx): weeklyHours * 4.33
  const expectedMonthlyHours = emp.weeklyHours * 4.33;

  return (
    <tr className="hover:bg-gray-50/70 transition-colors group">
      {/* Sticky employee cell */}
      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 px-5 py-4 border-r border-gray-100 transition-colors">
        <Link
          to={`/employee/${emp.employeeId}`}
          className="flex items-center gap-3"
        >
          <img
            src={
              emp.profilePictureSrc
                ? `${VITE_ASSETS_BASE_URL}/${emp.profilePictureSrc}`
                : defaultProfile
            }
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-gray-900 leading-tight truncate">
              {emp.fullName}
            </div>
            <div className="text-[11px] text-gray-400 truncate mt-0.5">
              {emp.position}
            </div>
          </div>
        </Link>
      </td>

      {/* Month cells */}
      {months.map((m) => {
        const stats = emp.monthStats[m.key];
        const hours = stats?.hours ?? 0;
        const days = stats?.days ?? 0;
        const pct = Math.min(100, (hours / expectedMonthlyHours) * 100);

        return (
          <td key={m.key} className="px-5 py-4 text-right align-top">
            {hours > 0 ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[13px] font-semibold text-gray-800">
                  {hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} h
                </span>
                <span className="text-[11px] text-gray-400">
                  {days} day{days !== 1 ? "s" : ""}
                </span>
                {/* Utilisation bar */}
                <div className="w-full max-w-[80px] h-1 rounded-full bg-gray-100 overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 90
                        ? "bg-green-400"
                        : pct >= 60
                        ? "bg-blue-400"
                        : "bg-gray-300"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-[12px] text-gray-300">—</span>
            )}
          </td>
        );
      })}

      {/* Total cell */}
      <td className="px-5 py-4 text-right border-l border-gray-100 align-top">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[13px] font-semibold text-gray-900">
            {totalHours % 1 === 0
              ? totalHours.toFixed(0)
              : totalHours.toFixed(1)}{" "}
            h
          </span>
          <span className="text-[11px] text-gray-400">
            {totalDays} day{totalDays !== 1 ? "s" : ""}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 shadow-xs overflow-hidden bg-white animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-200" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {["Employee", "Jan", "Feb", "Mar", "Apr", "Total"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 min-w-[130px] first:min-w-[220px]"
                >
                  <div className="h-3 bg-gray-200 rounded w-16 ml-auto first:ml-0" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3 bg-gray-200 rounded w-28" />
                      <div className="h-2.5 bg-gray-100 rounded w-20" />
                    </div>
                  </div>
                </td>
                {[1, 2, 3, 4, 5].map((j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="h-3 bg-gray-200 rounded w-12" />
                      <div className="h-2.5 bg-gray-100 rounded w-10" />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ year }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <CalendarDays size={22} className="text-gray-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          No published schedules for {year}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Publish a week in the Shift Planner to see working time data here.
        </p>
      </div>
      <Link
        to="/shifts"
        className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
      >
        Go to Shift Planner →
      </Link>
    </div>
  );
}
