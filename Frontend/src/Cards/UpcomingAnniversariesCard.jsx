import { useEffect, useState } from "react";
import { defaultProfile } from "../assets";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";


export default function UpcomingAnniversariesCard() {

    const [upcomingAnniversaries, setUpcomingAnniversaries] = useState([]); 

    const fetchUpcomingAnniversaries = async () => { 
        try { 
            const response = await api.get('/Employee/GetUpcomingAnniversaries'); 
            setUpcomingAnniversaries(response.data);
        } catch (error) { 
            toast.error("Error while fetching anniversaries"); 
            console.log("Error while fetching anniversaries", error); 
        }
    }; 

    useEffect(() => { 
        fetchUpcomingAnniversaries(); 
    }, []);


    return (
        <div className="w-full max-w-md p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-8 dark:bg-gray-800 dark:border-gray-700">
            <div className="mb-4 flex flex-col">
                <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">Upcoming anniversaries</h5>
                <p className="text-gray-500 text-xs font-normal mt-3">View upcoming birthdays and employment anniversaries.</p>
            </div>
            
            <div className="flow-root">
                <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {upcomingAnniversaries.map((item) => (
                        <li className="py-3 sm:py-4">
                            <div className="flex items-center">
                                <div className="shrink-0">
                                    <Link to={`/employee/${item.employeeId}`} className="flex items-center">
                                    <img className={`w-8 h-8 rounded-full  p-[1px] ring-3 ${item.type == "Birthday" ? "ring-blue-500 dark:ring-blue-500" : "ring-yellow-500 dark:ring-yellow-500"}`}
                                        src={(item.profilePictureSrc == null || item.profilePictureSrc == "") ? defaultProfile : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.profilePictureSrc}`}
                                        alt="Employee's image" />
                                        </Link>
                                </div>
                                <div className="flex-1 min-w-0 ms-4">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        {item.fullName}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                        {item.type}
                                    </p>
                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    <div className="relative max-w-sm">
                                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                                            </svg>
                                        </div>
                                        <div datepicker id="default-datepicker" type="text" className="bg-gray-50 border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">{format(parseISO(item.anniversaryDate), "dd.MM.yyyy.")}</div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}