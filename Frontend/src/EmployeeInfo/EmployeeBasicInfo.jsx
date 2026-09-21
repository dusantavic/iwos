import { useState } from "react"
import EmployeeBasicInfoEdit from "../EmployeeEditModals/EmployeeBasicInfoEdit";

export default function EmployeeBasicInfo({ employeeId, email, country, department, departmentId, position, positionId, refresh }) {
    const [editing, setEditing] = useState(false);

    const handleCloseModal = () => {
        setEditing(false);
        refresh();
    }

    return (
        <>
            {editing && <EmployeeBasicInfoEdit employeeId={employeeId} email={email} country={country} department={department} departmentId={departmentId} position={position} positionId={positionId} closeModal={handleCloseModal}/>}
            <div className="bg-white rounded-lg shadow p-6 relative dark:bg-gray-800 dark:border-gray-700 dark:border">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase mb-4 tracking-wide">Basic Information</h3>
                <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 border-b border-t border-gray-200 dark:border-gray-700 py-3">
                    <li className="flex items-center gap-2">
                        <svg className="mt-[3px] w-[14px] h-[14px] text-gray-700 dark:text-gray-300 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.038 5.61A2.01 2.01 0 0 0 2 6v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-.12-.01-.238-.03-.352l-.866.65-7.89 6.032a2 2 0 0 1-2.429 0L2.884 6.288l-.846-.677Z" />
                            <path d="M20.677 4.117A1.996 1.996 0 0 0 20 4H4c-.225 0-.44.037-.642.105l.758.607L12 10.742 19.9 4.7l.777-.583Z" />
                        </svg>
                        <span>{email ?? <span className="text-gray-400 italic">No email</span>}</span>
                    </li>
                    <li className="flex items-center gap-2"><svg className="w-[14px] h-[14px] text-gray-700 dark:text-gray-300 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd" />
                    </svg>
                        {country ?? <span className="text-gray-400 italic">No country</span>}
                    </li>
                    <li className="mt-[3px] flex items-center gap-2"><svg className="w-[14px] h-[14px] text-gray-700 dark:text-gray-300 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M10 2a3 3 0 0 0-3 3v1H5a3 3 0 0 0-3 3v2.382l1.447.723.005.003.027.013.12.056c.108.05.272.123.486.212.429.177 1.056.416 1.834.655C7.481 13.524 9.63 14 12 14c2.372 0 4.52-.475 6.08-.956.78-.24 1.406-.478 1.835-.655a14.028 14.028 0 0 0 .606-.268l.027-.013.005-.002L22 11.381V9a3 3 0 0 0-3-3h-2V5a3 3 0 0 0-3-3h-4Zm5 4V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1h6Zm6.447 7.894.553-.276V19a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-5.382l.553.276.002.002.004.002.013.006.041.02.151.07c.13.06.318.144.557.242.478.198 1.163.46 2.01.72C7.019 15.476 9.37 16 12 16c2.628 0 4.98-.525 6.67-1.044a22.95 22.95 0 0 0 2.01-.72 15.994 15.994 0 0 0 .707-.312l.041-.02.013-.006.004-.002.001-.001-.431-.866.432.865ZM12 10a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12Z" clipRule="evenodd" />
                    </svg>
                        {department}
                    </li>
                </ul>
                <button className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                    onClick={() => setEditing(true)}>
                    <svg className="mr-1 w-[16px] h-[16px] text-white dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z" clipRule="evenodd" />
                    </svg>
                    Edit
                </button>
            </div>
        </>
    )
}
