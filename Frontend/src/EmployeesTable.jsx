import { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Users } from "lucide-react";
import { defaultProfile } from "./assets";
import { BiFilter } from "react-icons/bi";
import { Link } from "react-router-dom";
import api from "./utils/axiosInstance";
import Paginator from "./Paginator";


export default function EmployeesTable({ departmentId = null, setLoading = null, setIsEmpty = null }) {
  const [data, setData] = useState([]);

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [departmentsFilter, setDepartmentFilter] = useState(false);
  const [pageSizeSelection, setPageSizeSelection] = useState(false);

  const [departmentsOptions, setDepartmentsOptions] = useState([]);

  const [currentDepartmentFilter, setCurrentDepartmentFilter] = useState(null);

  const pageSizeArray = [5, 10, 50, 100];

  const columns = useMemo(
    () => [
      {
        header: "Employee",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => {
          var item = row.original;
          return (
            <Link to={`/employee/${item.id}`} className="flex items-center cursor-pointer">
              <img
                src={
                  item.profilePictureSrc == null || item.profilePictureSrc == ""
                    ? defaultProfile
                    : `${import.meta.env.VITE_ASSETS_BASE_URL}/${item.profilePictureSrc}`
                }
                alt="Profile image"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="ps-3">
                <div className="text-base font-semibold">
                  {item.firstName} {item.lastName}
                </div>
                <div className="font-normal text-gray-500">
                  {item.contactEmail}
                </div>
              </div>
            </Link>
          );
        },
      },
      {
        header: "Position",
        accessorKey: "position",
      },
      {
        header: "Department",
        accessorKey: "department",
        cell: ({ getValue }) => {
          const value = getValue();
          return value != null ? value : "-";
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          var item = row.original;
          return (
            <div className="flex items-center">
              <div
                className={`h-2.5 w-2.5 rounded-full me-2 ${
                  item.status === "Active" ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {item.status}
            </div>
          );
        },
      },
      {
        header: "Action",
        accessorKey: "action",
        cell: ({ row }) => {
          var item = row.original;
          return (
            <Link
              to={`/employee/${item.id}`}
              className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
            >
              See details
            </Link>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalCount = table.getPrePaginationRowModel().rows.length;
  const startIndex = pageIndex * pageSize + 1;
  const endIndex = Math.min((pageIndex + 1) * pageSize, totalCount);
  const tableTopRef = useRef(null);

  function handleNextPage() {
    table.nextPage();
    tableTopRef.current.scrollIntoView();
  }

  function handlePreviousPage() {
    table.previousPage();
    tableTopRef.current.scrollIntoView();
  }

  function selectPageSize(selectedPageSize) {
    table.setPageSize(Number(selectedPageSize));
    setPageSizeSelection(false);
  }

  const fetchEmployees = async (departmentId = null) => {
    try {
      var url = "";

      if (departmentId) {
        url = `/Employee/GetEmployees?departmentId=${departmentId}`;
      } else {
        url = "/Employee/GetEmployees";
      }

      const response = await api.get(url);
      setData(response.data);
      if (!departmentId) setIsEmpty?.(response.data.length === 0);
    } catch (error) {
      console.log("Error while fetching employees.", error);
    }
  };

  useEffect(() => {
    const loadDepartments = async () => {
      const response = await api.get("/Department/GetDepartmentsForSelect");
      setDepartmentsOptions(response.data);
      setLoading(false);
    };

    fetchEmployees(departmentId);
    loadDepartments();
  }, []);

  const handleDepartmentFilterClick = (
    departmentId = null,
    departmentName = null,
  ) => {
    setCurrentDepartmentFilter(departmentName);
    fetchEmployees(departmentId);
    setDepartmentFilter(false);
  };

  return (
    <div ref={tableTopRef}>
      <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4">
        <div className="flex gap-3 items-center">
          <div>
            <button
              id="pageSizeDropdown"
              data-dropdown-toggle="pageSizeDropdownAction"
              className="inline-flex items-center text-gray-500 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1.5 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 cursor-pointer"
              type="button"
              onClick={() => setPageSizeSelection((prev) => !prev)}
            >
              <span className="sr-only">Page size selection button</span>
              Show{" "}
              {table.getState().pagination.pageSize == data.length
                ? "all"
                : table.getState().pagination.pageSize}
              <svg
                className="w-2.5 h-2.5 ms-2.5 mt-[2px]"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 6"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 4 4 4-4"
                />
              </svg>
            </button>

            <div
              id="pageSizeDropdownAction"
              className={`${
                pageSizeSelection ? "" : "hidden"
              } z-10 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600`}
              onMouseLeave={() => setPageSizeSelection(false)}
            >
              <ul
                className="py-1 text-sm text-gray-700 dark:text-gray-200"
                aria-labelledby="dropdownActionButton"
              >
                {pageSizeArray.map((pageSize) => (
                  <li
                    key={pageSize}
                    className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                    onClick={() => selectPageSize(pageSize)}
                  >
                    Show {pageSize}
                  </li>
                ))}
              </ul>
              <div className="py-1">
                <div
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white cursor-pointer"
                  onClick={() => selectPageSize(data.length)}
                >
                  Show all
                </div>
              </div>
            </div>
          </div>

          {/*Departments filtration*/}
          {!departmentId && departmentsOptions && (
            <div>
              <button
                id="dropdownActionButton"
                data-dropdown-toggle="dropdownAction"
                className="inline-flex items-center text-gray-500 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-1.5 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 cursor-pointer"
                type="button"
                onClick={() => setDepartmentFilter((prev) => !prev)}
              >
                <span className="sr-only">Department button</span>
                <span className="flex justify-center items-center gap-1">
                  <BiFilter className="text-[1rem]" />
                  {currentDepartmentFilter
                    ? currentDepartmentFilter
                    : "Department"}
                </span>
                <svg
                  className="w-2.5 h-2.5 ms-2.5 mt-[2px]"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 10 6"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 4 4 4-4"
                  />
                </svg>
              </button>

              {!departmentId && departmentsOptions && (
                <div
                  id="dropdownAction"
                  className={`${
                    departmentsFilter ? "" : "hidden"
                  } z-10 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600`}
                  onMouseLeave={() => setDepartmentFilter(false)}
                >
                  <ul
                    className="py-1 text-sm text-gray-700 dark:text-gray-200"
                    aria-labelledby="dropdownActionButton"
                  >
                    {departmentsOptions.map((opt) => (
                      <li>
                        <span
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                          onClick={() =>
                            handleDepartmentFilterClick(opt.value, opt.label)
                          }
                        >
                          {opt.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="py-1">
                    <span
                      className="flex items-center gap-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white cursor-pointer"
                      onClick={() => handleDepartmentFilterClick(null, null)}
                    >
                      <svg
                        class="mt-[2px] w-4 h-4 text-gray-600 dark:text-white"
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
                          d="m6 6 12 12m3-6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                      Remove filter
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="table-search-users"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Search employees"
            />
          </div>

          {!departmentId && (
            <Link
              to="/employee/new"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 cursor-pointer"
            >
              + Add new
            </Link>
          )}
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 shadow-md sm:rounded-lg rounded-md border p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-left">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-6 py-3 cursor-pointer select-none"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                  {header.column.getIsSorted() === "asc" && " 🔼"}
                  {header.column.getIsSorted() === "desc" && " 🔽"}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Users className="w-7 h-7 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-gray-700">No employees yet</p>
                    <p className="text-[13px] text-gray-400 mt-0.5">Add your first employee or import from a CSV file</p>
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}

      <Paginator
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={totalCount}
        canPrevious={table.getCanPreviousPage()}
        handlePreviousPage={handlePreviousPage}
        pageCount={table.getPageCount()}
        pageIndex={pageIndex}
        setPageIndex={table.setPageIndex}
        canNext={table.getCanNextPage()}
        handleNextPage={handleNextPage}
      />

    </div>
  );
}
