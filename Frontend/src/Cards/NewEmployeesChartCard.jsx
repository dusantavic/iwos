import NewEmployeesAreaChart from "../NewEmployeesAreaChart";
import { useState, useEffect } from "react";
import api from "../utils/axiosInstance";
import { toast } from "react-toastify";

export default function NewEmployeesChartCard() {
  // use this for presentation needs
  const testData = {
    categories: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
    ],
    seriesData: [6500, 6418, 6456, 6526, 6356, 6456],
  };

  const [chartData, setChartData] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState("Last year"); 

  const fetchChartData = async (yearsPeriod) => {
    try {
      if (yearsPeriod) { 
        var response = await api.get(`/Employee/GetEmployeesChartData?yearsPeriod=${yearsPeriod}`);
      setChartData(response.data);

      }
      else { 
        var response = await api.get("/Employee/GetEmployeesChartData");
      setChartData(response.data);

      }
    } catch (error) {
      toast.error("Error while fetching statistical data");
      console.log("Error whilte fetching new employees chart data", error);
    }
  };

  const handleDropdownClick = async (e) => { 
    setSelectedTime(e.target.innerText); 
    if (e.target.innerText == "Last two years") { 
      await fetchChartData(2);
    }
    else { 
      await fetchChartData();
    }
  }

  useEffect(() => {
    fetchChartData();
  }, []);

  return (
    <div className="flex-grow w-full bg-white rounded-lg shadow-sm border dark:bg-gray-800 p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700">
      <div className="flex justify-between">
        <div>
          <h5 className="leading-none text-3xl font-bold text-gray-900 dark:text-white pb-2">
            {chartData?.total}
          </h5>
          <p className="text-base font-normal text-gray-500 dark:text-gray-400">
            New employees in the {selectedTime.toLowerCase()}
          </p>
        </div>
        <div
          className={`flex items-center px-2.5 py-0.5 text-base font-semibold text-center ${
            chartData?.monthlyChangePercent >= 0
              ? "text-green-500 dark:text-green-500"
              : "text-red-500 dark:text-red-500 "
          }`}
          title="Monthly change percent"
        >
          {chartData?.monthlyChangePercent == -100 ||
          chartData?.monthlyChangePercent == 0
            ? "No change this month"
            : `${chartData?.monthlyChangePercent ?? 0}% this month`}
          {chartData?.monthlyChangePercent > 0 && (
            <svg
              className="w-5 h-5 text-green-500 dark:text-green-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v13m0-13 4 4m-4-4-4 4"
              />
            </svg>
          )}
          {chartData?.monthlyChangePercent < 0 && (
            <svg
              className="w-5 h-5 text-red-500 dark:text-red-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19V5m0 14-4-4m4 4 4-4"
              />
            </svg>
          )}
        </div>
      </div>

      <NewEmployeesAreaChart chartData={chartData} />

      <div className="grid grid-cols-1 items-center border-gray-200 border-t dark:border-gray-700 justify-between">
        <div className="flex justify-between items-center pt-5">
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            id="dropdownDefaultButton"
            data-dropdown-toggle="lastDaysdropdown"
            data-dropdown-placement="bottom"
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 text-center inline-flex items-center dark:hover:text-white"
            type="button"
          >
            {selectedTime}
            <svg
              className="w-2.5 m-2.5 ms-1.5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 10 6"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 4 4 4-4"
              />
            </svg>
          </button>


          {isDropdownOpen && (
            <div
              className="z-10 absolute mt-33 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700"
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                {[
                  "Last year", 
                  "Last two years"
                ].map((label) => (
                  <li key={label}>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                      onClick={(e) => handleDropdownClick(e)}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href="#"
            className="uppercase text-sm font-semibold inline-flex items-center rounded-lg text-blue-600 hover:text-blue-700 dark:hover:text-blue-500  hover:bg-gray-100 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700 px-3 py-2"
          >
            Employees Report
            <svg
              className="w-2.5 h-2.5 ms-1.5 rtl:rotate-180"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 6 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 9 4-4-4-4"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
