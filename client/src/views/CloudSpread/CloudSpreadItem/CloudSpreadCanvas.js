import React, { useEffect, useRef } from "react";

export default function CloudSpreadCanvas({
  currentStep = 0,
  totalSteps = 8,
  cloudsPerStep = 10,
  selectedCloudIndex = null,
  selectedCloudIndices = [],
  cloudMultipliers = [],
  height = 360,
  /** After x0.00 land: parent hides ball; still show x0 on cloud via picked labels */
  hideBall = false,
  /** Fires once when ball lands on selected cloud with multiplier 0.0 */
  onZeroMultiplierLand,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const zoomRef = useRef(1);
  const stepRef = useRef(currentStep);
  const selectedRef = useRef(selectedCloudIndex);
  const selectedIndicesRef = useRef(selectedCloudIndices);
  const cloudMultipliersRef = useRef(cloudMultipliers);
  const widthRef = useRef(900);
  const cloudCentersRef = useRef([]);
  /** Offscreen canvases for pre-rendered assets. */
  const cloudCacheRef = useRef([]);
  const ballCacheRef = useRef(null);
  const skyCacheRef = useRef(null);

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
  const hideBallRef = useRef(hideBall);
  const onZeroLandRef = useRef(onZeroMultiplierLand);
  /** Avoid double-firing callback for same cloud index */
  const zeroLandFiredForRef = useRef(null);

  useEffect(() => {
    hideBallRef.current = hideBall;
  }, [hideBall]);
  useEffect(() => {
    onZeroLandRef.current = onZeroMultiplierLand;
  }, [onZeroMultiplierLand]);
  useEffect(() => {
    zeroLandFiredForRef.current = null;
  }, [selectedCloudIndex]);

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);
  useEffect(() => {
    selectedRef.current = selectedCloudIndex;
  }, [selectedCloudIndex]);
  useEffect(() => {
    selectedIndicesRef.current = selectedCloudIndices;
  }, [selectedCloudIndices]);
  useEffect(() => {
    cloudMultipliersRef.current = cloudMultipliers;
  }, [cloudMultipliers]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;

    const onResize = () => {
      const measured = Math.floor(el.clientWidth);
      if (measured !== widthRef.current) {
        widthRef.current = measured;
        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = measured * dpr;
          canvas.height = height * dpr;
        }
      }
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  /** Stable [0, 1) pseudo-random per cloud index (same layout every frame). */
  const detRand = (cloudIndex, salt) => {
    const x = Math.sin((cloudIndex + 1) * 12.9898 + salt * 78.233 + salt * 0.001) * 43758.5453;
    return x - Math.floor(x);
  };

  /** Pre-calculate cloud centers when step or width changes. */
  useEffect(() => {
    const w = widthRef.current;
    const h = height;
    const step = Number(stepRef.current || 0);
    const cloudCount = Math.max(0, step * cloudsPerStep);
    const layoutScale = Math.min(1.5, Math.max(0.72, w / 520));

    const centers = [];
    const padX = Math.max(14, w * 0.045);
    const padTop = Math.max(32, h * 0.09);
    const padBottom = Math.max(52, h * 0.17);
    const usableW = Math.max(40, w - padX * 2);
    const usableH = Math.max(40, h - padTop - padBottom);

    const drawCloudShapeToBuffer = (c, cx, cy, rad, variant) => {
      c.fillStyle = "rgba(255,255,255,0.88)";
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
          c.arc(cx + r * 0.45, cy + r * 0.5, r * 0.5, 0, Math.PI * 2);
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

    const newCloudCache = [];

    for (let i = 0; i < cloudCount; i += 1) {
      const xRaw = padX + detRand(i, 11) * usableW;
      const yRaw = padTop + detRand(i, 29) * usableH;
      const r = (12 + detRand(i, 47) * 10) * layoutScale;
      const x = Math.max(r + 6, Math.min(w - (r + 6), xRaw));
      const y = Math.max(r + 6, Math.min(h - (r + 46), yRaw));
      const variant = Math.floor(detRand(i, 99) * 8);
      const layer = Math.floor(detRand(i, 71) * 3);
      centers.push({ x, y, r, i: i + 1, variant, layer });

      // Pre-render this cloud variant to an offscreen canvas
      const offC = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      const bufW = r * 6;
      const bufH = r * 6;
      offC.width = bufW * dpr;
      offC.height = bufH * dpr;
      const oCtx = offC.getContext("2d");
      oCtx.scale(dpr, dpr);
      drawCloudShapeToBuffer(oCtx, bufW / 2, bufH / 2, r, variant);
      newCloudCache[i + 1] = offC;
    }
    cloudCentersRef.current = centers.sort((a, b) => a.layer - b.layer);
    cloudCacheRef.current = newCloudCache;

    // Pre-render the sky
    const skyC = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    skyC.width = w * dpr;
    skyC.height = h * dpr;
    const skyCtx = skyC.getContext("2d");
    skyCtx.scale(dpr, dpr);
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#0a1020");
    skyGrad.addColorStop(0.18, "#152238");
    skyGrad.addColorStop(0.38, "#1e4a6e");
    skyGrad.addColorStop(0.58, "#4a8ec4");
    skyGrad.addColorStop(0.78, "#9fd4f0");
    skyGrad.addColorStop(1, "#eef6fc");
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, w, h);

    // Pre-render horizon haze
    const haze = skyCtx.createLinearGradient(0, h * 0.55, 0, h);
    haze.addColorStop(0, "rgba(255, 255, 255, 0)");
    haze.addColorStop(0.35, "rgba(230, 245, 255, 0.18)");
    haze.addColorStop(1, "rgba(255, 255, 255, 0.28)");
    skyCtx.fillStyle = haze;
    skyCtx.fillRect(0, h * 0.52, w, h * 0.48);

    // Pre-render the ball
    const ballC = document.createElement("canvas");
    const ballR = 10 * layoutScale;
    const ballBuf = ballR * 4;
    ballC.width = ballBuf * dpr;
    ballC.height = ballBuf * dpr;
    const ballCtx = ballC.getContext("2d");
    ballCtx.scale(dpr, dpr);
    
    // Draw the static part of the premium ball
    const drawStaticBall = (c, bx, by, R) => {
      c.save();
      c.translate(bx, by);
      
      // Soft ground contact shadow
      c.save();
      c.translate(0, R * 0.72);
      c.scale(1.35, 0.38);
      c.beginPath();
      c.arc(0, 0, R * 0.92, 0, Math.PI * 2);
      const sh = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.92);
      sh.addColorStop(0, "rgba(15, 40, 80, 0.42)");
      sh.addColorStop(0.55, "rgba(15, 40, 80, 0.14)");
      sh.addColorStop(1, "rgba(15, 40, 80, 0)");
      c.fillStyle = sh;
      c.fill();
      c.restore();

      // Outer soft bloom
      c.beginPath();
      c.arc(0, 0, R + 2.2, 0, Math.PI * 2);
      const bloom = c.createRadialGradient(0, 0, R * 0.4, 0, 0, R + 2.5);
      bloom.addColorStop(0, "rgba(255, 248, 220, 0.15)");
      bloom.addColorStop(0.65, "rgba(255, 200, 120, 0.06)");
      bloom.addColorStop(1, "rgba(255, 200, 100, 0)");
      c.fillStyle = bloom;
      c.fill();

      // Main body
      const body = c.createRadialGradient(-R * 0.42, -R * 0.46, R * 0.06, R * 0.08, R * 0.12, R * 1.12);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.08, "#fff8f0");
      body.addColorStop(0.22, "#ffe9a8");
      body.addColorStop(0.42, "#ffc53d");
      body.addColorStop(0.62, "#ff9a1a");
      body.addColorStop(0.82, "#d96a00");
      body.addColorStop(1, "#7a3a0a");
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.fillStyle = body;
      c.fill();

      // Ambient occlusion
      c.save();
      c.beginPath();
      c.arc(0, 0, R - 0.5, 0, Math.PI * 2);
      c.clip();
      const ao = c.createRadialGradient(R * 0.35, R * 0.55, 0, R * 0.2, R * 0.35, R * 1.1);
      ao.addColorStop(0, "rgba(60, 25, 0, 0)");
      ao.addColorStop(0.55, "rgba(80, 35, 0, 0.22)");
      ao.addColorStop(1, "rgba(40, 15, 0, 0.38)");
      c.fillStyle = ao;
      c.fillRect(-R * 2, -R * 2, R * 4, R * 4);
      c.restore();
      
      c.restore();
    };

    drawStaticBall(ballCtx, ballBuf / 2, ballBuf / 2, 6 * layoutScale);
    ballCacheRef.current = ballC;

    skyCacheRef.current = skyC;
  }, [currentStep, cloudsPerStep, height, widthRef.current]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false }); // Optimize if no transparency needed for the background
    if (!ctx) return undefined;

    const drawPremiumBall = (c, bx, by, R, opts = {}) => {
      const { inFlight = false } = opts;
      const t = performance.now() * 0.0022;
      const shimmer = 0.72 + 0.28 * Math.sin(t);
      const flightGlow = inFlight ? 0.35 : 0;

      const cached = ballCacheRef.current;
      if (cached) {
        const bufW = R * 4 * (10 / 6); // R was 6 in cache calculation
        const bufH = R * 4 * (10 / 6);
        c.drawImage(cached, bx - bufW / 2, by - bufH / 2, bufW, bufH);
      }

      c.save();
      c.translate(bx, by);

      // Cool sky bounce-light + speculars
      c.save();
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.clip();
      const cool = c.createLinearGradient(-R, R * 0.2, R * 0.9, -R * 0.3);
      cool.addColorStop(0, "rgba(180, 230, 255, 0.22)");
      cool.addColorStop(0.45, "rgba(255, 255, 255, 0)");
      c.fillStyle = cool;
      c.fillRect(-R * 2, -R * 2, R * 4, R * 4);

      const hi = c.createRadialGradient(-R * 0.52, -R * 0.58, 0, -R * 0.38, -R * 0.44, R * 0.72);
      hi.addColorStop(0, `rgba(255, 255, 255, ${0.94 * shimmer})`);
      hi.addColorStop(0.28, `rgba(255, 252, 240, ${0.45 * shimmer})`);
      hi.addColorStop(0.55, "rgba(255, 255, 255, 0.12)");
      hi.addColorStop(1, "rgba(255, 255, 255, 0)");
      c.beginPath();
      c.arc(-R * 0.28, -R * 0.34, R * 0.48, 0, Math.PI * 2);
      c.fillStyle = hi;
      c.fill();

      c.beginPath();
      c.arc(-R * 0.38, -R * 0.48, R * 0.11, 0, Math.PI * 2);
      c.fillStyle = `rgba(255, 255, 255, ${0.88 * shimmer})`;
      c.fill();
      c.beginPath();
      c.arc(-R * 0.44, -R * 0.54, R * 0.045, 0, Math.PI * 2);
      c.fillStyle = "rgba(255, 255, 255, 0.95)";
      c.fill();

      c.beginPath();
      c.arc(R * 0.42, R * 0.38, R * 0.52, 0, Math.PI * 2);
      const rim = c.createRadialGradient(R * 0.42, R * 0.38, 0, R * 0.42, R * 0.38, R * 0.52);
      rim.addColorStop(0, "rgba(255, 210, 140, 0.45)");
      rim.addColorStop(1, "rgba(255, 140, 40, 0)");
      c.fillStyle = rim;
      c.fill();
      c.restore();

      // Crisp outer rim light
      c.beginPath();
      c.arc(0, 0, R, 0, Math.PI * 2);
      c.strokeStyle = "rgba(255, 255, 255, 0.55)";
      c.lineWidth = 1.35;
      c.stroke();

      if (inFlight) {
        c.beginPath();
        c.arc(0, R * 0.15, R * 1.15, Math.PI * 1.15, Math.PI * 1.85);
        c.strokeStyle = `rgba(255, 220, 160, ${0.35 + flightGlow})`;
        c.lineWidth = 2;
        c.stroke();
      }

      c.restore();
    };

    /** Smooth time remap for flight (gentle accel / decel). */
    const easeInOutSine = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;

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

    /** Soft glow under a cloud (blur-like falloff). */
    const drawCloudAmbientGlow = (c, cx, cy, r, layer) => {
      const spread = r * (2.1 - layer * 0.15);
      const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, spread);
      g.addColorStop(0, "rgba(255, 255, 255, 0.22)");
      g.addColorStop(0.45, "rgba(200, 230, 255, 0.08)");
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      c.save();
      c.globalCompositeOperation = "screen";
      c.fillStyle = g;
      c.beginPath();
      c.arc(cx, cy, spread, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    /** Parallax: layer 0 = far (slow), 2 = near (faster). */
    const parallaxForLayer = (layer, idx, tSec) => {
      const spd = [0.11, 0.17, 0.24][layer];
      const ampX = [9, 15, 22][layer];
      const ampY = [6, 10, 14][layer];
      const ox = Math.sin(tSec * spd + idx * 1.17 + layer * 0.4) * ampX;
      const oy = Math.cos(tSec * spd * 0.75 + idx * 0.93 + layer * 0.35) * ampY;
      return { ox, oy };
    };

    const draw = (timestamp) => {
      const width = widthRef.current;
      const h = height;
      const dpr = window.devicePixelRatio || 1;
      
      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = width;
      const layoutScale = Math.min(1.5, Math.max(0.72, w / 520));
      const CLOUD_BALL_VERT_NUDGE = 12 * layoutScale;
      const step = Number(stepRef.current || 0);
      const cloudCount = Math.max(0, step * cloudsPerStep);
      const zoom = zoomRef.current;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw pre-rendered sky
      if (skyCacheRef.current) {
        ctx.drawImage(skyCacheRef.current, 0, 0, w, h);
      }

      const tSec = timestamp * 0.001;

      // 2. Draw subtle vignette
      const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.15, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      vig.addColorStop(0, "rgba(0, 0, 0, 0)");
      vig.addColorStop(1, "rgba(10, 20, 40, 0.22)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      const activeClouds = [];
      const cloudCenters = cloudCentersRef.current;
      const cloudCache = cloudCacheRef.current;

      cloudCenters.forEach((c) => {
        const { ox, oy } = parallaxForLayer(c.layer, c.i, tSec);
        const cx = Math.max(c.r + 6, Math.min(w - (c.r + 6), c.x + ox));
        const cy = Math.max(c.r + 6, Math.min(h - (c.r + 46), c.y + oy));
        activeClouds.push({ ...c, cx, cy });

        // Draw pre-rendered cloud
        const cached = cloudCache[c.i];
        if (cached) {
          const alphaByLayer = [0.78, 0.9, 1][c.layer];
          drawCloudAmbientGlow(ctx, cx, cy, c.r, c.layer);
          ctx.save();
          ctx.globalAlpha = alphaByLayer;
          // Offset by buffer center
          const bufW = c.r * 6;
          const bufH = c.r * 6;
          ctx.drawImage(cached, cx - bufW / 2, cy - bufH / 2, bufW, bufH);
          ctx.restore();
        }
      });

      // Ball animation: jump to newly selected cloud, bounce on landing, then show multiplier.
      const pickedIndices = selectedIndicesRef.current || [];
      const pickedSet = new Set(pickedIndices.map((n) => Number(n)));
      const rawSelForSkip = selectedRef.current;
      const selNum = Number(rawSelForSkip);
      const hideBallNow = hideBallRef.current;
      const skipCurrentMul =
        !hideBallNow &&
        rawSelForSkip != null &&
        rawSelForSkip !== "" &&
        Number.isFinite(selNum) &&
        selNum > 0;

      if (pickedSet.size > 0) {
        const mulFont = Math.max(7, Math.round(9 * layoutScale));
        ctx.font = `700 ${mulFont}px Arial`;
        ctx.fillStyle = "rgba(20, 35, 65, 0.98)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(255, 255, 255, 0.45)";
        ctx.shadowBlur = 4;
        const multipliers = cloudMultipliersRef.current || [];
        activeClouds.forEach((c) => {
          if (!pickedSet.has(Number(c.i))) return;
          if (skipCurrentMul && Number(c.i) === selNum) return;
          const mul = Number(multipliers[c.i - 1] ?? 0);
          ctx.fillText(`x${mul.toFixed(2)}`, c.cx, c.cy);
        });
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
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
        ballRef.current.x = w * 0.06;
        ballRef.current.y = h * 0.1;
        multHitRef.current = { pulse: 0, prevIdle: 0 };
      }

      const targetCloud = showBall ? activeClouds.find((c) => c.i === selected) : undefined;
      if (targetCloud) {
        const targetX = targetCloud.cx;
        const targetY = targetCloud.cy - targetCloud.r - 10 * layoutScale + CLOUD_BALL_VERT_NUDGE;

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
          ballRef.current.flightStartMs = performance.now();
          multHitRef.current = { pulse: 0, prevIdle: 0 };
        }

        const FLIGHT_MS = 1120;
        ballRef.current.flightEndX = targetX;
        ballRef.current.flightEndY = targetY;
        const endX = targetX;
        const endY = targetY;

        if (ballRef.current.progress < 1) {
          const elapsed = timestamp - (ballRef.current.flightStartMs || timestamp);
          const p = Math.min(1, Math.max(0, elapsed / FLIGHT_MS));
          ballRef.current.progress = p;
          const ax = ballRef.current.startX;
          const ay = ballRef.current.startY;
          const bx = endX;
          const by = endY;
          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const arcPeak = Math.min(95 * layoutScale, 26 * layoutScale + dist * 0.34);
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;
          const qx = midX;
          const qy = midY - arcPeak;
          const t = easeInOutSine(p);
          const omt = 1 - t;
          ballRef.current.x = omt * omt * ax + 2 * omt * t * qx + t * t * bx;
          ballRef.current.y = omt * omt * ay + 2 * omt * t * qy + t * t * by;
          if (p >= 1) {
            ballRef.current.landedAt = performance.now();
            ballRef.current.restX = endX;
            ballRef.current.restY = endY;
            multHitRef.current.pulse = 0.55;
            multHitRef.current.prevIdle = 0;
            const multipliers = cloudMultipliersRef.current || [];
            const landMul = Number(multipliers[selected - 1] ?? 0);
            if (
              landMul === 0 &&
              onZeroLandRef.current &&
              zeroLandFiredForRef.current !== selected
            ) {
              zeroLandFiredForRef.current = selected;
              try {
                onZeroLandRef.current();
              } catch {
                /* ignore */
              }
            }
          }
        } else {
          const tMs = ballRef.current.landedAt > 0 ? timestamp - ballRef.current.landedAt : 0;
          const IDLE_AMP = 12 * layoutScale;
          const idle = Math.abs(Math.sin(tMs * 0.009)) * IDLE_AMP;
          ballRef.current.x = targetX;
          ballRef.current.y = targetY - idle;
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

      if (showBall && targetCloud && !hideBallNow) {
        const R = 6 * layoutScale;
        drawPremiumBall(ctx, ballRef.current.x, ballRef.current.y, R, {
          inFlight: ballRef.current.progress < 1,
        });

        if (ballRef.current.progress >= 1) {
          const multipliers = cloudMultipliersRef.current || [];
          const mul = Number(multipliers[selected - 1] ?? 0);
          const label = `x${mul.toFixed(2)}`;
          const lx = targetCloud.cx;
          const ly = targetCloud.cy;
          const pulse = Math.min(1, multHitRef.current.pulse);
          const scale = 1 + 0.08 * pulse;
          const fontPx = Math.max(7, 9 * layoutScale + 0.85 * pulse);

          ctx.save();
          ctx.translate(lx, ly);
          ctx.scale(scale, scale);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `700 ${fontPx}px Arial`;

          const ring = pulse * 8 * layoutScale;
          if (ring > 0.2) {
            ctx.beginPath();
            ctx.arc(0, 0, 11 * layoutScale + ring, 0, Math.PI * 2);
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

      const hudFont = Math.max(11, Math.round(14 * layoutScale));
      const hudPadX = Math.max(12, w * 0.028);
      const hudLine1Y = h - Math.max(38, h * 0.12);
      const hudLine2Y = h - Math.max(18, h * 0.05);
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.font = `700 ${hudFont}px Arial`;
      ctx.textAlign = "left";
      ctx.fillText(`Step ${step}/${totalSteps}`, hudPadX, hudLine1Y);
      ctx.fillText(`Clouds: ${cloudCount}`, hudPadX, hudLine2Y);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [height, cloudsPerStep, totalSteps]);

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
