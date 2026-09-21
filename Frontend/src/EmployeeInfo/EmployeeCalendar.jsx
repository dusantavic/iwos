import { useEffect, useState } from "react";
import "react-day-picker/dist/style.css";
import classNames from "classnames";
import CalendarsComponent from "../CalendarsComponent";
import { addMonths } from "date-fns";
import NewAbsenceModal from "../NewAbsenceModal";
import UpcomingEventsComponent from "../UpcomingEventsComponent";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { formatDate } from "../utils/dateFormatter";
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  TrendingUp,
} from "lucide-react";
import { useTransitionStatus } from "@floating-ui/react";

export default function EmployeeCalendar({
  employeeId,
  triggerAbsencesTimelineRefreshFlag,
}) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState(false);
  const [editAllowanceValue, setEditAllowanceValue] = useState(null);

  const [refreshUpcomingEvents, setRefreshUpcomingEvents] = useState(false);
  const [isCompactView, setIsCompactView] = useState(true);

  const [absenceStats, setAbsenceStats] = useState(null);

  function firstOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  const [startDate, setStartDate] = useState(firstOfMonth(new Date()));

  const fecthEmployeeAbsenceStats = async () => {
    try {
      const result = await api.get(
        `/Absence/GetEmployeeAbsenceStats?employeeId=${employeeId}`,
      );
      setAbsenceStats(result.data);
      setEditAllowanceValue(result.data.annualTotalAllowance);
    } catch (err) {
      toast.error("Error while fetching absence stats");
    }
  };

  const handleSaveEditingAllowance = async () => {
    setEditingAllowance(false);
    const patchPromise = api.patch(
      `/Absence/UpdateAnnualVacationDays?employeeId=${employeeId}&annualDays=${editAllowanceValue}`,
    );

    await toast.promise(patchPromise, {
      pending: "Updating total allowance days...",
      error: "Updating total allowance days failed",
      success: `Total allowance days updated for ${new Date().getFullYear()}`,
    });

    await fecthEmployeeAbsenceStats();
  };

  const handlePrev = () => {
    setStartDate((prev) => addMonths(prev, -1));
  };

  const handleNext = () => {
    setStartDate((prev) => addMonths(prev, 1));
  };

  const handleCloseNewModal = () => {
    setIsNewModalOpen(false);
    setStartDate(firstOfMonth(new Date()));
    setRefreshUpcomingEvents(true);
    triggerAbsencesTimelineRefreshFlag();
  };

  const handleNewModalButtonClick = () => {
    setIsNewModalOpen(true);
  };

  useEffect(() => {
    fecthEmployeeAbsenceStats();
  }, []);

  return (
    <>
      {isNewModalOpen && (
        <NewAbsenceModal
          closeModal={handleCloseNewModal}
          employeeId={employeeId}
        />
      )}

      <div className="w-full bg-white rounded-lg shadow relative dark:bg-gray-800 dark:border-gray-700 dark:border">
        {/* Header and navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mx-6 py-4 border-b border-gray-200 dark:border-gray-700 gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide flex items-center">
            Calendar
          </h3>

          <div className="flex gap-4 items-center">
            <div className="relative group inline-block">
              <button
                onClick={() => setIsCompactView(false)}
                className={`p-2 rounded-full ${
                  !isCompactView ? "bg-gray-300" : "hover:bg-gray-200"
                }`}
                aria-label="List view"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 4H4m0 0v4m0-4 5 5m7-5h4m0 0v4m0-4-5 5M8 20H4m0 0v-4m0 4 5-5m7 5h4m0 0v-4m0 4-5-5"
                  />
                </svg>
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
                Extended view
              </div>
            </div>

            <div className="relative group inline-block">
              <button
                onClick={() => setIsCompactView(true)}
                className={`p-2 rounded-full ${
                  isCompactView ? "bg-gray-300" : "hover:bg-gray-200"
                }`}
                aria-label="Grid view"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 5v14M9 5v14M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
                  />
                </svg>
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
                Compact view
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrev}
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={handleNext}
                type="button"
                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col lg:flex-row gap-24 p-6 mt-3">
          <div
            className={classNames("w-full", {
              "max-w-3xl": isCompactView,
              "max-w-full": !isCompactView,
            })}
          >
            <CalendarsComponent
              isCompactView={isCompactView}
              startDate={startDate}
              employeeId={employeeId}
            />
          </div>

          {isCompactView && (
            <UpcomingEventsComponent
              employeeId={employeeId}
              refreshFlag={refreshUpcomingEvents}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mx-6">
          {/* Card 1: Remaining */}
          <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                YTD
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {absenceStats?.remainingVacationDays}
              </h3>
              <p className="text-sm font-medium items-center text-gray-500 dark:text-gray-400 mt-1 flex flex-row">
                {absenceStats?.remainingVacationDays == 1 ? "Remaining Day" : "Remaining Days"}
                {absenceStats?.remainingVacationDaysPending > 0 && (
                  <span class="bg-gray-100 ml-2 gap-1 flex items-center text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300">
                    <Clock className="w-2.5 h-2.5 mt-[2px]" />
                    {absenceStats?.remainingVacationDaysPending}
                      {absenceStats?.remainingVacationDaysPending == 1 ? "day" : "days"} pending
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{
                    width: `${(absenceStats?.remainingVacationDays / absenceStats?.annualTotalAllowance) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-400">
                  {(
                    (absenceStats?.remainingVacationDays /
                      absenceStats?.annualTotalAllowance) *
                    100
                  ).toFixed(0)}
                  % of total allowance
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {absenceStats?.annualTotalAllowance} total
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Carried Over */}
          <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-50 rounded-lg dark:bg-amber-900/30">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                EXPIRES JUN 30
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {absenceStats?.remainingCarriedOverDays}
              </h3>
              <p className="text-sm font-medium items-center text-gray-500 dark:text-gray-400 mt-1 flex flex-row">
                {absenceStats?.remainingCarriedOverDays == 1 ? "Carried Over Day" : "Carried Over Days"}
                {absenceStats?.remainingCarriedOverDaysPending > 0 && (
                  <span class="bg-gray-100 ml-2 gap-1 flex items-center text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-sm dark:bg-gray-700 dark:text-gray-300">
                    <Clock className="w-2.5 h-2.5 mt-[2px]" />
                    {absenceStats?.remainingCarriedOverDaysPending} 
                    {absenceStats?.remainingCarriedOverDaysPending == 1 ? "day" : "days"} pending
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                <div
                  className="bg-amber-600 h-1.5 rounded-full"
                  style={{
                    width: `${absenceStats?.carriedOverTotalAllowance == 0 ? 0 : (absenceStats?.remainingCarriedOverDays / absenceStats?.carriedOverTotalAllowance) * 100}%`,
                  }}
                ></div>
              </div>

              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-400">
                  {absenceStats?.carriedOverTotalAllowance == 0 ? 0 : (
                    (absenceStats?.remainingCarriedOverDays /
                      absenceStats?.carriedOverTotalAllowance) *
                    100
                  ).toFixed(0)}
                  % of total allowance
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {absenceStats?.carriedOverTotalAllowance} total
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Used */}
          <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-green-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              {/* <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold"
                    >
                      HR
                    </div>
                  ))}
                </div> */}
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {absenceStats?.pendingRequestsNumber}
              </h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                 {absenceStats?.pendingRequestsNumber == 1 ? "Pending Request" : "Pending Requests"}
              </p>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{
                    width: `${(absenceStats?.approvedRequestsNumber / (absenceStats?.approvedRequestsNumber + absenceStats?.pendingRequestsNumber)) * 100}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-400 font-medium">
                  {absenceStats?.approvedRequestsNumber} Approved
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {absenceStats?.pendingRequestsNumber} Pending
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Allowance */}
          <div className="relative p-5 bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-gray-800 dark:border-gray-700 group hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <Pencil
                className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors"
                onClick={() => setEditingAllowance(true)}
              />
            </div>
            <div className="relative z-10">
              {editingAllowance ? (
                <input
                  type="number"
                  value={editAllowanceValue}
                  autoFocus
                  onChange={(e) =>
                    setEditAllowanceValue(Number(e.target.value))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSaveEditingAllowance()
                  }
                  onBlur={() => setEditingAllowance(false)}
                  className="text-3xl font-extrabold bg-transparent border-b border-blue-300 focus:outline-none w-24"
                />
              ) : (
                <h3 className="text-3xl font-extrabold">
                  {absenceStats?.annualTotalAllowance}
                </h3>
              )}
              <p className="text-sm font-medium text-gray-500 mt-1">
                Total Allowance
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
              <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                Contract {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-6 mt-3 pb-6 flex border-t border-gray-200 dark:border-gray-700">
          <button
            className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
            onClick={handleNewModalButtonClick}
          >
            <svg
              className="mr-1 w-[14px] h-[14px] text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M18 5.05h1a2 2 0 0 1 2 2v2H3v-2a2 2 0 0 1 2-2h1v-1a1 1 0 1 1 2 0v1h3v-1a1 1 0 1 1 2 0v1h3v-1a1 1 0 1 1 2 0v1Zm-15 6v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3ZM11 18a1 1 0 1 0 2 0v-1h1a1 1 0 1 0 0-2h-1v-1a1 1 0 1 0-2 0v1h-1a1 1 0 1 0 0 2h1v1Z"
                clipRule="evenodd"
              />
            </svg>
            Create new absence
          </button>
        </div>
      </div>
    </>
  );
}
