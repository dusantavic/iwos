export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center space-x-6">
        {/* Avatar */}
        <div className="h-20 w-20 rounded-full bg-gray-300 dark:bg-gray-700" />
        {/* Name + Role */}
        <div className="flex-1 space-y-3">
          <div className="h-5 w-1/3 rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-4 w-1/4 rounded bg-gray-300 dark:bg-gray-700" />
        </div>
      </div>


      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="space-y-3">
              <div className="h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-6 w-1/3 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Contact Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-4">
          <div className="h-5 w-1/4 rounded bg-gray-300 dark:bg-gray-700" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 w-4 rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-3">
          <div className="h-5 w-1/4 rounded bg-gray-300 dark:bg-gray-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
