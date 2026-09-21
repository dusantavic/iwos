import { useEffect, useRef, useState } from "react";
import FileDrawer from "../FileDrawer";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";
import { LuPencil, LuTrash2 } from "react-icons/lu";

export default function EmployeeFiles({ employeeId, isNew = false }) {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState(null);

  const [viewMode, setViewMode] = useState("list");

  const clickTimeoutRef = useRef(null);

  const fetchAllFiles = async () => {
    try {
      var result = await api.get(
        `/Employee/GetAllFiles?employeeId=${employeeId}`
      );
      if (result.data) {
        setFiles(result.data);
      }
    } catch (error) {
      toast.error("Error while fetching employee's files");
      console.log(error);
    }
  };

  useEffect(() => {
    isNew || fetchAllFiles();
  }, []);

  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";

    for (const file of selected) {
      const displayName = file.name.replace(/\.[^/.]+$/, "");

      if (displayName.length > 120) { 
        toast.error("File name is too long. Maximum 120 charactes are allowed."); 
        return; 
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", employeeId);
      formData.append("displayName", displayName);

      try {
        await api
          .post("/Employee/AddFile", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          })
          .then(() => {
            toast.success("New file added successfully");
            fetchAllFiles();
          });
      } catch (error) {
        toast.error("Error while uploading the file");
        console.log("Error while uploading the file", error);
      }
    }
  };

  const handleDownloadIconClick = async (e, file) => { 
    e.stopPropagation(); 
    await handleDownload(file); 
  }

  const handleDownload = async (file) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    const dlUrl = makeFileUrl(employeeId, file.id, true);
    const result = await api.get(dlUrl, {
      responseType: "blob",
    });

    const blob = new Blob([result.data], {
      type: result.headers["content-type"],
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    a.download = file.displayName;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const makeFileUrl = (employeeId, fileId, download = false) =>
    `/Employee/GetFile` +
    `?employeeId=${employeeId}` +
    `&fileId=${fileId}` +
    `&download=${download}`;

  const handleFileClick = async (file) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      previewFile(file);
    }, 200);
  };

  const previewFile = async (file) => {
    const apiUrl = makeFileUrl(employeeId, file.id, true);

    try {
      const result = await api.get(apiUrl, {
        responseType: "blob",
      });

      const blob = new Blob([result.data], {
        type: result.headers["content-type"],
      });
      const objectUrl = URL.createObjectURL(blob);
      setSelectedFileUrl(objectUrl);
      setSelectedFileName(file.displayName);

      const drawer = document.getElementById("filePreviewDrawer");
      drawer.classList.remove("translate-x-full");
    } catch (error) {
      toast.error("Error while fetching the file");
      console.log(error);
    }
  };

  const handleClosePreview = () => {
    const drawer = document.getElementById("filePreviewDrawer");
    drawer.classList.add("translate-x-full");
    setSelectedFileUrl(null);
    setSelectedFileName(null);
  };

  const handleDeleteFile = async (e, id) => {
    e.stopPropagation(); 

    await api.delete(`/Employee/DeleteFile?fileId=${id}`).catch(() => {
      toast.error("The file couldn't be deleted");
      return; 
    });

    toast.success("File deleted"); 
    fetchAllFiles();
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 dark:bg-gray-800 dark:border-gray-700 dark:border">
        <div className="flex mb-4 justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-white uppercase tracking-wide">
              Files
            </h3>
            {files?.length > 0 && 
            <p className="text-xs text-gray-400 mt-2">
              ⓘ Click to preview, double-click to download.
            </p>}
          </div>

          <div className="flex gap-3">
            <div className="relative group inline-block">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-full ${
                  viewMode === "list" ? "bg-gray-300" : "hover:bg-gray-200"
                }`}
                aria-label="List view"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-width="2"
                    d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"
                  />
                </svg>
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
                List view
              </div>
            </div>

            <div className="relative group inline-block">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-full ${
                  viewMode === "grid" ? "bg-gray-300" : "hover:bg-gray-200"
                }`}
                aria-label="Grid view"
              >
                <svg
                  className="w-5 h-5 text-gray-700 dark:text-white"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.857 3A1.857 1.857 0 0 0 3 4.857v4.286C3 10.169 3.831 11 4.857 11h4.286A1.857 1.857 0 0 0 11 9.143V4.857A1.857 1.857 0 0 0 9.143 3H4.857Zm10 0A1.857 1.857 0 0 0 13 4.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 21 9.143V4.857A1.857 1.857 0 0 0 19.143 3h-4.286Zm-10 10A1.857 1.857 0 0 0 3 14.857v4.286C3 20.169 3.831 21 4.857 21h4.286A1.857 1.857 0 0 0 11 19.143v-4.286A1.857 1.857 0 0 0 9.143 13H4.857Zm10 0A1.857 1.857 0 0 0 13 14.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 21 19.143v-4.286A1.857 1.857 0 0 0 19.143 13h-4.286Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-medium py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-md">
                Gallery view
              </div>
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 border-b border-t border-gray-200 py-4 dark:border-gray-700 md:py-8">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden group cursor-pointer"
                onClick={() => handleFileClick(file)}
                onDoubleClick={() => handleDownload(file)}
              >
                <div className="p-10 bg-[#F2F2F7] flex items-center justify-center">
                  <div className="flex items-center justify-center w-full h-full">
                    <svg
                      className="w-8 h-8 text-[#6E6E73] dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1C1E] truncate">
                    {file.displayName}
                  </h3>
                  <div className="flex items-center ml-3 gap-2">
                    <div
                      className="cursor-pointer"
                      onClick={(e) => handleDownloadIconClick(e, file)}
                    >
                      <svg
                        className="w-4 h-4 text-blue-700 dark:text-white"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M13 11.15V4a1 1 0 1 0-2 0v7.15L8.78 8.374a1 1 0 1 0-1.56 1.25l4 5a1 1 0 0 0 1.56 0l4-5a1 1 0 1 0-1.56-1.25L13 11.15Z"
                          clip-rule="evenodd"
                        />
                        <path
                          fill-rule="evenodd"
                          d="M9.657 15.874 7.358 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.358l-2.3 2.874a3 3 0 0 1-4.685 0ZM17 16a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H17Z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="cursor-pointer">
                      <button
                        className="rounded-full text-gray-500 hover:text-gray-700
                          flex items-center justify-center gap-1.5 text-sm"
                        aria-label="Delete file"
                        onClick={(e) => handleDeleteFile(e, file.id)}
                      >
                        <LuTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2 text-sm text-blue-600 dark:text-white border-b border-t border-gray-200 py-4 dark:border-gray-700 md:py-8">
            {files?.length == 0 ? (
              <div className="text-[14px] text-gray-400 text-base">
                No files yet. Be the first to add one today!
              </div>
            ) : (
              files.map((item) => (
                <li
                  className="cursor-pointer flex items-center gap-2 hover:underline"
                  onClick={() => handleFileClick(item)}
                  onDoubleClick={() => handleDownload(item)}
                >
                  <svg
                    className="w-[14px] h-[14px] text-blue-600 dark:text-white"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 3v4a1 1 0 0 1-1 1H5m4 10v-2m3 2v-6m3 6v-3m4-11v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"
                    />
                  </svg>
                  {item.displayName}
                </li>
              ))
            )}
          </ul>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

        <button
          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
          onClick={handleUploadButtonClick}
        >
          <svg
            className="mr-1 w-[16px] h-[16px] text-white dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M12 3a1 1 0 0 1 .78.375l4 5a1 1 0 1 1-1.56 1.25L13 6.85V14a1 1 0 1 1-2 0V6.85L8.78 9.626a1 1 0 1 1-1.56-1.25l4-5A1 1 0 0 1 12 3ZM9 14v-1H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4v1a3 3 0 1 1-6 0Zm8 2a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H17Z"
              clipRule="evenodd"
            />
          </svg>
          Upload new
        </button>
      </div>

      <FileDrawer
        fileUrl={selectedFileUrl}
        fileName={selectedFileName}
        handleClosePreview={handleClosePreview}
      />
    </>
  );
}
