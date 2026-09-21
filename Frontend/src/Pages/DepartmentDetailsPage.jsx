import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { defaultProfile } from "../assets";
import EmployeesTable from "../EmployeesTable";
import Skeleton from "./Skeleton";
import EditHeadModal from "../EditHeadModal";
import AddPositionModal from "../AddPositionModal";
import { ShieldCheck } from "lucide-react";

export default function DepartmentDetailsPage() {
  const [loading, setLoading] = useState(true); 
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const [headProfileImage, setHeadProfileImage] = useState(null);
  const [isEditHeadModalOpen, setIsEditHeadModalOpen] = useState(false);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);

  const { departmentId } = useParams();

  const fetchDepartmentDetails = async () => {
    try {
      const result = await api.get(
        `/Department/GetDepartmentDetails?departmentId=${departmentId}`,
      );

      if (result.data) {
        setDepartmentDetails(result.data);
        fetchProfileImage(result.data.headId);
      }
    } catch (error) {
      toast.error("Error while fetching department details");
      console.log("Error while fetching department details.", error);
    }
    finally { 
      setLoading(false); 
    }
  };

  const fetchProfileImage = async (employeeId) => {
    try {
      const image = await api.get(
        `/Employee/GetProfileImage?employeeId=${employeeId}`,
        {
          responseType: "blob",
        },
      );

      const imageBlob = image.data;
      const imageObjectURL = URL.createObjectURL(imageBlob);
      setHeadProfileImage(imageObjectURL);
    } catch (error) {
      console.log("Error while fetching employee's profile picture", error);
    }
  };

  useEffect(() => {
    fetchDepartmentDetails();
  }, []);

  function getInitials(str) {
    if (str?.length == 2) {
      return str;
    }

    const words = str?.split(" ");
    const firstInitial = words[0]?.charAt(0).toUpperCase();
    const secondInitial = words[1]?.charAt(0).toUpperCase();

    return secondInitial ? firstInitial + secondInitial : firstInitial;
  }

  const handleCloseEditHeadModal = () => {
    setIsEditHeadModalOpen(false);
    fetchDepartmentDetails();
  };

  const handleCloseAddPositionModal = () => {
    setIsAddPositionModalOpen(false);
    fetchDepartmentDetails();
  };

  return (
    <div className="min-h-screen text-gray-800 font-sans space-y-4">
      {loading && <Skeleton />}

      {departmentDetails && (
        <>
          {isEditHeadModalOpen && (
            <EditHeadModal
              departmentId={departmentId}
              closeModal={handleCloseEditHeadModal}
            />
          )}
          {isAddPositionModalOpen && (
            <AddPositionModal
              departmentId={departmentId}
              departmentName={departmentDetails?.name}
              closeModal={handleCloseAddPositionModal}
            />
          )}

          {/* Top section */}
          <div>
            <div className="bg-white dark:bg-gray-800 dark:border-gray-700 dark:border rounded-lg shadow p-6 w-full">
              <div className="flex items-center gap-5 relative py-6">
                <div className="relative inline-flex items-center justify-center w-33 h-33 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                  <span className="font-medium text-[3.6rem] text-white dark:text-gray-300">
                    {getInitials(departmentDetails?.name)}
                  </span>
                </div>

                <div>
                  <h2 className="text-[1.8rem] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {departmentDetails?.name}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-1">
                    <svg
                      class="mt-[2px] w-[16px] h-[16px] text-gray-500 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-width="2"
                        d="M5 7h14M5 12h14M5 17h10"
                      />
                    </svg>
                    {departmentDetails?.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="#employees"
              className="flex flex-col h-auto justify-center min-w-[20vw] p-6 px-15 bg-white rounded-2xl shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-center cursor-pointer"
            >
              <h5 className="text-[4.5rem] font-bold text-gray-750 dark:text-white">
                {departmentDetails?.totalEmployees}
              </h5>
              <p className="font-normal text-gray-700 dark:text-gray-400 text-xl">
                Total employees
              </p>
            </a>

            <a
              href="#positions"
              className="flex flex-col h-auto justify-center min-w-[20vw] p-6 px-15 bg-white rounded-2xl shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-center cursor-pointer"
            >
              <h5 className="text-[4.5rem] font-bold text-gray-750 dark:text-white">
                {departmentDetails?.positionsCount}
              </h5>
              <p className="font-normal text-gray-700 dark:text-gray-400 text-xl">
                Positions
              </p>
            </a>

            <div className="flex-grow bg-gradient-to-br from-[#ffffff]  to-[#fff5c7]  dark:border-gray-700 dark:border rounded-lg shadow p-6">
              <div className="flex items-center gap-5 relative py-6">
                {/* <img src={profileImage ?? defaultProfile} alt="User" className="w-32 h-32 rounded-full object-cover" /> */}
                <img
                  src={headProfileImage ?? defaultProfile}
                  alt="Head"
                  className="w-32 h-32 rounded-full object-cover p-[3px] ring-yellow-500 ring-4"
                />

                {departmentDetails?.headId ? (
                  <div>
                <span className="inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Head of Department
                </span>

                    <h2 className="text-[1.8rem] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {departmentDetails?.headName}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-1">
                      <svg
                        className="mt-[2px] w-[16px] h-[16px] text-gray-500 dark:text-white"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4Zm10 5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-8-5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm1.942 4a3 3 0 0 0-2.847 2.051l-.044.133-.004.012c-.042.126-.055.167-.042.195.006.013.02.023.038.039.032.025.08.064.146.155A1 1 0 0 0 6 17h6a1 1 0 0 0 .811-.415.713.713 0 0 1 .146-.155c.019-.016.031-.026.038-.04.014-.027 0-.068-.042-.194l-.004-.012-.044-.133A3 3 0 0 0 10.059 14H7.942Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {departmentDetails?.headPosition}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <h2 className="text-[1.8rem] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        Head not assigned
                      </h2>
                      <p className="text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-1">
                        Use the Edit button to assign a Head of Department.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
                onClick={() => setIsEditHeadModalOpen(true)}
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
          </div>

          {/* Employees */}

          <div id="employees">
            <EmployeesTable departmentId={departmentId} />
          </div>

          <div id="positions" className="flex-1 flex">
            <div className="w-full bg-white rounded-lg shadow-md border dark:bg-gray-800 p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide">
                  Positions
                </h3>
                <div
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 cursor-pointer"
                  onClick={() => setIsAddPositionModalOpen(true)}
                >
                  + Add new
                </div>
              </div>
              <div className="flow-root">
                {departmentDetails?.positions.length === 0 && (
                  <div className="text-[14px] text-gray-400 text-base py-12">
                    No positions yet. Be the first to add one today!
                  </div>
                )}

                <ul
                  role="list"
                  className="divide-y divide-gray-200 dark:divide-gray-700"
                >
                  {departmentDetails?.positions.map((position) => (
                    <li className="py-3 sm:py-4">
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0 ms-4">
                          <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                            {position.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                            {position.description}
                          </p>
                        </div>
                        <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                          <div className="relative max-w-sm">
                            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                              <svg
                                class="w-4 h-4 text-gray-500 dark:text-gray-400"
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
                            </div>
                            <div
                              datepicker
                              id="default-datepicker"
                              type="text"
                              className="bg-gray-50 border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            >
                              {position.totalEmployees} employees
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
        </>
      )}
    </div>
  );
}
