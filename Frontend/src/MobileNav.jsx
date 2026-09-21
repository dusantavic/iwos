import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BiBarChartAlt2,
  BiCalendar,
  BiCategoryAlt,
  BiGroup,
  BiLogOutCircle,
  BiMenu,
  BiSpreadsheet,
  BiTime,
  BiX,
} from "react-icons/bi";
import { defaultProfile, favicon } from "./assets";
import { clearTokens, getUser } from "./utils/authService";

const PRIMARY_NAV = [
  { to: "/", label: "Dashboard", icon: BiBarChartAlt2, end: true },
  { to: "/shifts", label: "Shifts", icon: BiTime },
  { to: "/absences", label: "Absences", icon: BiCalendar },
  { to: "/employees", label: "Employees", icon: BiGroup },
];

const DRAWER_NAV = [
  ...PRIMARY_NAV,
  { to: "/departments", label: "Departments", icon: BiCategoryAlt },
  { to: "/working-time", label: "Working Time", icon: BiSpreadsheet },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const logOut = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  const profileSrc = user?.profilePictureSrc
    ? `${import.meta.env.VITE_ASSETS_BASE_URL}/${user.profilePictureSrc}`
    : defaultProfile;

  const currentTitle =
    DRAWER_NAV.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
    )?.label ?? "";

  return (
    <>
      {/* Top app bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-[9998] bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="h-full px-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <BiMenu className="text-2xl text-[#1d1d1f] dark:text-white" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <img src={favicon} alt="" className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
              {currentTitle || "Iwos"}
            </span>
          </div>

          <Link
            to="/profile"
            aria-label="Profile"
            className="flex-shrink-0"
          >
            <img
              src={profileSrc}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
            />
          </Link>
        </div>
      </header>

      {/* Drawer + backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[9999] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <aside
          className={`
            absolute top-0 left-0 h-full w-[78%] max-w-[320px]
            bg-white dark:bg-gray-900
            shadow-2xl
            flex flex-col
            transition-transform duration-300 ease-out
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <img src={favicon} alt="" className="h-6 w-6" />
              <span className="text-base font-semibold text-[#1d1d1f] dark:text-white">
                Iwos
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <BiX className="text-2xl text-[#1d1d1f] dark:text-white" />
            </button>
          </div>

          {/* Profile card */}
          <Link
            to="/profile"
            className="mx-3 mt-3 flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <img
              src={profileSrc}
              alt=""
              className="h-11 w-11 rounded-full object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-black/55 dark:text-white/55">HR Manager</div>
            </div>
          </Link>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-2 mt-3 pb-3">
            {DRAWER_NAV.map((item) => (
              <DrawerItem key={item.to} item={item} />
            ))}
          </nav>

          {/* Footer actions */}
          <div className="border-t border-black/5 dark:border-white/5 p-3">
            <button
              onClick={logOut}
              className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <BiLogOutCircle className="text-xl" />
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[9998] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-black/5 dark:border-white/5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4 h-16">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  h-full flex flex-col items-center justify-center gap-1
                  text-[11px] font-medium
                  transition
                  ${isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`text-xl ${isActive ? "scale-110" : ""} transition-transform`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function DrawerItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `
        flex items-center gap-3 h-12 px-3 rounded-xl text-sm font-medium
        transition
        ${isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          : "text-[#1d1d1f] dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"}
      `}
    >
      <Icon className="text-xl flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}
