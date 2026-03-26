import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';

const CX = 300;
const CY = 300;

function polar(cx0, cy0, r, angleRad) {
  return {
    x: cx0 + r * Math.cos(angleRad),
    y: cy0 + r * Math.sin(angleRad),
  };
}

function donutSectorPath(rOut, rIn, startRad, endRad) {
  const large = endRad - startRad > Math.PI ? 1 : 0;
  const p1 = polar(CX, CY, rOut, startRad);
  const p2 = polar(CX, CY, rOut, endRad);
  const p3 = polar(CX, CY, rIn, endRad);
  const p4 = polar(CX, CY, rIn, startRad);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

function chevronAt(r, angleRad, size = 10, clockwise = true) {
  const dir = clockwise ? 1 : -1;
  const tip = polar(CX, CY, r + size * 0.35, angleRad);
  const t1 = angleRad + dir * 0.12;
  const t2 = angleRad - dir * 0.12;
  const a = polar(CX, CY, r - size * 0.2, t1);
  const b = polar(CX, CY, r - size * 0.2, t2);
  return `M ${a.x} ${a.y} L ${tip.x} ${tip.y} L ${b.x} ${b.y}`;
}

const OUTER_LABELS = [
  { text: '4.0X' },
  { text: '13.0X' },
  { text: '28.5X' },
  { text: '53.0X' },
  { text: '88.0X' },
  { text: '137.5X' },
  { text: '205.0X' },
  { text: 'BONUS' },
];

const MIDDLE_LABELS = [
  { text: '2.5X' },
  { text: '8.0X' },
  { text: '16.5X' },
  { text: '28.5X' },
  { text: '45.0X' },
  { text: '+21.0X'},
];

const INNER_LABELS = [
  { text: '1.6X' },
  { text: '5.0X' },
  { text: '10.5X' },
  { text: '+7.5X' },
];

const COLORS = {
  segA: '#2c3034',
  segB: '#25292d',
  stroke: '#1e2124',
  text: '#c5ccd4',
  textMuted: '#9ba3ad',
  slotShade: 'rgba(8, 10, 12, 0.55)',
};

const TWIST_SYMBOL_SRC = {
  green: '/twist/green_jewel.png',
  orange: '/twist/orange_jewel.png',
  purple: '/twist/purple_jewel.png',
  stone: '/twist/stone.png',
  mouse: '/twist/mouse.png',
};

export function twistSymbolToSrc(symbol) {
  return TWIST_SYMBOL_SRC[symbol] || TWIST_SYMBOL_SRC.stone;
}

function LockIcon({ x, y, s = 5 }) {
  const w = s * 0.85;
  const h = s * 0.7;
  return (
    <g transform={`translate(${x},${y})`} fill="none" stroke={COLORS.textMuted} strokeWidth={1.15} strokeLinecap="round">
      <rect x={-w / 2} y={-h * 0.2} width={w} height={h} rx={1.2} />
      <path
        d={`M ${-w * 0.22} ${-h * 0.2} V ${-h * 0.55} Q 0 ${-h * 0.72} ${w * 0.22} ${-h * 0.55} V ${-h * 0.2}`}
      />
    </g>
  );
}

function ringGeometry(rOut, rIn, labels, gapDeg = 0.85) {
  const n = labels.length;
  const gap = (gapDeg * Math.PI) / 180;
  const per = (2 * Math.PI) / n;
  const chevR = rOut - 5;
  const segments = [];
  for (let i = 0; i < n; i += 1) {
    const start = -Math.PI / 2 + i * per + gap / 2;
    const end = -Math.PI / 2 + (i + 1) * per - gap / 2;
    const boundary = -Math.PI / 2 + (i + 1) * per;
    segments.push({ start, end, boundary, i });
  }
  return { n, per, chevR, segments, rOut, rIn };
}

const GLOW_PURPLE = 'rgba(107, 78, 232, 0.52)';
const GLOW_ORANGE = 'rgba(224, 154, 85, 0.5)';
const GLOW_GREEN = 'rgba(46, 207, 122, 0.42)';

function GlowPath({ d, fill }) {
  if (!d) return null;
  return <path d={d} fill={fill} stroke="rgba(255,255,255,0.14)" strokeWidth={0.75} />;
}

/**
 * forward: keep filled (0 → previous tier); animate only the new band (previous → current).
 * shrinkTail: keep (0 → new tier); peel tail from the outer tier end back toward the inner bound (CCW / “left” along that arc).
 * instant: full wedge ring-start → tier.
 * reverse: shrink full wedge back to ring start (cash out / mouse cleared tier).
 */
function RingGlowSweep({
  rOut,
  rIn,
  labels,
  segmentIndex,
  sweepAfterSegmentIndex = null,
  /** For shrinkTail: previous higher tier index (outer end of the tail being removed). */
  tailFromSegmentIndex = null,
  fill,
  glowId,
  animRevision = 0,
  mode = 'forward',
  gapDeg = 0.85,
  onComplete,
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const { segments } = ringGeometry(rOut, rIn, labels, gapDeg);
  const idx =
    segmentIndex == null ? -1 : Math.min(Math.max(0, Math.floor(segmentIndex)), segments.length - 1);
  const ringStart = segments[0]?.start ?? -Math.PI / 2;
  const tierEnd = idx >= 0 ? segments[idx].end : ringStart;

  const afterIdx =
    sweepAfterSegmentIndex == null
      ? null
      : Math.min(Math.max(0, Math.floor(sweepAfterSegmentIndex)), segments.length - 1);

  const tailFromIdx =
    tailFromSegmentIndex == null
      ? null
      : Math.min(Math.max(0, Math.floor(tailFromSegmentIndex)), segments.length - 1);

  const angleFromForward =
    afterIdx == null ? ringStart : segments[afterIdx].end;
  const angleToForward = tierEnd;

  const baseEndForward = afterIdx == null ? null : segments[afterIdx].end;

  useEffect(() => {
    completedRef.current = false;
    if (segmentIndex == null || idx < 0) {
      setProgress(0);
      return undefined;
    }

    if (mode === 'instant') {
      setProgress(1);
      return undefined;
    }

    if (mode === 'reverse') {
      setProgress(0);
      const start = performance.now();
      const duration = 720;
      const angleA = ringStart;
      const angleB = tierEnd;
      const spanRev = angleB - angleA;
      if (spanRev <= 1e-6) {
        onCompleteRef.current?.();
        return undefined;
      }
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const e = 1 - (1 - t) ** 3;
        setProgress(e);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }

    if (mode === 'shrinkTail') {
      if (tailFromIdx == null || tailFromIdx <= idx) {
        setProgress(1);
        return undefined;
      }
      setProgress(0);
      const start = performance.now();
      const duration = 680;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const e = 1 - (1 - t) ** 3;
        setProgress(e);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }

    // forward
    setProgress(0);
    const span = angleToForward - angleFromForward;
    if (span <= 1e-6) {
      setProgress(1);
      return undefined;
    }
    const start = performance.now();
    const duration = 680;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - (1 - t) ** 3;
      setProgress(e);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    segmentIndex,
    animRevision,
    glowId,
    idx,
    mode,
    ringStart,
    tierEnd,
    angleFromForward,
    angleToForward,
    sweepAfterSegmentIndex,
    tailFromSegmentIndex,
    tailFromIdx,
  ]);

  if (segmentIndex == null || idx < 0) return null;

  // instant: single cumulative wedge
  if (mode === 'instant') {
    if (tierEnd - ringStart <= 1e-6) return null;
    const d = donutSectorPath(rOut, rIn, ringStart, tierEnd);
    return (
      <GlowPath
        key={`glow-${glowId}-instant-${idx}-${animRevision}`}
        d={d}
        fill={fill}
      />
    );
  }

  if (mode === 'reverse') {
    const angleB = tierEnd - progress * (tierEnd - ringStart);
    if (progress >= 1 - 1e-4) return null;
    if (angleB - ringStart <= 1e-6) return null;
    const d = donutSectorPath(rOut, rIn, ringStart, angleB);
    return (
      <GlowPath
        key={`glow-${glowId}-reverse-${idx}-${animRevision}`}
        d={d}
        fill={fill}
      />
    );
  }

  if (mode === 'shrinkTail') {
    if (tailFromIdx == null || tailFromIdx <= idx) {
      if (tierEnd - ringStart <= 1e-6) return null;
      const d = donutSectorPath(rOut, rIn, ringStart, tierEnd);
      return (
        <GlowPath
          key={`glow-${glowId}-shrink-fallback-${idx}-${animRevision}`}
          d={d}
          fill={fill}
        />
      );
    }
    const tailOuterEnd = segments[tailFromIdx].end;
    const innerBound = segments[idx].end;
    const tailSpan = tailOuterEnd - innerBound;
    /** Receding outer edge: full tail at progress 0, collapsed to innerBound at 1 (5.0 → 1.6 along decreasing angle). */
    const tailVisibleEnd = tailOuterEnd - progress * tailSpan;
    const baseD =
      innerBound - ringStart > 1e-6
        ? donutSectorPath(rOut, rIn, ringStart, innerBound)
        : null;
    const tailD =
      tailVisibleEnd - innerBound > 1e-6
        ? donutSectorPath(rOut, rIn, innerBound, tailVisibleEnd)
        : null;
    return (
      <g key={`glow-${glowId}-shrinkTail-${idx}-${tailFromIdx}-${animRevision}`}>
        {baseD ? <GlowPath d={baseD} fill={fill} /> : null}
        {tailD ? <GlowPath d={tailD} fill={fill} /> : null}
      </g>
    );
  }

  // forward: cumulative base + new band
  const sweepEnd = angleFromForward + progress * (angleToForward - angleFromForward);
  const baseD =
    baseEndForward != null && baseEndForward - ringStart > 1e-6
      ? donutSectorPath(rOut, rIn, ringStart, baseEndForward)
      : null;
  const sweepD =
    progress > 0 && sweepEnd - angleFromForward > 1e-6
      ? donutSectorPath(rOut, rIn, angleFromForward, sweepEnd)
      : null;

  if (!baseD && !sweepD) return null;

  return (
    <g key={`glow-${glowId}-forward-${idx}-${animRevision}`}>
      {baseD ? <GlowPath d={baseD} fill={fill} /> : null}
      {sweepD ? <GlowPath d={sweepD} fill={fill} /> : null}
    </g>
  );
}

function RingSectors({ rOut, rIn, labels, gapDeg }) {
  const { segments, chevR } = ringGeometry(rOut, rIn, labels, gapDeg);
  return (
    <>
      {segments.map(({ start, end, boundary, i }) => (
        <path
          key={`s-${rOut}-${i}`}
          d={donutSectorPath(rOut, rIn, start, end)}
          fill={i % 2 === 0 ? COLORS.segA : COLORS.segB}
          stroke={COLORS.stroke}
          strokeWidth={1}
        />
      ))}
      {segments.map(({ boundary, i }) => (
        <path
          key={`c-${rOut}-${i}`}
          d={chevronAt(chevR, boundary, 10, true)}
          fill="none"
          stroke="#3d4248"
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

function RingLabels({ rOut, rIn, labels, fontSize, gapDeg = 0.85 }) {
  const { segments } = ringGeometry(rOut, rIn, labels, gapDeg);
  return (
    <>
      {segments.map(({ start, end, i }) => {
        const mid = start + (end - start) / 2;
        const tr = (rOut + rIn) / 2;
        const { x, y } = polar(CX, CY, tr, mid);
        const rot = (mid * 180) / Math.PI + 90;
        const row = labels[i];
        const lockOffset = row.lock ? fontSize * 1.35 : 0;
        return (
          <g key={`t-${rOut}-${i}`} transform={`translate(${x},${y}) rotate(${rot})`}>
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={COLORS.text}
              fontSize={fontSize}
              fontWeight="700"
              fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
              style={{ letterSpacing: '0.02em' }}
            >
              {row.text}
              {row.suffix ? (
                <tspan fill={COLORS.textMuted} fontSize={fontSize * 0.72} dx={2}>
                  {row.suffix}
                </tspan>
              ) : null}
            </text>
            {row.lock ? <LockIcon x={lockOffset} y={0} s={fontSize * 0.85} /> : null}
          </g>
        );
      })}
    </>
  );
}

function GemDiamond({ cx: gx, cy: gy, w, h, fill, stroke }) {
  return (
    <path
      d={`M ${gx} ${gy - h / 2} L ${gx + w / 2} ${gy} L ${gx} ${gy + h / 2} L ${gx - w / 2} ${gy} Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={1}
    />
  );
}

/** Radii: outer ring, middle, inner, center hole (matches reference proportions). */
const RO = 278;
const R1 = 223;
const R2 = 220;
const R3 = 168;
const R4 = 165;
const R5 = 114;
const RHOLE = 88;

/** SVG viewBox width/height (Twist wheel art). */
export const TWIST_VIEWBOX_SIZE = 600;
/**
 * Max square for center hub in SVG units — inner hole clip (RHOLE − 8 radius × 2).
 * Scales with the wheel; use (hubPx * this / TWIST_VIEWBOX_SIZE) when hub matches hole width.
 */
export const TWIST_CENTER_IMAGE_SVG = (RHOLE - 8) * 2;
/**
 * Idle center gem = this fraction of hub diameter (smaller than full hole). Same value drives bet-reel icon size.
 */
export const TWIST_CENTER_GEM_SCALE = 0.87;

function TopSlotOverlay() {
  const w = 46;
  return (
    <rect
      x={CX - w / 2}
      y={24}
      width={w}
      height={CY + R5 - 20}
      fill="url(#twistSlotGrad)"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}

/** Label sizes are SVG units in the 600×600 viewBox; lock/? scale with each ring’s fontSize. */
export default function TwistWheel({
  fontSizeOuter = 16,
  fontSizeMiddle = 15,
  fontSizeInner = 14,
  labelScale = 1,
  centerSymbol = 'stone',
  /** { p, o, g } = sector index to glow per ring (null = no glow on that ring). */
  ringHighlights = { p: null, o: null, g: null },
  /** Previous tier index per ring: forward sweep starts after that segment’s end (null = from ring start). */
  ringSweepAfter = { p: null, o: null, g: null },
  /** shrinkTail: outer tier index being peeled off (must be > current highlight). */
  ringShrinkFrom = { p: null, o: null, g: null },
  /** While highlight is null, play reverse from this tier (mouse cleared last step). */
  ringMouseExitIndex = { p: null, o: null, g: null },
  /** forward = cumulative + new band; shrinkTail; instant; reverse (exit / cashout path uses snapshot branch). */
  ringGlowMode = { p: 'forward', o: 'forward', g: 'forward' },
  /** After mouse-exit reverse on a ring, clears that slot. */
  onMouseExitGlowFinished,
  /** Increment per gem hit so consecutive same-tier spins re-animate. */
  ringGlowRevision = { p: 0, o: 0, g: 0 },
  /** When true, hide normal glows and play reverse shrink from snapshot. */
  cashoutClearing = false,
  /** Indices to shrink during cash-out (copy taken before clearing highlights). */
  cashoutSnapshot = { p: null, o: null, g: null },
  /** Fired after all active reverse sweeps finish (or immediately if none). */
  onCashoutGlowFinished,
  /** Hide center gem image (e.g. while bet reels run in the hub). */
  hideCenterGem = false,
}) {
  const onCashoutRef = useRef(onCashoutGlowFinished);
  onCashoutRef.current = onCashoutGlowFinished;
  const reverseDoneRef = useRef(0);
  const reverseExpectedRef = useRef(0);

  useEffect(() => {
    if (!cashoutClearing) {
      reverseDoneRef.current = 0;
      return undefined;
    }
    const n = [cashoutSnapshot.p, cashoutSnapshot.o, cashoutSnapshot.g].filter((x) => x != null).length;
    reverseExpectedRef.current = n;
    reverseDoneRef.current = 0;
    if (n === 0) {
      const id = requestAnimationFrame(() => onCashoutRef.current?.());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [cashoutClearing, cashoutSnapshot.p, cashoutSnapshot.o, cashoutSnapshot.g]);

  const onReverseRingDone = useCallback(() => {
    reverseDoneRef.current += 1;
    if (reverseDoneRef.current >= reverseExpectedRef.current) {
      onCashoutRef.current?.();
    }
  }, []);

  const mouseExitRef = useRef(onMouseExitGlowFinished);
  mouseExitRef.current = onMouseExitGlowFinished;
  const notifyMouseExit = useCallback((key) => {
    mouseExitRef.current?.(key);
  }, []);
  const fo = fontSizeOuter * labelScale;
  const fm = fontSizeMiddle * labelScale;
  const fi = fontSizeInner * labelScale;

  const gOuter = (RO + R1) / 2;
  const gMid = (R2 + R3) / 2;
  const gInner = (R4 + R5) / 2;
  const top = -Math.PI / 2;
  const pO = polar(CX, CY, gOuter, top);
  const pM = polar(CX, CY, gMid, top);
  const pI = polar(CX, CY, gInner, top);

  return (
    <Box
      as="svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      maxW="560px"
      maxH="100%"
      mx="auto"
      display="block"
      flexShrink={1}
      minH={0}
      minW={0}
      position="relative"
      zIndex={1}
      role="img"
      aria-label="Twist multiplier wheel"
    >
      <defs>
        <linearGradient id="twistSlotGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.slotShade} stopOpacity={0} />
          <stop offset="32%" stopColor={COLORS.slotShade} stopOpacity={1} />
          <stop offset="68%" stopColor={COLORS.slotShade} stopOpacity={1} />
          <stop offset="100%" stopColor={COLORS.slotShade} stopOpacity={0} />
        </linearGradient>
        <clipPath id="twistCenterClip">
          <circle cx={CX} cy={CY} r={RHOLE - 8} />
        </clipPath>
      </defs>

      <RingSectors rOut={RO} rIn={R1} labels={OUTER_LABELS} />
      <RingSectors rOut={R2} rIn={R3} labels={MIDDLE_LABELS} />
      <RingSectors rOut={R4} rIn={R5} labels={INNER_LABELS} />

      {!cashoutClearing ? (
        <>
          <RingGlowSweep
            key={`twist-glow-p-${ringGlowRevision.p}`}
            rOut={RO}
            rIn={R1}
            labels={OUTER_LABELS}
            segmentIndex={ringHighlights.p ?? ringMouseExitIndex.p}
            sweepAfterSegmentIndex={ringSweepAfter.p}
            tailFromSegmentIndex={ringShrinkFrom.p}
            mode={ringGlowMode.p || 'forward'}
            fill={GLOW_PURPLE}
            glowId="p"
            animRevision={ringGlowRevision.p}
            onComplete={
              ringHighlights.p == null &&
              ringMouseExitIndex.p != null &&
              ringGlowMode.p === 'reverse'
                ? () => notifyMouseExit('p')
                : undefined
            }
          />
          <RingGlowSweep
            key={`twist-glow-o-${ringGlowRevision.o}`}
            rOut={R2}
            rIn={R3}
            labels={MIDDLE_LABELS}
            segmentIndex={ringHighlights.o ?? ringMouseExitIndex.o}
            sweepAfterSegmentIndex={ringSweepAfter.o}
            tailFromSegmentIndex={ringShrinkFrom.o}
            mode={ringGlowMode.o || 'forward'}
            fill={GLOW_ORANGE}
            glowId="o"
            animRevision={ringGlowRevision.o}
            onComplete={
              ringHighlights.o == null &&
              ringMouseExitIndex.o != null &&
              ringGlowMode.o === 'reverse'
                ? () => notifyMouseExit('o')
                : undefined
            }
          />
          <RingGlowSweep
            key={`twist-glow-g-${ringGlowRevision.g}`}
            rOut={R4}
            rIn={R5}
            labels={INNER_LABELS}
            segmentIndex={ringHighlights.g ?? ringMouseExitIndex.g}
            sweepAfterSegmentIndex={ringSweepAfter.g}
            tailFromSegmentIndex={ringShrinkFrom.g}
            mode={ringGlowMode.g || 'forward'}
            fill={GLOW_GREEN}
            glowId="g"
            animRevision={ringGlowRevision.g}
            onComplete={
              ringHighlights.g == null &&
              ringMouseExitIndex.g != null &&
              ringGlowMode.g === 'reverse'
                ? () => notifyMouseExit('g')
                : undefined
            }
          />
        </>
      ) : (
        <>
          {cashoutSnapshot.p != null ? (
            <RingGlowSweep
              rOut={RO}
              rIn={R1}
              labels={OUTER_LABELS}
              segmentIndex={cashoutSnapshot.p}
              fill={GLOW_PURPLE}
              glowId="p-cashout"
              animRevision={0}
              mode="reverse"
              onComplete={onReverseRingDone}
            />
          ) : null}
          {cashoutSnapshot.o != null ? (
            <RingGlowSweep
              rOut={R2}
              rIn={R3}
              labels={MIDDLE_LABELS}
              segmentIndex={cashoutSnapshot.o}
              fill={GLOW_ORANGE}
              glowId="o-cashout"
              animRevision={0}
              mode="reverse"
              onComplete={onReverseRingDone}
            />
          ) : null}
          {cashoutSnapshot.g != null ? (
            <RingGlowSweep
              rOut={R4}
              rIn={R5}
              labels={INNER_LABELS}
              segmentIndex={cashoutSnapshot.g}
              fill={GLOW_GREEN}
              glowId="g-cashout"
              animRevision={0}
              mode="reverse"
              onComplete={onReverseRingDone}
            />
          ) : null}
        </>
      )}

      <TopSlotOverlay />

      <RingLabels rOut={RO} rIn={R1} labels={OUTER_LABELS} fontSize={fo} />
      <RingLabels rOut={R2} rIn={R3} labels={MIDDLE_LABELS} fontSize={fm} />
      <RingLabels rOut={R4} rIn={R5} labels={INNER_LABELS} fontSize={fi} />

      <GemDiamond cx={pO.x} cy={pO.y} w={15} h={19} fill="#6b4ee8" stroke="#9b85ff" />
      <circle cx={pM.x} cy={pM.y} r={7.5} fill="#b86528" stroke="#e09a55" strokeWidth={1} />
      <rect
        x={pI.x - 6.5}
        y={pI.y - 9}
        width={13}
        height={18}
        rx={2}
        fill="#247a42"
        stroke="#4ecf7a"
        strokeWidth={1}
      />

      <circle cx={CX} cy={CY} r={RHOLE - 6} fill="#000000" pointerEvents="none" />
      {!hideCenterGem ? (
        <image
          href={twistSymbolToSrc(centerSymbol)}
          x={CX - (TWIST_CENTER_IMAGE_SVG * TWIST_CENTER_GEM_SCALE) / 2}
          y={CY - (TWIST_CENTER_IMAGE_SVG * TWIST_CENTER_GEM_SCALE) / 2}
          width={TWIST_CENTER_IMAGE_SVG * TWIST_CENTER_GEM_SCALE}
          height={TWIST_CENTER_IMAGE_SVG * TWIST_CENTER_GEM_SCALE}
          clipPath="url(#twistCenterClip)"
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="none"
        />
      ) : null}

      <circle cx={CX} cy={CY} r={RHOLE - 1} fill="transparent" pointerEvents="none" />
      <circle
        cx={CX}
        cy={CY}
        r={RHOLE}
        fill="none"
        stroke="#1c1e22"
        strokeWidth={5}
        pointerEvents="none"
      />
      <circle cx={CX} cy={CY} r={RHOLE - 3} fill="none" stroke="#000000" strokeWidth={1.25} pointerEvents="none" />
    </Box>
  );
}
