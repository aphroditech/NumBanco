import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Text,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    HStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Flex,
    Button,
    Input,
    IconButton,
    FormControl,
    FormLabel,
    useBreakpointValue,
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import { aToZBet, aToZSpinComplete } from '../../action/AtoZActions';

import backgroundImage from 'assets/img/Digits/background.png'

import RealTimeHistory from './AToZItems/RealTimeHistory';
import UserBetHistory from './AToZItems/UserBetHistory';

import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { motion, AnimatePresence } from 'framer-motion';
import { onlineUser, offlineUser } from '../../action/BetActions';

const MotionBox = motion(Box);
/** Match Rocket Shot bet range and step */
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const AMOUNT_STEP = 0.5;

/** Normalize to 3-digit string "000"…"999" */
function padPickDigits(n) {
    const v = Math.min(999, Math.max(0, Math.floor(Number(n))));
    if (Number.isNaN(v)) return '000';
    return String(v).padStart(3, '0');
}

/** Digits above / current / below on the 0–9 ring (for idle columns). */
function adjacentDigitsVertical(d) {
    const n = ((d % 10) + 10) % 10;
    return [(n + 9) % 10, n, (n + 1) % 10];
}

const REEL_ROW_TEXT_PROPS = {
    fontWeight: '900',
    lineHeight: '1',
    fontFamily: 'Orbitron, system-ui, monospace',
};

/**
 * Vertical 0–9 strip; viewport shows 3 rows (digit above, current win line, digit below).
 * Strip translates up so digits flow downward; middle row lands on `targetDigit`.
 */
function AToZReelStrip({ targetDigit, cellH, durationSec, fullCycles, onAnimationComplete }) {
    const finalIndex = fullCycles * 10 + targetDigit;
    /** Need strip[finalIndex-1], strip[finalIndex], strip[finalIndex+1] visible when stopped. */
    const strip = useMemo(
        () => Array.from({ length: finalIndex + 2 }, (_, i) => i % 10),
        [finalIndex]
    );
    /** Align so middle row shows strip[finalIndex] (the result digit). */
    const finalY = Math.max(0, finalIndex - 1) * cellH;
    const fontPx = Math.max(22, Math.round(cellH * 0.52));
    const viewH = 3 * cellH;

    return (
        <Box
            overflow="hidden"
            h={`${viewH}px`}
            w="100%"
            position="relative"
            borderRadius="xl"
            border="1px solid rgba(0, 212, 255, 0.28)"
            bg="rgba(0, 0, 0, 0.35)"
            sx={{
                maskImage:
                    'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
            }}
        >
            {/* Win-line band (middle of three rows) */}
            <Box
                position="absolute"
                left={0}
                right={0}
                top={`${cellH}px`}
                h={`${cellH}px`}
                pointerEvents="none"
                zIndex={1}
                borderTop="1px solid rgba(0, 212, 255, 0.4)"
                borderBottom="1px solid rgba(0, 212, 255, 0.4)"
                bg="rgba(0, 212, 255, 0.06)"
                boxShadow="inset 0 0 20px rgba(0, 212, 255, 0.12)"
            />
            <MotionBox
                initial={{ y: 0 }}
                animate={{ y: -finalY }}
                transition={{
                    duration: durationSec,
                    ease: [0.18, 0.05, 0.12, 1],
                }}
                onAnimationComplete={onAnimationComplete}
                style={{ willChange: 'transform' }}
            >
                {strip.map((d, i) => (
                    <Box
                        key={i}
                        h={`${cellH}px`}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                    >
                        <Text
                            fontSize={`${fontPx}px`}
                            {...REEL_ROW_TEXT_PROPS}
                            color="#f2fbff"
                            sx={{
                                textShadow:
                                    '0 0 18px rgba(0, 212, 255, 0.35), 0 2px 0 rgba(0,0,0,0.5)',
                            }}
                        >
                            {d}
                        </Text>
                    </Box>
                ))}
            </MotionBox>
        </Box>
    );
}

export default function AToZPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    /** Set when spin ends and server said `isWin` — drives center-screen multiplier reveal */
    const [winOverlay, setWinOverlay] = useState(null);
    const pendingServerWinRef = useRef({ isWin: false, multiplier: 0, winAmount: null });
    const winOverlayHideTimerRef = useRef(null);
    const user = useSelector((state) => state.user.userInfo) || {};
    const walletBalance = user.balance;
    const balanceNum = Number(walletBalance);
    const maxAmount = Number.isFinite(balanceNum)
        ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balanceNum))
        : MAX_AMOUNT;

    const [amount, setAmount] = useState(MIN_AMOUNT);
    /** Three digits 0–9: [hundreds, tens, ones] → 000–999 */
    const [pickDigits, setPickDigits] = useState([0, 0, 0]);
    const [isSpinning, setIsSpinning] = useState(false);
    /** True while /bet is in flight — disables BET immediately (avoids parallel requests). */
    const [isBetPending, setIsBetPending] = useState(false);
    /** Synchronous guard: React state may not have re-rendered before a second click. */
    const spinLockRef = useRef(false);

    /** Last settled result digits (idle view). */
    const [idleDigits, setIdleDigits] = useState([0, 0, 0]);
    /** While set, vertical reel strips are animating. */
    const [spinBundle, setSpinBundle] = useState(null);
    const pendingSpinRef = useRef(null);
    const spinFinalizeGuardRef = useRef(false);
    const spinTimersRef = useRef([]);

    const cellH = useBreakpointValue({ base: 58, md: 76 }) ?? 64;

    const clearSpinAnim = useCallback(() => {
        spinTimersRef.current.forEach((id) => clearTimeout(id));
        spinTimersRef.current = [];
    }, []);

    const handleAmountChange = (e) => {
        const raw = e.target.value;
        const v = parseFloat(raw);
        if (v >= MIN_AMOUNT && v <= maxAmount) {
            setAmount(v);
        }
    };

    const canSpin = useMemo(() => {
        const n = Number(amount);
        if (!Number.isFinite(n) || isSpinning || isBetPending) return false;
        if (n < MIN_AMOUNT || n > maxAmount) return false;
        if (Number.isFinite(balanceNum) && n > balanceNum) return false;
        return true;
    }, [amount, isSpinning, isBetPending, maxAmount, balanceNum]);

    const finalizeSpinRound = useCallback(
        async (result) => {
            setIsSpinning(false);
            const { isWin, multiplier: mult, winAmount } = pendingServerWinRef.current;
            pendingServerWinRef.current = { isWin: false, multiplier: 0, winAmount: null };

            const data = {
                isWin,
                multiplier: mult,
                betAmount: result.betAmount,
                pickNumber: result.pickNumber,
                result: result.word,
            };
            await aToZSpinComplete(data, dispatch, history);
            if (isWin && mult > 0) {
                if (winOverlayHideTimerRef.current) {
                    window.clearTimeout(winOverlayHideTimerRef.current);
                }
                const bursts = Array.from({ length: 56 }).map(() => ({
                    angle: Math.random() * Math.PI * 2,
                    dist: 100 + Math.random() * 160,
                    duration: 0.38 + Math.random() * 0.35,
                    size: 5 + Math.random() * 12,
                    hue: 160 + Math.random() * 90,
                }));
                setWinOverlay({
                    id: Date.now(),
                    multiplier: mult,
                    winAmount: typeof winAmount === 'number' ? winAmount : null,
                    bursts,
                });
                winOverlayHideTimerRef.current = window.setTimeout(() => {
                    setWinOverlay(null);
                    winOverlayHideTimerRef.current = null;
                }, 1600);
            }
        },
        [dispatch, history]
    );

    /** Full cycles of 0–9 before landing; longer on right reels = more travel, stops last. */
    const REEL_FULL_CYCLES = [10, 13, 16];
    /** Seconds — left stops first, then middle, then right. */
    const REEL_DURATION_SEC = [1.05, 1.38, 1.72];

    const endSpinRound = useCallback(() => {
        if (spinFinalizeGuardRef.current) return;
        const p = pendingSpinRef.current;
        if (!p) return;
        spinFinalizeGuardRef.current = true;
        pendingSpinRef.current = null;
        setSpinBundle(null);
        setIdleDigits(p.targets);
        setIsSpinning(false);
        clearSpinAnim();
        finalizeSpinRound({
            betAmount: p.meta.bet,
            word: p.word,
            pickNumber: p.meta.pickNum,
        });
    }, [finalizeSpinRound, clearSpinAnim]);

    const startReactReelSpin = useCallback(
        (targetStr, meta) => {
            clearSpinAnim();
            const targets = targetStr.split('').map((c) => parseInt(c, 10));
            if (targets.length !== 3 || targets.some((n) => Number.isNaN(n))) {
                setIsSpinning(false);
                setIsBetPending(false);
                spinLockRef.current = false;
                return;
            }
            spinFinalizeGuardRef.current = false;
            pendingSpinRef.current = { word: targetStr, targets, meta };
            setSpinBundle({ key: Date.now(), targets });

            setIsSpinning(true);
            setIsBetPending(false);
            spinLockRef.current = false;

            spinTimersRef.current.push(
                window.setTimeout(() => {
                    if (!pendingSpinRef.current) return;
                    if (spinFinalizeGuardRef.current) return;
                    endSpinRound();
                }, 4800)
            );
        },
        [clearSpinAnim, endSpinRound]
    );

    useEffect(() => {
        onlineUser(14);
        return () => {
            offlineUser(14);
        };
    }, [dispatch]);
    useEffect(() => {
        return () => {
            clearSpinAnim();
            if (winOverlayHideTimerRef.current) {
                window.clearTimeout(winOverlayHideTimerRef.current);
                winOverlayHideTimerRef.current = null;
            }
        };
    }, [clearSpinAnim]);

    // Keep amount in range when balance / max changes (same idea as Rocket Shot cap)
    useEffect(() => {
        setAmount((prev) => {
            let next = prev;
            if (next > maxAmount) next = maxAmount;
            if (next < MIN_AMOUNT) next = MIN_AMOUNT;
            return next;
        });
    }, [maxAmount]);

    const adjustPickDigit = (index, delta) => {
        setPickDigits((prev) => {
            const next = [...prev];
            next[index] = Math.min(9, Math.max(0, next[index] + delta));
            return next;
        });
    };

    const handlePickDigitChange = (index, e) => {
        const raw = e.target.value.replace(/\D/g, '');
        const last = raw.slice(-1);
        const v = last === '' ? 0 : Math.min(9, Math.max(0, parseInt(last, 10)));
        if (Number.isNaN(v)) return;
        setPickDigits((prev) => {
            const next = [...prev];
            next[index] = v;
            return next;
        });
    };

    const handleSpin = async () => {
        if (!canSpin) return;
        if (spinLockRef.current) return;
        spinLockRef.current = true;
        setIsBetPending(true);

        const bet = parseFloat(amount);
        const data = {
            betAmount: bet,
            number: pickDigits[0] * 100 + pickDigits[1] * 10 + pickDigits[2],
        };

        let animationScheduled = false;

        try {
            const res = await aToZBet(data, dispatch, history);
            if (res == null) return;

            const mult = Number(res.multiplier) || 0;
            const won = res.isWin === true;
            const winAmt = typeof res.winAmount === 'number' ? res.winAmount : null;
            pendingServerWinRef.current = {
                isWin: won,
                multiplier: mult,
                winAmount: winAmt,
            };

            const pickNum = pickDigits[0] * 100 + pickDigits[1] * 10 + pickDigits[2];
            const serverResult =
                res.result != null ? String(res.result).replace(/\D/g, '').slice(0, 3).padStart(3, '0') : null;
            const wordForComplete =
                serverResult && /^[0-9]{3}$/.test(serverResult)
                    ? serverResult
                    : String(res.result ?? '')
                          .replace(/\D/g, '')
                          .slice(0, 3)
                          .padStart(3, '0');

            startReactReelSpin(wordForComplete, { bet, pickNum });
            animationScheduled = true;
        } catch (e) {
            console.error('[AToZ] handleSpin', e);
        } finally {
            if (!animationScheduled) {
                spinLockRef.current = false;
                setIsBetPending(false);
            }
        }
    };

    return (
        <Box
            px={{ base: '12px', md: '22px' }}
            minH="100vh"
            marginTop="100px"
            w="100%"
            maxW="100%"
            bg="transparent"
        >
            <Grid
                templateAreas={{
                    base: '"game" "side"',
                    xl: '"game side"',
                }}
                templateColumns={{
                    base: '1fr',
                    lg: '1fr',
                    xl: '5fr 3fr',
                }}
                gap={{ base: '14px', md: '18px' }}
                w="100%"
            >
                {/* Main Game Area */}
                <GridItem area="game">
                    <Card minH={{ base: '420px', md: '640px' }} w="100%" overflow="hidden">
                        <CardBody p="0" flexDirection="column" h="100%">
                            {/* main game top section */}
                            <Box
                                w="100%"
                                h="100%"
                                minH={{ base: '360px', md: '560px' }}
                                bgImage={backgroundImage}
                                bgSize="cover"
                                bgPosition="center"
                                bgRepeat="no-repeat"
                                position="relative"
                                overflow="hidden"
                            >
                                <Box
                                    position="absolute"
                                    inset={0}
                                    zIndex={1}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    px={{ base: 2, md: 6 }}
                                    py={4}
                                >
                                    <Box
                                        borderRadius="2xl"
                                        border="2px solid"
                                        borderColor="rgba(0, 212, 255, 0.35)"
                                        bg="rgba(10, 16, 24, 0.92)"
                                        px={{ base: 4, md: 10 }}
                                        py={{ base: 6, md: 10 }}
                                        maxW="100%"
                                        boxShadow="0 0 40px rgba(0, 212, 255, 0.12), inset 0 0 60px rgba(0, 200, 255, 0.06)"
                                    >
                                        <Text
                                            textAlign="center"
                                            fontSize="xs"
                                            fontWeight="extrabold"
                                            letterSpacing="0.28em"
                                            color="rgba(122, 240, 255, 0.72)"
                                            mb={4}
                                        >
                                            RESULT
                                        </Text>
                                        <HStack
                                            spacing={{ base: 2, md: 4 }}
                                            justify="center"
                                            align="stretch"
                                            w="100%"
                                        >
                                            {[0, 1, 2].map((idx) =>
                                                spinBundle ? (
                                                    <Box
                                                        key={`${spinBundle.key}-${idx}`}
                                                        flex="1"
                                                        minW={{ base: '72px', sm: '88px', md: '108px' }}
                                                    >
                                                        <AToZReelStrip
                                                            targetDigit={spinBundle.targets[idx]}
                                                            cellH={cellH}
                                                            durationSec={REEL_DURATION_SEC[idx]}
                                                            fullCycles={REEL_FULL_CYCLES[idx]}
                                                            onAnimationComplete={
                                                                idx === 2 ? endSpinRound : undefined
                                                            }
                                                        />
                                                    </Box>
                                                ) : (
                                                    <Box
                                                        key={`idle-${idx}`}
                                                        flex="1"
                                                        minW={{ base: '72px', sm: '88px', md: '108px' }}
                                                        position="relative"
                                                        borderRadius="xl"
                                                        border="1px solid rgba(0, 212, 255, 0.28)"
                                                        bg="rgba(0, 0, 0, 0.35)"
                                                        h={`${3 * cellH}px`}
                                                        overflow="hidden"
                                                        sx={{
                                                            maskImage:
                                                                'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                                                            WebkitMaskImage:
                                                                'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                                                        }}
                                                    >
                                                        <Box
                                                            position="absolute"
                                                            left={0}
                                                            right={0}
                                                            top={`${cellH}px`}
                                                            h={`${cellH}px`}
                                                            pointerEvents="none"
                                                            zIndex={1}
                                                            borderTop="1px solid rgba(0, 212, 255, 0.4)"
                                                            borderBottom="1px solid rgba(0, 212, 255, 0.4)"
                                                            bg="rgba(0, 212, 255, 0.06)"
                                                            boxShadow="inset 0 0 20px rgba(0, 212, 255, 0.12)"
                                                        />
                                                        <VStack spacing={0} align="stretch" h="100%" justify="flex-start">
                                                            {adjacentDigitsVertical(idleDigits[idx]).map((digit, row) => (
                                                                <Box
                                                                    key={row}
                                                                    h={`${cellH}px`}
                                                                    display="flex"
                                                                    alignItems="center"
                                                                    justifyContent="center"
                                                                    flexShrink={0}
                                                                >
                                                                    <Text
                                                                        fontSize={`${Math.max(22, Math.round(cellH * 0.52))}px`}
                                                                        {...REEL_ROW_TEXT_PROPS}
                                                                        color={
                                                                            row === 1
                                                                                ? '#f2fbff'
                                                                                : 'rgba(200, 230, 240, 0.4)'
                                                                        }
                                                                        sx={{
                                                                            textShadow:
                                                                                row === 1
                                                                                    ? '0 0 18px rgba(0, 212, 255, 0.45), 0 2px 0 rgba(0,0,0,0.5)'
                                                                                    : '0 1px 0 rgba(0,0,0,0.55)',
                                                                        }}
                                                                    >
                                                                        {digit}
                                                                    </Text>
                                                                </Box>
                                                            ))}
                                                        </VStack>
                                                    </Box>
                                                )
                                            )}
                                        </HStack>
                                    </Box>
                                </Box>
                                <AnimatePresence mode="wait">
                                    {winOverlay != null && (
                                        <MotionBox
                                            key={winOverlay.id ?? 'atoz-win-overlay'}
                                            position="absolute"
                                            inset={0}
                                            zIndex={30}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            pointerEvents="none"
                                            initial={{ opacity: 1 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12 }}
                                            bg="radial-gradient(ellipse at center, rgba(40, 90, 120, 0.55) 0%, rgba(0, 0, 0, 0.88) 55%, rgba(0, 0, 0, 0.92) 100%)"
                                            backdropFilter="blur(4px)"
                                        >
                                            {/* Impact flash */}
                                            <MotionBox
                                                position="absolute"
                                                inset={0}
                                                bg="radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(0,220,255,0.15) 35%, transparent 65%)"
                                                initial={{ opacity: 0.95 }}
                                                animate={{ opacity: 0 }}
                                                transition={{ duration: 0.14, ease: 'easeOut' }}
                                                pointerEvents="none"
                                            />
                                            {/* Expanding shockwaves */}
                                            {[0, 1].map((ring) => (
                                                <MotionBox
                                                    key={ring}
                                                    position="absolute"
                                                    left="50%"
                                                    top="50%"
                                                    w="80px"
                                                    h="80px"
                                                    marginLeft="-40px"
                                                    marginTop="-40px"
                                                    borderRadius="full"
                                                    border="3px solid rgba(0, 230, 255, 0.65)"
                                                    boxShadow="0 0 24px rgba(0, 230, 255, 0.5)"
                                                    initial={{ scale: 0.2, opacity: 0.9 }}
                                                    animate={{ scale: 3.2 + ring * 0.4, opacity: 0 }}
                                                    transition={{
                                                        duration: 0.55,
                                                        delay: ring * 0.06,
                                                        ease: [0.15, 0.85, 0.35, 1],
                                                    }}
                                                    pointerEvents="none"
                                                />
                                            ))}
                                            {/* Explosion shards */}
                                            <Box position="absolute" inset={0} overflow="visible" aria-hidden>
                                                {winOverlay.bursts?.map((b, i) => (
                                                    <MotionBox
                                                        key={`${winOverlay.id}-b-${i}`}
                                                        position="absolute"
                                                        left="50%"
                                                        top="50%"
                                                        w={`${b.size}px`}
                                                        h={`${Math.max(4, b.size * 0.45)}px`}
                                                        marginLeft={`${-b.size / 2}px`}
                                                        marginTop={`${-Math.max(4, b.size * 0.45) / 2}px`}
                                                        borderRadius="full"
                                                        bg={`hsla(${b.hue}, 95%, 62%, 0.95)`}
                                                        boxShadow={`0 0 ${Math.min(18, b.size)}px hsla(${b.hue}, 100%, 55%, 0.85)`}
                                                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                                        animate={{
                                                            x: Math.cos(b.angle) * b.dist,
                                                            y: Math.sin(b.angle) * b.dist,
                                                            opacity: 0,
                                                            scale: 0.15,
                                                        }}
                                                        transition={{
                                                            duration: b.duration,
                                                            ease: [0.02, 0.75, 0.25, 1],
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                            <MotionBox
                                                position="relative"
                                                zIndex={2}
                                                display="flex"
                                                flexDirection="column"
                                                alignItems="center"
                                                justifyContent="center"
                                                gap={{ base: 1, md: 2 }}
                                                px={{ base: 4, md: 7 }}
                                                py={{ base: 5, md: 7 }}
                                                borderRadius="xl"
                                                border="2px solid rgba(0, 240, 255, 0.55)"
                                                boxShadow="0 0 0 1px rgba(255,255,255,0.12), 0 0 48px rgba(0, 230, 255, 0.55), inset 0 0 32px rgba(0, 200, 255, 0.12)"
                                                bg="rgba(8, 14, 22, 0.92)"
                                                initial={{ scale: 0, opacity: 1 }}
                                                animate={{
                                                    scale: [0, 1.22, 0.98, 1],
                                                }}
                                                transition={{
                                                    duration: 0.28,
                                                    times: [0, 0.55, 0.8, 1],
                                                    ease: [0.2, 0.9, 0.3, 1],
                                                }}
                                            >
                                                <Text
                                                    fontSize={{ base: '10px', md: 'xs' }}
                                                    fontWeight="800"
                                                    letterSpacing="0.35em"
                                                    color="#7af0ff"
                                                    textTransform="uppercase"
                                                >
                                                    You win
                                                </Text>
                                                <Text
                                                    fontSize={{ base: '52px', md: '78px' }}
                                                    fontWeight="900"
                                                    lineHeight="0.95"
                                                    fontFamily="Orbitron, system-ui, sans-serif"
                                                    letterSpacing="-0.04em"
                                                    sx={{
                                                        background:
                                                            'linear-gradient(130deg, #ffffff 0%, #00d4ff 35%, #ffea8a 70%, #7aebff 100%)',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text',
                                                        filter:
                                                            'drop-shadow(0 0 20px rgba(0, 240, 255, 0.9)) drop-shadow(0 0 48px rgba(0, 200, 255, 0.55))',
                                                    }}
                                                >
                                                    {Number(winOverlay.multiplier).toLocaleString()}×
                                                </Text>
                                                {winOverlay.winAmount != null && Number.isFinite(winOverlay.winAmount) && (
                                                    <Text
                                                        fontSize={{ base: 'sm', md: 'md' }}
                                                        fontWeight="700"
                                                        color="rgba(180, 250, 255, 0.98)"
                                                    >
                                                        +${Number(winOverlay.winAmount).toFixed(2)}
                                                    </Text>
                                                )}
                                            </MotionBox>
                                        </MotionBox>
                                    )}
                                </AnimatePresence>
                                <FormControl w="100%" maxW="420px" position={'absolute'} bottom="10px" left="50%" transform="translateX(-50%)" zIndex={10}>
                                    <HStack
                                        spacing={{ base: '8px', sm: '12px' }}
                                        justify="center"
                                        align="flex-end"
                                        flexWrap="wrap"
                                        w="100%"
                                    >
                                        {['100s', '10s', '1s'].map((place, index) => (
                                            <VStack key={place} spacing="4px" align="center">
                                                
                                                <HStack
                                                    spacing="4px"
                                                    bg="#0A1018EB   "
                                                    borderRadius="10px"
                                                    px="6px"
                                                    py="4px"
                                                    border="1px solid rgba(0, 212, 255, 0.35)"
                                                >
                                                    <IconButton
                                                        aria-label={`Decrease ${place} digit`}
                                                        icon={<RemoveIcon style={{ fontSize: 18 }} />}
                                                        size="sm"
                                                        h="30px"
                                                        w="30px"
                                                        minW="20px"
                                                        bg="rgba(0, 212, 255, 0.15)"
                                                        color="#00D4FF"
                                                        borderRadius="8px"
                                                        _hover={{ bg: 'rgba(0, 212, 255, 0.28)' }}
                                                        isDisabled={isSpinning || isBetPending || pickDigits[index] <= 0}
                                                        onClick={() => adjustPickDigit(index, -1)}
                                                    />
                                                    <Input
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        autoComplete="off"
                                                        value={String(pickDigits[index])}
                                                        onChange={(e) => handlePickDigitChange(index, e)}
                                                        maxLength={1}
                                                        textAlign="center"
                                                        fontSize="1xl"
                                                        fontWeight="bold"
                                                        fontFamily="Orbitron, system-ui, monospace"
                                                        color="#fff"
                                                        bg="transparent"
                                                        border="none"
                                                        w="20px"
                                                        h="45px"
                                                        p="0"
                                                        isDisabled={isSpinning || isBetPending}
                                                        aria-label={`${place} digit 0-9`}
                                                        _focus={{
                                                            boxShadow: 'none',
                                                            border: 'none',
                                                        }}
                                                    />
                                                    <IconButton
                                                        aria-label={`Increase ${place} digit`}
                                                        icon={<AddIcon style={{ fontSize: 18 }} />}
                                                        size="sm"
                                                        h="30px"
                                                        w="30px"
                                                        minW="20px"
                                                        bg="rgba(0, 212, 255, 0.15)"
                                                        color="#00D4FF"
                                                        borderRadius="8px"
                                                        _hover={{ bg: 'rgba(0, 212, 255, 0.28)' }}
                                                        isDisabled={isSpinning || isBetPending || pickDigits[index] >= 9}
                                                        onClick={() => adjustPickDigit(index, 1)}
                                                    />
                                                </HStack>
                                            </VStack>
                                        ))}
                                    </HStack>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.5)" textAlign="center" mt="8px">
                                        Use − / + or type a digit (0–9) in each box.
                                    </Text>
                                </FormControl>
                            </Box>
                            {/* main game bottom section */}
                            <Box
                                w="100%"
                                pt="12px"
                                pb="14px"
                                bg="linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)"
                                borderTop="1px solid rgba(0, 212, 255, 0.3)"
                                position="relative"
                            >
                                <IconButton
                                    aria-label="Help"
                                    position="absolute"
                                    top="5px"
                                    right="5px"
                                    icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                    size="sm"
                                    variant="ghost"
                                    color="#00d4ff"
                                    _hover={{ bg: 'rgba(255,255,255,0.08)', color: '#00D4FF' }}
                                    onClick={() => setIsHelpModalOpen(true)}
                                />
                                <HStack spacing="10px" align="center"  justify="center" w="100%">
                                    {/* Pick Digits Form */}
                                    <Flex align="center" justify="center" gap="6px" flexWrap="wrap" w="100%">
                                        <Button
                                            size="sm"
                                            h="52px"
                                            minW="54px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => setAmount(MIN_AMOUNT)}
                                            isDisabled={isSpinning || isBetPending}
                                        >
                                            Min
                                        </Button>
                                        <HStack
                                            spacing="4px"
                                            bg="#0A1018EB"
                                            borderRadius="8px"
                                            px="6px"
                                            h="54px"
                                            border="1px solid rgba(255, 255, 255, 0.1)"
                                        >
                                            <IconButton
                                                aria-label="Decrease bet"
                                                icon={<RemoveIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={() => setAmount(amount - AMOUNT_STEP)}
                                                isDisabled={
                                                    isSpinning ||
                                                    isBetPending ||
                                                    amount - AMOUNT_STEP < MIN_AMOUNT
                                                }
                                            />
                                            <Input
                                                type="number"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                min={MIN_AMOUNT}
                                                max={maxAmount}
                                                step={AMOUNT_STEP}
                                                w={{ base: '72px', sm: '80px' }}
                                                textAlign="center"
                                                fontSize="md"
                                                fontWeight="bold"
                                                color="#fff"
                                                bg="transparent"
                                                border="none"
                                                p="0"
                                                isDisabled={isSpinning || isBetPending}
                                                _focus={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                                                _hover={{ border: 'none' }}
                                                sx={{
                                                    MozAppearance: 'textfield',
                                                    '&::-webkit-outer-spin-button': {
                                                        WebkitAppearance: 'none',
                                                        margin: 0,
                                                    },
                                                    '&::-webkit-inner-spin-button': {
                                                        WebkitAppearance: 'none',
                                                        margin: 0,
                                                    },
                                                }}
                                            />
                                            <IconButton
                                                aria-label="Increase bet"
                                                icon={<AddIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={() => setAmount(amount + AMOUNT_STEP)}
                                                isDisabled={
                                                    isSpinning ||
                                                    isBetPending ||
                                                    amount + AMOUNT_STEP > maxAmount
                                                }
                                            />
                                        </HStack>
                                        <Button
                                            size="sm"
                                            h="54px"
                                            minW="54px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => setAmount(maxAmount)}
                                            isDisabled={isSpinning || isBetPending}
                                        >
                                            Max
                                        </Button>
                                    </Flex>
                                    {/* Spin Button */}
                                    <HStack spacing="10px" align="center" flexWrap="wrap" justify="center" w="100%">
                                        <Button
                                            h="66px"
                                            w="100%"
                                            maxW="300px"
                                            fontSize="md"
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg="#00D4FF"
                                            color="#fff"
                                            border="2px solid #00D4FF"
                                            _hover={{
                                                bg: '#00D4FF',
                                                borderColor: '#00D4FF',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                                            }}
                                            _active={{ transform: 'translateY(0)' }}
                                            isDisabled={!canSpin}
                                            title={
                                                amount < MIN_AMOUNT
                                                    ? `Enter at least $${MIN_AMOUNT}`
                                                    : amount > maxAmount
                                                        ? `Max bet is $${maxAmount}`
                                                        : ''
                                            }
                                            onClick={handleSpin}
                                        >
                                            {isBetPending && !isSpinning ? 'Placing bet...' : isSpinning ? 'Spinning...' : 'BET'}
                                        </Button>
                                    </HStack>
                                </HStack>
                            </Box>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* History Area */}
                <RealTimeHistory />
            </Grid>
            <UserBetHistory />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size='3xl' minW="1000px" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="#00D4FF" >
                         How to Play Digits Game
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody py={4}>
                        <Text color="gray.200" lineHeight="1.65" mb={3} fontSize="sm">
                            Digits is a 3-reel number slot (000-999). Pick your 3-digit number, set your bet, and press BET.
                            After the reels stop, your payout depends on how many digits match and whether positions match.
                        </Text>

                        <Box
                            border="1px solid rgba(0, 212, 255, 0.28)"
                            borderRadius="12px"
                            bg="rgba(6, 12, 18, 0.72)"
                            overflowX="auto"
                            mb={3}
                        >
                            <Table size="sm" variant="simple" minW="620px">
                                <Thead>
                                    <Tr>
                                        <Th color="#7fefff" borderColor="rgba(255,255,255,0.1)">Match Type</Th>
                                        <Th color="#7fefff" borderColor="rgba(255,255,255,0.1)">Description</Th>
                                        <Th color="#7fefff" borderColor="rgba(255,255,255,0.1)" isNumeric>Multiplier</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">Exact Match</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">All 3 digits match and all positions match</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x800</Td>
                                    </Tr>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">Three Unordered</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">All 3 digits match but positions differ</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x150</Td>
                                    </Tr>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">Two Ordered</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">Exactly 2 digits match and those positions match</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x15</Td>
                                    </Tr>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">Two Unordered</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">Exactly 2 digits match but positions differ</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x7.5</Td>
                                    </Tr>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">One Ordered</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">Exactly 1 digit matches and its position matches</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x2.4</Td>
                                    </Tr>
                                    <Tr>
                                        <Td color="gray.100" borderColor="rgba(255,255,255,0.08)">One Unordered</Td>
                                        <Td color="gray.300" borderColor="rgba(255,255,255,0.08)">Exactly 1 digit matches but in a different position</Td>
                                        <Td color="#bdf9ff" borderColor="rgba(255,255,255,0.08)" isNumeric fontWeight="700">x1.2</Td>
                                    </Tr>
                                </Tbody>
                            </Table>
                        </Box>

                        <Text color="gray.300" lineHeight="1.6" fontSize="xs">
                            Tip: outcomes are evaluated from highest match tier to lowest, so each spin is counted once under the best matching rule.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}