import { getFormattedDateRange } from "./utils/dateFormatter";
import api from "./utils/axiosInstance";
import { toast } from "react-toastify";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";
import { Check } from "lucide-react";

export default function AbsenceDetailsModal({ events, closeModal, employeePortal = false, employeeId = null }) {


  const handleCancelAbsence = async (id) => {
    var cancelPromise = api
      .patch(`/Absence/CancelAbsence?absenceId=${id}`); 

    await toast.promise(cancelPromise, {
      pending: "Absence cancelling...",
      success: "Absence cancelled",
      error: "Error while cancelling the absence",
    });

    closeModal();
  };

  const handleWithdrawnAbsence = async (id) => { 

    if (!employeeId) { 
      toast.error("Can not withdrawn absence. Employee details missing.");
      return;
    }

    var withdrawnPromise = api
      .patch(`/Absence/WithdrawnAbsence?absenceId=${id}&employeeId=${employeeId}`); 

    await toast.promise(withdrawnPromise, {
      pending: "Absence withdrawing...",
      success: "Absence withdrawn",
      error: "Error while withdrawing the absence",
    });

    closeModal();
  }

  const handleApprove = async (id) => {
    var approvePromise = api.patch(`/Absence/ApproveAbsence?absenceId=${id}`);

    await toast.promise(approvePromise, {
      pending: "Absence approving...",
      success: "Absence approved",
      error: "Error while approving the absence",
    });
    closeModal();
  };

  const handleReject = async (id) => {
    var approvePromise = api.patch(`/Absence/RejectAbsence?absenceId=${id}`);

    await toast.promise(approvePromise, {
      pending: "Absence rejecting...",
      success: "Absence rejected",
      error: "Error while rejecting the absence",
    });
    closeModal();
  };

    function parseYMDLocal(ymd) { 
    const [y,m,d] = ymd.split("-").map(Number); 
    return new Date(y, m-1, d, 0, 0, 0, 0); 
  }

  return (
    <div
      id="absenceDetailsModal"
      tabIndex="-1"
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 min-h-screen"
    >
      <div className="relative w-full max-w-2xl p-4">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800 dark:border dark:border-gray-700">
          {/* <!-- Modal header --> */}
          <div className="flex items-start justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Absence details
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 flex items-center justify-center dark:hover:bg-gray-700 dark:hover:text-white"
              data-modal-hide="editUserModal"
              onClick={closeModal}
            >
              <span className="sr-only">Close modal</span>
              <svg
                className="w-3 h-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M1 1l12 12M13 1L1 13"
                />
              </svg>
            </button>
          </div>

          {/* <!-- Modal body --> */}
          <div className="px-6 divide-y divide-gray-200">
            {events.map((event) => (
              <div className="flex justify-between items-start w-full py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <div
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-white shadow-md
                        ${event.status === "Pending" ? "bg-gray-400" : EVENT_COLORS[event.type]}`}
                    >
                      {EVENT_ICONS[event.type]}
                    </div>
                    <span>
                      {event.type}{" "}
                      {event.status == "Pending" && "(Pending)"}{" "}
                    </span>
                  </div>
                  <span className="text-gray-600 text-sm">
                    {getFormattedDateRange(event.start, event.end)}
                  </span>
                </div>

                {employeePortal && event.status === "Pending" && (
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      className="text-gray-500 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm px-5 py-1.5 mr-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                      onClick={() => handleWithdrawnAbsence(event.id)}
                    >
                      Withdrawn
                    </button>
                  </div>
                )}

                {!employeePortal &&
                event.type != "Birthday" &&
                event.type != "Employment Anniversary" ? (
                  event.status == "Pending" ? (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        className="text-gray-500 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm px-5 py-1.5 mr-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        onClick={() => handleReject(event.id)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm px-3 py-1.5 flex justify-center items-center gap-1"
                        onClick={() => handleApprove(event.id)}
                      >
                        <Check className="w-3.5 h-3.5 mt-[1px]" />
                        Approve
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        className="text-gray-500 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm px-5 py-1.5 mr-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        onClick={() => handleCancelAbsence(event.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            ))}
          </div>

          {/* <!-- Modal footer --> */}
          <div className="flex items-center justify-end p-4 border-t border-gray-300 rounded-b dark:border-gray-700 mr-3"></div>
        </div>
      </div>
    </div>
  );
}
