import { useMemo, useState } from "react";
import { Copy, Check, X, KeyRound, Download } from "lucide-react";

/**
 * One-time credential reveal shown immediately after provisioning or resetting
 * an employee portal account. The password is only available in this moment —
 * the server never stores it in plaintext — so the modal guards dismissal with
 * a confirmation step. Accepts either a single credentials object or an array
 * (bulk provisioning); in list mode a CSV download is offered so the manager
 * can persist the full batch before closing.
 */
export default function EmployeeCredentialsModal({ credentials, onClose }) {
  const list = useMemo(() => {
    if (!credentials) return [];
    return Array.isArray(credentials) ? credentials : [credentials];
  }, [credentials]);

  const [copiedKey, setCopiedKey] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (list.length === 0) return null;

  const isBulk = list.length > 1;

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // clipboard may be unavailable in insecure contexts
    }
  };

  const downloadCsv = () => {
    const header = "Employee,Username,Temporary password";
    const rows = list.map((c) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "";
      return [name, c.username, c.temporaryPassword].map(csvEscape).join(",");
    });
    const blob = new Blob([`${header}\n${rows.join("\n")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-portal-credentials-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const copyAll = () => {
    const text = list
      .map((c) => {
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
        const prefix = name ? `${name} — ` : "";
        return `${prefix}${c.username} / ${c.temporaryPassword}`;
      })
      .join("\n");
    copy(text, "all");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {isBulk
                  ? `Portal credentials · ${list.length} employees`
                  : "Employee portal credentials"}
              </h3>
              <p className="text-xs text-slate-500">Shown only once</p>
            </div>
          </div>
          <button
            onClick={() => setConfirmClose(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <p className="text-sm text-slate-600">
            {isBulk
              ? "Download the CSV or copy the list before closing. Passwords cannot be retrieved afterwards — employees without saved credentials will need a password reset."
              : "Share these credentials with the new employee using a secure channel. The password will not be visible again after you close this dialog."}
          </p>

          {isBulk ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Employee</th>
                    <th className="text-left px-3 py-2 font-medium">Username</th>
                    <th className="text-left px-3 py-2 font-medium">Password</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((c, i) => {
                    const name = [c.firstName, c.lastName]
                      .filter(Boolean)
                      .join(" ");
                    const rowKey = c.employeeId ?? `${c.username}-${i}`;
                    const line = `${c.username} / ${c.temporaryPassword}`;
                    return (
                      <tr key={rowKey} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {name || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-900 whitespace-nowrap">
                          {c.username}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-900 whitespace-nowrap">
                          {c.temporaryPassword}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => copy(line, rowKey)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            title="Copy row"
                          >
                            {copiedKey === rowKey ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <CredentialRow
                label="Username"
                value={list[0].username}
                copied={copiedKey === "username"}
                onCopy={() => copy(list[0].username, "username")}
              />
              <CredentialRow
                label="Temporary password"
                value={list[0].temporaryPassword}
                copied={copiedKey === "password"}
                onCopy={() => copy(list[0].temporaryPassword, "password")}
                mono
              />
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {isBulk && (
              <button
                onClick={downloadCsv}
                className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {downloaded ? "Downloaded — download again" : "Download CSV"}
              </button>
            )}
            <button
              onClick={copyAll}
              className={`py-2 px-4 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 ${
                isBulk
                  ? "flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50"
                  : "w-full bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copiedKey === "all" ? (
                <>
                  <Check className="w-4 h-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {isBulk ? "Copy list" : "Copy both"}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setConfirmClose(true)}
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            I've saved them
          </button>
        </div>
      </div>

      {confirmClose && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900">
              Close and discard credentials?
            </h4>
            <p className="text-sm text-slate-600">
              After closing, the passwords cannot be retrieved. Any employee
              whose credentials were not saved will need a password reset.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Keep open
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Close anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialRow({ label, value, copied, onCopy, mono }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 truncate ${
            mono ? "font-mono tracking-wide" : ""
          }`}
        >
          {value}
        </div>
        <button
          onClick={onCopy}
          className="p-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          title="Copy"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
