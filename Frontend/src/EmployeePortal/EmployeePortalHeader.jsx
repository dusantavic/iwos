import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, Clock } from "lucide-react";
import { favicon, defaultProfile } from "../assets";
import { clearPortalTokens, getUser } from "./utils/portalAuthService";

const VITE_ASSETS_BASE_URL = import.meta.env.VITE_ASSETS_BASE_URL;

const TABS = [
  { to: "/portal/shifts", label: "Shifts", Icon: Clock },
  { to: "/portal/absences", label: "Absences", Icon: CalendarDays },
];

export default function EmployeePortalHeader() {
  const [open, setOpen] = useState(false);
  const user = getUser();
  const navigate = useNavigate();

  const avatarSrc = user?.profilePictureSrc
    ? `${VITE_ASSETS_BASE_URL}/${user.profilePictureSrc}`
    : defaultProfile;

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Employee";

  const handleLogout = () => {
    clearPortalTokens();
    navigate("/portal/login", { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <a href="/portal" className="flex items-center gap-2">
          <img src={favicon} className="h-6" alt="App Logo" />
          <span className="text-[1.2rem] font-semibold whitespace-nowrap">Iwos</span>
        </a>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 focus:outline-none"
          >
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={avatarSrc}
              alt="Profile"
            />
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-gray-800">{fullName}</div>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-800">{fullName}</p>
              </div>
              <div className="py-2">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-b-xl"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="px-4 flex gap-1">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
