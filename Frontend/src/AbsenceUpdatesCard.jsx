import { useEffect, useState } from "react";
import { EVENT_ICONS, EVENT_COLORS } from "./config/events.config";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";
import { defaultProfile } from "./assets";
import { getFormattedDateRange } from "./utils/dateFormatter";


export default function AbsenceUpdatesCard({aisPage = false}) {
    
    const [updates, setUpdates] = useState(null); 

    useEffect(() => { 
        const fetchRecentUpdates = async () => { 
            try {
                const result = await api.get("/Absence/GetRecentAbsenceUpdates");
                setUpdates(result.data); 
            }
            catch { 
                toast.error("Failed to fetch recent AIS updates");
            }
        }

        fetchRecentUpdates(); 
    }, []); 

    const getStatusBadgeClasses = (status) => {
      switch (status) {
        case "Approved":
          return "bg-blue-700/80 text-white  text-xs font-medium px-1.5 py-0.5 rounded";
        case "Withdrawn":
          return "bg-white border text-xs font-medium px-1.5 py-0.5 rounded";
        case "Cancelled":
          return "bg-white border text-xs font-medium px-1.5 py-0.5 rounded";
        case "Rejected":
          return "bg-white border text-xs font-medium px-1.5 py-0.5 rounded";
        case "Pending":
          return "bg-gray-400/80 border text-white  text-xs font-medium px-1.5 py-0.5 rounded";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

const getStatusText = (status) => {
  return status === "Pending" ? "+ New request" : status;
};

  return (
    <div className="w-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-8 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Latest AIS Updates
        </h5>
        {!aisPage && 
          <Link
            to="/absences"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
          >
            Go to AIS
          </Link>}
      </div>

          {updates?.length === 0 && (
            <div className="text-[14px] text-gray-400 text-base pt-6">
              No new updates in the previous 2 days.
            </div>
          )}
      <div className="flow-root max-h-96 overflow-y-auto">
        <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
          {updates?.map((item) => (
            <li  className="py-3 sm:py-4">
              <div className="flex items-center">
                <div className="relative shrink-0 w-10 h-10">
                  <Link to={`/employee/${item.employeeId}`} className="flex items-center">
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src={
                        item.employeeProfilePic == null ||
                        item.employeeProfilePic == ""
                          ? defaultProfile
                          : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.employeeProfilePic}`
                      }
                      alt="Employee profile"
                    />
                  </Link>
                  <div
                    className={`absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full text-white ring-2 ring-white transition duration-300 ${
                        EVENT_COLORS[item.type]
                    }`}
                  >
                    <span className="scale-75">{EVENT_ICONS[item.type] || "•"}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 ms-4">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                    {item.employeeFullName}
                  </p>
                  <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                    {item.type} • {getFormattedDateRange(item.start,item.end)} • {item.workingDays} days
                  </p>
                </div>

                <div className="inline-flex flex-col items-end text-xs text-gray-400 dark:text-gray-300 cursor-default">
                    {new Date(item.updatedDateTime).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  <span
                    className={`mt-1 px-2 py-0.5 rounded-full font-semibold text-xs ${getStatusBadgeClasses(item.status)}`}
                    >
                    {getStatusText(item.status)}
                    </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}