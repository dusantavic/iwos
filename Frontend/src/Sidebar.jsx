import {
  BiBarChartAlt2,
  BiBuildings,
  BiCalendar,
  BiCategoryAlt,
  BiCheckShield,
  BiCheckSquare,
  BiGroup,
  BiGridAlt,
  BiLogOutCircle,
  BiMenu,
  BiNotepad,
  BiTime,
  BiSpreadsheet,
  BiChart,
} from "react-icons/bi";
import { defaultProfile, favicon } from "./assets";
import { Link, useNavigate } from "react-router-dom";
import { clearTokens, getUser } from "./utils/authService";

export default function Sidebar({ active, toggleActive }) {
  const navigate = useNavigate();
  const user = getUser();

  const logOut = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen
        ${active ? "w-60" : "w-[72px]"}
        transition-all duration-300 ease-in-out
        hidden md:flex flex-col justify-between
        px-2 py-4
        backdrop-blur-2xl
        bg-[rgba(242,242,247,0.8)]
        border-r border-black/5
        z-[9999]
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <img
          src={favicon}
          alt="Logo"
          className={`
            h-[21px]
            m-[6px]
            transition-all duration-200
            ${active ? "opacity-100 scale-100" : "opacity-0 scale-75 w-0"}
          `}
        />

        <BiMenu
          onClick={toggleActive}
          className={`
            text-xl cursor-pointer
            opacity-60 hover:opacity-100
            transition
            ${!active ? "mx-auto" : ""}
          `}
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 mt-7">
        <SidebarItem to="/" icon={<BiBarChartAlt2 />} label="Dashboard" active={active} />
        <SidebarItem to="shifts" icon={<BiTime />} label="Shifts" active={active} />
        <SidebarItem to="absences" icon={<BiCalendar />} label="Absences" active={active} />
        <SidebarItem to="employees" icon={<BiGroup />} label="Employees" active={active} />
        <SidebarItem to="departments" icon={<BiCategoryAlt />} label="Departments" active={active} />
        <SidebarItem to="capacity" icon={<BiChart />} label="Capacity" active={active} />
        {/* <SidebarItem to="notes" icon={<BiNotepad />} label="Notes" active={active} />
        <SidebarItem to="todos" icon={<BiCheckSquare />} label="ToDos" active={active} /> */}
        {/* <SidebarItem to="working-time" icon={<BiSpreadsheet />} label="Working Time" active={active} /> */}
        <SidebarItem to="client" icon={<BiBuildings />} label="My Company" active={active} />
        {/* <SidebarItem to="admin" icon={<BiCheckShield />} label="Admin" active={active} /> */}
      </nav>

      {/* Footer */}
      <div className="pt-4">
        <div
          className={`
            flex items-center
            ${active ? "justify-between px-3" : "justify-center px-2"}
            py-2
            rounded-2xl
            bg-white/60 backdrop-blur-xl
            hover:bg-black/5
            transition
          `}
        >
          <div className="flex items-center gap-2">
            <img
              src={
                !user.profilePictureSrc
                  ? defaultProfile
                  : `${import.meta.env.VITE_ASSETS_BASE_URL}/${user.profilePictureSrc}`
              }
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />

            <div
              className={`
                flex flex-col leading-tight
                transition-all duration-200
                ${active ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
              `}
            >
              <div className="text-[13px] font-semibold text-[#1d1d1f] whitespace-nowrap">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[11px] text-black/55 whitespace-nowrap">
                HR Manager
              </div>
            </div>
          </div>

          <button
            onClick={logOut}
            className={`
              flex items-center justify-center
              w-8 h-8 rounded-lg
              hover:bg-black/10
              transition
              ${active ? "opacity-60 hover:opacity-100" : "opacity-0 w-0 overflow-hidden"}
            `}
          >
            <BiLogOutCircle />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className="
        relative group
        flex items-center gap-3
        h-10 px-3
        rounded-xl
        text-sm font-medium
        text-[#1d1d1f]
        hover:bg-black/5
        transition
      "
    >
      <span className="text-lg min-w-[20px] flex justify-center !cursor-pointer">
        {icon}
      </span>

      <span
        className={`
          whitespace-nowrap
          transition-all duration-200
          cursor-pointer
          ${active ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
        `}
      >
        {label}
      </span>

      {/* Tooltip (collapsed only) */}
      {!active && (
        <span
          className="
            absolute left-16 top-1/2 -translate-y-1/2
            px-2 py-1 text-xs
            rounded-lg
            bg-[rgba(60,60,67,0.95)] text-white
            opacity-0 scale-95
            pointer-events-none
            transition-all duration-150
            group-hover:opacity-100 group-hover:scale-100
            z-[10000]
            whitespace-nowrap
          "
        >
          {label}
        </span>
      )}
    </Link>
  );
}
