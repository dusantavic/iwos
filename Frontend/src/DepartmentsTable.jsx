import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import api from "./utils/axiosInstance";
import { Link } from "react-router-dom";
import Paginator from "./Paginator";


function getInitials(str) {
  if (str?.length == 2) {
    return str;
  }

  const words = str?.split(" ");
  const firstInitial = words[0]?.charAt(0).toUpperCase();
  const secondInitial = words[1]?.charAt(0).toUpperCase();

  return secondInitial ? firstInitial + secondInitial : firstInitial;
}

export default function DepartmentsTable({ setLoading, refreshKey, onNewDepartment }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pageSizeSelection, setPageSizeSelection] = useState(false);

  const [data, setData] = useState([]);

  const pageSizeArray = [5, 10];

  const columns = useMemo(() => [
    {
      header: "Department",
      accessorKey: "title",
      cell: ({ row }) => {
        var item = row.original;
        return (
          
          <Link to={`/department/${item.id}`} className="flex items-center">
            <div className="relative inline-flex items-center justify-center w-8 h-8 overflow-hidden bg-blue-700 rounded-full dark:bg-gray-600">
              <span className="font-medium text-[1rem] text-white dark:text-gray-300">
                {getInitials(item.title)}
              </span>
            </div>
            <div className="ps-3">
              <div className="text-base font-semibold">{item.title}</div>
            </div>
          </Link>
        );
      },
    },
    {
      header: "Head",
      accessorKey: "head",
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          value ?? (
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fill-rule="evenodd"
                  d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Not assigned</span>
            </div>
          )
        );
      },
    },
    {
      header: "Total employees",
      accessorKey: "totalEmployees",
    },
    {
      header: "Employee share",
      accessorKey: "employeeShare",
      cell: ({ row }) => {
        var item = row.original;
        return <div>{item.employeeShare} %</div>;
      },
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ row }) => {
        var item = row.original;
        return (
          <Link
            to={`/department/${item.id}`}
            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >
            See details
          </Link>
        );
      },
    },
  ]);

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

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get("/Department/GetDepartments");
        setData(response.data);
        setLoading(false);
      } catch (error) {
        toast.error("Error while fetching departments data.");
        console.log("Error while fetching departments data.", error);
      }
    };

    fetchDepartments();
  }, [refreshKey]);

  return (
    <>
      <div ref={tableTopRef}>
        <div className="flex items-center justify-between flex-column flex-wrap md:flex-row space-y-4 md:space-y-0 pb-4">
          <div className="flex gap-3">
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
                  className="w-2.5 h-2.5 ms-2.5"
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

            <div></div>
          </div>

          <label htmlFor="table-search" className="sr-only">
            Search
          </label>
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
                placeholder="Search departments"
              />
            </div>
            <button
              type="button"
              onClick={onNewDepartment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add new
            </button>
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
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
    </>
  );
}
