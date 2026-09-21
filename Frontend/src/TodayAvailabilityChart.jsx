import Chart from "react-apexcharts";
import { useState, useEffect } from "react";
import api from "./utils/axiosInstance";
import { BiCheckCircle } from "react-icons/bi";

export default function TodayAvailabilityChart() {
  const [todayAvailability, setTodayAvailability] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const fetchTodayAvailability = async () => {
      try {
        const response = await api.get("/Department/GetTodayAvailability");
        setTodayAvailability(response.data);
      } catch (error) {
        toast.error("Failed to load today's availability.");
        console.log("Failed to load today's availability.", error);
      }
    };
    
    fetchTodayAvailability();
  }, []);

  const options = {
    colors: ["#1A56DB", "#16BDCA"],
    chart: {
      type: "bar",
      height: "320px",
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
      background: "none",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        borderRadiusApplication: "end",
        borderRadius: 8,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontFamily: "Inter, sans-serif",
      },
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 1,
        },
      },
    },
    stroke: {
      show: true,
      width: 0,
      colors: ["transparent"],
    },
    grid: {
      show: false,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -14,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    xaxis: {
      floating: false,
      labels: {
        show: true,
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: "text-xs font-normal fill-gray-500 dark:fill-gray-400",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      show: false,
    },
    fill: {
      opacity: 1,
    },
    theme: {
      mode: theme == "dark" ? "dark" : "light",
    },
  };

  const series = [
    {
      name: "Total",
      color: "#1A56DB",
      data: todayAvailability?.departmentsAvailabilities?.map((a) => ({
        x: a.departmentName,
        y: a.totalCount,
      })),
    },
    {
      name: "Active today",
      color: "#16BDCA",
      data: todayAvailability?.departmentsAvailabilities?.map((a) => ({
        x: a.departmentName,
        y: a.activeTodayCount,
      })),
    },
  ];

  return (
      <div className="w-full bg-white rounded-lg shadow-md border dark:bg-gray-800 p-4 md:p-6 border-gray-200 sm:p-8 dark:border-gray-700 h-full max-h-[500px]">
        <div className="flex justify-between">
          <div>
            <h5 className="leading-none text-3xl font-bold text-gray-900 dark:text-white pb-2">
              {todayAvailability?.overallAvailability} %
            </h5>
            <p className="text-base font-normal text-gray-500 dark:text-gray-400">
              Active employees <strong>today</strong>
            </p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 text-base font-semibold text-[#16BDCA] dark:text-[#16BDCA] text-center">
            <BiCheckCircle /> Today's availability
          </div>
        </div>
        <div className="w-full h-81 pt-5">
          <Chart options={options} series={series} height="100%" type="bar" />
        </div>             
      </div>
  );
}
