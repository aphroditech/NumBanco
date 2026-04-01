import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Box, Flex, Switch, FormLabel } from '@chakra-ui/react';

/** Outer shell — match Plinko game card (PlinkoPage) */
const BG = '#2a2d2e';
const VB = { w: 100, h: 100 };

/** Multiplier band (SVG coords, y↓). Keeps peg triangle & bins tight. */
const BUCKET_HEIGHT = 5.45;
const BUCKET_TOP = VB.h - BUCKET_HEIGHT;
/** Small gap between bottom peg row and top of multiplier boxes */
const PEG_BUCKET_GAP = 0.7;
/** Used with bottom-anchored spacing: logical top bound for full-span math. */
const PEG_TOP_MARGIN = 1.85;
/**
 * Vertical row compression (lower = tighter stairs). Bottom peg row stays above multipliers;
 * the crop viewBox removes the empty band above the pyramid.
 */
const PEG_VERTICAL_COMPACT = 0.68;
/** Scale horizontal distance between peg centers (< 1 = pegs closer). */
const PEG_HORIZONTAL_TIGHT = 0.86;
/** Visual radius of peg dots (smaller = finer board). */
const PEG_DRAW_RADIUS = 0.52;

/**
 * Peg hit: specular glint — fast rise, long soft decay. `dur` controls total visible time.
 * No scale bounce — opacity-only.
 */
const PEG_HIT_SHINE_MS = 2000;
const PEG_HIT_SHINE_DUR = `${PEG_HIT_SHINE_MS / 1000}s`;
const PEG_HIT_OPACITY_VALUES = '0;0.72;0.42;0.22;0.08;0';
const PEG_HIT_OPACITY_KEY_TIMES = '0;0.04;0.2;0.48;0.78;1';
const PEG_HIT_OPACITY_SPLINES =
    '0.42 0 0.12 1;0.35 0 0.25 1;0.25 0.1 0.25 1;0.25 0.1 0.25 1;0.15 0.5 0.35 1';
/** Keep mounted until SMIL finishes + small buffer (ms). */
const PEG_HIT_FLASH_LIFETIME_MS = PEG_HIT_SHINE_MS + 120;

/** Card width as a fraction of the space between two bottom pegs (wider = more “landscape”) */
const BUCKET_WIDTH_FRAC = 0.72;

/** Bucket result / highlight outline — Rubic cyan */
const RESULT_OUTLINE_CYAN = '#00d4ff';

/** Row `r` has 3 + r pegs (r = 0 … rows-1). */
function pegCountForRow(r) {
    return 3 + r;
}

function yRow(row, rows) {
    if (rows <= 1) return PEG_TOP_MARGIN;
    const yLast = BUCKET_TOP - PEG_BUCKET_GAP;
    const maxSpan = yLast - PEG_TOP_MARGIN;
    const span = maxSpan * PEG_VERTICAL_COMPACT;
    return yLast - ((rows - 1 - row) / (rows - 1)) * span;
}

function pegPosStaggered(r, pegIdx, rows) {
    const count = pegCountForRow(r);
    const maxPegs = pegCountForRow(rows - 1);
    const innerW = VB.w * 0.94;
    const margin = (VB.w - innerW) / 2;
    const stepX = (innerW / (maxPegs + 1)) * PEG_HORIZONTAL_TIGHT;
    const rowW = (count - 1) * stepX;
    const startX = margin + (innerW - rowW) / 2;
    const clampedIdx = Math.max(0, Math.min(count - 1, pegIdx));
    return { x: startX + clampedIdx * stepX, y: yRow(r, rows) };
}

function bottomPegXs(rows) {
    const r = rows - 1;
    const count = pegCountForRow(r);
    const xs = [];
    for (let j = 0; j < count; j += 1) {
        xs.push(pegPosStaggered(r, j, rows).x);
    }
    return xs;
}

/** Horizontal centers of the (pegs - 1) buckets — each lies between two bottom pegs. */
function bucketGapCenters(rows) {
    const xs = bottomPegXs(rows);
    if (xs.length < 2) return { centers: [], gap: VB.w / Math.max(1, rows + 1) };
    const centers = [];
    for (let i = 0; i < xs.length - 1; i += 1) {
        centers.push((xs[i] + xs[i + 1]) / 2);
    }
    const gap = xs[1] - xs[0];
    return { centers, gap };
}

function bucketCenterX(slot, rows) {
    const { centers } = bucketGapCenters(rows);
    if (!centers.length) return VB.w / 2;
    const s = Math.max(0, Math.min(centers.length - 1, slot));
    return centers[s];
}

/** X midpoint of the gap to the left of peg `rightPegIdx` (between pegs rightPegIdx-1 and rightPegIdx). Requires rightPegIdx >= 1. */
function laneGapX(row, rightPegIdx, rows) {
    const a = pegPosStaggered(row, rightPegIdx - 1, rows);
    const b = pegPosStaggered(row, rightPegIdx, rows);
    return (a.x + b.x) / 2;
}

/** Rounded-rectangle card (chunky “block” look, all corners). */
function bucketCardPath(cx, top, w, h) {
    const rr = Math.min(w * 0.16, h * 0.24, 1.15);
    const left = cx - w / 2;
    const right = cx + w / 2;
    const bottom = top + h;
    return [
        `M ${left + rr} ${top}`,
        `L ${right - rr} ${top}`,
        `Q ${right} ${top} ${right} ${top + rr}`,
        `L ${right} ${bottom - rr}`,
        `Q ${right} ${bottom} ${right - rr} ${bottom}`,
        `L ${left + rr} ${bottom}`,
        `Q ${left} ${bottom} ${left} ${bottom - rr}`,
        `L ${left} ${top + rr}`,
        `Q ${left} ${top} ${left + rr} ${top}`,
        'Z',
    ].join(' ');
}

/** Darker bottom band for “extruded” block depth (drawn above face fill). */
function bucketBottomBevelPath(cx, top, w, h) {
    const rr = Math.min(w * 0.16, h * 0.24, 1.15);
    const lip = h * 0.24;
    const left = cx - w / 2;
    const right = cx + w / 2;
    const bottom = top + h;
    const lipTop = bottom - lip;
    return [
        `M ${left} ${lipTop}`,
        `L ${right} ${lipTop}`,
        `L ${right} ${bottom - rr}`,
        `Q ${right} ${bottom} ${right - rr} ${bottom}`,
        `L ${left + rr} ${bottom}`,
        `Q ${left} ${bottom} ${left} ${bottom - rr}`,
        `L ${left} ${lipTop}`,
        'Z',
    ].join(' ');
}

/**
 * Symmetric palette — outer pink/magenta → orange → gold center (reference-style).
 * `topHi` / `top` / `bot` = top highlight, face, dark bottom extrusion.
 */
function bucketPalette(i, nBuckets) {
    const mid = (nBuckets - 1) / 2;
    const d = Math.abs(i - mid);
    if (d >= mid - 0.5) return { topHi: '#f48fb1', top: '#e91e63', bot: '#4a0e2e' };
    if (d >= mid - 2.5) return { topHi: '#ffab91', top: '#ff5722', bot: '#6d1f0f' };
    if (d >= mid - 4.5) return { topHi: '#ffcc80', top: '#ff9800', bot: '#8a4a00' };
    if (d >= 0.5) return { topHi: '#ffe082', top: '#ffca28', bot: '#a65f00' };
    return { topHi: '#fffde7', top: '#ffeb3b', bot: '#b8860b' };
}

/**
 * Hyper Mode reference: center pale yellow (0.1) → yellow → light orange → dark orange → pink ends,
 * with distance-from-center bands matching a 9-slot symmetric layout scaled to any bucket count.
 */
function bucketPaletteHyper(i, nBuckets) {
    const mid = (nBuckets - 1) / 2;
    const d = Math.abs(i - mid);
    const maxD = mid;
    if (maxD < 1e-9) {
        return { topHi: '#fffde7', top: '#fff59d', bot: '#b89b20' };
    }
    const t = d / maxD;
    if (t > 0.875) return { topHi: '#f8bbd9', top: '#e91e8c', bot: '#4a0e2e' };
    if (t > 0.625) return { topHi: '#ffab91', top: '#ff5722', bot: '#5d1a0a' };
    if (t > 0.375) return { topHi: '#ffcc80', top: '#fb8c00', bot: '#7a3e00' };
    if (t > 0.125) return { topHi: '#ffe082', top: '#ffc107', bot: '#9a6500' };
    return { topHi: '#fffde7', top: '#ffee58', bot: '#c9a227' };
}

/** 5-point star path centered at (0,0). `outerR` / `innerR` in SVG units. */
function fivePointStarPathD(outerR, innerR) {
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push([rad * Math.cos(ang), rad * Math.sin(ang)]);
    }
    const [fx, fy] = pts[0];
    return [`M ${fx},${fy}`, ...pts.slice(1).map(([x, y]) => `L ${x},${y}`), 'Z'].join(' ');
}

/** Stars along the top rim of the bucket (bc.game–style). */
function landStarSlots(count) {
    return Array.from({ length: count }, (_, si) => {
        const t = count > 1 ? (si / (count - 1)) * 2 - 1 : 0;
        const ox = t * 0.42;
        const oy = -0.11 - (si % 3) * 0.055;
        const rot = ((si * 37) % 72) - 36;
        const size = 0.88 + (si % 4) * 0.06;
        return { ox, oy, rot, size };
    });
}

function formatMultLabel(m) {
    const x = Number(m);
    if (!Number.isFinite(x)) return '—';
    if (x >= 1000) {
        const k = x / 1000;
        if (Math.abs(k - Math.round(k)) < 1e-9) return `${Math.round(k)}k`;
        return `${Math.round(k * 10) / 10}k`;
    }
    if (x >= 10) return String(Math.round(x));
    if (x >= 1) return String(Math.round(x * 100) / 100);
    return String(Math.round(x * 1000) / 1000);
}

function buildWaypoints(rows, pathSteps) {
    const pts = [];
    const y0 = yRow(0, rows);
    pts.push({ x: laneGapX(0, 1, rows), y: y0 - 2.35 });
    let p = 1;
    for (let c = 0; c < rows; c += 1) {
        p += pathSteps[c] ? 1 : 0;
        if (c < rows - 1) {
            const r = c + 1;
            /* Only add intermediate rows here; bottom peg row uses final p after all steps. */
            if (r < rows - 1) {
                pts.push({ x: laneGapX(r, p, rows), y: yRow(r, rows) });
            }
        }
    }
    const bottomR = rows - 1;
    pts.push({ x: laneGapX(bottomR, p, rows), y: yRow(bottomR, rows) });
    const slot = p - 1;
    const landY = BUCKET_TOP + BUCKET_HEIGHT * 0.42;
    pts.push({ x: bucketCenterX(slot, rows), y: landY });
    return { waypoints: pts, finalSlot: slot };
}

/** 0→1 with zero derivative at ends — less “jerky” than quadratic ease for long paths. */
function smoothstep01(t) {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
}

/** Same transform stack as the bucket keycap press — keeps the ball glued to the card while it dips. */
function KeycapSyncGroup({ cx, bucketCy, children }) {
    return (
        <g transform={`translate(${cx}, ${bucketCy})`}>
            <g>
                <animateTransform
                    attributeName="transform"
                    type="translate"
                    additive="replace"
                    values="0 0; 0 2.35; 0 0.15; 0 0"
                    keyTimes="0;0.1;0.32;1"
                    dur="0.32s"
                    fill="freeze"
                />
                <g transform={`translate(${-cx}, ${-bucketCy})`}>{children}</g>
            </g>
        </g>
    );
}

export default function PlinkoBoard({
    rows,
    multipliers,
    pathSteps,
    dropTick,
    isAnimating,
    onAnimationDone,
    highlightSlot,
    hyperMode = false,
    onHyperModeChange = () => {},
    /** Optional image URL (e.g. imported JPG) for the falling ball; falls back to flat circle. */
    ballImageSrc,
}) {
    const ballClipId = useMemo(() => `plinko-ball-clip-${Math.random().toString(36).slice(2, 11)}`, []);
    const n = Math.max(8, Math.min(16, rows));
    const mults = Array.isArray(multipliers) && multipliers.length === n + 1 ? multipliers : [];
    const midIdx = mults.length ? Math.floor((mults.length - 1) / 2) : -1;

    const { bucketCenters, bucketWidth, ballRadius, ballStrokeW } = useMemo(() => {
        const { centers, gap } = bucketGapCenters(n);
        const w = Math.min(gap * 0.92, Math.max(gap * BUCKET_WIDTH_FRAC, 2.0));
        const dy = n > 1 ? Math.abs(yRow(1, n) - yRow(0, n)) : gap;
        const mesh = Math.min(gap, dy);
        const rowT = (n - 8) / 8;
        /* Ball size is independent of peg draw size — larger ball vs pegs. */
        const wantR = 1.42 * (1.52 - rowT * 0.42);
        const maxR = mesh * 0.62;
        const br = Math.max(0.78, Math.min(wantR, maxR));
        const sw = Math.max(0.12, Math.min(0.3, br * 0.14));
        return { bucketCenters: centers, bucketWidth: w, ballRadius: br, ballStrokeW: sw };
    }, [n]);

    const pegs = useMemo(() => {
        const list = [];
        for (let r = 0; r < n; r += 1) {
            const c = pegCountForRow(r);
            for (let j = 0; j < c; j += 1) {
                const pos = pegPosStaggered(r, j, n);
                list.push({ r, j, ...pos });
            }
        }
        return list;
    }, [n]);

    const pegsRef = useRef(pegs);
    pegsRef.current = pegs;

    /** `pegKey -> performance.now()` when the ball last triggered a shine (for SMIL + render). */
    const [pegHitFlash, setPegHitFlash] = useState({});
    const lastPegHitMsRef = useRef({});

    const [ball, setBall] = useState(() => ({
        x: laneGapX(0, 1, n),
        y: yRow(0, n) - 2.35,
        visible: false,
    }));
    /** Bumps when a new result lands so SVG land animations restart cleanly. */
    const [landEffectKey, setLandEffectKey] = useState(0);
    const rafRef = useRef(null);
    const activeSlotRef = useRef(null);
    /** Locked size for the current drop so the ball doesn't resize mid-flight */
    const dropBallSizeRef = useRef(null);
    const ballRadiusRef = useRef(ballRadius);
    const ballStrokeWRef = useRef(ballStrokeW);
    ballRadiusRef.current = ballRadius;
    ballStrokeWRef.current = ballStrokeW;

    const runAnimation = useCallback(
        (steps) => {
            const { waypoints, finalSlot } = buildWaypoints(n, steps);
            dropBallSizeRef.current = {
                r: ballRadiusRef.current,
                sw: ballStrokeWRef.current,
            };
            const hyper = hyperMode ? 0.72 : 1;
            let start = null;
            const totalMs = 2200 * hyper;
            const totalSeg = waypoints.length - 1;

            const tick = (ts) => {
                if (start == null) start = ts;
                const elapsed = ts - start;
                const u = Math.min(1, elapsed / totalMs);
                const eased = smoothstep01(u);
                const floatIdx = eased * totalSeg;
                const i = Math.min(totalSeg - 1, Math.floor(floatIdx));
                const t = floatIdx - i;
                const a = waypoints[i];
                const b = waypoints[i + 1];
                const x = a.x + (b.x - a.x) * t;
                const y = a.y + (b.y - a.y) * t;
                setBall({ x, y, visible: true });

                const now = performance.now();
                const rBallNow = ballRadiusRef.current;
                const hitR = rBallNow + PEG_DRAW_RADIUS + 0.14;
                const hitR2 = hitR * hitR;
                const pegList = pegsRef.current;
                setPegHitFlash((prev) => {
                    const next = {};
                    for (const [k, tm] of Object.entries(prev)) {
                        if (now - tm < PEG_HIT_FLASH_LIFETIME_MS) next[k] = tm;
                    }
                    for (let pi = 0; pi < pegList.length; pi += 1) {
                        const p = pegList[pi];
                        const dx = x - p.x;
                        const dy = y - p.y;
                        if (dx * dx + dy * dy <= hitR2) {
                            const k = `${p.r}-${p.j}`;
                            const lastMs = lastPegHitMsRef.current[k] || 0;
                            if (now - lastMs > 52) {
                                lastPegHitMsRef.current[k] = now;
                                next[k] = now;
                            }
                        }
                    }
                    return next;
                });

                if (u < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    const last = waypoints[waypoints.length - 1];
                    setBall({ x: last.x, y: last.y, visible: true });
                    dropBallSizeRef.current = null;
                    activeSlotRef.current = finalSlot;
                    setPegHitFlash({});
                    lastPegHitMsRef.current = {};
                    onAnimationDone?.(finalSlot);
                }
            };
            rafRef.current = requestAnimationFrame(tick);
        },
        [n, onAnimationDone, hyperMode]
    );

    useEffect(() => {
        const idle = { x: laneGapX(0, 1, n), y: yRow(0, n) - 2.35, visible: false };
        if (!pathSteps || pathSteps.length !== n || !dropTick) {
            dropBallSizeRef.current = null;
            activeSlotRef.current = null;
            setBall(idle);
            setPegHitFlash({});
            lastPegHitMsRef.current = {};
            return;
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        let cancelled = false;
        let innerRaf = null;
        const outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => {
                if (!cancelled) {
                    setPegHitFlash({});
                    lastPegHitMsRef.current = {};
                    runAnimation(pathSteps);
                }
            });
        });
        return () => {
            cancelled = true;
            cancelAnimationFrame(outerRaf);
            if (innerRaf != null) cancelAnimationFrame(innerRaf);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            dropBallSizeRef.current = null;
        };
    }, [dropTick, pathSteps, n, runAnimation]);

    useEffect(() => {
        if (highlightSlot == null) return;
        setLandEffectKey((k) => k + 1);
    }, [highlightSlot]);

    const hi = isAnimating ? null : highlightSlot != null ? highlightSlot : activeSlotRef.current;

    const bucketCyAll = BUCKET_TOP + BUCKET_HEIGHT * 0.42;
    const keycapCx =
        highlightSlot != null ? bucketCenters[highlightSlot] ?? bucketCenterX(highlightSlot, n) : null;
    const ballKeycapSync =
        ball.visible &&
        !isAnimating &&
        highlightSlot != null &&
        activeSlotRef.current === highlightSlot;

    const dropLock = dropBallSizeRef.current;
    const rBall = ball.visible && dropLock ? dropLock.r : ballRadius;
    const wBall = ball.visible && dropLock ? dropLock.sw : ballStrokeW;

    const { svgViewTop, svgViewHeight } = useMemo(() => {
        const yTop = yRow(0, n);
        const top = Math.max(0, yTop - PEG_DRAW_RADIUS - 0.4);
        const h = VB.h - top;
        return { svgViewTop: top, svgViewHeight: h };
    }, [n]);

    const landStarLayout = useMemo(() => landStarSlots(9), []);

    const boardBg = hyperMode ? '#2d2d30' : BG;

    return (
        <Box w="100%" maxW="760px" minW={0} mx="auto">
            <Box
                position="relative"
                borderRadius="12px"
                overflow="hidden"
            >
                <Flex
                    position="absolute"
                    top="6px"
                    right="12px"
                    zIndex={3}
                    align="center"
                    gap="10px"
                    pointerEvents="auto"
                >
                </Flex>

                <svg
                    viewBox={`0 ${svgViewTop} ${VB.w} ${svgViewHeight}`}
                    width="100%"
                    height="auto"
                    style={{ display: 'block', minHeight: '260px' }}
                    preserveAspectRatio="xMidYMin meet"
                >
                    <defs>
                        {mults.map((_, i) => {
                            const pal = hyperMode ? bucketPaletteHyper(i, mults.length) : bucketPalette(i, mults.length);
                            return (
                                <linearGradient key={`g-${i}-${hyperMode ? 'h' : 'n'}`} id={`plinkoBuck3d-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={pal.topHi} />
                                    <stop offset="34%" stopColor={pal.top} />
                                    <stop offset="66%" stopColor={pal.top} />
                                    <stop offset="100%" stopColor={pal.bot} />
                                </linearGradient>
                            );
                        })}
                        <radialGradient id="plinkoLandRadialBurst" cx="50%" cy="38%" r="72%">
                            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
                            <stop offset="30%" stopColor="rgba(120, 255, 255, 0.55)" />
                            <stop offset="55%" stopColor="rgba(0, 220, 255, 0.35)" />
                            <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
                        </radialGradient>
                        <filter id="plinkoLandBloom" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0.65" result="edge" />
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="wide" />
                            <feMerge>
                                <feMergeNode in="wide" />
                                <feMergeNode in="edge" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="plinkoLandSheenBlur" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="0.15" in="SourceGraphic" result="b" />
                            <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <linearGradient id="plinkoLandSheenLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="42%" stopColor="rgba(255,255,255,0.95)" />
                            <stop offset="100%" stopColor="rgba(0, 245, 255, 0.45)" />
                        </linearGradient>
                        {/* BC-style bright band (sweep) — hot center + soft edges */}
                        <linearGradient id="plinkoBcShineBand" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="35%" stopColor="rgba(255,255,255,0.25)" />
                            <stop offset="46%" stopColor="rgba(255,255,255,1)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,1)" />
                            <stop offset="54%" stopColor="rgba(200, 255, 255, 1)" />
                            <stop offset="65%" stopColor="rgba(255,255,255,0.35)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>
                        <linearGradient id="plinkoBcShineBand2" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(0,230,255,0)" />
                            <stop offset="48%" stopColor="rgba(0,245,255,0.35)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.75)" />
                            <stop offset="52%" stopColor="rgba(0,245,255,0.35)" />
                            <stop offset="100%" stopColor="rgba(0,230,255,0)" />
                        </linearGradient>
                        <radialGradient id="plinkoStarGoldFill" cx="38%" cy="32%" r="70%">
                            <stop offset="0%" stopColor="#fffef8" />
                            <stop offset="35%" stopColor="#ffeb3b" />
                            <stop offset="75%" stopColor="#ffc107" />
                            <stop offset="100%" stopColor="#f57f17" />
                        </radialGradient>
                        <filter id="plinkoStarGlow" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0.32" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Visible winner outline — stays for full highlight duration */}
                        <filter id="plinkoWinnerAura" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0.95" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <radialGradient id="plinkoPegHitShine" cx="40%" cy="34%" r="72%">
                            <stop offset="0%" stopColor="#00d4ff" stopOpacity={1} />
                            <stop offset="22%" stopColor="#00d4ff" stopOpacity={0.88} />
                            <stop offset="45%" stopColor="#00d4ff" stopOpacity={0.45} />
                            <stop offset="70%" stopColor="#00d4ff" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                        </radialGradient>
                        <filter id="plinkoPegHitBloom" x="-85%" y="-85%" width="270%" height="270%" colorInterpolationFilters="sRGB">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="0.36" result="b" />
                            <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {mults.map((_, i) => {
                            const ccx = bucketCenters[i] ?? bucketCenterX(i, n);
                            const cw = bucketWidth;
                            return (
                                <clipPath key={`winclip-${i}`} id={`plinkoWinClip-${i}`}>
                                    <path d={bucketCardPath(ccx, BUCKET_TOP, cw, BUCKET_HEIGHT)} />
                                </clipPath>
                            );
                        })}
                    </defs>
                    <rect x={0} y={svgViewTop} width={VB.w} height={svgViewHeight} fill={boardBg} />

                    {mults.map((m, i) => {
                        const cx = bucketCenters[i] ?? bucketCenterX(i, n);
                        const cw = bucketWidth;
                        const isHi = hi === i;
                        const isLandHit = highlightSlot === i;
                        const isCenter = i === midIdx;
                        const bucketCy = bucketCyAll;
                        const label = formatMultLabel(m);
                        const fontSize =
                            (label.includes('k')
                                ? 1.9
                                : m >= 100
                                  ? 2.0
                                  : m >= 10
                                    ? 2.25
                                    : m >= 1
                                      ? 2.35
                                      : 2.45) * (n === 16 ? 0.9 : 1);
                        let filter = undefined;
                        if (isLandHit) {
                            filter = 'url(#plinkoLandBloom)';
                        } else if (isHi) {
                            filter = 'url(#plinkoWinnerAura)';
                        } else if (isCenter) {
                            filter = 'drop-shadow(0 0 2px rgba(255,248,200,0.5))';
                        }

                        return (
                            <g key={`b-${i}`}>
                                {/* KeyCap-style “key press” when the ball lands (Rubic/Pumping kbd look) */}
                                <g transform={`translate(${cx}, ${bucketCy})`}>
                                    <g>
                                        {isLandHit && (
                                            <animateTransform
                                                attributeName="transform"
                                                type="translate"
                                                additive="replace"
                                                values="0 0; 0 2.35; 0 0.15; 0 0"
                                                keyTimes="0;0.1;0.32;1"
                                                dur="0.32s"
                                                fill="freeze"
                                            />
                                        )}
                                        <g transform={`translate(${-cx}, ${-bucketCy})`}>
                                {isLandHit && (
                                    <g key={`winfx-bg-${landEffectKey}-${i}`} pointerEvents="none">
                                        <ellipse
                                            cx={cx}
                                            cy={bucketCy}
                                            rx={cw * 0.52}
                                            ry={BUCKET_HEIGHT * 0.72}
                                            fill="url(#plinkoLandRadialBurst)"
                                            opacity="0"
                                            style={{ mixBlendMode: 'screen' }}
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values="0;1;0.55;0"
                                                keyTimes="0;0.12;0.4;1"
                                                dur="0.95s"
                                                fill="freeze"
                                            />
                                        </ellipse>
                                        {[0, 0.13, 0.26].map((delay, ri) => (
                                            <ellipse
                                                key={`r-${ri}`}
                                                cx={cx}
                                                cy={bucketCy}
                                                rx={cw * 0.36}
                                                ry={BUCKET_HEIGHT * 0.4}
                                                fill="none"
                                                stroke={RESULT_OUTLINE_CYAN}
                                                strokeOpacity="0.88"
                                                strokeWidth="0.32"
                                                opacity="0"
                                            >
                                                <animate
                                                    attributeName="opacity"
                                                    values="0;0.9;0"
                                                    keyTimes="0;0.22;1"
                                                    dur="0.78s"
                                                    begin={`${delay}s`}
                                                    fill="freeze"
                                                />
                                                <animate
                                                    attributeName="rx"
                                                    values={`${cw * 0.36};${cw * 0.98}`}
                                                    dur="0.78s"
                                                    begin={`${delay}s`}
                                                    fill="freeze"
                                                />
                                                <animate
                                                    attributeName="ry"
                                                    values={`${BUCKET_HEIGHT * 0.4};${BUCKET_HEIGHT * 1.08}`}
                                                    dur="0.78s"
                                                    begin={`${delay}s`}
                                                    fill="freeze"
                                                />
                                            </ellipse>
                                        ))}
                                        <line
                                            x1={cx - cw * 0.44}
                                            x2={cx + cw * 0.44}
                                            y1={BUCKET_TOP + 0.42}
                                            y2={BUCKET_TOP + 0.42}
                                            stroke="url(#plinkoLandSheenLine)"
                                            strokeWidth="0.28"
                                            strokeLinecap="round"
                                            filter="url(#plinkoLandSheenBlur)"
                                            opacity="0"
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values="0;1;0.85;0"
                                                keyTimes="0;0.1;0.35;1"
                                                dur="0.85s"
                                                fill="freeze"
                                            />
                                        </line>
                                    </g>
                                )}
                                <path
                                    d={bucketCardPath(cx, BUCKET_TOP, cw, BUCKET_HEIGHT)}
                                    fill={`url(#plinkoBuck3d-${i})`}
                                    stroke="none"
                                    filter={filter}
                                />
                                <path
                                    d={bucketBottomBevelPath(cx, BUCKET_TOP, cw, BUCKET_HEIGHT)}
                                    fill={hyperMode ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.2)'}
                                    stroke="none"
                                    style={{ mixBlendMode: 'multiply' }}
                                    pointerEvents="none"
                                />
                                <path
                                    d={bucketCardPath(cx, BUCKET_TOP, cw, BUCKET_HEIGHT)}
                                    fill="none"
                                    stroke={
                                        isLandHit || isHi
                                            ? RESULT_OUTLINE_CYAN
                                            : hyperMode
                                              ? 'rgba(0,0,0,0.94)'
                                              : 'rgba(0,0,0,0.52)'
                                    }
                                    strokeWidth={
                                        isLandHit ? 0.5 : isHi ? 0.38 : hyperMode ? 0.46 : 0.24
                                    }
                                    pointerEvents="none"
                                />
                                {isLandHit && (
                                    <line
                                        x1={cx - cw * 0.4}
                                        x2={cx + cw * 0.4}
                                        y1={BUCKET_TOP + 0.2}
                                        y2={BUCKET_TOP + 0.2}
                                        stroke="rgba(255,255,255,0.55)"
                                        strokeWidth="0.22"
                                        strokeLinecap="round"
                                        opacity="0"
                                        pointerEvents="none"
                                    >
                                        <animate
                                            attributeName="opacity"
                                            values="0;0.95;0.25;0"
                                            keyTimes="0;0.06;0.18;1"
                                            dur="0.32s"
                                            fill="freeze"
                                        />
                                    </line>
                                )}
                                {isLandHit && (
                                    <g
                                        clipPath={`url(#plinkoWinClip-${i})`}
                                        pointerEvents="none"
                                        key={`hitflash-${landEffectKey}-${i}`}
                                    >
                                        <rect
                                            x={cx - cw / 2}
                                            y={BUCKET_TOP}
                                            width={cw}
                                            height={BUCKET_HEIGHT}
                                            fill="#ffffff"
                                            opacity="0"
                                            style={{ mixBlendMode: 'overlay' }}
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values="0;0.95;0.4;0"
                                                keyTimes="0;0.09;0.22;1"
                                                dur="0.95s"
                                                fill="freeze"
                                            />
                                        </rect>
                                    </g>
                                )}
                                {isLandHit && (
                                    <g
                                        key={`winfx-shine-${landEffectKey}-${i}`}
                                        pointerEvents="none"
                                        clipPath={`url(#plinkoWinClip-${i})`}
                                    >
                                        {/* BC.Game-style diagonal shine sweep */}
                                        <g transform={`translate(${cx}, ${bucketCy}) rotate(-22)`} opacity="0">
                                            <animate
                                                attributeName="opacity"
                                                values="0;1;0.92;0"
                                                keyTimes="0;0.05;0.35;1"
                                                dur="1.15s"
                                                fill="freeze"
                                            />
                                            <rect
                                                x={-cw * 0.88}
                                                y={-BUCKET_HEIGHT * 1.25}
                                                width={cw * 0.68}
                                                height={BUCKET_HEIGHT * 2.7}
                                                fill="url(#plinkoBcShineBand)"
                                            >
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="translate"
                                                    from={`${-cw * 1.08} 0`}
                                                    to={`${cw * 1.18} 0`}
                                                    dur="0.48s"
                                                    begin="0.02s"
                                                    fill="freeze"
                                                />
                                            </rect>
                                        </g>
                                        {/* second pass — tighter cyan / white flash (reverse) */}
                                        <g transform={`translate(${cx}, ${bucketCy}) rotate(-22)`} opacity="0">
                                            <animate
                                                attributeName="opacity"
                                                values="0;0.88;0"
                                                keyTimes="0;0.3;1"
                                                dur="0.72s"
                                                begin="0.32s"
                                                fill="freeze"
                                            />
                                            <rect
                                                x={-cw * 0.88}
                                                y={-BUCKET_HEIGHT * 1.25}
                                                width={cw * 0.34}
                                                height={BUCKET_HEIGHT * 2.7}
                                                fill="url(#plinkoBcShineBand2)"
                                            >
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="translate"
                                                    from={`${cw * 1.05} 0`}
                                                    to={`${-cw * 1.12} 0`}
                                                    dur="0.4s"
                                                    begin="0.32s"
                                                    fill="freeze"
                                                />
                                            </rect>
                                        </g>
                                    </g>
                                )}
                                {isLandHit && (
                                    <g key={`winfx-sp-${landEffectKey}-${i}`} pointerEvents="none" style={{ mixBlendMode: 'screen' }}>
                                        {landStarLayout.map((off, si) => {
                                            const sx = cx + off.ox * cw;
                                            const sy = BUCKET_TOP + off.oy * BUCKET_HEIGHT;
                                            const outer = 0.36 * off.size;
                                            const inner = outer * 0.4;
                                            const d = fivePointStarPathD(outer, inner);
                                            const begin = `${0.03 + si * 0.045}s`;
                                            return (
                                                <g key={`st-${si}`} transform={`translate(${sx}, ${sy})`}>
                                                    <g opacity="0">
                                                        <animate
                                                            attributeName="opacity"
                                                            values="0;1;0.95;0.7;0"
                                                            keyTimes="0;0.12;0.38;0.7;1"
                                                            dur="1.15s"
                                                            begin={begin}
                                                            fill="freeze"
                                                        />
                                                        <g transform={`rotate(${off.rot})`}>
                                                            <g>
                                                                <animateTransform
                                                                    attributeName="transform"
                                                                    type="scale"
                                                                    values="0.15;1.12;1;0.92"
                                                                    keyTimes="0;0.2;0.45;1"
                                                                    dur="1.15s"
                                                                    begin={begin}
                                                                    fill="freeze"
                                                                />
                                                                <path
                                                                    d={d}
                                                                    fill="url(#plinkoStarGoldFill)"
                                                                    stroke="rgba(255, 224, 130, 0.98)"
                                                                    strokeWidth="0.055"
                                                                    filter="url(#plinkoStarGlow)"
                                                                />
                                                            </g>
                                                        </g>
                                                    </g>
                                                </g>
                                            );
                                        })}
                                    </g>
                                )}
                                <text
                                    x={cx}
                                    y={BUCKET_TOP + BUCKET_HEIGHT - 1.65}
                                    textAnchor="middle"
                                    fill={isLandHit || isHi ? '#f8ffff' : '#fff'}
                                    fontSize={fontSize}
                                    fontWeight="800"
                                    stroke="rgba(0,0,0,0.94)"
                                    strokeWidth={hyperMode ? '0.62' : '0.48'}
                                    paintOrder="stroke fill"
                                    style={{
                                        fontFamily: 'system-ui, Segoe UI, sans-serif',
                                        filter:
                                            isLandHit || isHi
                                                ? 'drop-shadow(0 0 5px rgba(0, 235, 255, 0.9))'
                                                : undefined,
                                    }}
                                >
                                    {label}
                                </text>
                                        </g>
                                    </g>
                                </g>
                            </g>
                        );
                    })}

                    {pegs.map((p) => {
                        const pk = `${p.r}-${p.j}`;
                        const hitAt = pegHitFlash[pk];
                        const shineR = PEG_DRAW_RADIUS * 2.2;
                        const showShine =
                            hitAt != null && performance.now() - hitAt < PEG_HIT_FLASH_LIFETIME_MS;
                        return (
                            <g key={pk}>
                                {showShine && (
                                    <g
                                        key={hitAt}
                                        transform={`translate(${p.x}, ${p.y})`}
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        <circle
                                            cx={0}
                                            cy={0}
                                            r={shineR}
                                            fill="url(#plinkoPegHitShine)"
                                            filter="url(#plinkoPegHitBloom)"
                                        >
                                            <animate
                                                attributeName="opacity"
                                                values={PEG_HIT_OPACITY_VALUES}
                                                keyTimes={PEG_HIT_OPACITY_KEY_TIMES}
                                                dur={PEG_HIT_SHINE_DUR}
                                                calcMode="spline"
                                                keySplines={PEG_HIT_OPACITY_SPLINES}
                                                fill="freeze"
                                            />
                                        </circle>
                                    </g>
                                )}
                                <circle cx={p.x} cy={p.y} r={PEG_DRAW_RADIUS} fill="#ffffff" />
                            </g>
                        );
                    })}

                    {ball.visible &&
                        (() => {
                            const ballNode = ballImageSrc ? (
                                <g>
                                    <defs>
                                        <clipPath id={ballClipId}>
                                            <circle cx={ball.x} cy={ball.y} r={rBall} />
                                        </clipPath>
                                    </defs>
                                    <image
                                        href={ballImageSrc}
                                        x={ball.x - rBall}
                                        y={ball.y - rBall}
                                        width={rBall * 2}
                                        height={rBall * 2}
                                        clipPath={`url(#${ballClipId})`}
                                        preserveAspectRatio="xMidYMid slice"
                                    />
                                    <circle
                                        cx={ball.x}
                                        cy={ball.y}
                                        r={rBall}
                                        fill="none"
                                        stroke="rgba(0,0,0,0.35)"
                                        strokeWidth={wBall}
                                    />
                                </g>
                            ) : (
                                <circle
                                    cx={ball.x}
                                    cy={ball.y}
                                    r={rBall}
                                    fill="#f5f5f5"
                                    stroke="rgba(0,0,0,0.35)"
                                    strokeWidth={wBall}
                                />
                            );
                            if (ballKeycapSync && keycapCx != null) {
                                return (
                                    <KeycapSyncGroup cx={keycapCx} bucketCy={bucketCyAll}>
                                        {ballNode}
                                    </KeycapSyncGroup>
                                );
                            }
                            return ballNode;
                        })()}
                </svg>
            </Box>
        </Box>
    );
}
