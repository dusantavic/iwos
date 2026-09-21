import { useState } from "react";
import EmployeePersonalDataEdit from "../EmployeeEditModals/EmployeePersonalDataEdit";

export default function EmployeePersonalData({
  employeeId,
  firstName,
  lastName,
  personalId,
  contractType,
  birthDate,
  refresh,
}) {
  const [editing, setEditing] = useState(false);

  const handleCloseModal = () => {
    setEditing(false);
    refresh();
  };

  const formatDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      {editing && (
        <EmployeePersonalDataEdit
          employeeId={employeeId}
          firstName={firstName}
          lastName={lastName}
          personalId={personalId}
          contractType={contractType}
          birthDate={birthDate}
          closeModal={handleCloseModal}
        />
      )}
      <div className="bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase mb-4 tracking-wide">
          Additional Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 border-b border-t border-gray-200 py-4 dark:border-gray-700 md:py-8">
          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Full Name</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              {firstName} {lastName}
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Personal ID</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              {personalId ?? <span className="italic text-gray-400">Not provided</span>}
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Birth Date</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              {formatDate(birthDate) ?? <span className="italic text-gray-400">Not provided</span>}
            </dd>
          </dl>

          <dl>
            <dt className="font-semibold text-gray-900 dark:text-white">Contract Type</dt>
            <dd className="flex items-center gap-1 text-gray-500 dark:text-gray-300">
              <svg
                className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-400 lg:inline"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Z" />
                <path
                  fillRule="evenodd"
                  d="M11 7V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm4.707 5.707a1 1 0 0 0-1.414-1.414L11 14.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
                  clipRule="evenodd"
                />
              </svg>
              {contractType ?? <span className="italic text-gray-400">Not set</span>}
            </dd>
          </dl>
        </div>
        <button
          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
          onClick={() => setEditing(true)}
        >
          <svg
            className="mr-1 w-[16px] h-[16px] text-white dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z"
              clipRule="evenodd"
            />
          </svg>
          Edit
        </button>
      </div>
    </>
  );
}
