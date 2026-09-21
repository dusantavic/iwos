export default function Paginator({
  startIndex,
  endIndex,
  totalCount,
  canPrevious,
  handlePreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  canNext,
  handleNextPage,
}) {
  const activePageClassName =
    "bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400 cursor-default flex items-center justify-center px-3 h-8 border border-gray-300 dark:border-gray-700";
  const nonActivePageClassName =
    "flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer";

  const pageNumbers = (pageCount, pageIndex) => {
    const range = [];
    const totalPages = pageCount;
    const currentPage = pageIndex + 1;

    const maxPagesToShow = 5;
    let start = Math.max(1, currentPage - 2);
    let end = start + maxPagesToShow - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  };

  return (
    <nav
      className="flex items-center flex-column flex-wrap md:flex-row justify-between pt-4"
      aria-label="Table navigation"
    >
      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mb-4 md:mb-0 block w-full md:inline md:w-auto">
        Showing{" "}
        <span className="font-semibold text-gray-900 dark:text-white">
          {startIndex}-{endIndex}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-gray-900 dark:text-white">
          {totalCount}
        </span>{" "}
        items
      </span>

      <ul className="inline-flex -space-x-px rtl:space-x-reverse text-sm h-8">
        <li>
          <button
            className="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-300 dark:disabled:bg-gray-900 dark:disabled:text-gray-600 disabled:cursor-default"
            disabled={!canPrevious}
            onClick={() => handlePreviousPage()}
          >
            Previous
          </button>
        </li>
        {pageNumbers(pageCount, pageIndex).map((page, idx) =>
          page === "..." ? (
            <li key={idx}>
              <span className="px-3 py-1 text-gray-500">...</span>
            </li>
          ) : (
            <li key={page}>
              <div
                onClick={() => setPageIndex(page - 1)}
                className={
                  pageIndex === page - 1
                    ? activePageClassName
                    : nonActivePageClassName
                }
              >
                {page}
              </div>
            </li>
          ),
        )}
        <li>
          <button
            className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-300 dark:disabled:bg-gray-900 dark:disabled:text-gray-600 disabled:cursor-default"
            disabled={!canNext}
            onClick={() => handleNextPage()}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
