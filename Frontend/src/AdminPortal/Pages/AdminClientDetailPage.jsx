import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import dayjs from "dayjs";
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import adminApi from "../utils/adminAxiosInstance";
import { StatusBadge, STATUS_OPTIONS } from "../utils/clientEnums";

const inputClass =
  "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const USER_TYPE_LABELS = {
  0: "Temporary",
  1: "L1",
  2: "L2",
  9: "Client Admin",
  10: "Global Admin",
};

export default function AdminClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [planTypes, setPlanTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [clientRes, usersRes, subsRes, planTypesRes] = await Promise.all([
        adminApi.get(`/AdminClients/${id}`),
        adminApi.get(`/AdminClients/${id}/users`),
        adminApi.get(`/AdminClients/${id}/subscriptions`),
        adminApi.get("/AdminClients/subscription-plan-types"),
      ]);

      setClient(clientRes.data);
      setUsers(usersRes.data);
      setSubscriptions(subsRes.data);
      setPlanTypes(planTypesRes.data.filter((p) => p.isActive));
    } catch (err) {
      if (err.response?.status === 404) {
        setClient(null);
      } else {
        toast.error("Could not load client details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        Loading client...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center text-slate-500">
        Client not found.
        <div className="mt-4">
          <button
            onClick={() => navigate("/admin/clients")}
            className="text-blue-600 hover:underline"
          >
            Back to clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/clients")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            {client.name}
            <StatusBadge status={client.status} />
          </h1>
          <p className="text-sm text-slate-500">{client.contactEmail}</p>
        </div>
      </div>

      <ClientInfoSection client={client} onUpdated={loadAll} />
      <UsersSection clientId={id} users={users} onUserAdded={loadAll} />
      <SubscriptionsSection
        clientId={id}
        subscriptions={subscriptions}
        planTypes={planTypes}
        onAssigned={loadAll}
      />
    </div>
  );
}

function ClientInfoSection({ client, onUpdated }) {
  const [form, setForm] = useState({
    name: client.name || "",
    contactEmail: client.contactEmail || "",
    contactPerson: client.contactPerson || "",
    contactPhone: client.contactPhone || "",
    address: client.address || "",
    country: client.country || "",
    code: client.code || "",
    bankAccountNumber: client.bankAccountNumber || "",
    bankWith: client.bankWith || "",
    status: client.status,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const statusOption = STATUS_OPTIONS.find((o) => o.value === form.status) || null;

  async function handleSave() {
    if (!form.name || !form.contactEmail || !form.country || !form.code) {
      toast.error("Check required fields and try again.");
      return;
    }
    try {
      setSubmitting(true);
      await adminApi.put(`/AdminClients/${client.id}`, form);
      toast.success("Client updated.");
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error updating client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Client information</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Name *" name="name" value={form.name} onChange={handleChange} />
        <Field label="Contact email *" name="contactEmail" value={form.contactEmail} onChange={handleChange} />
        <Field label="Contact person" name="contactPerson" value={form.contactPerson} onChange={handleChange} />
        <Field label="Contact phone" name="contactPhone" value={form.contactPhone} onChange={handleChange} />
        <Field label="Country *" name="country" value={form.country} onChange={handleChange} />
        <Field label="Code *" name="code" value={form.code} onChange={handleChange} />
        <Field label="Address" name="address" value={form.address} onChange={handleChange} />
        <Field label="Bank account number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
        <Field label="Bank with" name="bankWith" value={form.bankWith} onChange={handleChange} />

        <div>
          <label className="block text-sm font-medium text-gray-900">Status</label>
          <Select
            className="mt-1"
            options={STATUS_OPTIONS}
            value={statusOption}
            onChange={(opt) => setForm((prev) => ({ ...prev, status: opt?.value }))}
            menuPosition="fixed"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSave}
          className="rounded-lg bg-blue-700 px-5 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </section>
  );
}

function UsersSection({ clientId, users, onUserAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userName: "", email: "", password: "", firstName: "", lastName: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit() {
    if (!form.userName || !form.email || !form.password || !form.firstName || !form.lastName) {
      toast.error("Check required fields and try again.");
      return;
    }
    try {
      setSubmitting(true);
      await adminApi.post(`/AdminClients/${clientId}/users`, form);
      toast.success("User created.");
      setForm({ userName: "", email: "", password: "", firstName: "", lastName: "" });
      setShowForm(false);
      onUserAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error creating user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Application users</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add User
        </button>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 sm:grid-cols-2">
          <Field label="Username *" name="userName" value={form.userName} onChange={handleChange} />
          <Field label="Email *" name="email" value={form.email} onChange={handleChange} />
          <Field label="First name *" name="firstName" value={form.firstName} onChange={handleChange} />
          <Field label="Last name *" name="lastName" value={form.lastName} onChange={handleChange} />
          <div>
            <label className="block text-sm font-medium text-gray-900">Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div className="flex items-end sm:col-span-2 justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-blue-700 px-4 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create user"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Active</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3">{u.userName}</td>
                <td className="px-5 py-3">{u.email}</td>
                <td className="px-5 py-3">{u.firstName} {u.lastName}</td>
                <td className="px-5 py-3">{USER_TYPE_LABELS[u.type] ?? u.type}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3">{u.createdOn ? dayjs(u.createdOn).format("MMM D, YYYY") : "—"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubscriptionsSection({ clientId, subscriptions, planTypes, onAssigned }) {
  const [showForm, setShowForm] = useState(false);
  const [planOption, setPlanOption] = useState(null);
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const planSelectOptions = useMemo(
    () => planTypes.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
    [planTypes],
  );

  const sortedSubscriptions = useMemo(
    () => [...subscriptions].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
    [subscriptions],
  );

  async function handleAssign() {
    if (!planOption || !startDate) {
      toast.error("Pick a plan and a start date.");
      return;
    }
    try {
      setSubmitting(true);
      await adminApi.post(`/AdminClients/${clientId}/subscriptions`, {
        subscriptionPlanTypeId: planOption.value,
        startDate,
        notes: notes || undefined,
      });
      toast.success("Plan assigned.");
      setPlanOption(null);
      setNotes("");
      setShowForm(false);
      onAssigned();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error assigning plan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-800">Subscription history</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Assign Plan
        </button>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-900">Plan *</label>
            <Select
              className="mt-1"
              options={planSelectOptions}
              value={planOption}
              onChange={setPlanOption}
              placeholder="Select plan..."
              menuPosition="fixed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Start date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end justify-end gap-2 sm:col-span-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleAssign}
              className="rounded-lg bg-blue-700 px-4 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? "Assigning..." : "Assign plan"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Start date</th>
              <th className="px-5 py-3">End date</th>
              <th className="px-5 py-3">Days remaining</th>
              <th className="px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedSubscriptions.map((s) => {
              const isOpenEnded = !s.endDate;
              const daysRemaining = isOpenEnded
                ? null
                : dayjs(s.endDate).diff(dayjs(), "day");

              return (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{s.subscriptionPlanTypeName}</div>
                    <div className="text-xs text-slate-400">{s.subscriptionPlanTypeCode}</div>
                  </td>
                  <td className="px-5 py-3">{dayjs(s.startDate).format("MMM D, YYYY")}</td>
                  <td className="px-5 py-3">
                    {isOpenEnded ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Current
                      </span>
                    ) : (
                      dayjs(s.endDate).format("MMM D, YYYY")
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isOpenEnded
                      ? "—"
                      : daysRemaining >= 0
                        ? `${daysRemaining} days`
                        : "Expired"}
                  </td>
                  <td className="px-5 py-3">{s.notes || "—"}</td>
                </tr>
              );
            })}
            {sortedSubscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No subscription history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  );
}
