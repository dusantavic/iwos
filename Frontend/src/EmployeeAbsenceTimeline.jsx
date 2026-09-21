import { useEffect, useState } from "react";
import defaultApi from "./utils/axiosInstance";
import { getFormattedDateRange } from "./utils/dateFormatter";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";

export default function EmployeeAbsenceTimeline({ employeeId, refreshFlag, api = defaultApi }) {
  const [absenceHistory, setAbsenceHistory] = useState([]);

  useEffect(() => {
    const fetchAbsenceHistory = async () => {
      try {
        const response = await api.get(
          `/Absence/GetEmployeeAbsenceHistory?employeeId=${employeeId}`,
        );
        setAbsenceHistory(response.data);
      } catch (error) {
        console.log("Error while fetching absence history.", error);
      }
    };

    fetchAbsenceHistory();
  }, [refreshFlag]);

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

  return (
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
  <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide">
    Absence History
  </h3>

  <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 mt-6 border-t border-gray-200 dark:border-gray-700 py-6 md:py-3">
    {absenceHistory.length === 0 && (
      <div className="text-[14px] text-gray-400 text-base pt-6">
        No absences to show.
      </div>
    )}

    {absenceHistory.map((e, index) => (
      <div key={index} className="py-4 md:py-3 flex items-start md:items-center gap-3">
        {/* Icon container */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${EVENT_COLORS[e.type]} scale-[0.8] mt-1 md:mt-0`}
        >
          {EVENT_ICONS[e.type]}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
            <div className="flex flex-col">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {e.type}
              </h4>
              {e.type === "Vacation" && (
                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                  {e.workingDays == 1
                    ? `1 working day`
                    : `${e.workingDays} working days`}
                </p>
              )}
            </div>

            <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3">
              <span
                className={`px-2 py-0.5 rounded-full font-semibold text-xs ${getStatusBadgeClasses(e.status)} text-gray-400`}
              >
                {e.status}
              </span>

              {/* Date chip */}
              <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white w-fit bg-gray-100/80 rounded-lg p-1">
                <div className="flex flex-row items-center justify-center gap-1">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-white shrink-0"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd" />
                  </svg>
                  <div className="text-gray-900 text-xs rounded-lg block w-full dark:text-white whitespace-nowrap">
                    {getFormattedDateRange(e.start, e.end)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
  );
}
