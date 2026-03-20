import React, { useEffect, useRef, useState } from "react";

export default function GravityUltimateChartCanvas({
  chartDataDisplay = [],
  chartMin = 0,
  chartMax = 100,
  roundPhase = "betting",
  roundStartAtMs,
  height = 240,
  graphDurationSec = 15,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);
  const [width, setWidth] = useState(900);

  const dataRef = useRef(chartDataDisplay);
  const phaseRef = useRef(roundPhase);
  const startRef = useRef(roundStartAtMs);

  useEffect(() => { dataRef.current = chartDataDisplay; }, [chartDataDisplay]);
  useEffect(() => { phaseRef.current = roundPhase; }, [roundPhase]);
  useEffect(() => { startRef.current = roundStartAtMs; }, [roundStartAtMs]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(320, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const w = width;
      const h = height;

      ctx.clearRect(0, 0, w, h);

      // 🔥 Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b0e13");
      bg.addColorStop(1, "#05070a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 🔥 Top glow (casino feel)
      const topGlow = ctx.createLinearGradient(0, 0, 0, h);
      topGlow.addColorStop(0, "rgba(0,255,150,0.15)");
      topGlow.addColorStop(1, "rgba(0,255,150,0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid (matches the more "natural" look)
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const gridRows = 6;
      for (let gr = 0; gr <= gridRows; gr += 1) {
        const yGrid = (h / gridRows) * gr;
        ctx.beginPath();
        ctx.moveTo(0, yGrid);
        ctx.lineTo(w, yGrid);
        ctx.stroke();
      }

      const data = dataRef.current;
      if (!data || data.length < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const minY = chartMin;
      const maxY = chartMax;
      const range = maxY - minY || 1;

      const getX = (t) => (t / graphDurationSec) * w;
      const getY = (p) => h - ((p - minY) / range) * h;

      const now = Date.now();
      const start = startRef.current || now;
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed, graphDurationSec);

      const first = data[0];
      const last = data[data.length - 1];

      const uptrend = last.price >= first.price;
      const lineColor = uptrend ? "#00ff99" : "#ff4d4d";

      ctx.beginPath();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      let prevX = getX(first.time);
      let prevY = getY(first.price);
      let prevPrice = first.price;
      ctx.moveTo(prevX, prevY);

      // Smaller step => smoother, more natural motion.
      const step = 0.01;
      const isResultPhase = phaseRef.current === "result";
      const dotStrideI = 1; // draw more points (0.1s => 151 points total)
      let lastDotI = -1;

      for (let t = 0; t <= progress; t += step) {
        const i = Math.floor(t / 0.1);
        const a = data[i];
        const b = data[i + 1];
        if (!a || !b) continue;

        const ratio = (t - a.time) / (b.time - a.time || 0.1);
        const price = a.price + (b.price - a.price) * ratio;

        const x = getX(t);
        const y = getY(price);

        // Soft curve between points for a smoother look.
        const midX = (prevX + x) / 2;
        const midY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, midY);

        // Dense point markers (0.1s => 151 points total). Keeps the line visually "full".
        // Also draw in result phase so the user can see the full set of points frozen at the end.
        if (i !== lastDotI && i % dotStrideI === 0) {
          lastDotI = i;
          const pd = data[i];
          if (pd) {
            const xDot = getX(pd.time);
            const yDot = getY(pd.price);
            ctx.globalAlpha = isResultPhase ? 0.06 : 0.10;
            ctx.fillStyle = lineColor;
            // Slightly smaller dots feel softer than 1px hard points.
            const dotSize = 0.55;
            ctx.fillRect(xDot - dotSize / 2, yDot - dotSize / 2, dotSize, dotSize);
          }
        }

        prevX = x;
        prevY = y;
        prevPrice = price;
      }

      // Close the smoothed path on the final point.
      ctx.lineTo(prevX, prevY);

      // Main line (soft neon)
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = lineColor;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // 🔥 Subtle glow trail
      ctx.globalAlpha = 0.03;
      ctx.lineWidth = 5;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // 🔥 Edge highlight (pro look)
      ctx.beginPath();
      ctx.moveTo(getX(first.time), getY(first.price));

      for (let t = 0; t <= progress; t += step) {
        const i = Math.floor(t / 0.1);
        const a = data[i];
        const b = data[i + 1];
        if (!a || !b) continue;

        const ratio = (t - a.time) / (b.time - a.time || 0.1);
        const price = a.price + (b.price - a.price) * ratio;

        ctx.lineTo(getX(t), getY(price));
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.02;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 🔥 Area fill (very subtle so line feels natural)
      ctx.lineTo(prevX, h);
      ctx.lineTo(getX(first.time), h);
      ctx.closePath();

      const fill = ctx.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, "rgba(0,255,150,0.035)");
      fill.addColorStop(0.5, "rgba(0,255,150,0.015)");
      fill.addColorStop(1, "rgba(0,255,150,0)");

      ctx.fillStyle = fill;
      ctx.fill();

      // 🔥 Clean endpoint dot
      ctx.beginPath();
      ctx.arc(prevX, prevY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(prevX, prevY, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      // Live value tooltip (canvas-following, no React re-render).
      if (tooltipRef.current) {
        const el = tooltipRef.current;
        el.style.display = "block";
        el.style.left = `${prevX}px`;
        el.style.top = `${prevY}px`;
        el.style.borderColor = lineColor;
        el.style.boxShadow = `0 0 22px ${uptrend ? "rgba(0,255,150,0.25)" : "rgba(255,77,77,0.25)"}`;
        el.textContent = `Value: ${Number(prevPrice).toFixed(2)}`;
      }

      // 🔥 Result text
      if (phaseRef.current === "result") {
        const label = uptrend ? "UP WINS!" : "DOWN WINS!";
        const scale = 1 + Math.sin(Date.now() / 150) * 0.05;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);

        ctx.font = "900 64px Orbitron, sans-serif";
        ctx.shadowBlur = 60;
        ctx.fillStyle = lineColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 40;

        ctx.fillText(label, 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, chartMin, chartMax, graphDurationSec]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height, position: "relative" }}>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          transform: "translate(-50%, -110%)",
          padding: "4px 8px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.45)",
          color: "rgba(255,255,255,0.92)",
          fontWeight: 800,
          fontSize: "12px",
          whiteSpace: "nowrap",
          display: "none",
          zIndex: 5,
          backdropFilter: "blur(6px)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height,
          borderRadius: "14px",
        }}
      />
    </div>
  );
}