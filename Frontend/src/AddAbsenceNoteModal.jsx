import { getFormattedDateRange } from "./utils/dateFormatter";
import api from "./utils/axiosInstance";
import { toast } from "react-toastify";
import { EVENT_COLORS, EVENT_ICONS } from "./config/events.config";
import { Check } from "lucide-react";
import { useState } from "react";

export default function AddAbsenceNoteModal({setReturnNote, closeModal}) {

    const [note, setNote] = useState(null); 

    const handleChange = (e) => { 
        setNote(e.target.value);
    }

    const handleSubmit = () => { 
        setReturnNote(note); 
        closeModal();
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
              Add a Note
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
            <label
              className="block mb-2.5 text-sm font-medium text-heading"
            >
              Add your reject note
            </label>
            <textarea
              value={note}
              onChange={handleChange}
              rows="4"
              className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full p-3.5 shadow-xs placeholder:text-body"
              placeholder="Write your note here..."
            ></textarea>
          </div>

          {/* <!-- Modal footer --> */}
          <div className="flex items-center justify-end p-4 border-t border-gray-300 rounded-b dark:border-gray-700 mr-3">
            <button
              type="submit"
              className="text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm px-5 py-1.5"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
