export const profilChartOptionsDashboard = {
  chart: {
    toolbar: {
      show: true,
    },
  },
  tooltip: {
    theme: "dark",
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: "smooth",
  },
  xaxis: {
    type: "datetime",
    categories: [
      "0s",
      "3s",
      "6s",
      "9s",
      "12s",
      "15s",
      "18s",
      "21s",
      "24s",
      "27s",
      "30s",
    ],
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
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
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },
    },
  },
  legend: {
    show: true,
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },  
  },
  grid: {
    strokeDashArray: 5,
    borderColor: "#56577A"
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "vertical",
      shadeIntensity: 0,
      gradientToColors: undefined, // optional, if not defined - uses the shades of same color in series
      inverseColors: true,
      opacityFrom: 0.8,
      opacityTo: 0,
      stops: [],
    },
    colors: ["#582CFF"],
  },
  colors: ["#582CFF"],
};


export const betChartDataDashboard = [
  {
    name: "Free Bet",
    data: [1,5,10,20,40,60,70,80,90,100],
  }
];

export const betChartOptionsDashboard = {
  chart: {
    toolbar: {
      show: true,
    },
  },
  tooltip: {
    theme: "dark",
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: "smooth",
  },
  xaxis: {
    type: "datetime",
    categories: [
      "0s",
      "3s",
      "6s",
      "9s",
      "12s",
      "15s",
      "18s",
      "21s",
      "24s",
      "27s",
      "30s",
    ],
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
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
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },
    },
  },
  legend: {
    show: true,
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },  
  },
  grid: {
    strokeDashArray: 5,
    borderColor: "#56577A"
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "vertical",
      shadeIntensity: 0,
      gradientToColors: undefined, // optional, if not defined - uses the shades of same color in series
      inverseColors: true,
      opacityFrom: 0.8,
      opacityTo: 0,
      stops: [],
    },
    colors: ["#582CFF"],
  },
  colors: ["#582CFF"],
};

export const lineChartDataDashboard = [
  {
    name: "Bet",
    data: [500, 250, 300, 220, 500, 250, 3010, 230, 300, 350, 250, 4100, 300, 220, 500, 250, 3010, 230, 300, 350, 250, 4100, 300, 220, 500, 250, 3010],
  },
  {
    name: "Win",
    data: [200, 230, 3010, 350, 370, 420, 550, 350, 400, 500, 330, 550, 350, 400, 500, 330, 550, 350, 400, 500, 330, 550, 350, 400, 500, 330, 550],
  },
];

export const lineChartOptionsDashboard = {
  chart: {
    toolbar: {
      show: true,
    },
  },
  tooltip: {
    theme: "dark",
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: "smooth",
  },
  xaxis: {
    type: "datetime",
    labels: {
      style: {
        colors: "#c8cccf",
        fontSize: "12px",
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: true,
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },
    },
  }, 
  legend: {
    show: true,
  },
  grid: {
    strokeDashArray: 1,
    borderColor: "#56577A"
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "vertical",
      shadeIntensity: 0,
      gradientToColors: undefined, // optional, if not defined - uses the shades of same color in series
      inverseColors: true,
      opacityFrom: 0.8,
      opacityTo: 0,
      stops: [],
    },
    colors: ["#f8285a", "#17c653"],
  },
  colors: ["#f8285a", "#17c653"],
};




export const lineChartDataDashboard2 = [
  {
    name: "Bet",
    data: [0, 10, 14, 14, 15, 16, 17, 19, 20, 20, 20, 20, 24, 25, 60, 62, 62, 63, 63, 63, 63, 69, 69, 69, 69, 80, 80, 80, 80, 100],
  },
];

export const lineChartOptionsDashboard2 = {
  chart: {
    toolbar: {
      show: false,
    },
  },
  tooltip: {
    theme: "dark",
  },
  dataLabels: {
    enabled: true,
  },
  stroke: {
    curve: "smooth",
  },
  xaxis: {
    type: "datetime",
    categories: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    labels: {
      style: {
        colors: "#c8cccf",
        fontSize: "12px",
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
    labels: {
      style: {
        colors: "#c8cfca",
        fontSize: "12px",
      },
    },
  },
  legend: {
    show: true,
  },
  grid: {
    strokeDashArray: 1,
    borderColor: "#56577A"
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "vertical",
      shadeIntensity: 0,
      gradientToColors: undefined, // optional, if not defined - uses the shades of same color in series
      inverseColors: true,
      opacityFrom: 0.8,
      opacityTo: 0,
      stops: [],
    },
    colors: ["#00d4ff"],
  },
  colors: ["#00d4ff"],
};
