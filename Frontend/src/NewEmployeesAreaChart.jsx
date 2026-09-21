import Chart from "react-apexcharts";
import { useState } from "react";

export default function NewEmployeesAreaChart({ chartData }) {
  const [theme, setTheme] = useState('light');

  const options = {
    chart: {
      type: "area",
      height: "100%",
      fontFamily: "Inter, sans-serif",
      dropShadow: { enabled: false },
      toolbar: { show: false },
      background: "none",
      zoom: {
        enabled: false,
      },
    },
    tooltip: {
      enabled: true,
      x: { show: false },
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
        shade: "#1C64F2",
        gradientToColors: ["#1C64F2"],
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 6 },
    grid: {
      show: false,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: 0,
      },
    },
    xaxis: {
      categories: chartData?.categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    theme: {
      mode: theme == "dark" ? "dark" : "light",
    },
  };

  const series = [
    {
      name: "New employees",
      data: chartData?.seriesData,
      color: "#1A56DB",
    },
  ];

  return (
    <div className="w-full h-96">
      <Chart options={options} series={series} type="area" height="100%" />
    </div>
  );
}
