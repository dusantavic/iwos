import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import DashboardCard from "../DashboardCard";

export default function ScheduleHealthCard({ data, error, onRetry }) {
  const navigate = useNavigate();
  const loading = data == null && !error;
  const issues = data?.openIssues ?? [];
  const isEmpty = !loading && !error && issues.length === 0;

  return (
    <DashboardCard
      title="Schedule health"
      subtitle={
        loading || error
          ? null
          : issues.length > 0
          ? `${issues.length} issue${issues.length === 1 ? "" : "s"} need attention`
          : "All systems green"
      }
      icon={<ShieldCheck className="h-4 w-4" />}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={
        isEmpty
          ? {
              icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
              title: "Healthy configuration",
              description: "No open issues detected in the current week.",
            }
          : null
      }
    >
      <ul className="space-y-2 overflow-y-auto max-h-80">
        {issues.map((issue, i) => (
          <IssueRow
            key={`${issue.code}_${i}`}
            issue={issue}
            onClick={issue.ctaRoute ? () => navigate(issue.ctaRoute) : undefined}
          />
        ))}
      </ul>
    </DashboardCard>
  );
}

function IssueRow({ issue, onClick }) {
  const styles =
    issue.severity === "critical"
      ? { bg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800", text: "text-red-700 dark:text-red-400", Icon: AlertCircle }
      : issue.severity === "warning"
      ? { bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", Icon: AlertTriangle }
      : { bg: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", Icon: Info };

  const Icon = styles.Icon;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`
        w-full text-left flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border ${styles.bg}
        ${onClick ? "hover:opacity-80 transition cursor-pointer" : ""}
      `}
    >
      <Icon className={`h-4 w-4 ${styles.text} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{issue.title}</p>
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">{issue.description}</p>
      </div>
      {onClick && <ArrowRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />}
    </Wrapper>
  );
}
