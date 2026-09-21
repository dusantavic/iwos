import { useState } from "react";
import api from "../utils/axiosInstance";
import AsyncSelect from "react-select/async";
import { toast } from "react-toastify";

export default function EmployeeBasicInfoEdit({
  employeeId,
  email,
  country,
  department,
  departmentId,
  position,
  positionId,
  closeModal,
}) {
  const inputFieldClassName =
    "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

  const [deptOption, setDeptOption] = useState(
    departmentId != null && department
      ? { value: departmentId, label: department }
      : null
  );

  const [positionOption, setPositionOption] = useState(
    positionId != null && position
      ? { value: positionId, label: position }
      : null
  );

  const [editedEmployee, setEditedEmployee] = useState({
    contactEmail: email ?? "",
    country: country ?? "",
    departmentId: departmentId,
    positionId: positionId,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEditedEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selectedOption, { name }) => {
    setEditedEmployee((prev) => ({
      ...prev,
      [name]: selectedOption?.value?.toString(),
    }));
  };

  const handleDeptChange = (selectedOption, actionMeta) => {
    setDeptOption(selectedOption);
    setPositionOption(null);
    handleSelectChange(selectedOption, { name: actionMeta.name });
  };

  const handlePositionChange = (selectedOption, actionMeta) => {
    setPositionOption(selectedOption);
    handleSelectChange(selectedOption, { name: actionMeta.name });
  };

  const loadDepartments = async () => {
    const res = await api.get("/Department/GetDepartmentsForSelect");
    return res.data;
  };

  const loadPositions = async () => {
    if (!deptOption) return [];
    const res = await api.get(
      `/Department/GetPositionsForSelectByDepartment?departmentId=${deptOption.value}`
    );
    return res.data;
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const postObj = {
      employeeId,
      contactEmail: editedEmployee.contactEmail || null,
      positionId: editedEmployee.positionId,
      country: editedEmployee.country || null,
    };

    try {
      const postPromise = api.patch("/Employee/EditEmployeeBasicInfo", postObj);
      await toast.promise(postPromise, {
        pending: "Editing basic info...",
        success: "Basic info updated",
        error: "Error while updating basic info",
      });
      closeModal();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div
      id="editUserModal"
      tabIndex="-1"
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 min-h-screen"
    >
      <div className="relative w-full max-w-2xl p-4">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800 dark:border dark:border-gray-700">
          <div className="flex items-start justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Basic Information
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 flex items-center justify-center dark:hover:bg-gray-700 dark:hover:text-white"
              onClick={closeModal}
            >
              <span className="sr-only">Close modal</span>
              <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                name="contactEmail"
                className={inputFieldClassName}
                placeholder="Enter email"
                value={editedEmployee.contactEmail}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                Country <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="country"
                className={inputFieldClassName}
                placeholder="Enter country"
                value={editedEmployee.country}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                Department <span className="text-red-500">*</span>
              </label>
              <AsyncSelect
                name="departmentId"
                cacheOptions
                defaultOptions={true}
                loadOptions={loadDepartments}
                placeholder="Select department"
                onChange={handleDeptChange}
                value={deptOption}
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                Position <span className="text-red-500">*</span>
              </label>
              <AsyncSelect
                name="positionId"
                key={deptOption?.value}
                cacheOptions
                defaultOptions
                loadOptions={loadPositions}
                isDisabled={!deptOption}
                placeholder={deptOption?.value ? "Select position" : "Select department first"}
                className="mt-1"
                onChange={handlePositionChange}
                value={positionOption}
              />
            </div>
          </div>

          <div className="flex items-center justify-end p-4 border-t border-gray-300 rounded-b dark:border-gray-700 mr-3">
            <button
              onClick={handleSubmit}
              className="text-white bg-blue-700 hover:bg-blue-800 rounded-lg text-sm px-5 py-1.5"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
