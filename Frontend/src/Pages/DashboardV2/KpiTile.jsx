import { motion } from "framer-motion";

export default function KpiTile({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
  loading = false,
  delay = 0,
  onClick,
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "critical"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-900 dark:text-white";

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700
        px-3 py-3 sm:px-5 sm:py-4 text-left w-full h-full
        ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">
          {label}
        </p>
        {icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2 animate-pulse">
          <div className="h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : (
        <>
          <div className={`mt-2 text-2xl sm:text-3xl font-bold tabular-nums ${valueClass}`}>
            {value}
          </div>
          {sub && (
            <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{sub}</div>
          )}
        </>
      )}
    </Wrapper>
  );
}
