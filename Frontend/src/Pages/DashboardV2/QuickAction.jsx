export default function QuickAction({
  icon,
  label,
  disabledLabel,
  badge,
  onClick,
  disabled = false,
  variant = "secondary",
}) {
  const isPrimary = variant === "primary";
  const showBadge = typeof badge === "number" && badge > 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center gap-2 flex-shrink-0
        h-9 px-3 sm:px-4 rounded-lg
        text-xs sm:text-sm font-medium
        border transition
        disabled:cursor-not-allowed
        ${
          disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
            : isPrimary
            ? "bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-sm"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        }
      `}
    >
      <span className={`flex h-4 w-4 items-center justify-center ${disabled ? "opacity-50" : ""}`}>
        {icon}
      </span>
      <span className="whitespace-nowrap">
        {disabled && disabledLabel ? disabledLabel : label}
      </span>
      {showBadge && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold tabular-nums bg-red-600 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
