import { Link } from "react-router-dom";

function getInitials(str) {
    if (str.length == 2) {
        return str;
    }

    const words = str.split(' ');
    const firstInitial = words[0]?.charAt(0).toUpperCase();
    const secondInitial = words[1]?.charAt(0).toUpperCase();

    return secondInitial ? firstInitial + secondInitial : firstInitial;
}

export default function DepartmentsChart() {
    return (
        <>
            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-md sm:p-8 dark:bg-gray-800 dark:border-gray-700 w-full">
                <div className="flex items-center justify-between mb-4">
                    <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">Our departments</h5>
                    <Link to="departments" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">
                        Manage departments
                    </Link>
                </div>
                <div className="flow-root">

                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        <li className="py-3 sm:py-4">
                            <div className="flex items-center">
                                <div class="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                                    <span class="font-medium text-[1rem] text-white dark:text-gray-300">{getInitials("IT")}</span>
                                </div>
                                <div className="flex-1 min-w-0 ms-4">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        IT
                                    </p>
                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                        Dusan Tavic
                                    </p>
                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    30 EMPLOYEES
                                </div>
                            </div>
                        </li>
                        <li className="py-3 sm:py-4">
                            <div className="flex items-center ">
                                <div class="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                                    <span class="font-medium text-[1rem] text-white dark:text-gray-300">{getInitials("Marketing")}</span>
                                </div>
                                <div className="flex-1 min-w-0 ms-4">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        Marketing
                                    </p>
                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                        Predrag Okiljevic
                                    </p>
                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    20 EMPLOYEES
                                </div>
                            </div>
                        </li>
                        <li className="py-3 sm:py-4">
                            <div className="flex items-center">
                                <div class="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                                    <span class="font-medium text-[1rem] text-white dark:text-gray-300">{getInitials("HR Sector")}</span>
                                </div>
                                <div className="flex-1 min-w-0 ms-4">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        HR Sector
                                    </p>
                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                        Jelena A. Labrovic
                                    </p>
                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    12 EMPLOYEES
                                </div>
                            </div>
                        </li>
                        <li className="py-3 sm:py-4">
                            <div className="flex items-center ">
                                <div class="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
                                    <span class="font-medium text-[1rem] text-white dark:text-gray-300">{getInitials("QA")}</span>
                                </div>
                                <div className="flex-1 min-w-0 ms-4">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        QA
                                    </p>
                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                        Rade Andrijasevic
                                    </p>
                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    8 EMPLOYEES
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    )
}