
export default function SelectList({title, options}) { 
    //@dusan: OBSOLED. should be replaced with Select from "react-select" everywhere in the codebase. 
    
    return ( 
            <dl>
                <dt className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{title}</dt>
                <div className="relative">
                    <select
                        className="mt-1 pr-10 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 appearance-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                    >
                        {options.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </dl>
    )
}