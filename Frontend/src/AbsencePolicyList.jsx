import React from 'react';
import { 
  Palmtree, 
  Stethoscope, 
  Home, 
  Baby, 
  GraduationCap, 
  UserMinus,
  Clock,
  Briefcase,
  ChevronRight,
  Info
} from 'lucide-react';
import { EVENT_COLORS, EVENT_ICONS } from './config/events.config';


const absenceData = [
  { type: 'Vacation', label: 'Vacation', description: 'Standard annual leave granted to an employee. A fixed number of vacation days is allocated per year, and the employee’s remaining balance is reduced each time a vacation request is approved.', policy: 'Uses Vacation Days' },
  { type: 'Sick Leave', label: 'Sick Leave', description: 'Leave taken due to illness or medical reasons. Sick leave does not reduce the employee’s allocated vacation balance.', policy: 'No Vacation Deduction' },
  { type: 'Justified Absence', label: 'Justified Absence', description: 'A customizable absence type used for specific situations such as religious celebrations (Slava), public holidays, or other approved personal circumstances. This type of absence does not deduct days from the employee’s vacation balance.', policy: 'No Vacation Deduction' },
];

export default function AbsencePolicyList({openReportModal = null}) {
  return (
<section className="bg-white antialiased dark:bg-gray-900  mx-auto max-w-full rounded-lg border border-gray-200 p-2 sm:p-6 shadow-sm dark:border-gray-700">
  <div className="max-w-full px-2 py-4 sm:px-4 sm:py-8 mx-auto lg:px-6 lg:py-16">
    <div className="max-w-full mx-auto text-center mb-6 sm:mb-10">
      <h2 className="text-2xl font-medium md:font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl dark:text-white">
        Absence Policy List
      </h2>
      <p className="mt-2 sm:mt-4 text-xs md:text-xl font-normal text-gray-500 dark:text-gray-400">
        A comprehensive overview of available leave types and their associated guidelines.
      </p>
    </div>

    <div className="w-full overflow-hidden bg-white md:border md:border-gray-200 rounded-lg md:shadow-sm md:dark:bg-gray-800 md:dark:border-gray-700">
      <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
        {absenceData.map((absence, index) => (
          <li key={index} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between gap-x-4">
              <div className="flex items-start min-w-0 flex-1">
                <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full mt-1 ${EVENT_COLORS[absence.type]} text-white`}>
                  {EVENT_ICONS[absence.type]}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-white break-words">
                      {absence.label}
                    </p>
                    {/* Vidljivo samo na sm i manjim, nestaje na md jer se pojavljuje desno */}
                    <span className="md:hidden inline-flex items-center text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {absence.policy}
                    </span>
                  </div>
                  <p className="hidden sm:block mt-1 text-sm text-gray-500 dark:text-gray-400 whitespace-normal break-words">
                    {absence.description}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center space-x-4 flex-shrink-0 pt-1">
                {/* Vidljivo samo na md i većim */}
                <span className="hidden md:inline-flex items-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 whitespace-nowrap">
                  <Info className="w-3 h-3 mr-1" />
                  {absence.policy}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
              </div>
            </div>
            {/* Mobile-only description snippet */}
            <p className="mt-2 text-xs text-gray-500 sm:hidden dark:text-gray-400 italic whitespace-normal break-words leading-relaxed">
              {absence.description}
            </p>
          </li>
        ))}
      </ul>
    </div>

    {openReportModal && (
      <div className="flex justify-center mt-6 sm:mt-8">
        <button 
          className="w-full sm:w-auto text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          onClick={openReportModal}
        >
          + Request New Absence
        </button>
      </div>
    )}
  </div>
</section>
  );
}