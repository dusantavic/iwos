import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Building2, Users, CreditCard, AlertTriangle } from "lucide-react";
import dayjs from "dayjs";
import adminApi from "../utils/adminAxiosInstance";
import { statusLabel, billingLabel, StatusBadge, BillingBadge } from "../utils/clientEnums";

export default function AdminDashboardPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await adminApi.get("/AdminClients");
        if (!cancelled) setClients(response.data);
      } catch {
        if (!cancelled) toast.error("Could not load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const byStatus = {};
    for (const c of clients) {
      const label = statusLabel(c.status);
      byStatus[label] = (byStatus[label] || 0) + 1;
    }
    return byStatus;
  }, [clients]);

  const trialsAndOverdue = useMemo(() => {
    return clients
      .filter((c) => statusLabel(c.status) === "Trial" || ["OverDue", "PastDue"].includes(billingLabel(c.billing)))
      .sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
  }, [clients]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of all Iwos client tenants.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Building2}
          label="Total clients"
          value={clients.length}
          accent="text-slate-700 bg-slate-100"
        />
        <SummaryCard
          icon={Users}
          label="Active"
          value={counts.Active || 0}
          accent="text-green-700 bg-green-100"
        />
        <SummaryCard
          icon={CreditCard}
          label="Trial"
          value={counts.Trial || 0}
          accent="text-blue-700 bg-blue-100"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Overdue / Suspended"
          value={(counts.Overdue || 0) + (counts.Suspended || 0)}
          accent="text-red-700 bg-red-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Trials ending soon & overdue billing
          </h2>
          <p className="text-xs text-slate-500">
            Clients on a trial plan or with overdue/past-due billing — needs follow-up.
          </p>
        </div>

        {trialsAndOverdue.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            Nothing needs attention right now.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {trialsAndOverdue.map((c) => (
              <li
                key={c.id}
                onClick={() => navigate(`/admin/clients/${c.id}`)}
                className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.contactEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <BillingBadge billing={c.billing} />
                  <span className="text-xs text-slate-400">
                    {c.lastActivity ? dayjs(c.lastActivity).format("MMM D, YYYY") : "No activity"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
