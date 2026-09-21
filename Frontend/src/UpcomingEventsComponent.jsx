import { useEffect, useState } from "react";
import api from "./utils/axiosInstance";
import { getFormattedDateRange } from "./utils/dateFormatter";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";

export default function UpcomingEventsComponent({ employeeId, refreshFlag }) {
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const response = await api.get(
          `/Employee/GetUpcomingEvents?employeeId=${employeeId}`
        );
        setUpcomingEvents(response.data);
      } catch (error) {
        console.log("Error while fetching upcoming events.", error);
      }
    };

    fetchUpcomingEvents();
  }, [refreshFlag]);

  return (
    <>
      <div className="-ml-5 w-full lg:w-1/2">
        <h3 className="mb-3 font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-300">
          <svg
            className="mt-[1px] w-[16px] h-[16px] text-gray-600 dark:text-gray-300"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
              clipRule="evenodd"
            />
          </svg>
          Upcoming approved events
        </h3>
        <ul
          role="list"
          className="divide-y divide-gray-200 dark:divide-gray-700"
        >
          {upcomingEvents?.length ? (
            <>
              {upcomingEvents.map((e) => (
                <li className="py-3 sm:py-4">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-white transition duration-300 ${
                          EVENT_COLORS[e.type]
                        }`}
                      >
                        {EVENT_ICONS[e.type]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 ms-4">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                        {e.type}
                      </p>
                      <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                        {e.daysRemaining > 0
                          ? `in ${e.daysRemaining} ${e.daysRemaining == 1 ? "day" : "days"}`
                          : "currently active"}
                      </p>
                    </div>
                    <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
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
                          {getFormattedDateRange(e.start, e.end)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </>
          ) : (
            <div className="text-[14px] text-gray-400 text-base pt-6">
              No upcoming approved events in the next 2 months.
            </div>
          )}
        </ul>
      </div>
    </>
  );
}
