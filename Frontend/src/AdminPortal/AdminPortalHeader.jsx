import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, ShieldAlert, KeyRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { favicon } from "../assets";
import { clearAdminTokens, getUser } from "./utils/adminAuthService";
import adminApi from "./utils/adminAxiosInstance";

const TABS = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/admin/clients", label: "Clients", Icon: Building2, end: false },
];

export default function AdminPortalHeader() {
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const user = getUser();
  const navigate = useNavigate();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Admin";

  const handleLogout = () => {
    clearAdminTokens();
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-200 bg-slate-900 border-b border-amber-500/40">
      {/* Distinct internal-tool accent strip — never to be confused with the
          client-facing manager app or employee portal. */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-red-500" />

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/admin" className="flex items-center gap-2">
            <img src={favicon} className="h-6" alt="App Logo" />
            <span className="text-[1.2rem] font-semibold whitespace-nowrap text-white">
              Iwos
            </span>
          </a>
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-400 ring-1 ring-amber-500/40">
            <ShieldAlert className="h-3.5 w-3.5" />
            Admin Portal — Internal Use Only
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-semibold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block font-medium">{fullName}</span>
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-slate-800 shadow-lg z-50">
              <div className="border-b border-slate-700 px-4 py-3">
                <p className="text-sm font-medium text-slate-100">{fullName}</p>
                <p className="text-xs text-slate-400">{user?.username}</p>
              </div>
              <div className="py-2">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                  onClick={() => {
                    setOpen(false);
                    setShowChangePassword(true);
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Change Password
                </button>
                <button
                  className="w-full rounded-b-xl px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="px-4 flex gap-1 bg-slate-900">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`
            }
          >
            <tab.Icon className="w-4 h-4" />
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {showChangePassword && (
        <ChangePasswordModal closeModal={() => setShowChangePassword(false)} />
      )}
    </header>
  );
}

function ChangePasswordModal({ closeModal }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!oldPassword || !newPassword) {
      toast.error("Fill in both fields.");
      return;
    }
    try {
      setSubmitting(true);
      await adminApi.post("/AdminPortal/ChangePassword", {
        oldPassword,
        newPassword,
      });
      toast.success("Password changed.");
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-sm rounded-lg bg-white shadow">
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-medium text-gray-900">Current password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-300 p-4">
          <button
            type="button"
            onClick={closeModal}
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
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
