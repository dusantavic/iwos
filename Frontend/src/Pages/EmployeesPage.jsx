import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, FileSpreadsheet, Download } from "lucide-react";
import EmployeesPageStats from "../EmployeesPageStats";
import EmployeesTable from "../EmployeesTable";
import Skeleton from "./Skeleton";
import ImportCsvModal from "../ImportCsvModal";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const handleDownloadCsvTemplate = async () => {
    try {
      const res = await api.get("/Employee/GetCsvColumnDefinitions");
      const columns = res.data;

      const headerRow = columns.map((c) => (c.required ? `${c.header}*` : c.header)).join(",");
      const exampleRow = columns.map((c) => c.example).join(",");
      const notesRow = columns.map((c) => (c.note ? `[${c.note}]` : "")).join(",");

      const csv = ["# * = required field", headerRow, exampleRow, notesRow].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employees_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    }
  };

  const handleImported = () => {
    setTableRefreshKey((k) => k + 1);
    setIsEmpty(false);
  };

  return (
    <>
      {loading && <Skeleton />}
      <EmployeesTable key={tableRefreshKey} setLoading={setLoading} setIsEmpty={setIsEmpty} />

      {!loading && isEmpty && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-8 py-10">
          <div className="max-w-lg mx-auto text-center space-y-5">
            <div>
              <p className="text-[16px] font-semibold text-gray-800">Get started by adding your team</p>
              <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                Create employee profiles individually, or prepare a spreadsheet and bulk-import your whole team at once.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/employee/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add employee
              </Link>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-[14px] font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 text-gray-500" />
                Download CSV template
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-[14px] font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                Import CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !isEmpty && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-gray-500" />
            Import CSV
          </button>
        </div>
      )}

      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}
    </>
  );
}
