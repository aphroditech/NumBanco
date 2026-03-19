import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area
} from "recharts";

export default React.memo(function GravityChart({
  chartDataDisplay,
  lastPrice,
  chartMin,
  chartMax,
  chartThreshold,
  roundPhase,
  tradingStartTime,
  tradingEndTime,
  formatTime,
  showLiveLabel,
  liveTime
}) {

  const data = useMemo(() => chartDataDisplay, [chartDataDisplay]);

  const tooltipFormatter = (value) => value.toFixed(2);

  const tooltipLabelFormatter = (label) => {
    if (!label) return "";
    return `${label.toFixed(2)}s`;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        key="gravity-chart"
        data={data}
        margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
      >

        {/* gradient definition */}
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff99" stopOpacity={0.8}/>
            <stop offset="100%" stopColor="#00ff99" stopOpacity={0}/>
          </linearGradient>

          {/* glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <CartesianGrid
          stroke="#333"
          strokeDasharray="4 4"
          opacity={0.25}
        />

        <XAxis
          dataKey="time"
          type="number"
          domain={[0, 15]}
          tick={false}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          type="number"
          domain={[chartMin, chartMax]}
          tick={false}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
          isAnimationActive={false}
        />

        {/* threshold line */}
        <ReferenceLine
          y={chartThreshold}
          stroke="#888"
          strokeDasharray="4 4"
        />

        {/* area glow */}
        <Area
          type="monotone"
          dataKey="price"
          stroke="none"
          fill="url(#priceGradient)"
          isAnimationActive={false}
        />

        {/* main graph line */}
        <Line
          type="monotone"
          dataKey="price"
          stroke="#00ff99"
          strokeWidth={3}
          dot={false}
          connectNulls
          filter="url(#glow)"
          isAnimationActive={false}
        />

      </LineChart>
    </ResponsiveContainer>
  );
});
