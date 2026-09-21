import { Link } from "react-router-dom";
import { defaultProfile } from "../assets";

export default function NewEmployeesListCard({ newEmployees }) {
  return (
    <div className="p-4 flex-1 max-w-sm bg-white border border-gray-200 rounded-lg shadow-md sm:p-8 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          New employees
        </h5>
        <Link
          to="employees"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
        >
          View all
        </Link>
      </div>

      {/* List */}
      <div className="flow-root">
        <ul
          role="list"
          className="divide-y divide-gray-200 dark:divide-gray-700"
        >
          {newEmployees.map((item) => (
            <li className="py-3 sm:py-4" key={item.id}>
              <Link to={`employee/${item.id}`} className="flex items-center">
                <div className="shrink-0">
                  <img
                    className="w-8 h-8 rounded-full"
                    src={
                      (item.profilePictureSrc == null || item.profilePictureSrc == "") 
                        ? defaultProfile
                        : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.profilePictureSrc}`
                    }
                    alt="Employee's image"
                  />
                </div>
                <div className="flex-1 min-w-0 ms-4">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                    {item.firstName} {item.lastName}
                  </p>
                  <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                    {item.email}
                  </p>
                </div>
                <div className="inline-flex items-center text-xs font-medium text-gray-900 dark:text-white">
                  {item.month}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
