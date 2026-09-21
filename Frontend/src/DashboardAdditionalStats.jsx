import { useState } from "react";
import Chart from "react-apexcharts";
import TodayAvailabilityChart from "./TodayAvailabilityChart";

export default function DashboardAdditionalStats({
  attritionRate,
  departmentsCounts,
  employeesGrowthData,
  fetchEmployeesGrowthData,
  fetchAttritionRate,
}) {
  const [theme, setTheme] = useState('light');
  const [isGrowthDropdownOpen, setIsGrowthDropdownOpen] = useState(false);
  const [growthSelectedTime, setGrowthSelectedTime] = useState("Last year");

  const [isAttritionRateDropdownOpen, setIsAttritionRateDropdownOpen] =
    useState(false);
  const [attritionRateSelectedTime, setAttritionRateSelectedTime] =
    useState("Last year");

  const employeeGrowth = {
    series: [
      {
        name: "Employees",
        data: employeesGrowthData?.seriesData,
      },
    ],
    options: {
      chart: {
        id: "employee-growth",
        type: "area",
        toolbar: {
          show: false,
        },
        background: "none",
      },
      colors: ["#1D4ED8"],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
      },
      xaxis: {
        categories: employeesGrowthData?.categories?.map((c) => c.slice(0, 3)),
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 6,
          opacityFrom: 0.65,
          opacityTo: 0.3,
        },
      },
      grid: {
        strokeDashArray: 4,
      },
      theme: {
        mode: theme == "dark" ? "dark" : "light",
      },
    },
  };

  const attritionRateData = {
    options: {
      chart: { type: "radialBar", background: "none" },
      colors: ["#DC2626"],
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          dataLabels: {
            value: { fontSize: "32px", show: true },
            name: { show: false },
          },
        },
      },
      labels: ["Attrition Rate"],
      theme: {
        mode: theme == "dark" ? "dark" : "light",
      },
    },
    series: [attritionRate],
  };

  const departmentDistribution = {
    series: departmentsCounts?.map((dc) => dc.count),
    options: {
      chart: {
        height: 144,
        width: "90%",
        type: "donut",
        background: "none",
      },
      // colors: ["#1C64F2", "#16BDCA", "#FDBA8C", "#E74694"],
      stroke: {
        colors: ["transparent"],
        lineCap: "",
      },
      plotOptions: {
        pie: {
          donut: {
            size: "80%",
            labels: {
              show: true,
              name: {
                show: true,
                fontFamily: "Inter, sans-serif",
                offsetY: 20,
              },
              value: {
                show: true,
                fontFamily: "Inter, sans-serif",
                offsetY: -20,
                formatter: function (value) {
                  return value + " Employees";
                },
              },
              total: {
                show: true,
                showAlways: true,
                label: "Departments",
                fontFamily: "Inter, sans-serif",
                formatter: function (w) {
                  return w.globals.labels.length.toString();
                },
              },
            },
          },
        },
      },
      labels: departmentsCounts?.map((dc) => dc.name),
      dataLabels: {
        enabled: false,
      },
      legend: {
        position: "bottom",
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        padding: {
          top: -2,
        },
      },
      theme: {
        mode: theme == "dark" ? "dark" : "light",
      },
    },
  };

  const handleGrowthDropdownClick = async (e) => {
    setGrowthSelectedTime(e.target.innerText);
    if (e.target.innerText == "Last two years") {
      await fetchEmployeesGrowthData(2);
    } else {
      await fetchEmployeesGrowthData();
    }
  };

  const handleAttritionRateDropdownClick = async (e) => {
    setAttritionRateSelectedTime(e.target.innerText);
    if (e.target.innerText == "Last two years") {
      await fetchAttritionRate(2);
    } else {
      await fetchAttritionRate();
    }
  };

  return (
    <div className="flex w-full gap-3">
      {/* Employee Growth Card */}
      <div className="w-full md:w-1/3 bg-white border border-gray-200 rounded-lg shadow-md p-5 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
        <h5 className="text-lg font-semibold text-gray-700 mb-4 dark:text-white">
          Employee Growth
        </h5>
        <Chart
          options={employeeGrowth.options}
          series={employeeGrowth.series}
          type="area"
          height={282}
        />
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsGrowthDropdownOpen((prev) => !prev)}
            id="dropdownDefaultButton"
            data-dropdown-toggle="lastDaysdropdown"
            data-dropdown-placement="bottom"
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 text-center inline-flex items-center dark:hover:text-white"
            type="button"
          >
            {growthSelectedTime}
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

          {isGrowthDropdownOpen && (
            <div
              className="z-10 absolute mt-33 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700"
              onMouseLeave={() => setIsGrowthDropdownOpen(false)}
            >
              <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                {["Last year", "Last two years"].map((label) => (
                  <li key={label}>
                    <button
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                      onClick={(e) => handleGrowthDropdownClick(e)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Attrition Rate Card */}
      <div className="w-full md:w-1/3">
        <TodayAvailabilityChart/>
      </div>

      {/* Department Distribution Card */}
      <div className="w-full md:w-1/3 bg-white border border-gray-200 rounded-lg shadow-md p-5 dark:bg-gray-800 dark:border-gray-700
        flex flex-col">
        <h5 className="text-lg font-semibold text-gray-700 mb-4 dark:text-white">
          Department Distribution
        </h5>
        <Chart
          options={departmentDistribution.options}
          series={departmentDistribution.series}
          type="donut"
          height={250}
          class="flex flex-col items-center justify-center flex-grow"
        />
      </div>
    </div>
  );
}
