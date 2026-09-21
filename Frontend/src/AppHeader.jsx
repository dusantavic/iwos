import { favicon } from "./assets";

export default function AppHeader() {
    return (
        <nav>
            <div className="flex items-center justify-between">
                <a href="#" className="flex items-center gap-2">
                    <img src={favicon} className="h-6" alt="App Logo" />
                    <span className="text-[1.2rem] font-semibold whitespace-nowrap dark:text-white">Iwos</span>
                </a>
                <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                    <button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-[0.8rem] px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">See Pricing</button>
                </div>
                <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-cta">
                    <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0  gap-5">
                        <li>
                            <a href="#" className="block py-2 px-3 md:p-0 text-white bg-blue-700 rounded-sm md:bg-transparent md:text-blue-700 md:dark:text-blue-500 text-[0.9rem]" aria-current="page">Explore Iwos</a>
                        </li>
                        <li>
                            <a href="#" className="block py-2 px-3 md:p-0 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700 text-[0.9rem]">About Us</a>
                        </li>
                        <li>
                            <a href="#" className="block py-2 px-3 md:p-0 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700 text-[0.9rem]">Privacy Policy</a>
                        </li>
                        <li>
                            <a href="#" className="block py-2 px-3 md:p-0 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700 text-[0.9rem]">Contact</a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>

    )
}