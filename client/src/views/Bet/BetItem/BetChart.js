import React from "react";
import ReactApexChart from "react-apexcharts";

const BetChart = ({ data, fillOpacity = 0.3 }) => {
  const series = [{ name: "Tickets Sold", data }];

  // Fixed y-axis max at 100
  const yAxisMax = 100;
  // Use 6 ticks for nice intervals: 0, 20, 40, 60, 80, 100
  const tickAmount = 6;

  const options = {
    chart: {
      type: "area", // area chart for fill
      animations: {
        enabled: true,
        easing: "linear",
        dynamicAnimation: { speed: 100 }, // 0.1s = 100ms
      },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    xaxis: {
      type: "numeric",
      min: 0,
      max: 30, // 30 seconds
      title: { text: "Time (s)" },
      labels: { style: { colors: "#c8cfca" } },
    },
    yaxis: {
      min: 0,
      max: yAxisMax,
      title: { text: "Tickets Sold" },
      tickAmount: tickAmount, // Dynamic but consistent based on max
      decimalsInFloat: 0, // No decimal places
      labels: {
        style: { colors: "#c8cfca" },
        formatter: (val) => {
          // Ensure whole numbers only (ApexCharts should already create nice intervals)
          return Math.round(val).toString();
        },
      },
    },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    tooltip: {
      theme: "dark",
      x: { formatter: (val) => val.toFixed(1) + "s" },  
      y: { formatter: (val) => Math.round(val) + " tickets" },
    },
    grid: { borderColor: "#56577A", strokeDashArray: 5 },
    colors: ["#582CFF"], // line color
    fill: {
      type: "solid", // solid fill under the line
      opacity: fillOpacity, // control the opacity of background color
      colors: ["#582CFF"], // fill color
    },
  };

  return <ReactApexChart options={options} series={series} type="area" height="100%" />;
};

export default BetChart;