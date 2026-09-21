import React, { useEffect, useState } from "react";
import {
  BrainCircuit,
  AlertTriangle,
  Info,
  Lightbulb,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Bell,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";

// --- Component: AIInsights ---

const typeStyles = {
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  tip: "bg-green-50 border-green-200 text-green-800",
};

const priorityBadge = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const priorityDot = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-500",
};

const iconMap = {
  warning: <AlertTriangle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-700" />,
  tip: <Lightbulb className="w-4 h-4 text-yellow-700" />,
};

export default function AbsenceInsights() {
  const [open, setOpen] = useState(false);
  const [insightsResult, setInsightsResult] = useState(null);

  const fetchAbsenceInsights = async () => {
    try {
      const response = await api.get("Absence/GetAIInsights");
      setInsightsResult(response.data);
    } catch (err) {
      toast.error("Failed to load absence advices");
    }
  };

  useEffect(() => {
    fetchAbsenceInsights();
  }, []);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg  overflow-hidden mt-3 cursor-default">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="text-left flex flex-col">
            <span className="text-sm font-bold text-gray-900">
              Absence Advices
            </span>
            <span className="text-xs text-gray-500">
              {insightsResult?.insights?.length} suggestions for your team
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content */}
      {open && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100">
          {insightsResult?.insights?.length > 0 ? (
            insightsResult?.insights?.map((insight, index) => (
              <div
                key={index}
                className="flex flex-col justify-start p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition"
              >
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {iconMap[insight.type]}
                    <span className="text-sm font-semibold capitalize text-gray-800">
                      {insight.shortTitle}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <span
                      className={`w-2 h-2 rounded-full ${priorityDot[insight.priority]}`}
                    />
                    {insight.priority}
                  </span>
                </div>

                {/* Content */}
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {insight.text}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-8 text-center text-gray-500 text-sm">
              No new insights at this time.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
