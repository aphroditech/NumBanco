import React, { useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import {
  twistSymbolToSrc,
  TWIST_VIEWBOX_SIZE,
  TWIST_CENTER_IMAGE_SVG,
  TWIST_CENTER_GEM_SCALE,
} from './TwistWheel';

const SYMBOL_KEYS = ['green', 'orange', 'purple', 'stone', 'mouse'];

const FALLBACK_HUB_PX =
  (TWIST_CENTER_IMAGE_SVG / TWIST_VIEWBOX_SIZE) * 560;

const PREFIX_MIN = 18;
const PREFIX_MAX = 26;

function randomSymbol() {
  return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)];
}

/** Bottom of column = index 0 (column-reverse). Result sits at bottom; randoms stack upward. */
function buildSettleStrip(resultSymbol) {
  const prefixLen = PREFIX_MIN + Math.floor(Math.random() * (PREFIX_MAX - PREFIX_MIN + 1));
  const strip = [resultSymbol];
  for (let i = 0; i < prefixLen; i += 1) strip.push(randomSymbol());
  return strip;
}

/** Same as idle SVG gem: hub diameter × TWIST_CENTER_GEM_SCALE (full circle width, no extra inset). */
function computeCenterMetrics(hubWidthPx) {
  const w = hubWidthPx > 12 ? hubWidthPx : FALLBACK_HUB_PX;
  const iconPx = Math.max(12, w * TWIST_CENTER_GEM_SCALE);
  const itemH = Math.ceil(iconPx + 8);
  return { iconPx, itemH };
}

function computeDefaultMetrics() {
  const iconPx = 40;
  const itemH = 52;
  return { iconPx, itemH };
}

/**
 * Single vertical line: column-reverse + translateY>0 moves strip down so the current gem exits
 * downward and the next symbol enters from the top.
 */
function ReelBand({
  phase,
  resultSymbol,
  seedSymbol,
  onSettled,
  variant,
  hubWidthPx,
}) {
  const [strip, setStrip] = useState(() => []);
  const [translateY, setTranslateY] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);
  const settledRef = useRef(false);

  const isSpinning = phase === 'spinning';
  const isCenter = variant === 'center';

  const metrics = isCenter
    ? computeCenterMetrics(hubWidthPx)
    : computeDefaultMetrics();

  const { iconPx, itemH } = metrics;

  useLayoutEffect(() => {
    if (phase === 'done') return;
    settledRef.current = false;

    if (phase === 'idle') {
      setStrip([]);
      setTranslateY(0);
      setTransitionOn(false);
      return;
    }

    if (phase === 'spinning') {
      const above = Array.from({ length: 24 }, () => randomSymbol());
      setStrip([seedSymbol, ...above]);
      setTranslateY(0);
      setTransitionOn(false);
      return;
    }

    if (phase === 'settling' && resultSymbol) {
      const next = buildSettleStrip(resultSymbol);
      setStrip(next);
      const prefixLen = next.length - 1;
      const startY = prefixLen * itemH;
      setTranslateY(startY);
      setTransitionOn(false);
      const startSettle = () => {
        setTransitionOn(true);
        setTranslateY(0);
      };
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(startSettle);
      });
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [phase, resultSymbol, seedSymbol, itemH]);

  const handleTransitionEnd = useCallback(
    (e) => {
      if (e.propertyName !== 'transform') return;
      if (phase === 'done' || phase !== 'settling' || !transitionOn || settledRef.current) return;
      settledRef.current = true;
      onSettled?.();
    },
    [phase, transitionOn, onSettled],
  );

  const durationSec = 1.85;
  const delaySec = 0;

  return (
    <Box
      w="100%"
      px={isCenter ? 0 : '8px'}
      position="relative"
      h={`${itemH}px`}
      overflow="hidden"
      borderRadius={isCenter ? 0 : '10px'}
      border={isCenter ? 'none' : '1px solid rgba(0, 212, 255, 0.35)'}
      bg={isCenter ? 'transparent' : 'rgba(0,0,0,0.45)'}
      boxShadow={isCenter ? 'none' : 'inset 0 0 12px rgba(0,0,0,0.5)'}
    >
      {!isCenter ? (
        <>
          <Box
            position="absolute"
            left={0}
            right={0}
            top={0}
            h={`${itemH * 0.35}px`}
            bgGradient="linear(to-b, rgba(0,0,0,0.55), transparent)"
            zIndex={1}
            pointerEvents="none"
          />
          <Box
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            h={`${itemH * 0.35}px`}
            bgGradient="linear(to-t, rgba(0,0,0,0.55), transparent)"
            zIndex={1}
            pointerEvents="none"
          />
        </>
      ) : null}
      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        display="flex"
        flexDirection="column-reverse"
        alignItems="center"
        willChange="transform"
        style={
          isSpinning
            ? { animation: `twistReelFall 0.36s linear infinite` }
            : {
                transform: `translateY(${translateY}px)`,
                transition: transitionOn
                  ? `transform ${durationSec}s cubic-bezier(0.2, 0.85, 0.25, 1) ${delaySec}s`
                  : undefined,
              }
        }
        onTransitionEnd={handleTransitionEnd}
      >
        {strip.map((sym, i) => (
          <Flex
            key={`${phase}-${i}-${sym}`}
            h={`${itemH}px`}
            w="100%"
            flexShrink={0}
            align="center"
            justify="center"
          >
            <Box
              as="img"
              src={twistSymbolToSrc(sym)}
              alt=""
              w={`${iconPx}px`}
              h={`${iconPx}px`}
              maxW={`${iconPx}px`}
              maxH={`${iconPx}px`}
              objectFit="contain"
              draggable={false}
            />
          </Flex>
        ))}
      </Box>
    </Box>
  );
}

/**
 * One vertical reel: current gem at bottom; on bet, strip moves down so symbols fall away downward
 * and the next ones enter from the top. Icon size matches idle center gem (TWIST_CENTER_GEM_SCALE).
 */
export default function TwistBetReels({
  phase = 'idle',
  resultSymbol = null,
  multiplier = null,
  onSettleComplete,
  variant = 'default',
  /** Symbol shown in the wheel center before this spin (e.g. green gem). */
  seedSymbol = 'stone',
}) {
  const measureRef = useRef(null);
  const [hubWidthPx, setHubWidthPx] = useState(0);

  useEffect(() => {
    if (phase === 'idle' || variant !== 'center') {
      return undefined;
    }
    const el = measureRef.current;
    if (!el) return undefined;
    const update = () => setHubWidthPx(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, variant]);

  const handleSettled = useCallback(() => {
    onSettleComplete?.();
  }, [onSettleComplete]);

  if (phase === 'idle') return null;

  const showMultiplier =
    (phase === 'settling' || phase === 'done') &&
    resultSymbol &&
    typeof multiplier === 'number' &&
    Number.isFinite(multiplier) &&
    (resultSymbol === 'green' || resultSymbol === 'orange' || resultSymbol === 'purple');

  const showLabel =
    (phase === 'settling' || phase === 'done') &&
    resultSymbol &&
    (resultSymbol === 'stone' || resultSymbol === 'mouse');

  const isCenter = variant === 'center';
  const isSpinning = phase === 'spinning';
  const metricsForKeyframes = isCenter
    ? computeCenterMetrics(hubWidthPx || FALLBACK_HUB_PX)
    : computeDefaultMetrics();
  const { itemH } = metricsForKeyframes;

  return (
    <Box
      ref={variant === 'center' ? measureRef : undefined}
      w="100%"
      h={isCenter ? '100%' : undefined}
      maxW={isCenter ? '100%' : '420px'}
      mx={isCenter ? 0 : 'auto'}
      px={isCenter ? 0 : 2}
      mb={isCenter ? 0 : 3}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minH={isCenter ? 0 : undefined}
      flex={isCenter ? '1' : undefined}
    >
      <style>
        {`
          @keyframes twistReelFall {
            0% { transform: translateY(0); }
            100% { transform: translateY(${itemH * 4}px); }
          }
        `}
      </style>
      <ReelBand
        phase={phase}
        resultSymbol={resultSymbol}
        seedSymbol={seedSymbol}
        onSettled={phase === 'done' ? undefined : handleSettled}
        variant={variant}
        hubWidthPx={hubWidthPx}
      />
      {showMultiplier && !isCenter ? (
        <Text
          textAlign="center"
          mt={2}
          fontSize="sm"
          fontWeight="800"
          color="#00D4FF"
          letterSpacing="0.04em"
          lineHeight={1.1}
        >
          {multiplier.toFixed(2)}×
        </Text>
      ) : null}
      {showLabel && !isCenter ? (
        <Text
          textAlign="center"
          mt={2}
          fontSize="xs"
          fontWeight="700"
          color="rgba(255,255,255,0.75)"
          textTransform="capitalize"
          lineHeight={1.1}
        >
          {resultSymbol}
        </Text>
      ) : null}
    </Box>
  );
}
