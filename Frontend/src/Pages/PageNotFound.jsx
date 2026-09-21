import { Link } from "react-router-dom";

export default function PageNotFound() {
    return (
        <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
                <p className="text-base font-semibold text-blue-700">404</p>
                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">Page not found</h1>
                <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">Sorry, we couldn’t find the page you’re looking for.</p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link to="/" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-[0.8rem] px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Go back home</Link>
                </div>
            </div>
        </main>
    )
}

