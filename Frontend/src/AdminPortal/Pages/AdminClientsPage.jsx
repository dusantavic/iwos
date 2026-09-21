import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { toast } from "react-toastify";
import { Plus, Search, X } from "lucide-react";
import adminApi from "../utils/adminAxiosInstance";
import { StatusBadge, PlanBadge, BillingBadge } from "../utils/clientEnums";
import Paginator from "../../Paginator";

const inputClass =
  "mt-1 w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const navigate = useNavigate();

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get("/AdminClients");
      setClients(response.data);
    } catch {
      toast.error("Could not load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const columns = useMemo(
    () => [
      { header: "Client", accessorKey: "name" },
      { header: "Contact", accessorKey: "contactPerson" },
      {
        header: "Email",
        accessorKey: "contactEmail",
        cell: ({ getValue }) => (
          <a
            href={`mailto:${getValue()}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {getValue()}
          </a>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        header: "Plan",
        accessorKey: "plan",
        cell: ({ getValue }) => <PlanBadge plan={getValue()} />,
      },
      {
        header: "Billing",
        accessorKey: "billing",
        cell: ({ getValue }) => <BillingBadge billing={getValue()} />,
      },
      {
        header: "Last activity",
        accessorKey: "lastActivity",
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue()).toLocaleDateString() : "—",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: clients,
    columns,
    state: { globalFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: 10 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalCount = table.getPrePaginationRowModel().rows.length;
  const startIndex = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endIndex = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Manage Iwos tenant accounts.</p>
        </div>
        <button
          onClick={() => setShowNewClientModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          New Client
        </button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search by name or email"
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-9 text-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          Loading clients...
        </div>
      ) : (
        <>
          <table className="w-full rounded-md border border-gray-200 text-left text-sm text-gray-500 shadow-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none px-6 py-3"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && " ▲"}
                      {header.column.getIsSorted() === "desc" && " ▼"}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/admin/clients/${row.original.id}`)}
                  className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-400">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalCount > 0 && (
            <Paginator
              startIndex={startIndex}
              endIndex={endIndex}
              totalCount={totalCount}
              canPrevious={table.getCanPreviousPage()}
              handlePreviousPage={() => table.previousPage()}
              pageCount={table.getPageCount()}
              pageIndex={pageIndex}
              setPageIndex={table.setPageIndex}
              canNext={table.getCanNextPage()}
              handleNextPage={() => table.nextPage()}
            />
          )}
        </>
      )}

      {showNewClientModal && (
        <NewClientModal
          closeModal={() => setShowNewClientModal(false)}
          onCreated={() => {
            setShowNewClientModal(false);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

function NewClientModal({ closeModal, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPerson: "",
    contactPhone: "",
    address: "",
    country: "",
    code: "",
    bankAccountNumber: "",
    bankWith: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit() {
    if (!form.name || !form.contactEmail || !form.country || !form.code) {
      toast.error("Check required fields and try again.");
      return;
    }

    try {
      setSubmitting(true);
      await adminApi.post("/AdminClients", form);
      toast.success("Client created.");
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error creating client.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-201 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow">
        <div className="flex items-start justify-between border-b border-gray-200 p-4">
          <h3 className="text-xl font-semibold text-gray-900">New Client</h3>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Name *" name="name" value={form.name} onChange={handleChange} />
          <Field label="Contact email *" name="contactEmail" value={form.contactEmail} onChange={handleChange} />
          <Field label="Contact person" name="contactPerson" value={form.contactPerson} onChange={handleChange} />
          <Field label="Contact phone" name="contactPhone" value={form.contactPhone} onChange={handleChange} />
          <Field label="Country *" name="country" value={form.country} onChange={handleChange} />
          <Field label="Code *" name="code" value={form.code} onChange={handleChange} />
          <Field label="Address" name="address" value={form.address} onChange={handleChange} />
          <Field label="Bank account number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
          <Field label="Bank with" name="bankWith" value={form.bankWith} onChange={handleChange} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-300 p-4">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-gray-300 bg-white px-5 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="rounded-lg bg-blue-700 px-5 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  );
}
