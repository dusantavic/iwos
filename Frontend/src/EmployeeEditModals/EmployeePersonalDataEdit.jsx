import { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import Select from "react-select";
import { toast } from "react-toastify";

export default function EmployeePersonalDataEdit({
  employeeId,
  firstName,
  lastName,
  personalId,
  contractType,
  birthDate,
  closeModal,
}) {
  const inputFieldClassName =
    "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

  const [enumLookups, setEnumLookups] = useState(null);
  const [contractTypeOption, setContractTypeOption] = useState(null);

  const [editedEmployee, setEditedEmployee] = useState({
    firstName,
    lastName,
    personalId: personalId ?? "",
    contractType: "",
    birthDate: birthDate
      ? new Date(birthDate).toISOString().split("T")[0]
      : "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEditedEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handleContractTypeChange = (selectedOption) => {
    setContractTypeOption(selectedOption);
    setEditedEmployee((prev) => ({
      ...prev,
      contractType: selectedOption?.value?.toString() ?? "",
    }));
  };

  const loadEnumLookups = async () => {
    const res = await api.get("/Employee/GetEnumLookups");
    setEnumLookups(res.data);

    const ct = res.data?.contractTypeSelectItems?.find(
      (x) => x.label === contractType
    );
    setContractTypeOption(ct ?? null);
    if (ct) {
      setEditedEmployee((prev) => ({ ...prev, contractType: ct.value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const postObj = {
      employeeId,
      firstName: editedEmployee.firstName,
      lastName: editedEmployee.lastName,
      personalId: editedEmployee.personalId || null,
      contractType: editedEmployee.contractType ? Number(editedEmployee.contractType) : null,
      birthDate: editedEmployee.birthDate || null,
    };

    try {
      const postPromise = api.patch("/Employee/EditEmployeePersonalData", postObj);
      await toast.promise(postPromise, {
        pending: "Editing additional data...",
        success: "Additional data updated",
        error: "Error while updating additional data",
      });
      closeModal();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadEnumLookups();
  }, []);

  return (
    <div
      id="employeeDetailsModal"
      tabIndex="-1"
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 min-h-screen"
    >
      <div className="relative w-full max-w-2xl p-4">
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-800 dark:border dark:border-gray-700">
          <div className="flex items-start justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Additional Data
            </h3>
            <button
              type="button"
              className="text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 flex items-center justify-center dark:hover:bg-gray-700 dark:hover:text-white"
              onClick={closeModal}
            >
              <span className="sr-only">Close modal</span>
              <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={editedEmployee.firstName}
                  onChange={handleChange}
                  className={inputFieldClassName}
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Contract Type <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Select
                  name="contractType"
                  options={enumLookups?.contractTypeSelectItems}
                  placeholder="Select contract type"
                  isClearable
                  className="mt-1"
                  onChange={handleContractTypeChange}
                  value={contractTypeOption}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={editedEmployee.lastName}
                  onChange={handleChange}
                  className={inputFieldClassName}
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Personal ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="personalId"
                  value={editedEmployee.personalId}
                  onChange={handleChange}
                  className={inputFieldClassName}
                  placeholder="Enter personal ID"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Birth Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={editedEmployee.birthDate}
                  onChange={handleChange}
                  className={inputFieldClassName}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end p-4 border-t border-gray-300 rounded-b dark:border-gray-700">
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
