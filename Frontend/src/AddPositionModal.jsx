import { useEffect, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";

const inputFieldClassName = "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";


export default function AddPositionModal({ departmentId, departmentName, closeModal }) {

    const newPositionObj = { 
        name: "", 
        description: ""
    }; 

    const [newPosition, setNewPosition] = useState(newPositionObj); 

    const handleChange = event => { 
        const {name, value} = event.target; 
        setNewPosition(prev => ({
            ...prev, 
            [name] : value
        }));
    };

  async function handleSubmit() {
    if (!newPosition.name) {
      toast.error("Check required fields and try again.");
      return;
    }

    var createPositionDto = {
      departmentId: departmentId, 
      title: newPosition.name, 
      description: newPosition.description
    };

    await api
      .post("/Department/CreatePosition", createPositionDto)
      .then(() => {
        toast.success("New position created.");
        closeModal();
      })
      .catch((err) => {
        toast.error("Error while creating new position.");
        console.log(err);
      });
  }

  return (
    <div
      id="editHeadModal"
      tabIndex="-1"
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 min-h-screen"
    >
      <div className="relative w-full max-w-2xl p-4">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800 dark:border dark:border-gray-700">
          {/* <!-- Modal header --> */}
          <div className="flex items-start justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add new position
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
          <div className="p-6 space-y-4">
            <dl>
              <dt className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Department
              </dt>
              <dd className="flex items-center gap-1">
                <input
                  type="text"
                  className={inputFieldClassName}
                  value={departmentName}
                  disabled={true}
                />
              </dd>
            </dl>

            <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Position name
              </dt>
              <dd className="flex items-center gap-1">
                <input
                  type="text"
                  className={inputFieldClassName}
                  placeholder="Enter position name"
                  name="name"
                  onChange={handleChange}
                />
              </dd>
            </dl>

                        <dl>
              <dt className="font-semibold text-gray-900 dark:text-white">
                Description
              </dt>
              <dd className="flex items-center gap-1">
                <input
                  type="text"
                  className={inputFieldClassName}
                  placeholder="Enter position description"
                  name="description"
                  onChange={handleChange}
                />
              </dd>
            </dl>
          </div>

          {/* <!-- Modal footer --> */}
          <div className="flex items-center justify-end p-4 border-t border-gray-300 rounded-b dark:border-gray-700 mr-3">
            {/* <button data-modal-hide="editUserModal" type="button" className="text-gray-500 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm px-5 py-1.5 mr-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                            Cancel
                        </button> */}
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
