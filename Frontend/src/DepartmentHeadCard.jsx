import { Briefcase, Edit2, Mail, ShieldCheck } from "lucide-react";

export default function DepartmentHeadCard({departmentDetails, headProfileImage, defaultProfile}) { 

     const hasHead = departmentDetails?.headId;

  return (
    <div className="flex-grow bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-800 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Accent Header Strip */}
      <div className="h-2 bg-gradient-to-r from-amber-400 to-yellow-500 w-full" />
      
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* Profile Image Section */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <img
              src={headProfileImage ?? defaultProfile}
              alt={hasHead ? departmentDetails?.headName : "Default Profile"}
              className="relative w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-sm"
            />
            {hasHead && (
              <div className="absolute bottom-1 right-1 bg-green-500 border-2 border-white dark:border-gray-800 w-6 h-6 rounded-full flex items-center justify-center" title="Active">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-grow text-center md:text-left">
            {hasHead ? (
              <div className="space-y-3">
                {/* Flowbite Inspired Badge */}
                <span className="inline-flex items-center bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Head of Department
                </span>

                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {departmentDetails?.headName}
                </h2>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Briefcase className="w-4 h-4 mr-2" />
                    {departmentDetails?.headPosition || "Senior Management"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                  Head not assigned
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                  This department currently lacks a designated leader. Assign a head to manage workflows and approvals.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
              <button
                type="button"
                onClick={() => setIsEditHeadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-300 transition-colors duration-200 dark:bg-amber-500 dark:hover:bg-amber-600 dark:focus:ring-amber-800"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {hasHead ? 'Update Leadership' : 'Assign Head'}
              </button>
              
              {hasHead && (
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-amber-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  View Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}