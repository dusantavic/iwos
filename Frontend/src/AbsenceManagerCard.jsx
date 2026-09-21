import { useEffect } from "react";

export default function AbsenceManagerCard({ employmentDate, totalAnnualVacationDays, annualVacation, carriedOverDays, setAnnualVacation, setCarriedOverDays }) {

  useEffect(() => {
    if (!employmentDate) return;

    const today = new Date();
    const start = new Date(employmentDate);
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    // Months employed until end of year
    let monthsEmployed = endOfYear.getMonth() - start.getMonth() + 1;
    if (start.getFullYear() < today.getFullYear()) {
      monthsEmployed = 12; // if employed previous year, irrelevant
    } 
    // Allocate vacation proportionally
    const calculatedDays = Math.min(
      totalAnnualVacationDays,
      Math.floor((monthsEmployed / 12) * totalAnnualVacationDays)
    );

    setAnnualVacation(calculatedDays);
  }, [employmentDate, totalAnnualVacationDays]);

  const inputFieldClassName =
    "bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

  return (
    <div className="relative w-full mx-auto group">
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">

        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1 tracking-wide">
          Absence Manager
        </h3>

        {/* Info message */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          Set the vacation balance for the employee's first year.
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">

          {/* Calculated Vacation Days */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Annual Vacation Days</label>
            <input
              type="number"
              value={annualVacation}
              onChange={(e) => setAnnualVacation(Number(e.target.value))}
              className={inputFieldClassName}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total vacation days for the current year
            </span>
          </div>

          {/* Carried Over Days */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Carried Over Days</label>
            <input
              type="number"
              value={carriedOverDays}
              onChange={(e) => setCarriedOverDays(Number(e.target.value))}
              className={inputFieldClassName}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Additional unused vacation days from the previous year
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
