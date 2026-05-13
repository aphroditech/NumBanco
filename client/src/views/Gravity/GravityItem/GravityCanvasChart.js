import React, { useEffect, useRef, useState } from "react";

export default React.memo(function GravityUltimateChartCanvas({
  chartDataDisplay = [],
  chartMin = 0,
  chartMax = 100,
  roundPhase = "betting",
  roundStartAtMs,
  clockOffset = 0,
  roundId,
  height = 240,
  graphDurationSec = 15,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);
  // Cache Y-scale per round so endpoint updates at settlement don't rescale the whole curve.
  const yScaleRef = useRef(null);
  const [width, setWidth] = useState(900);
  const lastTimestampRef = useRef(null);
  const internalProgressRef = useRef(0);

  const dataRef = useRef(chartDataDisplay);
  const phaseRef = useRef(roundPhase);
  const startRef = useRef(roundStartAtMs);
  const clockOffsetRef = useRef(clockOffset);

  const roundIdRef = useRef(roundId);

  useEffect(() => {
    // Only update if we have actual data to prevent flickering during state transitions.
    if (Array.isArray(chartDataDisplay) && chartDataDisplay.length > 0) {
      dataRef.current = chartDataDisplay;
    }
  }, [chartDataDisplay]);

  useEffect(() => { phaseRef.current = roundPhase; }, [roundPhase]);
  useEffect(() => { clockOffsetRef.current = clockOffset; }, [clockOffset]);

  useEffect(() => {
    // ONLY reset scaling when a truly new round starts (valid new round ID).
    // Ignore cases where roundId might be missing for a frame.
    if (roundId && roundIdRef.current !== roundId) {
      roundIdRef.current = roundId;
      startRef.current = roundStartAtMs;
      yScaleRef.current = null;
    } else if (roundStartAtMs) {
      // Still update start time if it changed but round ID stayed same (should be rare)
      startRef.current = roundStartAtMs;
    }
  }, [roundId, roundStartAtMs]);

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
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = width;
      const h = height;
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        const pad = 18;
        const plotH = Math.max(1, h - pad * 2);
        const yGrid = pad + (plotH / gridRows) * gr;
        ctx.beginPath();
        ctx.moveTo(pad, yGrid);
        ctx.lineTo(w - pad, yGrid);
        ctx.stroke();
      }

      const data = dataRef.current;
      if (!data || data.length < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Build an adjusted Y range so the first point always renders at the vertical middle
      // without clipping other values.
      // Cache it so backend updates to only the endpoint don't cause a full curve rescale.
      let minY;
      let range;
      if (yScaleRef.current) {
        minY = yScaleRef.current.minY;
        range = yScaleRef.current.range;
      } else {
        // Use the actual data's min/max across the FULL 15s to lock the scale.
        // We also factor in the theoretical game bounds [80, 100] to ensure 
        // the scale is stable even if the initial points are flat.
        const prices = data.map((d) => d.price);
        const minP = Math.min(...prices, 82); // Assume at least [82, 98] range for stability
        const maxP = Math.max(...prices, 98);
        const firstP = data[0].price;
        
        // Ensure first point is roughly centered and full potential range is visible.
        // This prevents the scale from "jumping" when the flat initial line 
        // suddenly gets its real random-walk values.
        const maxDist = Math.max(Math.abs(firstP - minP), Math.abs(maxP - firstP), 8) || 8;
        const bump = Math.max(maxDist * 0.35, 4); 
        
        let minY0 = firstP - maxDist - bump;
        let maxY0 = firstP + maxDist + bump;
        
        const span0 = maxY0 - minY0 || 1;
        const padFrac = 0.20; // More padding for extreme movements
        minY = minY0 - span0 * padFrac;
        const maxY = maxY0 + span0 * padFrac;
        range = maxY - minY || 1;
        yScaleRef.current = { minY, range };
      }

      const pad = 18;
      // Inner inset so glow (shadowBlur up to 16), stroke, and endpoint dot stay inside overflow:hidden card
      const LINE_PAD_X = 16;
      const LINE_PAD_Y = 44;

      const plotW = Math.max(1, w - pad * 2 - LINE_PAD_X * 2);
      const plotH = Math.max(1, h - pad * 2 - LINE_PAD_Y * 2);
      const plotTop = pad + LINE_PAD_Y;
      const plotBottom = plotTop + plotH;

      const getX = (t) => pad + LINE_PAD_X + (t / graphDurationSec) * plotW;
      const getY = (p) => plotTop + (1 - (p - minY) / range) * plotH;

      const now = Date.now() + clockOffsetRef.current;
      const start = startRef.current || now;
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed, graphDurationSec);

      const first = data[0];
      const last = data[data.length - 1];

      const thresholdPrice = first.price;
      const greenColor = "#00ff99";
      const redColor = "#ff4d4d";

      // Used only for the result text (win label). The line color is handled dynamically.
      const uptrend = last.price >= first.price;

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
            // Color each marker based on whether this point is above/below the first point.
            const dotColor = price >= thresholdPrice ? greenColor : redColor;
            ctx.fillStyle = dotColor;
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
      const endpointAbove = prevPrice >= thresholdPrice;
      const endpointColor = endpointAbove ? greenColor : redColor;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = endpointColor;
      ctx.shadowColor = endpointColor;
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
      ctx.lineTo(prevX, plotBottom);
      ctx.lineTo(getX(first.time), plotBottom);
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
      ctx.fillStyle = endpointColor;
      ctx.fill();

      // Show the very first graph value (start point) so users can compare start vs current.
      const firstX = getX(first.time);
      const firstY = getY(first.price);
      const firstValue = Number(first.price).toFixed(2);
      const startColor = "#8ea2b5";

      ctx.beginPath();
      ctx.arc(firstX, firstY, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(firstX, firstY, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = startColor;
      ctx.fill();

      ctx.save();
      ctx.font = "700 11px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textBaseline = "bottom";
      const startLabel = `Start: ${firstValue}`;
      const labelPad = 8;
      const labelW = ctx.measureText(startLabel).width;
      const minLabelX = labelW / 2 + 6;
      const maxLabelX = w - labelW / 2 - 6;
      const labelX = Math.max(minLabelX, Math.min(maxLabelX, firstX + labelPad + labelW / 2));
      const labelY = Math.max(14, Math.min(h - 6, firstY - 6));
      ctx.fillText(startLabel, labelX - labelW / 2, labelY);
      ctx.restore();

      // Live value tooltip (canvas-following, no React re-render).
      // Clamp anchor X so translate(-50%, …) doesn't clip at left/right edges (parent overflow:hidden).
      if (tooltipRef.current) {
        const el = tooltipRef.current;
        el.style.display = "block";
        el.textContent = `Value: ${Number(prevPrice).toFixed(2)}`;
        const measured = el.offsetWidth || 0;
        const halfW = measured > 0 ? measured / 2 : 68;
        const edgePad = 10;
        const clampedX = Math.max(halfW + edgePad, Math.min(w - halfW - edgePad, prevX));
        el.style.left = `${clampedX}px`;
        el.style.zIndex = 10000;
        el.style.top = `${prevY}px`;
        el.style.borderColor = endpointColor;
        el.style.boxShadow = `0 0 22px ${endpointAbove ? "rgba(0,255,150,0.25)" : "rgba(255,77,77,0.25)"}`;
      }

      // 🔥 Result text
      if (phaseRef.current === "result") {
        const label = endpointAbove ? "UP WINS!" : "DOWN WINS!";
        const scale = 1 + Math.sin(performance.now() / 150) * 0.05;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);

        ctx.font = "900 64px Orbitron, sans-serif";
        ctx.shadowBlur = 60;
        ctx.fillStyle = endpointColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = endpointColor;
        ctx.shadowBlur = 40;

        ctx.fillText(label, 0, 0);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, graphDurationSec]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height, position: "relative", overflow: "visible" }}>
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
});