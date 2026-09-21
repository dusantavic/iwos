import { BiBarChartAlt, BiCheckCircle } from "react-icons/bi";
import BarChart2 from "./TodayAvailabilityChart";
import { defaultProfile } from "./assets";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./utils/axiosInstance";
import { toast } from "react-toastify";
import DepartmentsStatsChart from "./DepartmentsStatsChart";
import TodayAvailabilityChart from "./TodayAvailabilityChart";
import { format, parseISO } from "date-fns";

export default function DepartmentsPageStats() {
  const [departmentsStats, setDepartmentsStats] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);

  useEffect(() => {
    const fetchDepartmentsStats = async () => {
      try {
        const response = await api.get("/Department/GetDepartmentsStats");
        setDepartmentsStats(response.data);
      } catch (error) {
        toast.error("Error while fetching departments stats data.");
        console.log("Error while fetching departments stats data", error);
      }
    };

    const fetchDepartmentHeads = async () => {
      try {
        const response = await api.get("/Department/GetDepartmentsHeads");
        setDepartmentHeads(response.data);
      } catch (error) {
        toast.error("Error while fetching departments heads data.");
        console.log("Error while fetching departments heads data", error);
      }
    };

    fetchDepartmentsStats();
    fetchDepartmentHeads();
  }, []);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 mt-3">
          <div className="flex-1">
            <div className="w-full bg-white rounded-lg shadow-md border dark:bg-gray-800 p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700 max-h-[500px]">
              <div className="flex justify-between">
                <div>
                  <h5 className="leading-none text-3xl font-bold text-gray-900 dark:text-white pb-2">
                    {departmentsStats.totalDepartments}
                  </h5>
                  <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                    Total departments
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 text-base font-semibold text-green-500 dark:text-green-500 text-center">
                  <BiBarChartAlt />
                  {departmentsStats.uniformity}% Uniformity
                </div>
              </div>

              <DepartmentsStatsChart
                departmentsStatsData={departmentsStats.departmentsData}
              />
            </div>
          </div>

          <div className="flex-1 flex ">
              <TodayAvailabilityChart />    
          </div>

          <div className="flex-1 flex">
            <div className="w-full bg-white rounded-lg shadow-md border dark:bg-gray-800 p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700 overflow-y-auto max-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
                  Heads of Departments
                </h5>
                <Link
                  to="/employees"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
                >
                  Manage employees
                </Link>
              </div>
              <div className="flow-root">
                <ul
                  role="list"
                  className="divide-y divide-gray-200 dark:divide-gray-700"
                >
                  {departmentHeads.map((head) => (
                    <li className="py-3 sm:py-4">
                      <div className="flex items-center">
                        <div className="shrink-0">
                          <Link to={`/employee/${head.id}`} className="flex items-center">
                          <img
                            className="w-8 h-8 rounded-full"
                            src={
                              (head.profilePictureSrc == null || head.profilePictureSrc == "")
                                ? defaultProfile
                                : `${import.meta.env.VITE_ASSETS_BASE_URL}/${head.profilePictureSrc}`
                            }
                            alt="Profile image"
                          />
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0 ms-4">
                          <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                            {head.fullName}
                          </p>
                          <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                            Head of {head.departmentTitle}
                          </p>
                        </div>
                        <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                          <div className="relative max-w-sm">
                            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                              <svg
                                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                              </svg>
                            </div>
                            <div
                              datepicker
                              id="default-datepicker"
                              type="text"
                              className="bg-gray-50 border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            >
                              {head.currentHeadAssignmentDate
                                ? format(
                                    parseISO(head.currentHeadAssignmentDate),
                                    "dd.MM.yyyy."
                                  )
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
