import { useState } from "react";
import { X, Building2, Briefcase, Plus } from "lucide-react";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";

function PositionRow({ pos, onRemove }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f2f2f7]">
      <Briefcase className="w-3.5 h-3.5 text-[#aeaeb2] shrink-0" />
      <span className="text-[13px] text-[#1d1d1f] flex-1">{pos.title}</span>
      <button
        type="button"
        onClick={() => onRemove(pos.tempId)}
        className="p-1 rounded hover:text-red-500 text-[#c7c7cc] cursor-pointer transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function CreateDepartmentModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [positions, setPositions] = useState([]);
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const addPosition = () => {
    if (!newPositionTitle.trim()) return;
    setPositions((prev) => [
      ...prev,
      { tempId: Date.now(), title: newPositionTitle.trim() },
    ]);
    setNewPositionTitle("");
  };

  const removePosition = (tempId) => {
    setPositions((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Department name is required.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(
        "/Department/CreateDepartment",
        JSON.stringify(name.trim()),
        { headers: { "Content-Type": "application/json" } }
      );
      const deptId = data.id;
      for (const pos of positions) {
        await api.post("/Department/CreatePosition", {
          departmentId: deptId,
          title: pos.title,
        });
      }
      toast.success(`Department "${name.trim()}" created.`);
      onCreated?.();
      onClose();
    } catch {
      toast.error("Failed to create department. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f2f2f7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#1d1d1f] leading-tight">
                New Department
              </h2>
              <p className="text-[12px] text-[#8e8e93]">
                Add positions after naming the department
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F2F2F7] text-[#8e8e93] hover:text-[#1d1d1f] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
          {/* Department name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
              Department name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. Engineering, HR, Finance…"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#F2F2F7] rounded-xl text-[14px] text-[#1d1d1f] placeholder:text-[#aeaeb2] outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            />
          </div>

          {/* Positions */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93]">
              Positions <span className="text-[#aeaeb2] font-normal normal-case">(optional)</span>
            </label>

            {positions.length > 0 && (
              <div className="bg-white border border-[#e5e5ea] rounded-2xl overflow-hidden">
                {positions.map((pos) => (
                  <PositionRow key={pos.tempId} pos={pos} onRemove={removePosition} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-2xl px-4 py-2.5">
              <Plus className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
              <input
                type="text"
                value={newPositionTitle}
                onChange={(e) => setNewPositionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPositionTitle.trim()) {
                    addPosition();
                  }
                }}
                placeholder="Add position… (Enter to add)"
                className="flex-1 text-[13px] text-[#1d1d1f] bg-transparent outline-none placeholder:text-[#aeaeb2]"
              />
              {newPositionTitle.trim() && (
                <button
                  type="button"
                  onClick={addPosition}
                  className="text-[#007AFF] text-[12px] font-medium cursor-pointer hover:text-blue-700"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f2f2f7]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-[#3c3c43] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white text-[14px] font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                Create department
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
