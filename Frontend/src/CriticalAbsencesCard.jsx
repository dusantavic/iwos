import React, { useEffect, useState } from 'react';
import { Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { defaultProfile } from './assets';
import { toast } from 'react-toastify';
import api from './utils/axiosInstance';
import { Link } from 'react-router-dom';

export default function CriticalAbsencesCard() {

  const [employees, setEmployees] = useState(null); 

  useEffect(() => { 
    const fetchCriticalLeaveEmployees = async () => {
        try { 
            const result = await api.get("/Absence/GetCriticalLeaveEmployees?take=20"); 
            setEmployees(result.data);
        }
        catch (err) { 
            toast.error("Failed to fetch critical leave employees");
        }
    }

    fetchCriticalLeaveEmployees(); 
  }, []);

  return (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {/* Card Header - Flowbite Standard */}
      <div className="flex items-center justify-between pt-6 px-6">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Critical Leave
        </h5>
        
      </div>

        {/* Scrollable List Container */}
        <div className="flow-root overflow-hidden px-6 pb-3">
          <ul
            role="list"
            className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[440px] overflow-y-auto custom-scrollbar"
          >
            {employees?.map((item) => (
              <Link
                to={`/employee/${item.employeeId}`}
                key={item.employeeId}
                className="p-3 sm:p-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-4">
                  {/* Profile Picture with Fallback Logic */}
                  <div className="shrink-0 relative">
                    <img
                      src={
                        item.employeeProfilePic == null ||
                        item.employeeProfilePic == ""
                          ? defaultProfile
                          : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.employeeProfilePic}`
                      }
                      alt="Profile image"
                      className="w-9.5 h-9.5 rounded-full object-cover"
                    />
                    {item.riskPercentage > 85 && (
                      <span className="top-0 left-7 absolute w-3 h-3 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.employeeFullName}
                      </p>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {item.remainingDays}d Remaining
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 truncate dark:text-gray-400 mb-2">
                      {(100 - item.riskPercentage).toFixed(0)}% days used
                    </p>

                    {/* Flowbite Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div
                        className={`h-[5px] rounded-full transition-all duration-700 ease-out ${
                          item.riskPercentage >= 800
                            ? "bg-orange-600"
                            : item.riskPercentage >= 600
                              ? "bg-orange-400"
                              : "bg-blue-600"
                        }`}
                        style={{ width: `${item.riskPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="inline-flex items-center text-gray-400">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </ul>
        </div>

        {/* Card Footer
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Action required for 20+ days
            </span>
          </div>
        </div> */}
      </div>
    </div>
  );
}