import React, { useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import Paginator from "./Paginator";

const data = [
  {
    id: 1,
    name: "Acme Corp",
    contactPerson: "John Doe",
    email: "john.doe@acme.com",
    status: "Active",
    plan: "Pro",
    usersCount: 12,
    createdAt: "2023-09-10",
    lastActivity: "2025-05-05",
    subscriptionEnds: "2025-09-10",
    billingStatus: "Paid",
  },
  {
    id: 2,
    name: "Beta Inc",
    contactPerson: "Jane Smith",
    email: "jane@beta.com",
    status: "Active",
    plan: "Basic",
    usersCount: 3,
    createdAt: "2025-04-01",
    lastActivity: "2025-05-01",
    subscriptionEnds: "2025-05-15",
    billingStatus: "Free",
  },
  {
    id: 3,
    name: "CloudNova",
    contactPerson: "Emma Wilson",
    email: "emma@cloudnova.io",
    status: "Active",
    plan: "Enterprise",
    usersCount: 50,
    createdAt: "2022-12-15",
    lastActivity: "2025-03-20",
    subscriptionEnds: "2025-12-15",
    billingStatus: "Overdue",
  },
  {
    id: 4,
    name: "Delta Systems",
    contactPerson: "Mark Taylor",
    email: "mark@deltasystems.net",
    status: "Active",
    plan: "Pro",
    usersCount: 7,
    createdAt: "2023-06-30",
    lastActivity: "2025-05-03",
    subscriptionEnds: "2025-06-30",
    billingStatus: "Paid",
  },
  {
    id: 5,
    name: "EchoTech",
    contactPerson: "Lisa Ray",
    email: "lisa@echotech.com",
    status: "Cancelled",
    plan: "Basic",
    usersCount: 5,
    createdAt: "2023-02-01",
    lastActivity: "2024-11-15",
    subscriptionEnds: "2024-12-01",
    billingStatus: "Cancelled",
  },
  {
    id: 6,
    name: "FutureSoft",
    contactPerson: "Tom Nguyen",
    email: "tom@futuresoft.ai",
    status: "Active",
    plan: "Enterprise",
    usersCount: 80,
    createdAt: "2024-01-01",
    lastActivity: "2025-05-06",
    subscriptionEnds: "2026-01-01",
    billingStatus: "Paid",
  },
  {
    id: 7,
    name: "Greenwave",
    contactPerson: "Olivia Chen",
    email: "olivia@greenwave.com",
    status: "Trial",
    plan: "Free",
    usersCount: 2,
    createdAt: "2025-04-20",
    lastActivity: "2025-05-02",
    subscriptionEnds: "2025-05-20",
    billingStatus: "Free",
  },
  {
    id: 8,
    name: "HyperLogic",
    contactPerson: "George Hill",
    email: "george@hyperlogic.io",
    status: "Active",
    plan: "Pro",
    usersCount: 10,
    createdAt: "2023-10-10",
    lastActivity: "2025-05-04",
    subscriptionEnds: "2025-10-10",
    billingStatus: "Paid",
  },
  {
    id: 9,
    name: "InspireDev",
    contactPerson: "Natalie Brooks",
    email: "natalie@inspire.dev",
    status: "Suspended",
    plan: "Basic",
    usersCount: 4,
    createdAt: "2023-03-18",
    lastActivity: "2025-01-10",
    subscriptionEnds: "2025-03-18",
    billingStatus: "Overdue",
  },
  {
    id: 10,
    name: "Jetstream",
    contactPerson: "Mike Black",
    email: "mike@jetstream.io",
    status: "Active",
    plan: "Enterprise",
    usersCount: 60,
    createdAt: "2024-05-06",
    lastActivity: "2025-05-06",
    subscriptionEnds: "2025-05-06",
    billingStatus: "Paid",
  },
  {
    id: 11,
    name: "KineticApps",
    contactPerson: "Sarah Gold",
    email: "sarah@kineticapps.com",
    status: "Active",
    plan: "Pro",
    usersCount: 8,
    createdAt: "2023-08-20",
    lastActivity: "2025-04-30",
    subscriptionEnds: "2025-08-20",
    billingStatus: "Paid",
  },
  {
    id: 12,
    name: "Lighthouse Solutions",
    contactPerson: "Dan Wolfe",
    email: "dan@lighthouse.com",
    status: "Trial",
    plan: "Basic",
    usersCount: 3,
    createdAt: "2025-04-15",
    lastActivity: "2025-05-04",
    subscriptionEnds: "2025-05-25",
    billingStatus: "Free",
  },
  {
    id: 13,
    name: "Momentum Group",
    contactPerson: "Jill West",
    email: "jill@momentumgroup.org",
    status: "Active",
    plan: "Pro",
    usersCount: 15,
    createdAt: "2022-10-10",
    lastActivity: "2025-05-05",
    subscriptionEnds: "2025-10-10",
    billingStatus: "Paid",
  },
  {
    id: 14,
    name: "NeoStack",
    contactPerson: "Kevin Lee",
    email: "kevin@neostack.dev",
    status: "Suspended",
    plan: "Free",
    usersCount: 1,
    createdAt: "2023-01-10",
    lastActivity: "2024-12-10",
    subscriptionEnds: "2025-01-10",
    billingStatus: "Overdue",
  },
  {
    id: 15,
    name: "OptimaNet",
    contactPerson: "Amy Moore",
    email: "amy@optimanet.io",
    status: "Active",
    plan: "Enterprise",
    usersCount: 70,
    createdAt: "2023-04-05",
    lastActivity: "2025-05-03",
    subscriptionEnds: "2025-04-05",
    billingStatus: "Paid",
  },
  {
    id: 16,
    name: "Pulseware",
    contactPerson: "Robert Lang",
    email: "robert@pulseware.com",
    status: "Cancelled",
    plan: "Basic",
    usersCount: 6,
    createdAt: "2022-07-01",
    lastActivity: "2024-08-01",
    subscriptionEnds: "2024-07-01",
    billingStatus: "Cancelled",
  },
  {
    id: 17,
    name: "QuantumEdge",
    contactPerson: "Tina Alvarez",
    email: "tina@quantumedge.io",
    status: "Active",
    plan: "Pro",
    usersCount: 9,
    createdAt: "2023-05-06",
    lastActivity: "2025-05-06",
    subscriptionEnds: "2025-05-06",
    billingStatus: "Paid",
  },
  {
    id: 18,
    name: "RedNova",
    contactPerson: "David Kim",
    email: "david@rednova.io",
    status: "Trial",
    plan: "Basic",
    usersCount: 4,
    createdAt: "2025-04-28",
    lastActivity: "2025-05-05",
    subscriptionEnds: "2025-05-18",
    billingStatus: "Free",
  },
  {
    id: 19,
    name: "Skybound",
    contactPerson: "Mia Wong",
    email: "mia@skybound.net",
    status: "Active",
    plan: "Enterprise",
    usersCount: 100,
    createdAt: "2024-10-01",
    lastActivity: "2025-05-06",
    subscriptionEnds: "2025-10-01",
    billingStatus: "Paid",
  },
  {
    id: 20,
    name: "Turing Labs",
    contactPerson: "Ethan Scott",
    email: "ethan@turinglabs.com",
    status: "Suspended",
    plan: "Pro",
    usersCount: 20,
    createdAt: "2023-09-01",
    lastActivity: "2025-04-01",
    subscriptionEnds: "2025-09-01",
    billingStatus: "Overdue",
  },
];


export default function AdminTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pageSizeSelection, setPageSizeSelection] = useState(false);

  const pageSizeArray = [5, 10, 50, 100];

  const columns = useMemo(
    () => [
      {
        header: "Client",
        accessorKey: "name",
      },
      {
        header: "Contact",
        accessorKey: "contactPerson",
      },
      {
        header: "Email",
        accessorKey: "email",
        cell: ({ getValue }) => (
          <a
            href={`mailto:${getValue()}`}
            className="text-blue-600 hover:underline"
          >
            {getValue()}
          </a>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const status = row.original.status;
          const colors = {
            Active: "bg-green-500",
            Trial: "bg-yellow-400",
            Suspended: "bg-red-500",
            Inactive: "bg-gray-400",
          };
          const color = colors[status] || "bg-gray-400";

          return (
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
              <span className="text-sm text-gray-700 dark:text-gray-400">
                {status}
              </span>
            </div>
          );
        },
      },
      {
        header: "Plan",
        accessorKey: "plan",
      },
      {
        header: "Users",
        accessorKey: "usersCount",
      },
      {
        header: "Last Activity",
        accessorKey: "lastActivity",
      },
      {
        header: "Billing",
        accessorKey: "billingStatus",
        cell: ({ getValue }) => {
          const value = getValue();
          const colors = {
            Paid: "bg-green-100 text-green-800 dark:opacity-[0.7]",
            Overdue: "bg-red-100 text-red-800 dark:opacity-[0.7]",
            Free: "bg-blue-100 text-blue-800 dark:opacity-[0.7]",
          };
          const color =
            colors[value] || "bg-gray-100 text-gray-800 dark:opacity-[0.7]";

          return (
            <span
              className={`flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}
            >
              {value}
              {value === "Paid" && (
                <svg
                  className="w-3 h-3 text-green-700"
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
                    d="M5 11.917 9.724 16.5 19 7.5"
                  />
                </svg>
              )}
            </span>
          );
        },
      },
      {
        header: "Action",
        accessorKey: "action",
        cell: ({ row }) => (
          <a
            href="#"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            See details
          </a>
        ),
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

  return (
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
              className={`${pageSizeSelection ? "" : "hidden"} z-10 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600`}
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
        </div>

        <label htmlFor="table-search" className="sr-only">
          Search
        </label>
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
            placeholder="Search clients"
          />
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
                <td key={cell.id} className="px-6 py-4">
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
  );
}
