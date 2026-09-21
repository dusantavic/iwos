
export default function FileDrawer({fileUrl, fileName, handleClosePreview}) { 
    
    return( 
            <div id="filePreviewDrawer" className="fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900 w-full max-w-2xl transform translate-x-full transition-transform duration-300 ease-in-out shadow-md" data-drawer>
                {fileUrl && (
                    <div>
                        <div className="flex justify-between mb-6 items-center mt-2" >
                            <div className="flex gap-4 items-center">
                                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">{fileName}</h2>

                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-blue-600 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 14v4.833A1.166 1.166 0 0 1 16.833 20H5.167A1.167 1.167 0 0 1 4 18.833V7.167A1.166 1.166 0 0 1 5.167 6h4.618m4.447-2H20v5.768m-7.889 2.121 7.778-7.778" />
                                    </svg>
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-white hover:underline"
                                    >
                                        Open in new tab
                                    </a>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-600"
                                onClick={handleClosePreview}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-gray-300">
                            <iframe
                                src={fileUrl}
                                title={fileName}
                                width="100%"
                                height="600px"
                                className="w-full h-[600px] border-0"
                            ></iframe>
                        </div>
                    </div>
                )}
            </div>
    )
}