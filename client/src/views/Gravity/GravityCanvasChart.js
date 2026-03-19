import React, { useRef, useEffect } from "react";

export default function GravityCanvasChart({
  chartDataDisplay,
  chartMin,
  chartMax,
  chartThreshold
}) {

  const canvasRef = useRef(null);

  useEffect(() => {

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!chartDataDisplay || chartDataDisplay.length < 2) return;

    const maxTime = chartDataDisplay[chartDataDisplay.length - 1].time;

    const scaleX = width / 15;
    const scaleY = height / (chartMax - chartMin);

    const getX = (t) => t * scaleX;
    const getY = (p) => height - (p - chartMin) * scaleY;

    /**
     * Threshold line
     */
    ctx.beginPath();
    ctx.setLineDash([5,5]);
    ctx.strokeStyle = "#888";

    const thresholdY = getY(chartThreshold);

    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();

    ctx.setLineDash([]);

    /**
     * Graph line
     */

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00ff99";

    const first = chartData[0] ?? {time:0,price:chartThreshold};

    ctx.moveTo(getX(first.time), getY(first.price));

    for (let i = 1; i < chartDataDisplay.length; i++) {

      const pt = chartDataDisplay[i];

      ctx.lineTo(
        getX(pt.time),
        getY(pt.price)
      );
    }

    ctx.stroke();

  }, [chartDataDisplay, chartMin, chartMax, chartThreshold]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={320}
      style={{
        width: "100%",
        height: "320px",
        background: "#0f1115",
        borderRadius: "10px"
      }}
    />
  );
}