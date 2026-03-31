import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, HStack, Flex, useBreakpointValue } from '@chakra-ui/react';

/** Allowed symbols per column (order = reel strip; neighbors wrap within that column only). */
export const REEL_SYMBOLS_BY_COLUMN = [
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ['.', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
];

const DEFAULT_SYMBOLS = ['1', '.', '1'];

function reelList(colIdx) {
    return REEL_SYMBOLS_BY_COLUMN[colIdx] ?? REEL_SYMBOLS_BY_COLUMN[0];
}

function randSymbol(colIdx) {
    const list = reelList(colIdx);
    return list[Math.floor(Math.random() * list.length)];
}

/** Clamp value to the allowed set for that reel (0–2). */
export function normalizeReelSymbol(v, colIdx) {
    const list = reelList(colIdx);
    const s = String(v);
    if (list.includes(s)) return s;
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) {
        const asStr = String(n);
        if (list.includes(asStr)) return asStr;
    }
    return list[0];
}

function tripletForCenter(symbol, colIdx) {
    const list = reelList(colIdx);
    const mid = normalizeReelSymbol(symbol, colIdx);
    let idx = list.indexOf(mid);
    if (idx < 0) idx = 0;
    const n = list.length;
    return [list[(idx - 1 + n) % n], list[idx], list[(idx + 1) % n]];
}

function tripletsFromSymbols(symbols) {
    return symbols.map((x, colIdx) => tripletForCenter(x, colIdx));
}

/** Crisp black outline outside the white stroke (two shadow rings). */
const BLACK_OUTLINE =
    '-2px -2px 0 #979797, 0 -2px 0 #979797, 2px -2px 0 #979797, -2px 0 0 #979797, 2px 0 0 #979797, -2px 2px 0 #979797, 0 2px 0 #979797, 2px 2px 0 #979797, ' +
    '-1px -1px 0 #0a0a0a, 1px -1px 0 #0a0a0a, -1px 1px 0 #0a0a0a, 1px 1px 0 #0a0a0a, 0 -1px 0 #0a0a0a, 0 1px 0 #0a0a0a, -1px 0 0 #0a0a0a, 1px 0 0 #0a0a0a';

const BLACK_OUTLINE_COMPACT =
    '-1px -1px 0 #979797, 1px -1px 0 #979797, -1px 1px 0 #979797, 1px 1px 0 #979797, 0 -1px 0 #979797, 0 1px 0 #979797, -1px 0 0 #979797, 1px 0 0 #979797, ' +
    '-2px 0 0 #050505, 2px 0 0 #050505, 0 -2px 0 #050505, 0 2px 0 #050505';

function ReelGlyph({ value, rowPx, compact }) {
    const hProp = rowPx != null ? { h: `${rowPx}px` } : { minH: '56px' };
    const fontSize = compact
        ? { base: '2.15rem', sm: '2.25rem' }
        : { base: '2.95rem', sm: '3.25rem', md: '3.45rem' };
    const whiteBorder = compact ? '1.75px #FFFFFF' : '2.5px #FFFFFF';

    return (
        <Flex {...hProp} align="center" justify="center" w="100%" flexShrink={0} position="relative">
            <Box
                as="span"
                position="relative"
                zIndex={1}
                fontFamily='"Arial Black", "Helvetica Neue", Helvetica, Arial, sans-serif'
                fontWeight="900"
                fontSize='40px'
                lineHeight="1"
                letterSpacing="0.02em"
                color="#D91A1F"
                sx={{
                    WebkitTextStroke: whiteBorder,
                    paintOrder: 'stroke fill',
                    textShadow: compact ? BLACK_OUTLINE_COMPACT : BLACK_OUTLINE,
                }}
                userSelect="none"
            >
                {value}
            </Box>
        </Flex>
    );
}

/**
 * Three vertical reels overlaid on the machine art. Spins when spinRequestId increments.
 * @param {{ spinRequestId?: number, targetSymbols?: string[], onSpinComplete?: (columns: string[][]) => void, inset?: { top?: string, left?: string, right?: string, bottom?: string } }} props
 */
export default function SlotMachineReels({
    spinRequestId = 0,
    targetSymbols = DEFAULT_SYMBOLS,
    onSpinComplete,
    inset = { top: '14%', left: '11%', right: '11%', bottom: '26%' },
    /** Shorter rows for fixed-size machine art (e.g. 170px-tall frame). */
    compact = false,
}) {
    const responsiveRow = useBreakpointValue({ base: 52, sm: 58, md: 62 }) ?? 58;
    const rowHPx = compact ? 48 : responsiveRow;

    const rowHPxRef = useRef(rowHPx);
    rowHPxRef.current = rowHPx;
    const targetSymbolsRef = useRef(targetSymbols);
    targetSymbolsRef.current = targetSymbols;

    const [strips, setStrips] = useState(() => tripletsFromSymbols(targetSymbols).map((t) => [...t]));
    const [translateY, setTranslateY] = useState(() => [0, 0, 0]);
    const [transitionMs, setTransitionMs] = useState(() => [0, 0, 0]);
    const [isSpinning, setIsSpinning] = useState(false);

    const finalTripletsRef = useRef(tripletsFromSymbols(targetSymbols));
    const landedRef = useRef(new Set());
    const spinInProgressRef = useRef(false);

    const runSpin = useCallback(() => {
        if (spinInProgressRef.current) return;
        spinInProgressRef.current = true;
        landedRef.current = new Set();
        setIsSpinning(true);

        const row = rowHPxRef.current;
        const mids = targetSymbolsRef.current;
        const newFinal = tripletsFromSymbols(mids).map((triplet) => [...triplet]);
        finalTripletsRef.current = newFinal;

        const nextStrips = newFinal.map((triplet, colIdx) => {
            const prefixLen = 24 + colIdx * 14;
            const prefix = Array.from({ length: prefixLen }, () => randSymbol(colIdx));
            return [...prefix, ...triplet];
        });

        const durations = [1500, 1950, 2400];

        setStrips(nextStrips);
        setTranslateY([0, 0, 0]);
        setTransitionMs([0, 0, 0]);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTransitionMs(durations);
                setTranslateY(nextStrips.map((s) => -(s.length - 3) * row));
            });
        });
    }, []);

    useEffect(() => {
        if (spinRequestId <= 0) return;
        runSpin();
    }, [spinRequestId, runSpin]);

    useEffect(() => {
        if (spinInProgressRef.current) return;
        const triplets = tripletsFromSymbols(targetSymbols).map((t) => [...t]);
        setStrips(triplets);
        setTranslateY([0, 0, 0]);
        setTransitionMs([0, 0, 0]);
        finalTripletsRef.current = tripletsFromSymbols(targetSymbols).map((t) => [...t]);
    }, [targetSymbols]);

    const finishColumn = useCallback(
        (colIdx) => {
            if (landedRef.current.has(colIdx)) return;
            landedRef.current.add(colIdx);
            if (landedRef.current.size < 3) return;

            const settled = finalTripletsRef.current.map((t) => [...t]);
            spinInProgressRef.current = false;
            setIsSpinning(false);
            setStrips(settled);
            setTranslateY([0, 0, 0]);
            setTransitionMs([0, 0, 0]);
            onSpinComplete?.(settled);
        },
        [onSpinComplete]
    );

    const handleTransitionEnd = useCallback(
        (e, colIdx) => {
            if (e.propertyName !== 'transform') return;
            e.stopPropagation();
            finishColumn(colIdx);
        },
        [finishColumn]
    );

    return (
        <Box position="absolute" {...inset} zIndex={2} pointerEvents="none" aria-busy={isSpinning}>
            <Box position="relative" w="100%" h={`${rowHPx * 3}px`} overflow="hidden" bg="transparent">
                <HStack position="relative" zIndex={1} spacing={0} align="stretch" w="100%" h={`${rowHPx * 3}px`}>
                    {[0, 1, 2].map((colIdx) => {
                        const strip = strips[colIdx] || ['0', '0', '0'];
                        const ty = translateY[colIdx] ?? 0;
                        const dur = transitionMs[colIdx] ?? 0;

                        return (
                            <Box
                                key={colIdx}
                                flex="1"
                                minW={0}
                                h={`${rowHPx * 3}px`}
                                flexShrink={0}
                                overflow="hidden"
                                bg="transparent"
                            >
                                <Box
                                    willChange="transform"
                                    style={{
                                        transform: `translate3d(0, ${ty}px, 0)`,
                                        transition:
                                            dur > 0
                                                ? `transform ${dur}ms cubic-bezier(0.18, 0.72, 0.12, 0.99)`
                                                : 'none',
                                    }}
                                    onTransitionEnd={(e) => handleTransitionEnd(e, colIdx)}
                                >
                                    {strip.map((d, i) => (
                                        <ReelGlyph
                                            key={
                                                strip.length === 3
                                                    ? `${colIdx}-idle-${i}`
                                                    : `${colIdx}-s-${spinRequestId}-${i}`
                                            }
                                            value={d}
                                            rowPx={rowHPx}
                                            compact={compact}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        );
                    })}
                </HStack>
            </Box>
        </Box>
    );
}
