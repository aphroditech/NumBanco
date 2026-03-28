import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Grid,
    GridItem,
    HStack,
    IconButton,
    Input,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    VStack,
} from '@chakra-ui/react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { useSelector , useDispatch } from 'react-redux';
import { betWheel, completeWheelSpin } from 'action/wheelActions';
import { useHistory } from 'react-router-dom';
import RealTimeHistory from './WheelItem/RealTimeHistory';
import WheelHistory from './WheelItem/WheelHistory';
import AttractionsIcon from '@mui/icons-material/Attractions';

const MotionBox = motion(Box);

const SEGMENT_COUNT = 30;
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;

const LEVEL_CONFIG = {
    low: {
        key: 'low',
        label: 'LOW',
        edgeColor: '#5aa4ff',
        payouts: [
            { label: '0.00x', color: '#f1f5f9', count: 22 },
            { label: '1.18x', color: '#60a5fa', count: 6 },
            { label: '1.48x', color: '#4ade80', count: 2 },
        ],
    },
    medium: {
        key: 'medium',
        label: 'MEDIUM',
        edgeColor: '#d1d5db',
        payouts: [
            { label: '0.00x', color: '#f1f5f9', count: 14 },
            { label: '1.48x', color: '#60a5fa', count: 6 },
            { label: '1.68x', color: '#4ade80', count: 3 },
            { label: '1.97x', color: '#fbbf24', count: 3 },
            { label: '2.96x', color: '#a855f7', count: 2 },
            { label: '3.95x', color: '#ef4444', count: 2 },
        ],
    },
    hard: {
        key: 'hard',
        label: 'HARD',
        edgeColor: '#f1f5f9',
        payouts: [
            { label: '0.00x', color: '#f1f5f9', count: 29 },
            { label: '29.40x', color: '#ef4444', count: 1 },
        ],
    },
};

// Fixed low-mode segment order (clockwise from top) to match the reference structure.
const LOW_SEGMENT_PATTERN = [
    'green',
    'blue',
    'white',
    'blue',
    'blue',
    'blue',
    'blue',
    'white',
    'blue',
    'blue',
    'blue',
    'blue',
    'green',
    'blue',
    'white',
    'blue',
    'blue',
    'blue',
    'blue',
    'white',
    'blue',
    'blue',
    'blue',
    'blue',
    'white',
    'blue',
    'blue',
    'blue',
    'blue',
    'white',
];

function clampBetAmount(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return MIN_AMOUNT;
    const fixed = Math.round(n * 100) / 100;
    return Math.max(MIN_AMOUNT, Math.min(MAX_AMOUNT, fixed));
}

function buildSegments(levelKey) {
    const level = LEVEL_CONFIG[levelKey] || LEVEL_CONFIG.low;

    if (levelKey === 'low') {
        const byType = {
            white: level.payouts.find((p) => p.label === '0.00x'),
            blue: level.payouts.find((p) => p.label === '1.18x'),
            green: level.payouts.find((p) => p.label === '1.48x'),
        };
        return LOW_SEGMENT_PATTERN.map((kind, i) => ({
            ...(byType[kind] || byType.blue),
            payoutIndex: i,
        }));
    }

    const base = [];
    level.payouts.forEach((p, payoutIndex) => {
        for (let i = 0; i < p.count; i += 1) {
            base.push({
                ...p,
                payoutIndex,
            });
        }
    });
    // Deterministic spread around the wheel (visually balanced, fixed every render).
    const out = Array(SEGMENT_COUNT).fill(null);
    let cursor = 0;
    for (let i = 0; i < base.length; i += 1) {
        while (out[cursor % SEGMENT_COUNT] != null) cursor += 1;
        out[cursor % SEGMENT_COUNT] = base[i];
        cursor += 7;
    }
    for (let i = 0; i < SEGMENT_COUNT; i += 1) {
        if (out[i] == null) out[i] = base[i % base.length];
    }
    return out;
}

function segmentsToConic(segments) {
    const a = 360 / SEGMENT_COUNT;
    const stops = segments.map((s, i) => {
        const start = i * a;
        const end = (i + 1) * a;
        return `${s.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(from -90deg, ${stops.join(',')})`;
}

function segmentSeparatorGradient(segmentCount) {
    const step = 360 / Math.max(1, Number(segmentCount) || 1);
    return `repeating-conic-gradient(
        from -90deg,
        rgba(255,255,255,0.55) 0deg 0.9deg,
        rgba(255,255,255,0.18) 0.9deg 1.6deg,
        transparent 1.6deg ${step}deg
    )`;
}

function mockRows() {
    return [
        { user: 'Brandon H', result: '0x', win: '$0', winColor: '#ef4444' },
        { user: 'Brandon H', result: '1.48x', win: '$0.21', winColor: '#4ade80' },
        { user: 'Brandon H', result: '0x', win: '$0', winColor: '#ef4444' },
        { user: 'Brandon H', result: '1.68x', win: '$0.64', winColor: '#4ade80' },
        { user: 'Brandon H', result: '0x', win: '$0', winColor: '#ef4444' },
        { user: 'Brandon H', result: '0x', win: '$0', winColor: '#ef4444' },
    ];
}

/** Parse multiplier from segment label (e.g. "1.18x", "29.40x"). */
function multiplierFromLabel(label) {
    return parseFloat(String(label).replace(/x$/i, '').trim());
}

function multipliersEqual(a, b) {
    return Math.abs(a - b) < 1e-6;
}

/**
 * Indices of wheel segments whose payout equals the server result (target multiplier).
 */
function findSegmentIndicesForResult(segments, result) {
    const target = Number(result);
    if (!Number.isFinite(target)) return [];
    const indices = [];
    segments.forEach((seg, i) => {
        const m = multiplierFromLabel(seg.label);
        if (multipliersEqual(m, target)) indices.push(i);
    });
    return indices;
}

/**
 * If no exact label match (should be rare), pick the segment closest in multiplier value.
 */
function pickSegmentIndexForResult(segments, result) {
    const indices = findSegmentIndicesForResult(segments, result);
    if (indices.length > 0) {
        return indices[Math.floor(Math.random() * indices.length)];
    }
    const target = Number(result);
    let bestIdx = 0;
    let bestDiff = Infinity;
    segments.forEach((seg, i) => {
        const m = multiplierFromLabel(seg.label);
        const d = Math.abs(m - target);
        if (d < bestDiff) {
            bestDiff = d;
            bestIdx = i;
        }
    });
    return bestIdx;
}

function mod360(deg) {
    let x = deg % 360;
    if (x < 0) x += 360;
    return x;
}

/**
 * Pointer is fixed at the top. Wheel uses conic-gradient(from -90deg, …): segment 0 starts at 9 o'clock.
 * Center of segment i (degrees clockwise from top, wheel at rest) = mod360(270 + (i + 0.5) * (360/n)).
 * After rotating the wheel CW by R, segment center is at mod360(angle_i + R); we need 0 under the pointer.
 */
function computeRotationDelta(currentRotation, segmentIndex, segmentCount) {
    const n = Math.max(1, segmentCount);
    const a = 360 / n;
    const angleI = mod360(270 + (segmentIndex + 0.5) * a);
    const sumNorm = mod360(angleI + currentRotation);
    const delta = mod360(360 - sumNorm);
    const fullSpins = 4 + Math.floor(Math.random() * 3);
    return delta + 360 * fullSpins;
}

const WHEEL_SPIN_DURATION_SEC = 4.6;
const OUTCOME_FX_MS = 1500;

/** Match wheel legend style (e.g. 0.00x, 29.40x). */
function formatMultiplierLabel(m) {
    const x = Number(m);
    if (!Number.isFinite(x)) return '—';
    return `${x.toFixed(2)}x`;
}

export default function WheelPage() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance || MAX_AMOUNT));
    const dispatch = useDispatch();
    const history = useHistory();
    const [amount, setAmount] = useState('0.50');
    const [level, setLevel] = useState('low');
    const [isSpinning, setIsSpinning] = useState(false);
    /** Shown only after the wheel animation stops — same values the server used for this round. */
    const [spinOutcome, setSpinOutcome] = useState(null);
    /** Cumulative degrees — source of truth for landing math (avoids stale state after Redux re-renders). */
    const wheelRotationRef = useRef(0);
    const wheelControls = useAnimation();

    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [showOutcomeFx, setShowOutcomeFx] = useState(false);
    const [lossEffectKey, setLossEffectKey] = useState(0);
    const [winEffectKey, setWinEffectKey] = useState(0);
    const outcomeFxTimerRef = useRef(null);

    const handleAmountChange = (e) => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(v);
    };

    const handleAmountBlur = () => {
        setAmount(clampBetAmount(amount).toFixed(2));
    };

    const segments = useMemo(() => buildSegments(level), [level]);
    const ringGradient = useMemo(() => segmentsToConic(segments), [segments]);
    const separatorGradient = useMemo(() => segmentSeparatorGradient(segments.length), [segments.length]);
    const rows = useMemo(() => mockRows(), []);

    const showWinFxOverlay =
        showOutcomeFx && spinOutcome != null && Number(spinOutcome.payout) > 0;
    const showLossFxOverlay =
        showOutcomeFx && spinOutcome != null && Number(spinOutcome.payout) <= 0;

    const wheelWinConfetti = useMemo(() => {
        if (!showWinFxOverlay) return [];
        return Array.from({ length: 30 }).map((_, i) => {
            const leftPct = 6 + Math.random() * 88;
            const delay = Math.random() * 0.35;
            const rot = Math.random() * 360;
            const gold = Math.random() < 0.4;
            const hue = gold ? 38 + Math.random() * 28 : 168 + Math.random() * 80;
            const drift = (Math.random() - 0.5) * 72;
            const size = 5 + Math.random() * 7;
            const duration = 1.35 + Math.random() * 0.55;
            return { i, leftPct, delay, rot, hue, drift, size, duration };
        });
    }, [showWinFxOverlay, winEffectKey]);

    const wheelLossParticles = useMemo(() => {
        if (!showLossFxOverlay) return [];
        return Array.from({ length: 20 }).map((_, i) => ({
            i,
            leftPct: Math.random() * 100,
            delay: Math.random() * 0.85,
            duration: 2.6 + Math.random() * 1.6,
            y0: 10 + Math.random() * 38,
            opacity: 0.1 + Math.random() * 0.18,
            w: 2 + Math.random() * 3,
        }));
    }, [showLossFxOverlay, lossEffectKey]);

    const clearOutcomeFxTimer = () => {
        if (outcomeFxTimerRef.current) {
            clearTimeout(outcomeFxTimerRef.current);
            outcomeFxTimerRef.current = null;
        }
    };

    const armOutcomeFxAutoDismiss = () => {
        clearOutcomeFxTimer();
        setShowOutcomeFx(true);
        outcomeFxTimerRef.current = setTimeout(() => {
            setShowOutcomeFx(false);
            outcomeFxTimerRef.current = null;
        }, OUTCOME_FX_MS);
    };

    const payoutLegend = LEVEL_CONFIG[level].payouts;

    useEffect(() => {
        wheelRotationRef.current = 0;
        wheelControls.set({ rotate: 0 });
        setSpinOutcome(null);
        clearOutcomeFxTimer();
        setShowOutcomeFx(false);
    }, [level, wheelControls]);

    useEffect(() => () => clearOutcomeFxTimer(), []);

    useEffect(() => {
        return () => {
            wheelControls.stop();
        };
    }, [wheelControls]);

    const spinDemo = async () => {
        if (isSpinning) return;
        const bet = clampBetAmount(amount);
        if (bet > balance) return;

        const data = {
            betAmount: bet,
            level,
        };

        setIsSpinning(true);
        setSpinOutcome(null);
        clearOutcomeFxTimer();
        setShowOutcomeFx(false);

        try {
            const betRes = await betWheel(data, dispatch, history);
            const resultNum = Number(betRes?.result);
            if (
                betRes == null ||
                resultNum === undefined ||
                resultNum === null ||
                !Number.isFinite(resultNum)
            ) {
                return;
            }

            const segmentIndex = pickSegmentIndexForResult(segments, resultNum);
            const currentDeg = wheelRotationRef.current;
            const delta = computeRotationDelta(currentDeg, segmentIndex, segments.length);
            const next = currentDeg + delta;
            wheelRotationRef.current = next;

            await wheelControls.start({
                rotate: next,
                transition: {
                    duration: WHEEL_SPIN_DURATION_SEC,
                    ease: [0.12, 0.86, 0.1, 1],
                },
            });

            let payout =
                resultNum > 0 ? Math.round(bet * resultNum * 100) / 100 : 0;
            try {
                const completeData = await completeWheelSpin(
                    { multiplier: parseFloat(resultNum), betAmount: bet, level: level },
                    dispatch,
                    history,
                );
                if (completeData != null && Number.isFinite(Number(completeData.winAmount))) {
                    payout = Number(completeData.winAmount);
                }
            } catch (completeErr) {
                console.error(completeErr);
            }

            setSpinOutcome({ multiplier: resultNum, payout });
            if (payout > 0) {
                setWinEffectKey((k) => k + 1);
            } else {
                setLossEffectKey((k) => k + 1);
            }
            armOutcomeFxAutoDismiss();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSpinning(false);
        }
    };

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" mt="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "live"',
                    md: '"panel live" "game game"',
                    '1550px': '"panel game live"',
                }}
                templateColumns={{
                    sm: '1fr',
                    md: '1fr 1fr',
                    '1550px': '3fr 6fr 2fr',
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'minmax(500px, auto)',
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem area="panel" minW="320px" display="flex" flexDirection="column" minH="0">
                    <Card
                        pt="30px"
                        pb="22px"
                        px="22px"
                        minH="500px"
                        h="100%"
                        display="flex"
                        flexDirection="column"
                        flex="1"
                    >
                        <CardBody
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="flex-start"
                            flex="1"
                            minH="0"
                            position="relative"
                        >
                            <Box position="absolute" top="-30px" right="-20px" zIndex={2}>
                                <IconButton
                                    aria-label="Help"
                                    icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                    size="md"
                                    bg="transparent"
                                    color="#00d4ff"
                                    borderRadius="50%"
                                    _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
                                    onClick={() => setIsHelpModalOpen(true)}
                                />
                            </Box>
                            <VStack spacing="20px" align="stretch" w="100%" maxW="320px">
                                <Box display="flex" alignItems="center" gap="8px">
                                    <AttractionsIcon style={{ fontSize: 22, color: '#00D4FF' }} />
                                    <Text fontSize="sm" color="#fff" fontWeight="700">Wheel</Text>
                                </Box>
                                <FormControl w="100%">
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Bet Amount
                                    </FormLabel>
                                    <GradientBorder borderRadius="24px" w="100%">
                                        <Flex
                                            w="100%"
                                            align="center"
                                            justify="space-between"
                                            bg="#323738"
                                            borderRadius="22px"
                                            h="48px"
                                            pl="16px"
                                            pr="0"
                                            overflow="hidden"
                                            border="1px solid rgba(255,255,255,0.08)"
                                        >
                                            <Input
                                                bg="transparent"
                                                border="none"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                h="auto"
                                                p="0"
                                                color="white"
                                                type="text"
                                                inputMode="decimal"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.50"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
                                                minW="0"
                                                isDisabled={isSpinning}
                                            />
                                            <HStack spacing="0" align="stretch" h="100%" flexShrink={0}>
                                                <Button
                                                    size="sm"
                                                    h="100%"
                                                    minW="40px"
                                                    px="10px"
                                                    bg="transparent"
                                                    color="#fff"
                                                    fontSize="xs"
                                                    fontWeight="700"
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.12)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                    isDisabled={isSpinning}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || String(MIN_AMOUNT));
                                                        const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                                                        setAmount(Math.max(MIN_AMOUNT, base / 2).toFixed(2));
                                                    }}
                                                >
                                                    /2
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    h="100%"
                                                    minW="40px"
                                                    px="10px"
                                                    bg="transparent"
                                                    color="#fff"
                                                    fontSize="xs"
                                                    fontWeight="700"
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.12)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                    isDisabled={isSpinning}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || String(MIN_AMOUNT));
                                                        const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                                                        const next = Math.min(maxAmount, base * 2);
                                                        setAmount(next.toFixed(2));
                                                    }}
                                                >
                                                    ×2
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    h="100%"
                                                    minW="52px"
                                                    px="10px"
                                                    bg="transparent"
                                                    color="#00D4FF"
                                                    fontSize="xs"
                                                    fontWeight="800"
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.12)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                    isDisabled={isSpinning}
                                                    onClick={() => setAmount(maxAmount.toFixed(2))}
                                                >
                                                    Max
                                                </Button>
                                            </HStack>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                <Box>
                                    <Text fontSize="sm" color="#fff" fontWeight="700" mb="8px">
                                        Level
                                    </Text>
                                    <HStack spacing="8px">
                                        {Object.keys(LEVEL_CONFIG).map((k) => (
                                            <Button
                                                key={k}
                                                flex="1"
                                                h="42px"
                                                borderRadius="10px"
                                                disabled={isSpinning}
                                                variant="unstyled"
                                                border="1px solid"
                                                borderColor={level === k ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.16)'}
                                                bg={level === k ? 'rgba(8,52,62,0.85)' : 'rgba(20,24,28,0.75)'}
                                                color={level === k ? '#9ff4ff' : 'rgba(255,255,255,0.8)'}
                                                fontWeight="800"
                                                onClick={() => setLevel(k)}
                                                _hover={{ borderColor: 'rgba(0,212,255,0.45)' }}
                                            >
                                                {LEVEL_CONFIG[k].label}
                                            </Button>
                                        ))}
                                    </HStack>
                                </Box>

                                <Box
                                    p="12px"
                                    borderRadius="12px"
                                    bg="#323738"
                                    border="1px solid rgba(0,212,255,0.2)"
                                >
                                    <HStack justify="space-between" mb="8px">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.72)">
                                            Segments
                                        </Text>
                                        <Text fontSize="lg" color="#fff" fontWeight="800">
                                            30
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.72)">
                                            Selected Level
                                        </Text>
                                        <Text fontSize="md" color="#00D4FF" fontWeight="800" textTransform="uppercase">
                                            {level}
                                        </Text>
                                    </HStack>
                                </Box>

                                <Button
                                    h="46px"
                                    borderRadius="20px"
                                    bg="#00D4FF"
                                    color="#fff"
                                    fontWeight="800"
                                    _hover={{ bg: '#00b8dc' }}
                                    onClick={spinDemo}
                                    isDisabled={isSpinning}
                                    isLoading={isSpinning}
                                >
                                    BET
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="game" display="flex" flexDirection="column" minH="0">
                    <Card
                        pt="24px"
                        pb="18px"
                        px="20px"
                        minH="500px"
                        h="100%"
                        display="flex"
                        flexDirection="column"
                        flex="1"
                        overflow="visible"
                        position="relative"
                    >
                        <CardBody
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            flex="1"
                            minH="0"
                            position="relative"
                        >
                            <HStack w="100%" justify="space-between" px={{ base: 0, md: 4 }} mb={3}>
                                <Box>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)">
                                        Bet
                                    </Text>
                                    <Text fontSize="xl" color="#fff" fontWeight="800">
                                        {clampBetAmount(amount).toFixed(2)}
                                    </Text>
                                </Box>
                                <Box textAlign="right">
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)">
                                        Level
                                    </Text>
                                    <Text fontSize="xl" color="#00D4FF" fontWeight="800" textTransform="uppercase">
                                        {level}
                                    </Text>
                                </Box>
                            </HStack>

                            <Box
                                position="relative"
                                w={{ base: '300px', md: '430px' }}
                                h={{ base: '300px', md: '430px' }}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                {/* Outer aura for a more fantastic look */}
                                <MotionBox
                                    position="absolute"
                                    inset={{ base: '-8px', md: '-12px' }}
                                    borderRadius="full"
                                    pointerEvents="none"
                                    bg="radial-gradient(circle at 50% 38%, rgba(0,212,255,0.2) 0%, rgba(92,155,255,0.12) 38%, transparent 72%)"
                                    animate={{ scale: [1, 1.02, 1], opacity: [0.8, 1, 0.8] }}
                                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                    zIndex={1}
                                />

                                {/* Pointer */}
                                <Box
                                    position="absolute"
                                    top={{ base: '-6px', md: '-10px' }}
                                    left="50%"
                                    transform="translateX(-50%)"
                                    zIndex={5}
                                    w={{ base: '26px', md: '32px' }}
                                    h={{ base: '26px', md: '32px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(160deg, #ff7f9f 0%, #ec5c74 45%, #c93f5f 100%)"
                                    border="2px solid rgba(255,255,255,0.7)"
                                    boxShadow="0 8px 16px rgba(236,92,116,0.45), 0 0 14px rgba(255,147,174,0.4)"
                                />
                                <Box
                                    position="absolute"
                                    top={{ base: '18px', md: '20px' }}
                                    left="50%"
                                    transform="translateX(-50%)"
                                    zIndex={5}
                                    width="0"
                                    height="0"
                                    borderLeft={{ base: '11px solid transparent', md: '13px solid transparent' }}
                                    borderRight={{ base: '11px solid transparent', md: '13px solid transparent' }}
                                    borderTop={{ base: '22px solid #ec5c74', md: '24px solid #ec5c74' }}
                                    filter="drop-shadow(0 4px 6px rgba(0,0,0,0.35))"
                                />

                                <motion.div
                                    animate={wheelControls}
                                    initial={false}
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        transformOrigin: 'center center',
                                        background: ringGradient,
                                        border: `10px solid ${LEVEL_CONFIG[level].edgeColor}`,
                                        boxShadow:
                                            '0 24px 46px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.2), 0 0 24px rgba(74,140,255,0.25)',
                                    }}
                                >
                                    {/* Segment separators (clear distinction between each segment) */}
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        borderRadius="full"
                                        bg={separatorGradient}
                                        pointerEvents="none"
                                        zIndex={2}
                                    />

                                    {/* Gloss ring */}
                                    <Box
                                        position="absolute"
                                        inset="3px"
                                        borderRadius="full"
                                        pointerEvents="none"
                                        bg="radial-gradient(circle at 50% 18%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)"
                                        zIndex={3}
                                    />

                                    <Box
                                        position="absolute"
                                        inset={{ base: '24px', md: '28px' }}
                                        borderRadius="full"
                                        bg="repeating-conic-gradient(from -90deg, #31393f 0deg 12deg, #3a4348 12deg 24deg)"
                                        boxShadow="inset 0 0 0 7px rgba(255,255,255,0.05), inset 0 16px 28px rgba(0,0,0,0.18)"
                                    />
                                    <Box
                                        position="absolute"
                                        left="50%"
                                        top="50%"
                                        transform="translate(-50%, -50%)"
                                        w={{ base: '110px', md: '130px' }}
                                        h={{ base: '110px', md: '130px' }}
                                        borderRadius="full"
                                        bg="#343c41"
                                        boxShadow="inset 0 0 0 7px rgba(255,255,255,0.05)"
                                    />
                                </motion.div>
                            </Box>

                            <HStack spacing="8px" mt={5} flexWrap="wrap" justify="center">
                                {payoutLegend.map((p) => (
                                    <Box
                                        key={`${level}-${p.label}`}
                                        minW={{ base: '88px', md: '98px' }}
                                        px={{ base: 3, md: 4 }}
                                        py={2}
                                        borderRadius="10px"
                                        bg="#3b4348"
                                        borderBottom="4px solid"
                                        borderColor={p.color}
                                    >
                                        <Text color="#fff" fontWeight="800" fontSize={{ base: '26px', md: '30px' }} textAlign="center">
                                            {p.label}
                                        </Text>
                                    </Box>
                                ))}
                            </HStack>

                            <AnimatePresence>
                                {showWinFxOverlay && spinOutcome && (
                                    <motion.div
                                        key={`wheel-win-${winEffectKey}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.28 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            zIndex: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '56px 12px 88px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            inset={0}
                                            bg="linear-gradient(165deg, rgba(0,48,58,0.58) 0%, rgba(0,0,0,0.74) 48%, rgba(18,12,8,0.68) 100%)"
                                            backdropFilter="blur(10px)"
                                            sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                        />
                                        <motion.div
                                            aria-hidden
                                            initial={{ opacity: 0, scale: 0.86 }}
                                            animate={{ opacity: 0.45, scale: 1 }}
                                            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                                            style={{
                                                position: 'absolute',
                                                width: 'min(400px, 88vw)',
                                                height: 'min(400px, 88vw)',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(0, 212, 255, 0.2)',
                                                boxShadow:
                                                    '0 0 72px rgba(0, 212, 255, 0.14), inset 0 0 48px rgba(0, 212, 255, 0.06)',
                                            }}
                                        />
                                        <motion.div
                                            aria-hidden
                                            animate={{ scale: [1, 1.035, 1], opacity: [0.22, 0.38, 0.22] }}
                                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                            style={{
                                                position: 'absolute',
                                                width: 'min(340px, 82vw)',
                                                height: 'min(340px, 82vw)',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(250, 204, 21, 0.14)',
                                            }}
                                        />
                                        {wheelWinConfetti.map((c) => (
                                            <motion.div
                                                key={`${winEffectKey}-wc-${c.i}`}
                                                initial={{ opacity: 0, y: -18, rotate: c.rot, scale: 0.55 }}
                                                animate={{
                                                    opacity: [0, 1, 0.85, 0],
                                                    y: 200,
                                                    x: c.drift,
                                                    rotate: c.rot + 200,
                                                    scale: 1,
                                                }}
                                                transition={{
                                                    duration: c.duration,
                                                    delay: c.delay,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${c.leftPct}%`,
                                                    top: '18%',
                                                    width: c.size,
                                                    height: c.size * 1.35,
                                                    borderRadius: 3,
                                                    background: `hsl(${c.hue} 85% 58%)`,
                                                    boxShadow: `0 0 12px hsla(${c.hue},90%,55%,0.45)`,
                                                }}
                                            />
                                        ))}
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 12 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                            style={{ position: 'relative', maxWidth: 'min(340px, 92vw)', width: '100%' }}
                                        >
                                            <Box
                                                borderRadius="22px"
                                                border="1px solid rgba(0, 212, 255, 0.28)"
                                                bg="rgba(10, 18, 24, 0.55)"
                                                backdropFilter="blur(20px)"
                                                sx={{ WebkitBackdropFilter: 'blur(20px)' }}
                                                boxShadow="0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
                                                px={{ base: 6, md: 8 }}
                                                py={{ base: 7, md: 8 }}
                                                textAlign="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    letterSpacing="0.28em"
                                                    color="rgba(0, 212, 255, 0.85)"
                                                    mb={3}
                                                >
                                                    WHEEL WIN
                                                </Text>
                                                <Box color="#00D4FF" mb={3} display="flex" justifyContent="center">
                                                    <AttractionsIcon sx={{ fontSize: 56, opacity: 0.95 }} />
                                                </Box>
                                                <Text
                                                    fontSize={{ base: '38px', md: '44px' }}
                                                    fontWeight="900"
                                                    lineHeight="1"
                                                    letterSpacing="-0.03em"
                                                    bgGradient="linear(to-br, #ffffff, #7aebff, #fef08a)"
                                                    bgClip="text"
                                                    sx={{
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                    }}
                                                    mb={1}
                                                >
                                                    {formatMultiplierLabel(spinOutcome.multiplier)}
                                                </Text>
                                                <Text fontSize="sm" color="rgba(255,255,255,0.5)" mb={2}>
                                                    Multiplier hit
                                                </Text>
                                                <Text fontSize="2xl" fontWeight="800" color="#4ade80">
                                                    +${Number(spinOutcome.payout).toFixed(2)}
                                                </Text>
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {showLossFxOverlay && spinOutcome && (
                                    <motion.div
                                        key={`wheel-loss-${lossEffectKey}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.32 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            zIndex: 27,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '56px 12px 88px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            inset={0}
                                            bg="linear-gradient(198deg, rgba(15, 23, 42, 0.64) 0%, rgba(18, 16, 28, 0.8) 52%, rgba(35, 22, 40, 0.72) 100%)"
                                            backdropFilter="blur(10px)"
                                            sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                        />
                                        {wheelLossParticles.map((p) => (
                                            <motion.div
                                                key={`${lossEffectKey}-wl-${p.i}`}
                                                initial={{ opacity: 0, y: `${p.y0}%` }}
                                                animate={{ opacity: [0, p.opacity, 0], y: ['8%', '108%'] }}
                                                transition={{
                                                    duration: p.duration,
                                                    delay: p.delay,
                                                    repeat: Infinity,
                                                    ease: 'linear',
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${p.leftPct}%`,
                                                    top: 0,
                                                    width: `${p.w}px`,
                                                    height: `${p.w * 4}px`,
                                                    borderRadius: '999px',
                                                    background:
                                                        'linear-gradient(180deg, rgba(148, 163, 184, 0.32) 0%, transparent 100%)',
                                                }}
                                            />
                                        ))}
                                        <motion.div
                                            initial={{ opacity: 0, y: 18 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 280, damping: 30, delay: 0.06 }}
                                            style={{ position: 'relative', maxWidth: 'min(320px, 90vw)', width: '100%' }}
                                        >
                                            <Box
                                                borderRadius="20px"
                                                border="1px solid rgba(148, 163, 184, 0.24)"
                                                bg="rgba(15, 18, 28, 0.52)"
                                                backdropFilter="blur(18px)"
                                                sx={{ WebkitBackdropFilter: 'blur(18px)' }}
                                                boxShadow="0 20px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.05)"
                                                px={{ base: 5, md: 7 }}
                                                py={{ base: 6, md: 7 }}
                                                textAlign="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    letterSpacing="0.3em"
                                                    color="rgba(148, 163, 184, 0.9)"
                                                    mb={3}
                                                >
                                                    ROUND COMPLETE
                                                </Text>
                                                <Text
                                                    fontSize={{ base: '22px', md: '26px' }}
                                                    fontWeight="800"
                                                    color="rgba(248, 250, 252, 0.95)"
                                                    lineHeight="1.35"
                                                    mb={2}
                                                >
                                                    Stopped on{' '}
                                                    <Text as="span" color="#94a3b8">
                                                        {formatMultiplierLabel(spinOutcome.multiplier)}
                                                    </Text>
                                                </Text>
                                                <Text fontSize="sm" color="rgba(148, 163, 184, 0.88)" lineHeight="1.55">
                                                    No payout this spin — try again when you are ready.
                                                </Text>
                                                <Box
                                                    mt={4}
                                                    h="2px"
                                                    w="44px"
                                                    mx="auto"
                                                    borderRadius="full"
                                                    bg="linear-gradient(90deg, transparent, rgba(148,163,184,0.45), transparent)"
                                                />
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="live" display="flex" flexDirection="column" minH="0">
                    <RealTimeHistory />
                </GridItem>
            </Grid>
            <WheelHistory />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                        How to Play Wheel
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                Spin the wheel and test your luck!
                                </Text>
                                <Text mb={1}>
                                     -Choose your bet amount and difficulty level, then hit BET to start.
                                </Text>
                                <Text mb={1}>
                                     -The wheel will spin and land on a multiplier.
                                </Text>
                                <Text mb={1}>
                                     -Win rewards based on where it stops — or lose your bet if it hits 0.00x.
                                </Text>
                                <Text mb={1}>
                                     - Higher levels offer bigger rewards but lower chances of winning.
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
