
export default function SimpleCardStats({number, text}) { 
    return( 
        <div className="flex flex-col h-fit min-w-[20vw] p-6 px-15 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-center cursor-default">
        <h5 className="text-[4.5rem] font-bold text-gray-750 dark:text-white">{number}</h5> 
        <p className="font-normal text-gray-700 dark:text-gray-400 text-xl">{text}</p>
        </div>
    )
}