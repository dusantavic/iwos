import { useEffect, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";

export default function EditHeadModal({ departmentId, closeModal }) {

    const [employees, setEmployees] = useState([]); 
    const [dateOfAssignment, setDateOfAssignment] = useState(new Date().toISOString().split('T')[0]); 
    const [includeAllEmployees, setIncludeAllEmployees] = useState(false); 
    const [headId, setHeadId] = useState(null); 

  useEffect(() => {
    const fetchEmployeesForSelect = async () => {
      try {
        let url = ""; 

        if (includeAllEmployees) { 
            url = "/Employee/GetEmployeesForSelect"; 
        }
        else { 
            url = `/Employee/GetEmployeesForSelect?departmentId=${departmentId}`; 
        }

        const response = await api.get(url);
        setEmployees(response.data);
      } catch (error) {
        toast.error("Error while fetching employees data.");
        console.log(error);
      }
    };

    fetchEmployeesForSelect();
  }, [includeAllEmployees]);

  async function handleSubmit() {
    if (!headId || !dateOfAssignment) {
      toast.error("Check required fields and try again.");
      return;
    }

    var updateDepartmentHeadDto = {
      departmentId: departmentId, 
      headId: headId, 
      assignmentDate: dateOfAssignment
    };

    await api
      .patch("/Department/UpdateDepartmentHead", updateDepartmentHeadDto)
      .then(() => {
        toast.success("Department head updated.");
        closeModal(); 
      })
      .catch((err) => {
        toast.error("Error while updating department head.");
        console.log(err);
      });
  }

  const handleHeadSelect = (e) => {
    setHeadId(e.value); 
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
              Edit Head of Department
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
                Head
              </dt>
              <Select
                name="head"
                options={employees}
                placeholder="Select head of department"
                className="mt-1"
                onChange={handleHeadSelect}
              />
            </dl>

            <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={includeAllEmployees}
                onChange={(e) => setIncludeAllEmployees(e.target.checked)} 
                className="sr-only peer"/>
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-base text-gray-900 dark:text-gray-300">Include all employees</span>
            </label>

            <div className="w-full">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Date of assignment
                </label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]} 
                  onChange={(e) => setDateOfAssignment(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
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
