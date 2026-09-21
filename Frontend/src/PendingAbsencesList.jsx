import React, { useEffect, useState } from "react";
import { ChevronDown, Check, X, Clock, Calendar } from "lucide-react";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";
import { defaultProfile } from "./assets";
import { Link } from "react-router-dom";
import { formatDate } from "./utils/dateFormatter";

const mockRequests = [
  {
    id: "req-101",
    fullName: "Bonnie Green",
    employeePic:
      "https://flowbite.com/docs/images/people/profile-picture-3.jpg",
    type: "Vacation",
    startDate: "Mar 12, 2026",
    endDate: "Mar 15, 2026",
    requestedAt: "Today, 09:42 AM",
    status: "pending",
  },
  {
    id: "req-102",
    fullName: "Jese Leos",
    employeePic:
      "https://flowbite.com/docs/images/people/profile-picture-2.jpg",
    type: "Sick Leave",
    startDate: "Mar 10, 2026",
    endDate: "Mar 11, 2026",
    requestedAt: "Yesterday, 04:15 PM",
    status: "pending",
  },
  {
    id: "req-103",
    fullName: "Thomas Lean",
    employeePic:
      "https://flowbite.com/docs/images/people/profile-picture-5.jpg",
    type: "Vacation",
    startDate: "Mar 20, 2026",
    endDate: "Mar 22, 2026",
    requestedAt: "Mar 08, 11:20 AM",
    status: "pending",
  },
  {
    id: "req-104",
    fullName: "Lana Byrd",
    employeePic:
      "https://flowbite.com/docs/images/people/profile-picture-4.jpg",
    type: "Vacation",
    startDate: "Apr 01, 2026",
    endDate: "Apr 01, 2026",
    requestedAt: "Mar 07, 02:00 PM",
    status: "pending",
  },
];

export default function PendingAbsencesList({ refreshFlag, open = false, setRefreshPendingFlag }) {
  const [requests, setRequests] = useState([]);
  const [isExpanded, setIsExpanded] = useState(open);

  const fetchPendingAbsences = async () => {
    try {
      const response = await api.get("/Absence/GetPendingRequests");
      setRequests(response.data);
    } catch (err) {
      toast.error("Error while fetching pending requests");
    }
  };

  useEffect(() => {
    fetchPendingAbsences();
  }, [refreshFlag]);

  const handleApprove = async (id) => {
    var approvePromise = api.patch(
      `/Absence/ApproveAbsence?absenceId=${id}`,
    );

    await toast.promise(approvePromise, {
      pending: "Absence approving...",
      success: "Absence approved",
      error: "Error while approving the absence",
    });
    fetchPendingAbsences();
    setRefreshPendingFlag(!refreshFlag); 
  };

  const handleReject = async (id) => {
    var approvePromise = api.patch(
      `/Absence/RejectAbsence?absenceId=${id}`,
    );

    await toast.promise(approvePromise, {
      pending: "Absence rejecting...",
      success: "Absence rejected",
      error: "Error while rejecting the absence",
    });
    fetchPendingAbsences();
    setRefreshPendingFlag(!refreshFlag); 
  };

  return (
    <div className="w-full border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-4 font-medium text-left text-gray-500 border-b border-gray-200 rounded-t-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-400"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Pending Absence Requests ({requests.length})
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Collapsible Scrollable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 shadow-sm ${isExpanded ? "max-h-[450px] overflow-y-auto" : "max-h-0"}`}
      >
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {requests.map((item) => (
            <li
              key={item.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Employee Info Section */}
                <div className="flex items-center gap-3">
                  <Link
                    to={`employee/${item.employeeId}`}
                    className="flex items-center"
                  >
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src={
                        item.profilePictureSrc == null ||
                        item.profilePictureSrc == ""
                          ? defaultProfile
                          : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.profilePictureSrc}`
                      }
                      alt="Employee profile"
                    />
                  </Link>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {item.employeeFullName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Requested on {formatDate(item.requestedDateTime)}
                    </p>
                  </div>
                </div>

                {/* Status Badge (Flowbite style) */}
                <span
                  className={`${EVENT_COLORS[item.type]} text-white text-[10px] font-medium px-2 py-0.5 rounded uppercase flex flex-row items-center gap-1`}
                >
                  {EVENT_ICONS[item.type]} {item.type}
                </span>
              </div>

              {/* Date Details Box */}
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 w-fit">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-[12px] font-medium text-gray-600 dark:text-gray-300">
                  {formatDate(item.start)} <span className="mx-1 text-gray-300">→</span>{" "}
                  {formatDate(item.end)}
                </p>
              </div>

              {/* Action Buttons: Full Width Horizontal */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-red-700 focus:ring-4 focus:ring-gray-100 transition-all dark:bg-gray-800 dark:text-red-500 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </li>
          ))}

          {requests.length === 0 && (
            <li className="p-8 text-center text-gray-500 text-sm">
              All caught up! No pending requests.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
