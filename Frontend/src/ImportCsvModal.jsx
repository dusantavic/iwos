import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import api from "./utils/axiosInstance";
import { toast } from "react-toastify";

export default function ImportCsvModal({ onClose, onImported }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [showErrors, setShowErrors] = useState(true);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) {
      setSelectedFile(file);
      setResult(null);
    } else {
      toast.error("Only .csv files are accepted.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await api.get("/Employee/GetCsvColumnDefinitions");
      const columns = res.data;

      const headerRow = columns.map((c) => (c.required ? `${c.header}*` : c.header)).join(",");
      const exampleRow = columns.map((c) => c.example).join(",");
      const notesRow = columns.map((c) => c.note ? `[${c.note}]` : "").join(",");

      const csv = [
        "# * = required field",
        headerRow,
        exampleRow,
        notesRow,
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "employees_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.post("/Employee/BulkImportEmployees", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      if (res.data.successCount > 0) {
        onImported?.();
      }
    } catch {
      toast.error("Import failed. Please check your file and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Import Employees via CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Download template */}
          <div className="flex items-start justify-between gap-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Step 1 — Download the template</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Fill in the columns marked with <span className="font-semibold">*</span>. Remove the notes row before uploading.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingTemplate ? "Downloading…" : "Download template"}
            </button>
          </div>

          {/* Upload area */}
          {!result && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Step 2 — Upload your CSV</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer py-10 px-6
                  ${dragging
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : selectedFile
                    ? "border-green-400 bg-green-50/50 dark:bg-green-950/20 cursor-default"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
              >
                {selectedFile ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Drop your CSV here, or <span className="text-blue-600">browse</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">.csv files only</p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{result.successCount}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Imported</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{result.failureCount}</p>
                    <p className="text-xs text-red-500 dark:text-red-500">Failed</p>
                  </div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="border border-red-100 dark:border-red-900 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowErrors((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-sm font-medium text-red-700 dark:text-red-400"
                  >
                    <span>{result.errors.length} row error{result.errors.length !== 1 ? "s" : ""}</span>
                    {showErrors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showErrors && (
                    <ul className="divide-y divide-red-50 dark:divide-red-900/50 max-h-48 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="flex gap-3 px-4 py-2.5 bg-white dark:bg-gray-800">
                          <span className="shrink-0 text-xs font-medium text-gray-400 w-12">Row {err.row}</span>
                          <div className="min-w-0">
                            {err.employeeName && (
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block truncate">{err.employeeName}</span>
                            )}
                            <span className="text-xs text-red-600 dark:text-red-400">{err.message}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {result ? (
            <>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Import another file
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                    </svg>
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import employees
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
