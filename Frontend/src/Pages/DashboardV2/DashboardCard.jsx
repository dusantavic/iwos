import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  loading = false,
  error = null,
  empty = null,
  onRetry,
  children,
  className = "",
  delay = 0,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 p-4 sm:p-5 h-full flex flex-col ${className}`}
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          {icon && (
            <span className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <CardLoadingState />
        ) : error ? (
          <CardErrorState message={error} onRetry={onRetry} />
        ) : empty ? (
          <CardEmptyState {...empty} />
        ) : (
          children
        )}
      </div>
    </motion.section>
  );
}

function CardLoadingState() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function CardErrorState({ message, onRetry }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">Couldn't load this section.</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

function CardEmptyState({ icon, title, description, cta }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 mb-3">
        {icon}
      </span>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{description}</p>
      )}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}
