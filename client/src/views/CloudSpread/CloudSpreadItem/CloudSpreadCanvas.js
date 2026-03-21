import React, { useEffect, useRef } from "react";

export default function CloudSpreadCanvas({
  currentStep = 0,
  totalSteps = 8,
  cloudsPerStep = 10,
  selectedCloudIndex = null,
  selectedCloudIndices = [],
  cloudMultipliers = [],
  height = 360,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const zoomRef = useRef(1);
  const stepRef = useRef(currentStep);
  const selectedRef = useRef(selectedCloudIndex);
  const widthRef = useRef(900);
  const ballRef = useRef({
    x: 34,
    y: 34,
    startX: 34,
    startY: 34,
    targetIndex: null,
    progress: 1,
    landedAt: 0,
    /** Frozen at landing so cloud jitter does not make the ball "jump" forever */
    restX: null,
    restY: null,
    /** Snapshot end of jump (avoids jitter mid-flight); ms when flight began */
    flightEndX: null,
    flightEndY: null,
    flightStartMs: 0,
  });
  /** Idle bounce → multiplier “hit” pulse (0..1 decays). */
  const multHitRef = useRef({ pulse: 0, prevIdle: 0 });

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    selectedRef.current = selectedCloudIndex;
  }, [selectedCloudIndex]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const onResize = () => {
      widthRef.current = Math.max(320, Math.floor(el.clientWidth));
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    /** Polished “glossy marble” ball: radial shading, highlights, rim. */
    const drawPremiumBall = (c, bx, by, R) => {
      c.save();
      c.translate(bx, by);

      const body = c.createRadialGradient(-R * 0.38, -R * 0.42, R * 0.08, 0, 0, R * 1.05);
      body.addColorStop(0, "#fff8e8");
      body.addColorStop(0.12, "#ffe566");
      body.addColorStop(0.35, "#ffc53d");
      body.addColorStop(0.55, "#ff9f1a");
      body.addColorStop(0.78, "#e87000");
      body.addColorStop(1, "#a84a08");

      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.fillStyle = body;
      c.fill();

      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.strokeStyle = "rgba(255, 255, 255, 0.42)";
      c.lineWidth = 1.25;
      c.stroke();

      c.beginPath();
      c.arc(0, 0, R - 1.1, 0, Math.PI * 2);
      c.strokeStyle = "rgba(0, 0, 0, 0.12)";
      c.lineWidth = 1;
      c.stroke();

      const hi = c.createRadialGradient(-R * 0.55, -R * 0.58, 0, -R * 0.35, -R * 0.4, R * 0.65);
      hi.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      hi.addColorStop(0.35, "rgba(255, 255, 255, 0.35)");
      hi.addColorStop(0.7, "rgba(255, 255, 255, 0.05)");
      hi.addColorStop(1, "rgba(255, 255, 255, 0)");
      c.beginPath();
      c.arc(-R * 0.32, -R * 0.36, R * 0.42, 0, Math.PI * 2);
      c.fillStyle = hi;
      c.fill();

      c.beginPath();
      c.arc(-R * 0.12, -R * 0.52, R * 0.14, 0, Math.PI * 2);
      c.fillStyle = "rgba(255, 255, 255, 0.75)";
      c.fill();

      c.beginPath();
      c.arc(R * 0.35, R * 0.38, R * 0.55, 0, Math.PI * 2);
      const rim = c.createRadialGradient(R * 0.35, R * 0.38, 0, R * 0.35, R * 0.38, R * 0.55);
      rim.addColorStop(0, "rgba(255, 200, 120, 0.35)");
      rim.addColorStop(1, "rgba(255, 140, 40, 0)");
      c.fillStyle = rim;
      c.fill();

      c.restore();
    };

    /** Smooth time remap for flight (gentle accel / decel). */
    const easeInOutSine = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;

    /** Stable [0, 1) pseudo-random per cloud index (same layout every frame). */
    const detRand = (cloudIndex, salt) => {
      const x = Math.sin((cloudIndex + 1) * 12.9898 + salt * 78.233 + salt * 0.001) * 43758.5453;
      return x - Math.floor(x);
    };

    /** Several cloud silhouettes (all use soft white puffs); variant is stable per index. */
    const drawCloudShape = (c, cx, cy, rad, variant) => {
      const fill = "rgba(255,255,255,0.88)";
      c.fillStyle = fill;
      c.beginPath();
      const r = rad;
      switch (variant) {
        case 0: {
          c.arc(cx, cy, r, 0, Math.PI * 2);
          c.arc(cx + r * 0.8, cy + 1, r * 0.78, 0, Math.PI * 2);
          c.arc(cx - r * 0.7, cy + 1, r * 0.72, 0, Math.PI * 2);
          break;
        }
        case 1: {
          c.arc(cx - r * 0.85, cy, r * 0.68, 0, Math.PI * 2);
          c.arc(cx + r * 0.05, cy - r * 0.08, r * 0.88, 0, Math.PI * 2);
          c.arc(cx + r * 0.9, cy + 1, r * 0.72, 0, Math.PI * 2);
          c.arc(cx + r * 1.65, cy + 2, r * 0.52, 0, Math.PI * 2);
          break;
        }
        case 2: {
          c.arc(cx, cy - r * 0.55, r * 0.72, 0, Math.PI * 2);
          c.arc(cx, cy + r * 0.1, r * 0.95, 0, Math.PI * 2);
          c.arc(cx, cy + r * 0.95, r * 0.58, 0, Math.PI * 2);
          break;
        }
        case 3: {
          c.arc(cx - r * 0.55, cy - r * 0.1, r * 0.62, 0, Math.PI * 2);
          c.arc(cx + r * 0.5, cy - r * 0.05, r * 0.62, 0, Math.PI * 2);
          c.arc(cx, cy + r * 0.45, r * 0.72, 0, Math.PI * 2);
          c.arc(cx - r * 0.35, cy + r * 0.95, r * 0.48, 0, Math.PI * 2);
          c.arc(cx + r * 0.45, cy + r * 0.9, r * 0.5, 0, Math.PI * 2);
          break;
        }
        case 4: {
          c.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
          c.arc(cx + r * 1.05, cy - r * 0.25, r * 0.58, 0, Math.PI * 2);
          c.arc(cx - r * 0.8, cy + r * 0.4, r * 0.62, 0, Math.PI * 2);
          c.arc(cx + r * 0.4, cy + r * 0.7, r * 0.52, 0, Math.PI * 2);
          break;
        }
        case 5: {
          c.arc(cx - r * 0.35, cy, r * 0.78, 0, Math.PI * 2);
          c.arc(cx + r * 0.55, cy - 3, r * 0.58, 0, Math.PI * 2);
          c.arc(cx + r * 1.2, cy + 1, r * 0.65, 0, Math.PI * 2);
          c.arc(cx + r * 1.85, cy + 3, r * 0.48, 0, Math.PI * 2);
          break;
        }
        case 6: {
          c.arc(cx - r * 0.15, cy - r * 0.25, r * 0.58, 0, Math.PI * 2);
          c.arc(cx + r * 0.55, cy - r * 0.35, r * 0.52, 0, Math.PI * 2);
          c.arc(cx - r * 0.65, cy + r * 0.45, r * 0.68, 0, Math.PI * 2);
          c.arc(cx + r * 0.45, cy + r * 0.4, r * 0.7, 0, Math.PI * 2);
          c.arc(cx, cy + r * 0.95, r * 0.55, 0, Math.PI * 2);
          break;
        }
        default: {
          c.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
          c.arc(cx + r * 0.52, cy + r * 0.12, r * 0.44, 0, Math.PI * 2);
          c.arc(cx - r * 0.48, cy + r * 0.2, r * 0.4, 0, Math.PI * 2);
          c.arc(cx + r * 0.22, cy - r * 0.38, r * 0.36, 0, Math.PI * 2);
          c.arc(cx - r * 0.18, cy - r * 0.28, r * 0.34, 0, Math.PI * 2);
          c.arc(cx + r * 0.85, cy + r * 0.08, r * 0.32, 0, Math.PI * 2);
          break;
        }
      }
      c.fill();
    };

    const draw = () => {
      const width = widthRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = width;
      const h = height;
      /** Ball sits this many px lower so it overlaps the active multiplier. */
      const CLOUD_BALL_VERT_NUDGE = 12;
      const step = Number(stepRef.current || 0);
      const cloudCount = Math.max(0, step * cloudsPerStep);
      // Keep cloud field fully visible: disable zoom growth that can push clouds off-screen.
      const targetZoom = 1;
      zoomRef.current += (targetZoom - zoomRef.current) * 0.2;
      const zoom = zoomRef.current;

      ctx.clearRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#3f89ff");
      sky.addColorStop(0.6, "#89c4ff");
      sky.addColorStop(1, "#d9efff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      const cloudCenters = [];
      const padX = 44;
      const padTop = 52;
      const padBottom = 72;
      const usableW = Math.max(40, w - padX * 2);
      const usableH = Math.max(40, h - padTop - padBottom);
      for (let i = 0; i < cloudCount; i += 1) {
        const xRaw = padX + detRand(i, 11) * usableW;
        const yRaw = padTop + detRand(i, 29) * usableH;
        const r = 12 + detRand(i, 47) * 10;
        const x = Math.max(r + 6, Math.min(w - (r + 6), xRaw));
        const y = Math.max(r + 6, Math.min(h - (r + 46), yRaw));
        const variant = Math.floor(detRand(i, 99) * 8);
        cloudCenters.push({ x, y, r, i: i + 1, variant });

        drawCloudShape(ctx, x, y, r, variant);

      }

      // Ball animation: jump to newly selected cloud, bounce on landing, then show multiplier.
      // Keep multipliers visible on all previously selected clouds.
      const pickedIds = Array.isArray(selectedCloudIndices) ? selectedCloudIndices.slice(-48) : [];
      const pickedSet = new Set(pickedIds.map((n) => Number(n)));
      const rawSelForSkip = selectedRef.current;
      const selNum = Number(rawSelForSkip);
      const skipCurrentMul =
        rawSelForSkip != null &&
        rawSelForSkip !== "" &&
        Number.isFinite(selNum) &&
        selNum > 0;

      if (pickedSet.size > 0) {
        ctx.font = "800 12px Arial";
        ctx.fillStyle = "rgba(28, 43, 71, 0.95)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        cloudCenters.forEach((c) => {
          if (!pickedSet.has(Number(c.i))) return;
          if (skipCurrentMul && Number(c.i) === selNum) return;
          const mul = Number(cloudMultipliers?.[c.i - 1] ?? 0);
          ctx.fillText(`x${mul.toFixed(2)}`, c.x, c.y);
        });
      }

      const rawSel = selectedRef.current;
      const selected = Number(rawSel);
      const showBall =
        rawSel != null &&
        rawSel !== "" &&
        Number.isFinite(selected) &&
        selected > 0;

      // No ball until the parent passes a real pick (e.g. after Bet succeeds).
      if (!showBall) {
        ballRef.current.targetIndex = null;
        ballRef.current.progress = 1;
        ballRef.current.landedAt = 0;
        ballRef.current.restX = null;
        ballRef.current.restY = null;
        ballRef.current.flightEndX = null;
        ballRef.current.flightEndY = null;
        ballRef.current.flightStartMs = 0;
        ballRef.current.x = 34;
        ballRef.current.y = 34;
        multHitRef.current = { pulse: 0, prevIdle: 0 };
      }

      const targetCloud = showBall ? cloudCenters.find((c) => c.i === selected) : undefined;
      if (targetCloud) {
        const targetX = targetCloud.x;
        const targetY = targetCloud.y - targetCloud.r - 10 + CLOUD_BALL_VERT_NUDGE;

        if (ballRef.current.targetIndex !== selected) {
          ballRef.current.targetIndex = selected;
          ballRef.current.startX = ballRef.current.x;
          ballRef.current.startY = ballRef.current.y;
          ballRef.current.progress = 0;
          ballRef.current.landedAt = 0;
          ballRef.current.restX = null;
          ballRef.current.restY = null;
          ballRef.current.flightEndX = targetX;
          ballRef.current.flightEndY = targetY;
          ballRef.current.flightStartMs = Date.now();
          multHitRef.current = { pulse: 0, prevIdle: 0 };
        }

        const FLIGHT_MS = 1120;
        const endX = ballRef.current.flightEndX ?? targetX;
        const endY = ballRef.current.flightEndY ?? targetY;

        if (ballRef.current.progress < 1) {
          const elapsed = Date.now() - (ballRef.current.flightStartMs || Date.now());
          const p = Math.min(1, Math.max(0, elapsed / FLIGHT_MS));
          ballRef.current.progress = p;
          const ax = ballRef.current.startX;
          const ay = ballRef.current.startY;
          const bx = endX;
          const by = endY;
          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const arcPeak = Math.min(95, 26 + dist * 0.34);
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          const qx = midX;
          const qy = midY - arcPeak;
          const t = easeInOutSine(p);
          const omt = 1 - t;
          ballRef.current.x = omt * omt * ax + 2 * omt * t * qx + t * t * bx;
          ballRef.current.y = omt * omt * ay + 2 * omt * t * qy + t * t * by;
          if (p >= 1) {
            ballRef.current.landedAt = Date.now();
            ballRef.current.restX = endX;
            ballRef.current.restY = endY;
            multHitRef.current.pulse = 0.55;
            multHitRef.current.prevIdle = 0;
          }
        } else {
          const restX = ballRef.current.restX ?? targetX;
          const restY = ballRef.current.restY ?? targetY;
          ballRef.current.x = restX;
          const tMs = ballRef.current.landedAt > 0 ? Date.now() - ballRef.current.landedAt : 0;
          const IDLE_AMP = 12;
          const idle = Math.abs(Math.sin(tMs * 0.009)) * IDLE_AMP;
          ballRef.current.y = restY - idle;
          const hitTh = IDLE_AMP * 0.9;
          if (idle >= hitTh && multHitRef.current.prevIdle < hitTh) {
            multHitRef.current.pulse = 0.5;
          }
          multHitRef.current.prevIdle = idle;
          multHitRef.current.pulse *= 0.88;
        }

        if (ballRef.current.progress < 1) {
          multHitRef.current.pulse *= 0.92;
        }
      }

      if (showBall && targetCloud) {
        const R = 9.5;
        drawPremiumBall(ctx, ballRef.current.x, ballRef.current.y, R);

        if (ballRef.current.progress >= 1) {
          const mul = Number(cloudMultipliers?.[selected - 1] ?? 0);
          const label = `x${mul.toFixed(2)}`;
          /** Same as other clouds: multiplier centered inside the cloud body. */
          const lx = targetCloud.x;
          const ly = targetCloud.y;
          const pulse = Math.min(1, multHitRef.current.pulse);
          const scale = 1 + 0.1 * pulse;
          const fontPx = 12 + 1.2 * pulse;

          ctx.save();
          ctx.translate(lx, ly);
          ctx.scale(scale, scale);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `800 ${fontPx}px Arial`;

          const ring = pulse * 10;
          if (ring > 0.2) {
            ctx.beginPath();
            ctx.arc(0, 0, 15 + ring, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 210, 130, ${0.18 * pulse})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.shadowColor = `rgba(255, 190, 80, ${0.12 + 0.18 * pulse})`;
          ctx.shadowBlur = 2 + 5 * pulse;
          ctx.fillStyle = "rgba(28, 43, 71, 0.96)";
          ctx.fillText(label, 0, 0);
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.08 * pulse})`;
          ctx.fillText(label, -0.35 * pulse, -0.35 * pulse);

          ctx.restore();
        }
      }

      ctx.restore();

      ctx.fillStyle = "rgba(8,26,54,0.8)";
      ctx.font = "700 20px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Step ${step}/${totalSteps}`, 20, h - 46);
      ctx.fillText(`Clouds: ${cloudCount}`, 20, h - 20);

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [height, cloudsPerStep, totalSteps, selectedCloudIndex, selectedCloudIndices, cloudMultipliers]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height, position: "relative" }}>
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
