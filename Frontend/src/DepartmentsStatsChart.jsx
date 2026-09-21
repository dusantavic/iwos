import Chart from "react-apexcharts";
import { useState } from "react";

export default function DepartmentsStatsChart({ departmentsStatsData }) {

    const [theme, setTheme] = useState('light');

    const options = {
        colors: ["#1A56DB"],
        chart: {
          type: "bar",
          height: "320px",
          fontFamily: "Inter, sans-serif",
          toolbar: {
            show: false,
          },
          background: 'none'
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
            top: -14
          },
        },
        theme: {
          mode: theme == 'dark' ? 'dark' : 'light'
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
              cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
            }
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
      }

    const series = [{
        name: 'Total employees',
        data: departmentsStatsData?.map(d => ({ 
          x: d.title, 
          y: d.totalEmployees
        }))
    }]

    return (
        <div className="w-full h-81">
            <Chart options={options} series={series} height="100%" type="bar" />
        </div>
    );
};

