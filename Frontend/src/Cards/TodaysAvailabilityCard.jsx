import { useState } from "react";
import Chart from "react-apexcharts";

export default function TodaysAvailabilityCard({ availability }) {
  const [theme, setTheme] = useState('light');

    const attritionRateData = {
    options: {
      chart: { type: "radialBar", background: "none" },
      colors: ["#1447e6"],
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          dataLabels: {
            value: { fontSize: "32px", show: true },
            name: { show: false },
          },
        },
      },
      labels: ["Today's Availability"],
      theme: {
        mode: theme == "dark" ? "dark" : "light",
      },
    },
    series: [availability],
  };

  return (
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm p-5 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
        <h5 className="text-lg font-semibold text-gray-700  dark:text-white">
          Today's Availability
        </h5>
        <Chart
          options={attritionRateData.options}
          series={attritionRateData.series}
          type="radialBar"
          height={230}
        />

      </div>

  );
}
