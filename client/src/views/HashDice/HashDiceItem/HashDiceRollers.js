import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Box, Flex, Text } from '@chakra-ui/react';

const DIGIT_H = 48;
/** Match numeral cap-height to the cell so every column shares the same vertical center. */
const DIGIT_FONT_PX = Math.round(DIGIT_H * 0.8);
/**
 * Per-column horizontal nudge (in px).
 * Positive moves digits right, negative moves them left.
 * Example: [-2, 0, 2, 0, 0]
 */
const DIGIT_X_OFFSETS = [0, 0, 0, 0, 0];
/**
 * Per-column vertical nudge (in px).
 * Positive moves digits down, negative moves them up.
 * Example: [0, 1, 0, -1, 0]
 */
const DIGIT_Y_OFFSETS = [5, 5, 5, 5, 5];
const CYCLE = 10 * DIGIT_H;
/** Several 0–9 blocks stacked so wrapping scroll is seamless (9 → 0 is physical continuation). */
const STRIP_REPEATS = 5;
const STRIP_H = STRIP_REPEATS * CYCLE;

const REEL_STRIP_CELLS = (() => {
    const out = [];
    for (let r = 0; r < STRIP_REPEATS; r += 1) {
        for (let d = 0; d < 10; d += 1) {
            out.push({ key: `r${r}-${d}`, d });
        }
    }
    return out;
})();

/** Min spin before API target can lock — shorter = snappier round, still readable motion. */
const MIN_SPIN_BEFORE_SETTLE_MS = 680;
const SPIN_PX_PER_SEC = 2400;
/** Per-column settle (4→1); slightly longer + cubic ease reads more like physical reels. */
const TWEEN_MS = 420;
/** Per-frame scroll cap: higher = smoother fast spin; still capped so digits stay legible. */
const MAX_SCROLL_DY = DIGIT_H * 0.88;
/** Velocity ramps toward SPIN_PX_PER_SEC (lower = softer, more natural accel). */
const SPIN_VEL_SMOOTH = 8;

function pad5(n) {
    const x = Math.floor(Number(n));
    if (!Number.isFinite(x)) return '00000';
    const m = ((x % 100000) + 100000) % 100000;
    return String(m).padStart(5, '0');
}

/** Align scroll offset (forward) so remainder mod CYCLE shows `targetDigit` in the window. */
function snapOffsetForward(currentPx, targetDigit) {
    const targetY = targetDigit * DIGIT_H;
    const mod = ((currentPx % CYCLE) + CYCLE) % CYCLE;
    let delta = targetY - mod;
    if (delta <= 0) delta += CYCLE;
    return currentPx + delta;
}

function easeOutCubic(t) {
    const u = 1 - t;
    return 1 - u * u * u;
}

function clampStep(dy) {
    if (dy > MAX_SCROLL_DY) return MAX_SCROLL_DY;
    if (dy < -MAX_SCROLL_DY) return -MAX_SCROLL_DY;
    return dy;
}

function ReelColumn({ offsetPx, dimmed, colIndex }) {
    const y = ((offsetPx % STRIP_H) + STRIP_H) % STRIP_H;
    const digitX = DIGIT_X_OFFSETS[colIndex] ?? 0;
    const digitY = DIGIT_Y_OFFSETS[colIndex] ?? 0;

    return (
        <Box
            flex="1 1 0"
            minW={0}
            maxW="100%"
            borderRadius="5px"
            bg="transparent"
            position="relative"
            overflow="hidden"
            transition="none"
            h={`${DIGIT_H}px`}
            minH={`${DIGIT_H}px`}
            maxH={`${DIGIT_H}px`}
        >
            <Box
                display="flex"
                flexDirection="column"
                alignItems="stretch"
                w="100%"
                minW={0}
                willChange="transform"
                position="relative"
                zIndex={1}
                sx={{
                    transform: `translate3d(0, ${-y}px, 0)`,
                    backfaceVisibility: 'hidden',
                    transition: 'none',
                }}
            >
                {REEL_STRIP_CELLS.map(({ key, d }) => (
                    <Box
                        key={key}
                        h={`${DIGIT_H}px`}
                        minH={`${DIGIT_H}px`}
                        w="100%"
                        minW={0}
                        display="grid"
                        placeItems="center"
                        flexShrink={0}
                    >
                        <Text
                            as="span"
                            position="relative"
                            zIndex={1}
                            m={0}
                            p={0}
                            w="100%"
                            h={`${DIGIT_H}px`}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            textAlign="center"
                            fontSize={`${DIGIT_FONT_PX}px`}
                            fontWeight="900"
                            color={dimmed ? 'red' : 'red'}
                            letterSpacing="0"
                            lineHeight="1"
                            fontVariantNumeric="lining-nums tabular-nums"
                            fontFamily="'Arial Black', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                            sx={{
                                fontFeatureSettings: '"lnum" 1, "tnum" 1',
                                textShadow: 'none',
                                transform: `translate3d(${digitX}px, ${digitY}px, 0)`,
                            }}
                        >
                            {d}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

/**
 * Slot reels: five columns share the same 0–9 strip scroll; all spin together, then ease
 * to the result right-to-left (column 4 … 0). Offsets only — no random digit swaps.
 */
export default function HashDiceRollers({ phase, value, spinTarget, onSettled }) {
    const [offsets, setOffsets] = useState([0, 0, 0, 0, 0]);
    /** True from final digit lock until next spin — bright borders immediately, no wait for parent `phase`. */
    const [revealHighlight, setRevealHighlight] = useState(false);

    const spinTargetRef = useRef(spinTarget);
    spinTargetRef.current = spinTarget;
    const onSettledRef = useRef(onSettled);
    onSettledRef.current = onSettled;
    const settledFiredRef = useRef(false);

    useLayoutEffect(() => {
        if (phase === 'spinning') {
            setRevealHighlight(false);
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'spinning') return;
        const ds = pad5(value)
            .split('')
            .map((c) => parseInt(c, 10));
        setOffsets(ds.map((d) => d * DIGIT_H));
    }, [phase, value]);

    useEffect(() => {
        if (phase !== 'spinning') return undefined;

        /** Fresh each spin so auto-bet round 2+ always signals parent (ref was staying true). */
        settledFiredRef.current = false;

        let cancelled = false;
        let rafId = 0;

        /** All five columns spin from random strip offsets; settle 4 → 0 when target is known. */
        const o = Array.from({ length: 5 }, () => Math.random() * STRIP_H);
        let lastTs = performance.now();
        const spinStart = Date.now();

        let targetDigits = null;
        let tweenCol = -1;
        let tweenFrom = 0;
        let tweenTo = 0;
        let tweenStart = 0;
        const locked = [false, false, false, false, false];
        let spinVel = 0;
        /** Slight per-reel speed so columns don’t move in perfect lockstep (physical drums). */
        const colMul = Array.from({ length: 5 }, () => 0.9 + Math.random() * 0.22);

        const fireSettledOnce = () => {
            if (cancelled) return;
            if (settledFiredRef.current) return;
            settledFiredRef.current = true;
            onSettledRef.current?.();
        };

        const applyFrame = (nextO) => {
            for (let i = 0; i < 5; i += 1) o[i] = nextO[i];
            setOffsets([...o]);
        };

        const frame = (ts) => {
            if (cancelled) return;

            const dt = Math.min(0.032, (ts - lastTs) / 1000);
            lastTs = ts;

            const t = spinTargetRef.current;
            const elapsed = Date.now() - spinStart;
            const ready =
                t != null && Number.isFinite(t) && elapsed >= MIN_SPIN_BEFORE_SETTLE_MS;

            if (targetDigits == null) {
                if (ready) {
                    targetDigits = pad5(Number(t))
                        .split('')
                        .map((c) => parseInt(c, 10));
                    tweenCol = 4;
                    tweenFrom = o[4];
                    tweenTo = snapOffsetForward(o[4], targetDigits[4]);
                    tweenStart = ts;
                } else {
                    const velLerp = 1 - Math.exp(-SPIN_VEL_SMOOTH * dt);
                    spinVel += (SPIN_PX_PER_SEC - spinVel) * velLerp;
                    const dyBase = spinVel * dt;
                    const next = o.map((v, i) => v + clampStep(dyBase * colMul[i]));
                    applyFrame(next);
                    rafId = requestAnimationFrame(frame);
                    return;
                }
            }

            const next = o.slice();

            const velLerp = 1 - Math.exp(-SPIN_VEL_SMOOTH * dt);
            spinVel += (SPIN_PX_PER_SEC - spinVel) * velLerp;
            const dyBase = spinVel * dt;
            for (let i = 0; i < 5; i += 1) {
                if (!locked[i] && i !== tweenCol) {
                    next[i] += clampStep(dyBase * colMul[i]);
                }
            }

            if (tweenCol >= 0) {
                const p = Math.min(1, (ts - tweenStart) / TWEEN_MS);
                if (p < 1) {
                    next[tweenCol] = tweenFrom + (tweenTo - tweenFrom) * easeOutCubic(p);
                } else {
                    next[tweenCol] = tweenTo;
                    locked[tweenCol] = true;

                    /** Last reel to ease in is column 0; then snap all to exact targets. */
                    if (tweenCol === 0) {
                        for (let i = 0; i < 5; i += 1) {
                            next[i] = targetDigits[i] * DIGIT_H;
                        }
                        applyFrame(next);
                        flushSync(() => setRevealHighlight(true));
                        fireSettledOnce();
                        return;
                    }

                    tweenCol -= 1;
                    tweenFrom = next[tweenCol];
                    tweenTo = snapOffsetForward(next[tweenCol], targetDigits[tweenCol]);
                    tweenStart = ts;
                }
            }

            applyFrame(next);
            rafId = requestAnimationFrame(frame);
        };

        setOffsets([...o]);
        rafId = requestAnimationFrame(frame);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [phase]);

    const dimmed = phase === 'spinning' && !revealHighlight;

    return (
        <Box
            w="100%"
            minW={0}
            overflow="hidden"
            borderRadius="4px"
            /* No fixed px inset: keeps column widths aligned with the scaled machine artwork.
               We shorten highlight via % inset on _before/_after per column instead. */
            px={0}
            sx={{ isolation: 'isolate' }}
        >
            <Flex
                w="100%"
                minW={0}
                justify="stretch"
                align="stretch"
                gap={{ base: '2px', sm: '3px', md: '4px' }}
                py={0}
                px={0}
            >
                {offsets.map((off, i) => (
                    <ReelColumn key={i} offsetPx={off} dimmed={dimmed} colIndex={i} />
                ))}
            </Flex>
        </Box>
    );
}
