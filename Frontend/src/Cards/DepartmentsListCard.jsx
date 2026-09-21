import { Link } from "react-router-dom";

function getInitials(str) {
  if (str.length == 2) {
    return str;
  }

  const words = str.split(" ");
  const firstInitial = words[0]?.charAt(0).toUpperCase();
  const secondInitial = words[1]?.charAt(0).toUpperCase();

  return secondInitial ? firstInitial + secondInitial : firstInitial;
}

export default function DepartmentsListCard({ departments }) {
  return (
    <>
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-md sm:p-8 dark:bg-gray-800 dark:border-gray-700 w-full cursor-default">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
            Largest departments
          </h5>
          <Link
            to="departments"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
          >
            Manage departments
          </Link>
        </div>

        {/* List */}
        <div className="flow-root">
          <ul
            role="list"
            className="divide-y divide-gray-200 dark:divide-gray-700"
          >
            {departments?.map((item) => (
              <li className="py-3 sm:py-4">
                <div className="flex items-center">
                  <div className="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                    <span className="font-medium text-[1rem] text-white dark:text-gray-300">
                      {getInitials(item.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 ms-4">
                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                      {item.head}
                    </p>
                  </div>
                  <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    <svg
                      class="w-4 h-4 mr-2 mt-[2px] text-gray-900 dark:text-gray-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M12 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.5 8a4 4 0 0 0-4 4 2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-3Zm6.82-3.096a5.51 5.51 0 0 0-2.797-6.293 3.5 3.5 0 1 1 2.796 6.292ZM19.5 18h.5a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-1.1a5.503 5.503 0 0 1-.471.762A5.998 5.998 0 0 1 19.5 18ZM4 7.5a3.5 3.5 0 0 1 5.477-2.889 5.5 5.5 0 0 0-2.796 6.293A3.501 3.501 0 0 1 4 7.5ZM7.1 12H6a4 4 0 0 0-4 4 2 2 0 0 0 2 2h.5a5.998 5.998 0 0 1 3.071-5.238A5.505 5.505 0 0 1 7.1 12Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    {item.employeesCount} EMPLOYEES
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
