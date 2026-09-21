import { useEffect, useState } from "react";
import { defaultProfile } from "./assets";
import api from "./utils/axiosInstance";
import { toast } from "react-toastify";
import { getFormattedDateRange } from "./utils/dateFormatter";
import { Link } from "react-router-dom";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";

export default function UpcomingAbsencesCard({viewAll = true}) {
  const [upcomingAbsences, setUpcomingAbsences] = useState([]);

  const fetchUpcomingAbsences = async () => {
    try {
      const response = await api.get("/Employee/GetUpcomingAbsences");
      setUpcomingAbsences(response.data);
    } catch (error) {
      toast.error("Error while fetching upcoming absences");
      console.log("Error while fetching upcoming absences", error);
    }
  };

  useEffect(() => {
    fetchUpcomingAbsences();
  }, []);


const getLabelBadgeClasses = (label) => {
  const baseClasses = "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition-all";

  const styles = {
    "Current": "bg-blue-500 text-white ring-1 ring-inset ring-blue-500/30",
    "Upcoming next week": "bg-gray-500/10 text-gray-600 ring-1 ring-inset ring-gray-500/20",
    "Upcoming soon": "bg-gray-400/5 text-gray-400 ring-1 ring-inset ring-gray-400/10",
  };

  return `${baseClasses} ${styles[label] || "text-gray-400"}`;
};
    
  return (
    <div className="w-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-8 dark:bg-gray-800 dark:border-gray-700" >
      <div className="flex items-start justify-between mb-4">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Current and upcoming absences
          <p className="text-gray-500 text-xs font-normal mt-3">View current and upcoming approved absences.</p>
        </h5>
        {viewAll && <Link
          to="/absences"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
        >
          View all
        </Link>}
      </div>

      <div className="flow-root max-h-96 overflow-y-auto">
        <ul
          role="list"
          className="divide-y divide-gray-200 dark:divide-gray-700"
        >
          {upcomingAbsences.map((item) => (
            <li className="py-3 sm:py-4">
              <div className="flex items-center">
                <div className="relative shrink-0 w-10 h-10">
                  {/* Profile Image */}

                  <Link
                    to={`employee/${item.employeeId}`}
                    className="flex items-center"
                  >
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src={
                        (item.profilePictureSrc == null || item.profilePictureSrc == "")
                          ? defaultProfile
                          : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.profilePictureSrc}`
                      }
                      alt="Employee profile"
                    />
                  </Link>
                  {/* Event Status Badge */}
                  <div
                    className={`absolute -bottom-1 -right-1 
                flex items-center justify-center 
                w-5 h-5 rounded-full 
                text-white 
                ring-2 ring-white 
                transition duration-300 
                ${EVENT_COLORS[item.type]}`}
                  >
                    <span className="scale-75">{EVENT_ICONS[item.type]}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 ms-4">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                    {item.fullName}
                  </p>
                  <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                    {item.type}
                  </p>
                </div>
                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white gap-1">
                  <span
                    className={`text-gray-400 mt-1 px-2 py-0.5 rounded-full font-semibold text-xs ${getLabelBadgeClasses(item.label)}`}
                    >
                    {item.label}
                    </span>
                  <div className="relative max-w-sm">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                      </svg>
                    </div>
                    <div
                      type="text"
                      className="bg-gray-50 border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    >
                      {getFormattedDateRange(item.start, item.end)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
