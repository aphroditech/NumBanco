import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    Image,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PercentIcon from '@mui/icons-material/Percent';
import { AnimatePresence, motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import History from './RangeItem/History';
import RealView from './RangeItem/RealView';

import keyboard from 'assets/img/Range/keyboard.jpg';
import Hexagon from 'assets/img/Range/hexagon.png';

import { toast } from "react-toastify";
import { rangeBet } from 'action/RangeActions';
import { useHistory } from 'react-router-dom';

const MotionBox = motion(Box);

/** bc.game-style palette */
const C = {
    bg: '#2a2d2e',
    bgElevated: '#363a40',
    bgInput: '#3a3e44',
    green: '#47e17d',
    orange: '#f5a623',
    orangeDeep: '#e8940a',
    greenDeep: '#3bc96f',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.55)',
    border: 'rgba(255,255,255,0.08)',
    cyan: '#00D4FF',
    cyanMuted: 'rgba(0, 212, 255, 0.35)',
    stageDeep: '#0a0e14',
};

const RANGE_MIN = 0;
const RANGE_MAX = 100;
/** Minimum width of the win band (user must select at least this span). */
const MIN_SPAN = 1;
const MAX_SPAN = 95;


/** Match Snakes bet clamp for panel parity */
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;

const TRACK_H = 26;
const HANDLE_W = 16;
const HANDLE_H = 36;
const BET_EFFECT_MS = 800;

/** Slight house edge so multiplier × win% ≈ ~1 net */
const HOUSE_FACTOR = 0.97;

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function clampBetAmount(raw, maxBal) {
    const n = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n)) return MIN_AMOUNT;
    const fixed = Math.round(n * 100) / 100;
    return Math.max(MIN_AMOUNT, Math.min(Math.min(MAX_AMOUNT, maxBal || MAX_AMOUNT), fixed));
}

const RANGE_MODE = {
    range: { key: 'range', label: 'RANGE' },
    single: { key: 'single', label: 'SINGLE' },
};

/**
 * Dual handle 0–100, span in [MIN_SPAN, MAX_SPAN]. Green = win band, orange = lose (bc.game style).
 */
function RangeDualSlider({ value, onChange, targetValue, targetWin }) {
    const [minV, maxV] = value;
    const trackRef = useRef(null);
    const draggingRef = useRef(null);

    const setMinFromPointer = useCallback(
        (clientX) => {
            const el = trackRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const pct = clamp(((clientX - r.left) / r.width) * 100, RANGE_MIN, RANGE_MAX);
            const rounded = Math.round(pct);
            let m = clamp(rounded, RANGE_MIN, maxV);
            if (m > maxV - MIN_SPAN) m = maxV - MIN_SPAN;
            m = clamp(m, RANGE_MIN, RANGE_MAX);
            let M = maxV;
            if (M - m < MIN_SPAN) M = clamp(m + MIN_SPAN, m, RANGE_MAX);
            if (M - m > MAX_SPAN) M = clamp(m + MAX_SPAN, m, RANGE_MAX);
            onChange([m, M]);
        },
        [maxV, onChange],
    );

    const setMaxFromPointer = useCallback(
        (clientX) => {
            const el = trackRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const pct = clamp(((clientX - r.left) / r.width) * 100, RANGE_MIN, RANGE_MAX);
            const rounded = Math.round(pct);
            let M = clamp(rounded, minV, RANGE_MAX);
            if (M < minV + MIN_SPAN) M = minV + MIN_SPAN;
            M = clamp(M, RANGE_MIN, RANGE_MAX);
            let m = minV;
            if (M - m < MIN_SPAN) m = clamp(M - MIN_SPAN, RANGE_MIN, M);
            if (M - m > MAX_SPAN) m = clamp(M - MAX_SPAN, RANGE_MIN, M);
            onChange([m, M]);
        },
        [minV, onChange],
    );

    useEffect(() => {
        const onMove = (e) => {
            const which = draggingRef.current;
            if (!which) return;
            const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
            if (x == null) return;
            if (which === 'min') setMinFromPointer(x);
            else setMaxFromPointer(x);
        };
        const onUp = () => {
            draggingRef.current = null;
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [setMinFromPointer, setMaxFromPointer]);

    const startDrag = (which) => (e) => {
        e.preventDefault();
        draggingRef.current = which;
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        const x = e.clientX;
        if (which === 'min') setMinFromPointer(x);
        else setMaxFromPointer(x);
    };

    const midpoint = useMemo(() => (minV + maxV) / 2, [minV, maxV]);
    // When the round hasn't started yet, fall back to the selected band center.
    const pointerValue = targetValue == null ? midpoint : targetValue;
    const pointerPct = clamp(pointerValue, RANGE_MIN, RANGE_MAX);
    const arrowColor =
        targetWin == null ? C.cyan : targetWin ? C.green : C.orange;
    const arrowGlow =
        targetWin == null ? C.cyanMuted : targetWin ? 'rgba(71,225,125,0.35)' : 'rgba(245,166,35,0.35)';
    const hexNumberColor =
        targetWin == null ? 'rgba(255,255,255,0.95)' : targetWin ? C.green : '#f5e10c';

    return (
        <Flex direction="column" align="center" w="100%" maxW="600px" mx="auto" gap={6} position="relative" zIndex={1} pt="62px">
            {/* Random target hex (moves when BET is pressed) */}
            <Box
                position="absolute"
                top="0px"
                left={`${pointerPct}%`}
                transform="translateX(-50%)"
                transition="left 650ms cubic-bezier(0.2, 0.9, 0.2, 1)"
                pointerEvents="none"
                zIndex={5}
            >
                <Box
                    w="80px"
                    h="72px"
                    bgImage={`url(${Hexagon})`}
                    bgRepeat="no-repeat"
                    bgPosition="center"
                    bgSize="contain"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Text
                        fontSize="20px"
                        fontWeight="900"
                        color={hexNumberColor}
                        letterSpacing="-0.02em"
                        fontfeaturesettings="'tnum'"
                        textShadow={`0 1px 0 rgba(0,0,0,0.55), 0 0 12px ${arrowGlow}`}
                    >
                        {pointerValue.toFixed(2)}
                    </Text>
                </Box>
            </Box>

            <Box w="100%" userSelect="none">
                <Flex justify="space-between" align="flex-end" mb={2} px={`${HANDLE_W / 2 + 4}px`}>
                    {[0, 25, 50, 75, 100].map((n) => (
                        <Flex key={n} direction="column" align="center" w="40px">
                            <Box
                                w="2px"
                                h={n === 50 ? '14px' : '8px'}
                                borderRadius="full"
                                bg={n === 50 ? C.cyan : 'rgba(255,255,255,0.2)'}
                                boxShadow={n === 50 ? `0 0 12px ${C.cyanMuted}` : 'none'}
                                mb={1}
                            />
                            <Text
                                fontSize="xs"
                                fontWeight="700"
                                color={n === 50 ? 'white' : C.textMuted}
                                fontfeaturesettings="'tnum'"
                            >
                                {n}
                            </Text>
                        </Flex>
                    ))}
                </Flex>

                <Box position="relative" w="100%" pl={`${HANDLE_W / 2}px`} pr={`${HANDLE_W / 2}px`}>
                    <Box
                        borderRadius="full"
                        p="4px"
                        bg="linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.35) 100%)"
                        boxShadow="0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)"
                    >
                        <Box
                            ref={trackRef}
                            position="relative"
                            w="100%"
                            h={`${TRACK_H}px`}
                            borderRadius="full"
                            bg="#080c11"
                            overflow="hidden"
                            boxShadow="inset 0 3px 12px rgba(0,0,0,0.65)"
                        >
                            <Box
                                position="absolute"
                                left={0}
                                top={0}
                                bottom={0}
                                w={`${minV}%`}
                                borderTopLeftRadius="full"
                                borderBottomLeftRadius="full"
                                bg={`linear-gradient(180deg, ${C.orange} 0%, ${C.orangeDeep} 100%)`}
                                boxShadow="inset 0 1px 0 rgba(255,255,255,0.25)"
                                pointerEvents="none"
                            />
                            <Box
                                position="absolute"
                                left={`${minV}%`}
                                top={0}
                                bottom={0}
                                w={`${maxV - minV}%`}
                                bg={`linear-gradient(180deg, ${C.green} 0%, ${C.greenDeep} 100%)`}
                                boxShadow="inset 0 1px 0 rgba(255,255,255,0.3), 0 0 24px rgba(71, 225, 125, 0.15)"
                                pointerEvents="none"
                                sx={{
                                    '@keyframes rangeShine': {
                                        '0%': { backgroundPosition: '0% 50%' },
                                        '100%': { backgroundPosition: '200% 50%' },
                                    },
                                    backgroundImage: `linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 45%, transparent 90%), linear-gradient(180deg, ${C.green} 0%, ${C.greenDeep} 100%)`,
                                    backgroundSize: '200% 100%, 100% 100%',
                                    animation: 'rangeShine 5s ease-in-out infinite',
                                }}
                            />
                            <Box
                                position="absolute"
                                left={`${maxV}%`}
                                right={0}
                                top={0}
                                bottom={0}
                                borderTopRightRadius="full"
                                borderBottomRightRadius="full"
                                bg={`linear-gradient(180deg, ${C.orange} 0%, ${C.orangeDeep} 100%)`}
                                boxShadow="inset 0 1px 0 rgba(255,255,255,0.25)"
                                pointerEvents="none"
                            />
                            <Box
                                position="absolute"
                                left={`${pointerPct}%`}
                                top="-4px"
                                bottom="-4px"
                                w="3px"
                                ml="-1.5px"
                                bg={`linear-gradient(180deg, ${arrowColor} 0%, rgba(0,0,0,0) 140%)`}
                                borderRadius="full"
                                pointerEvents="none"
                                zIndex={1}
                                boxShadow={`0 0 16px ${arrowGlow}`}
                            />
                        </Box>
                    </Box>

                    <Box
                        position="absolute"
                        left={`${HANDLE_W / 2}px`}
                        right={`${HANDLE_W / 2}px`}
                        top="50%"
                        transform="translateY(-50%)"
                        h={`${HANDLE_H}px`}
                        pointerEvents="none"
                    >
                        <Box
                            position="absolute"
                            left={`${minV}%`}
                            top="50%"
                            transform="translate(-50%, -50%)"
                            w={`${HANDLE_W}px`}
                            h={`${HANDLE_H}px`}
                            borderRadius="8px"
                            bg="linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)"
                            border="1px solid rgba(255,255,255,0.95)"
                            boxShadow={`0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 #fff, 0 0 0 1px rgba(0,212,255,0.35)`}
                            cursor="grab"
                            zIndex={3}
                            pointerEvents="auto"
                            transition="box-shadow 0.2s, transform 0.15s"
                            _hover={{
                                boxShadow: `0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 #fff, 0 0 0 2px ${C.cyan}`,
                                transform: 'translate(-50%, -50%) scale(1.04)',
                            }}
                            _active={{ cursor: 'grabbing', transform: 'translate(-50%, -50%) scale(0.98)' }}
                            onPointerDown={startDrag('min')}
                        />
                        <Box
                            position="absolute"
                            left={`${maxV}%`}
                            top="50%"
                            transform="translate(-50%, -50%)"
                            w={`${HANDLE_W}px`}
                            h={`${HANDLE_H}px`}
                            borderRadius="8px"
                            bg="linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)"
                            border="1px solid rgba(255,255,255,0.95)"
                            boxShadow={`0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 #fff, 0 0 0 1px rgba(0,212,255,0.35)`}
                            cursor="grab"
                            zIndex={3}
                            pointerEvents="auto"
                            transition="box-shadow 0.2s, transform 0.15s"
                            _hover={{
                                boxShadow: `0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 #fff, 0 0 0 2px ${C.cyan}`,
                                transform: 'translate(-50%, -50%) scale(1.04)',
                            }}
                            _active={{ cursor: 'grabbing', transform: 'translate(-50%, -50%) scale(0.98)' }}
                            onPointerDown={startDrag('max')}
                        />
                    </Box>
                </Box>

                <Flex mt={4} align="center" gap={2} flexWrap="wrap" justify="center" px={`${HANDLE_W / 2}px`}>
                    <HStack
                        spacing={2}
                        px={4}
                        py={2}
                        borderRadius="full"
                        bg="rgba(0, 212, 255, 0.1)"
                        border="1px solid rgba(0, 212, 255, 0.25)"
                    >
                        <Text
                            fontSize="xs"
                            fontWeight="700"
                            color={C.textMuted}
                            textTransform="uppercase"
                            letterSpacing="0.08em"
                        >
                            Win band
                        </Text>
                        <Text fontSize="sm" fontWeight="800" color="white" fontfeaturesettings="'tnum'">
                            {minV} — {maxV}
                        </Text>
                    </HStack>
                </Flex>
            </Box>
        </Flex>
    );
}

export default function RangePage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance || MAX_AMOUNT));

    const [range, setRange] = useState([25, 75]);
    const [amount, setAmount] = useState('0.50');
    const [rangeType, setRangeType] = useState('range');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [targetValue, setTargetValue] = useState(null);
    const [targetWin, setTargetWin] = useState(null);
    const [isBetting, setIsBetting] = useState(false);
    const [isAutoBetting, setIsAutoBetting] = useState(false);
    /** 'win' | 'lose' | null — short full-screen effect after server `result.isWin` */
    const [outcomeOverlay, setOutcomeOverlay] = useState(null);
    const [outcomeKey, setOutcomeKey] = useState(0);

    /** Panel controls match Snakes (always editable until you wire game phases). */
    const canBet = true;

    const [minV, maxV] = range;
    const span = maxV - minV;

    const winChancePct = useMemo(() => {
        if (span <= 0) return 0;
        return (span / (RANGE_MAX - RANGE_MIN)) * 100;
    }, [span]);

    const payoutMult = useMemo(() => {
        if (span <= 0) return 0;
        return (100 / span) * HOUSE_FACTOR;
    }, [span]);

    const amountNum = useMemo(
        () => clampBetAmount(amount, maxAmount),
        [amount, maxAmount],
    );
    const winPreview = useMemo(() => amountNum * payoutMult, [amountNum, payoutMult]);

    const handleAmountChange = (e) => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(v);
    };

    const handleAmountBlur = () => {
        setAmount(clampBetAmount(amount, maxAmount).toFixed(2));
    };

    const handleHalfAmount = useCallback(() => {
        if (!canBet) return;
        const current = parseFloat(amount || String(MIN_AMOUNT));
        const base = Number.isFinite(current) ? current : MIN_AMOUNT;
        setAmount(Math.max(MIN_AMOUNT, base / 2).toFixed(2));
    }, [amount, canBet]);

    const handleDoubleAmount = useCallback(() => {
        if (!canBet) return;
        const current = parseFloat(amount || String(MIN_AMOUNT));
        const base = Number.isFinite(current) ? current : MIN_AMOUNT;
        const next = Math.min(maxAmount, base * 2);
        setAmount(next.toFixed(2));
    }, [amount, canBet, maxAmount]);

    const toggleAutoBet = useCallback(() => {
        if (!canBet) return;
        if (isBetting && !isAutoBetting) return;
        setIsAutoBetting((prev) => !prev);
    }, [canBet, isAutoBetting, isBetting]);

    const handleBet = useCallback(async (opts = {}) => {
        const { auto = false } = opts;
        if (isBetting) return;

        if (Number(amountNum) > balance || Number(amountNum) < MIN_AMOUNT) {
            toast.error("Insufficient balance");
            if (auto) setIsAutoBetting(false);
            return;
        }
        setIsBetting(true);

        const data = {
            betAmount: parseFloat(amountNum),
            chance: winChancePct,
            multiplier: parseFloat(payoutMult),
            min: parseInt(minV),
            max: parseInt(maxV),
        };
        try {
            const result = await rangeBet(data, history, dispatch);
            if (!result) return;
            setTargetValue(result.result);
            setTargetWin(Boolean(result.isWin));
            setOutcomeKey((k) => k + 1);
            setOutcomeOverlay(result.isWin ? 'win' : 'lose');
            window.setTimeout(() => setOutcomeOverlay(null), BET_EFFECT_MS);
        } finally {
            setIsBetting(false);
        }
    }, [amountNum, balance, dispatch, history, isBetting, maxV, minV, payoutMult, winChancePct]);

    useEffect(() => {
        if (!isAutoBetting || isBetting) return undefined;
        const timerId = window.setTimeout(() => {
            handleBet({ auto: true });
        }, BET_EFFECT_MS);
        return () => window.clearTimeout(timerId);
    }, [handleBet, isAutoBetting, isBetting]);

    useEffect(() => {
        const onKeyDown = (e) => {
            const target = e.target;
            const tagName = target?.tagName?.toLowerCase();
            const isTypingField =
                tagName === 'input' ||
                tagName === 'textarea' ||
                target?.isContentEditable;
            if (isTypingField || isHelpModalOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                handleHalfAmount();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                handleDoubleAmount();
                return;
            }
            if (e.shiftKey && e.code === 'Space') {
                e.preventDefault();
                toggleAutoBet();
            }
            if (e.keyCode === 32 || e.code === 'Space') {
                if (e.repeat) return;
                if (canBet) {
                    e.preventDefault();
                    handleBet();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleDoubleAmount, handleHalfAmount, isHelpModalOpen, toggleAutoBet]);

    return (
        <Box
            px={{ base: '16px', md: '24px' }}
            minH="100vh"
            bg="transparent"
            marginTop="100px"
            w="100%"
            maxW="100%"
            position="relative"
        >
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel game" "empty empty"',
                    '1550px': '"panel game empty"',
                }}
                templateColumns={{
                    sm: '1fr',
                    md: 'minmax(300px, 380px) 1fr',
                    '1550px': 'minmax(300px, 380px) minmax(0, 1fr) minmax(260px, 320px)',
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto',
                }}
                gap={{ base: '16px', md: '20px' }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem
                    area="panel"
                    minW={{ base: 0, md: 0, '1550px': 'min(100%, 320px)' }}
                    display="flex"
                    flexDirection="column"
                    minH={0}
                >
                    <Card
                        pt={{ base: '22px', md: '30px' }}
                        pb={{ base: '18px', md: '22px' }}
                        px={{ base: '16px', md: '22px' }}
                        overflow="visible"
                        h="100%"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        <CardBody
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="flex-start"
                            flex="1"
                            minH={0}
                            position="relative"
                            p={0}
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
                            <VStack spacing="20px" align="stretch" w="100%" maxW={{ base: '100%', sm: '320px' }} mx="auto">
                                <Box display="flex" alignItems="center" gap="8px">
                                    <WhatshotIcon style={{ fontSize: 22, color: '#00D4FF' }} />
                                    <Text fontSize="sm" color="#fff" fontWeight="700">
                                        Range
                                    </Text>
                                </Box>

                                <FormControl w="100%">
                                    <Flex justify="space-between" align="baseline" mb="8px" gap="8px">
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" m={0}>
                                            Bet Amount
                                        </FormLabel>
                                        <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                            ${balance.toFixed(2)}
                                        </Text>
                                    </Flex>
                                    <GradientBorder borderRadius="24px" w="100%">
                                        <Flex
                                            w="100%"
                                            align="center"
                                            justify="space-between"
                                            bg="#323738"
                                            borderRadius="22px"
                                            h="48px"
                                            pl="12px"
                                            pr="0"
                                            overflow="hidden"
                                            border="1px solid rgba(255,255,255,0.08)"
                                        >
                                            <Input
                                                bg="transparent"
                                                border="none"
                                                fontSize="md"
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
                                                isDisabled={!canBet}
                                            />
                                            <HStack spacing="8px" pr="10px" flexShrink={0}>
                                                <HStack spacing="0" align="stretch" h="48px">
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
                                                        isDisabled={!canBet}
                                                        onClick={handleHalfAmount}
                                                    >
                                                        ½
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
                                                        isDisabled={!canBet}
                                                        onClick={handleDoubleAmount}
                                                    >
                                                        2×
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
                                                        isDisabled={!canBet}
                                                        onClick={() => setAmount(maxAmount.toFixed(2))}
                                                    >
                                                        Max
                                                    </Button>
                                                </HStack>
                                            </HStack>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                <Box mt={5}>
                                    <Flex justify="space-between" align="baseline" mb="8px">
                                        <Text fontSize="sm" color="#fff" fontWeight="700">
                                            Current multiplier
                                        </Text>
                                        <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                            ${winPreview.toFixed(2)} payout
                                        </Text>
                                    </Flex>
                                    <GradientBorder borderRadius="24px" w="100%">
                                        <Flex
                                            w="100%"
                                            align="center"
                                            justify="space-between"
                                            bg="#323738"
                                            borderRadius="22px"
                                            h="48px"
                                            pl="16px"
                                            pr="12px"
                                            border="1px solid rgba(255,255,255,0.08)"
                                        >
                                            <Text fontSize="md" fontWeight="bold" color="rgba(255,255,255,0.9)">
                                                {payoutMult.toFixed(4)}×
                                            </Text>
                                        </Flex>
                                    </GradientBorder>
                                </Box>

                                <VStack spacing="10px" w="100%">
                                    <Button
                                        h="46px"
                                        mt={5}
                                        borderRadius="20px"
                                        bg="#00D4FF"
                                        color="#fff"
                                        fontWeight="800"
                                        w="100%"
                                        _hover={{ bg: '#00b8dc' }}
                                        isDisabled={!canBet || isBetting}
                                        onClick={handleBet}
                                    >
                                        {isBetting ? 'BETTING...' : 'BET'}
                                    </Button>
                                    <Button
                                        h="44px"
                                        borderRadius="18px"
                                        bg={isAutoBetting ? '#f5a623' : 'rgba(0,212,255,0.18)'}
                                        color="#fff"
                                        fontWeight="800"
                                        w="100%"
                                        border="1px solid rgba(255,255,255,0.2)"
                                        _hover={{
                                            bg: isAutoBetting ? '#e8940a' : 'rgba(0,212,255,0.3)',
                                        }}
                                        isDisabled={!canBet || (isBetting && !isAutoBetting)}
                                        onClick={toggleAutoBet}
                                    >
                                        {isAutoBetting ? 'STOP' : 'AUTO BET'}
                                    </Button>
                                </VStack>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* Main game */}
                <GridItem area="game" display="flex" flexDirection="column" minH={0} minW={0}>
                    <Card
                        position="relative"
                        pt={{ base: '22px', md: '28px' }}
                        pb={{ base: '22px', md: '28px' }}
                        px={{ base: 4, md: 6 }}
                        h="100%"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        w="100%"
                        bg={C.stageDeep}
                        borderRadius="20px"
                        border={`1px solid ${C.border}`}
                        boxShadow="0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
                        overflow="hidden"
                        sx={{
                            backgroundImage: `
                        radial-gradient(ellipse 120% 80% at 50% -20%, rgba(0, 212, 255, 0.18) 0%, transparent 55%),
                        radial-gradient(ellipse 90% 60% at 80% 100%, rgba(71, 225, 125, 0.12) 0%, transparent 45%),
                        radial-gradient(ellipse 70% 50% at 10% 90%, rgba(245, 166, 35, 0.1) 0%, transparent 40%),
                        linear-gradient(180deg, #0d1218 0%, #070b0f 100%)
                    `,
                        }}
                    >
                        <Box
                            position="absolute"
                            inset={0}
                            opacity={0.04}
                            pointerEvents="none"
                            zIndex={0}
                            bgImage="linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)"
                            bgSize="24px 24px"
                        />
                        <AnimatePresence>
                            {outcomeOverlay === 'win' && (
                                <motion.div
                                    key={`range-win-${outcomeKey}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 20,
                                    }}
                                >
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        borderRadius="20px"
                                        bg="linear-gradient(165deg, rgba(30,120,70,0.5) 0%, rgba(0,55,58,0.35) 45%, rgba(8,10,16,0.65) 100%)"
                                        sx={{ backdropFilter: 'blur(6px)' }}
                                    />
                                    <MotionBox
                                        position="absolute"
                                        w="min(260px, 78%)"
                                        h="min(260px, 55%)"
                                        maxW="320px"
                                        maxH="320px"
                                        borderRadius="full"
                                        border="2px solid rgba(71, 225, 125, 0.35)"
                                        boxShadow="0 0 90px rgba(71, 225, 125, 0.28), inset 0 0 60px rgba(0, 212, 255, 0.06)"
                                        animate={{ scale: [1, 1.04, 1], opacity: [0.8, 1, 0.85] }}
                                        transition={{ duration: 0.55, ease: 'easeInOut' }}
                                    />
                                    {Array.from({ length: 28 }).map((_, i) => {
                                        const a = (i / 28) * Math.PI * 2;
                                        const d = 56 + (i % 6) * 10;
                                        return (
                                            <motion.div
                                                key={`w-${outcomeKey}-${i}`}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{
                                                    opacity: [0, 1, 0],
                                                    x: Math.cos(a) * d,
                                                    y: Math.sin(a) * d,
                                                    scale: [0, 1.15, 0.35],
                                                }}
                                                transition={{
                                                    duration: 0.32,
                                                    delay: i * 0.01,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    top: '45%',
                                                    width: 8,
                                                    height: 8,
                                                    marginLeft: -4,
                                                    marginTop: -4,
                                                    borderRadius: 999,
                                                    background: i % 3 === 0 ? '#47e17d' : i % 3 === 1 ? '#00D4FF' : '#ffffff',
                                                    boxShadow: '0 0 14px rgba(255,255,255,0.45)',
                                                }}
                                            />
                                        );
                                    })}
                                    <motion.div
                                        initial={{ scale: 0.55, opacity: 0, y: 28 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                                        style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 12px' }}
                                    >
                                        <Text
                                            fontSize={{ base: '3xl', md: '5xl' }}
                                            fontWeight="900"
                                            letterSpacing="-0.04em"
                                            lineHeight="1"
                                            bgGradient="linear(to-br, #d8ffe8, #47e17d, #00D4FF)"
                                            bgClip="text"
                                            sx={{
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                filter: 'drop-shadow(0 0 28px rgba(71,225,125,0.55))',
                                            }}
                                        >
                                            WIN
                                        </Text>
                                        <Text
                                            color="rgba(255,255,255,0.92)"
                                            fontSize={{ base: 'xs', md: 'sm' }}
                                            fontWeight="700"
                                            mt={2}
                                            letterSpacing="0.12em"
                                        >
                                            IN RANGE · PAYOUT APPLIED
                                        </Text>
                                    </motion.div>
                                </motion.div>
                            )}
                            {outcomeOverlay === 'lose' && (
                                <motion.div
                                    key={`range-lose-${outcomeKey}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 20,
                                    }}
                                >
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        borderRadius="20px"
                                        bg="linear-gradient(165deg, rgba(120,55,15,0.42) 0%, rgba(35,22,12,0.55) 50%, rgba(10,10,14,0.7) 100%)"
                                        sx={{ backdropFilter: 'blur(5px)' }}
                                    />
                                    <MotionBox
                                        position="absolute"
                                        w="min(240px, 72%)"
                                        h="min(240px, 50%)"
                                        maxW="300px"
                                        maxH="300px"
                                        borderRadius="full"
                                        border="2px solid rgba(245, 166, 35, 0.28)"
                                        boxShadow="0 0 70px rgba(245, 166, 35, 0.18)"
                                        animate={{ scale: [1, 0.98, 1] }}
                                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                                    />
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <motion.div
                                            key={`l-${outcomeKey}-${i}`}
                                            initial={{ opacity: 0, y: -12 }}
                                            animate={{ opacity: [0, 0.9, 0], y: [0, 72 + i * 6] }}
                                            transition={{ duration: 0.4, delay: i * 0.03, ease: 'easeOut' }}
                                            style={{
                                                position: 'absolute',
                                                left: `${38 + i * 2.8}%`,
                                                top: '34%',
                                                width: 5,
                                                height: 5,
                                                borderRadius: 1,
                                                background: 'rgba(245, 166, 35, 0.85)',
                                                filter: 'blur(0.5px)',
                                            }}
                                        />
                                    ))}
                                    <motion.div
                                        initial={{ x: 0 }}
                                        animate={{ x: [0, -5, 5, -4, 4, 0] }}
                                        transition={{ duration: 0.28 }}
                                        style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 12px' }}
                                    >
                                        <motion.div
                                            initial={{ scale: 0.65, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                                        >
                                            <Text
                                                fontSize={{ base: '3xl', md: '5xl' }}
                                                fontWeight="900"
                                                letterSpacing="-0.03em"
                                                color="#f5e10c"
                                                lineHeight="1"
                                                sx={{
                                                    textShadow:
                                                        '0 0 32px rgba(245, 166, 35, 0.55), 0 2px 0 rgba(0,0,0,0.45)',
                                                }}
                                            >
                                                MISS
                                            </Text>
                                        </motion.div>
                                        <Text
                                            color="rgba(255,255,255,0.85)"
                                            fontSize={{ base: 'xs', md: 'sm' }}
                                            fontWeight="700"
                                            mt={2}
                                            letterSpacing="0.1em"
                                        >
                                            OUT OF RANGE · BETTER LUCK NEXT SPIN
                                        </Text>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <CardBody
                            display="flex"
                            flexDirection="column"
                            p={0}
                            flex="1"
                            minH={0}
                            gap={6}
                            position="relative"
                            zIndex={1}
                        >
                            <Box flex="1" display="flex" flexDirection="column" minH={0}>
                                <Text
                                    fontSize="xs"
                                    fontWeight="800"
                                    letterSpacing="0.18em"
                                    color={C.textMuted}
                                    textTransform="uppercase"
                                    textAlign="center"
                                >
                                    Set your range
                                </Text>
                                <Box display="flex" flexDirection="column" justifyContent="center" flex="1" minH={0}>
                                    <RangeDualSlider
                                        value={range}
                                        onChange={setRange}
                                        targetValue={targetValue}
                                        targetWin={targetWin}
                                    />
                                </Box>
                            </Box>

                            <Flex gap={4} flexWrap={{ base: 'wrap', md: 'nowrap' }} align="stretch">
                                <Box
                                    flex="1"
                                    minW="140px"
                                    borderRadius="16px"
                                    p={5}
                                    position="relative"
                                    overflow="hidden"
                                    border={`1px solid ${C.border}`}
                                    bg="rgba(0,0,0,0.22)"
                                    backdropFilter="blur(10px)"
                                    boxShadow="inset 0 1px 0 rgba(255,255,255,0.06)"
                                    _before={{
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        w: '4px',
                                        borderRadius: '4px 0 0 4px',
                                        bg: `linear-gradient(180deg, ${C.cyan} 0%, rgba(0,212,255,0.4) 100%)`,
                                    }}
                                >
                                    <HStack align="flex-start" spacing={3} pl={1}>
                                        <Box
                                            mt={0.5}
                                            p={2}
                                            borderRadius="12px"
                                            bg="rgba(0, 212, 255, 0.12)"
                                            color={C.cyan}
                                            display="flex"
                                        >
                                            <TrendingUpIcon style={{ fontSize: 22 }} />
                                        </Box>
                                        <Box flex="1" minW={0}>
                                            <Text fontSize="xs" color={C.textMuted} fontWeight="700" mb={1} letterSpacing="0.06em">
                                                Payout
                                            </Text>
                                            <HStack align="baseline" spacing={1}>
                                                <Text fontSize="2xl" fontWeight="800" color={C.text} fontfeaturesettings="'tnum'">
                                                    {payoutMult.toFixed(4)}
                                                </Text>
                                                <Text fontSize="lg" fontWeight="700" color={C.textMuted}>
                                                    ×
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                </Box>
                                <Box
                                    flex="1"
                                    minW="140px"
                                    borderRadius="16px"
                                    p={5}
                                    position="relative"
                                    overflow="hidden"
                                    border={`1px solid ${C.border}`}
                                    bg="rgba(0,0,0,0.22)"
                                    backdropFilter="blur(10px)"
                                    boxShadow="inset 0 1px 0 rgba(255,255,255,0.06)"
                                    _before={{
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        w: '4px',
                                        borderRadius: '4px 0 0 4px',
                                        bg: `linear-gradient(180deg, ${C.green} 0%, ${C.greenDeep} 100%)`,
                                    }}
                                >
                                    <HStack align="flex-start" spacing={3} pl={1}>
                                        <Box
                                            mt={0.5}
                                            p={2}
                                            borderRadius="12px"
                                            bg="rgba(71, 225, 125, 0.14)"
                                            color={C.green}
                                            display="flex"
                                        >
                                            <PercentIcon style={{ fontSize: 22 }} />
                                        </Box>
                                        <Box flex="1" minW={0}>
                                            <Text fontSize="xs" color={C.textMuted} fontWeight="700" mb={1} letterSpacing="0.06em">
                                                Win chance
                                            </Text>
                                            <HStack align="baseline" spacing={1}>
                                                <Text fontSize="2xl" fontWeight="800" color={C.text} fontfeaturesettings="'tnum'">
                                                    {winChancePct.toFixed(2)}
                                                </Text>
                                                <Text fontSize="lg" fontWeight="700" color={C.textMuted}>
                                                    %
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                </Box>
                            </Flex>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem
                    area="empty"
                    minH={{ base: '250px', md: '250px', '1550px': 0 }}
                    display="flex"
                    flexDirection="column"
                    minW={0}
                >
                    <RealView />
                </GridItem>
            </Grid>
            <History />

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} isCentered size="md">
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="#00D4FF">Range</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody pb={6}>
                        <Text color="gray.300" fontSize="sm" mb={2}>
                            *Choose a number band on the slider (0–100). Win chance and payout multiplier update from the
                            width of your range.
                        </Text>
                        <Image src={keyboard} alt="Keyboard" />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
