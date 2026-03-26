import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import Card from 'components/Card/Card.js';
import { VStack, Text, Box, HStack, Image, Button, Flex, Input, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const CoinHeadImage = '/img/Coin/head.png';
const CoinTailImage = '/img/Coin/tail.png';
const backgroundImage = '/img/Coin/background.jpg';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHistory } from 'react-router-dom';
import { coinBet, coinSpinComplete, getCoinHistory } from 'action/CoinActions';
import { useDispatch, useSelector } from 'react-redux';

const MotionImage = motion(Image);
const MotionBox = motion(Box);
const MotionText = motion(Text);

const RECENT_COUNT = 5;

/** Toss animation: longer duration + more degrees/sec than before. */
const COIN_SPIN_DURATION_SEC = 2;

/** 1 = win, 0 = lose — matches server `M1uXj3sZpU`. */
function buildConfettiSpecs(seed, count = 16) {
    const out = [];
    let s = seed * 7919 + 1;
    const rnd = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
    const colors = ['#4ade80', '#22d3ee', '#fbbf24', '#a78bfa', '#f472b6', '#34d399'];
    for (let i = 0; i < count; i += 1) {
        out.push({
            id: i,
            x: rnd() * 100,
            delay: rnd() * 0.12,
            duration: 0.85 + rnd() * 0.55,
            rot: rnd() * 360,
            color: colors[i % colors.length],
            w: 4 + rnd() * 5,
            h: 6 + rnd() * 9,
        });
    }
    return out;
}

const MIN_BET = 0.5;
const MAX_BET = 20;
/** Step for +/- buttons (typed amounts may use up to 2 decimal places). */
const BET_STEP = 0.5;

/** Allow typing only digits and one decimal point; cap fractional part at 2 digits. */
function sanitizeBetDraft(raw) {
    let s = String(raw ?? '').replace(/[^\d.]/g, '');
    if (s.startsWith('.')) s = `0${s}`;
    const dot = s.indexOf('.');
    if (dot === -1) return s;
    const intPart = s.slice(0, dot);
    const dec = s
        .slice(dot + 1)
        .replace(/\./g, '')
        .slice(0, 2);
    return `${intPart}.${dec}`;
}

function formatBetDisplay(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
}

/** Landed face from history row: `true` = heads, `false` = tails, `null` = empty slot. (`result`: 1 = HEADS, 0 = TAILS.) */
function isHistoryHeads(entry) {
    if (!entry || entry.result === undefined || entry.result === null) return null;
    return Number(entry.result) === 1;
}

export default function MainGameSection() {
    const history = useHistory();
    const amounts = ['0.5', '1', '5', '10', '20'];
    const [coinFace, setCoinFace] = useState('HEADS');
    const [isTossing, setIsTossing] = useState(false);
    const [revealKey, setRevealKey] = useState(0);
    /** Landed face after API: 1 = HEADS, 0 = TAILS — read in onAnimationComplete (avoids stale state). */
    const landedFlipRef = useRef(1);
    /** Snapshot for spinComplete: server landed face + win flag + player pick (closures can be stale). */
    const tossOutcomeRef = useRef({
        playerFlip: 1,
        landedFlip: 1,
        isWin: false,
    });
    const [betAmount, setBetAmount] = useState(0.5);
    const [betFocused, setBetFocused] = useState(false);
    const [betDraft, setBetDraft] = useState('');
    /** `null` = idle / spinning; `1` = win; `0` = lose (aligned with API 1/0). */
    const [outcomeCode, setOutcomeCode] = useState(null);
    /** Bumps when the toss animation finishes — drives one-shot FX (confetti / shake). */
    const [outcomeBurstId, setOutcomeBurstId] = useState(0);
    const [winPayoutDisplay, setWinPayoutDisplay] = useState(0);
    const dispatch = useDispatch();
    const coinHistoryRaw = useSelector((state) => state.histories?.coinHistory) || [];

    const recentResultSlots = useMemo(() => {
        const newestFirst = [...coinHistoryRaw].reverse();
        const faces = newestFirst.slice(0, RECENT_COUNT).reverse();
        return Array.from({ length: RECENT_COUNT }, (_, i) => faces[i] ?? null);
    }, [coinHistoryRaw]);

    useEffect(() => {
        getCoinHistory(history, dispatch);
    }, [dispatch, history]);

    const confettiSpecs = useMemo(() => buildConfettiSpecs(outcomeBurstId), [outcomeBurstId]);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const clampBet = useCallback((n) => {
        const v = Number(n);
        if (!Number.isFinite(v)) return MIN_BET;
        const rounded = Math.round(v * 100) / 100;
        return Math.min(MAX_BET, Math.max(MIN_BET, rounded));
    }, []);

    const commitBetFromDraft = useCallback(() => {
        const parsed = parseFloat(betDraft);
        const n = clampBet(Number.isFinite(parsed) && betDraft.trim() !== '' ? parsed : MIN_BET);
        setBetAmount(n);
        setBetDraft(formatBetDisplay(n));
        setBetFocused(false);
    }, [betDraft, clampBet]);

    const adjustBetByStep = useCallback(
        (delta) => {
            const next = clampBet(betAmount + delta);
            setBetAmount(next);
            if (betFocused) setBetDraft(formatBetDisplay(next));
        },
        [betAmount, betFocused, clampBet]
    );

    const setFromPreset = (amt) => {
        const n = clampBet(Number(amt));
        setBetAmount(n);
        if (betFocused) setBetDraft(formatBetDisplay(n));
    };

    const handleThrowCoin = async (choice) => {
        if (isTossing) return;
        setOutcomeCode(null);
        setIsTossing(true);
        const data = {
            flip: choice,
            betAmount: parseFloat(betAmount),
        };

        const result = await coinBet(data, dispatch, history);

        if (result != null) {
            // Server: flip === 1 → HEADS, flip === 0 → TAILS (same as buttons).
            const landed = Number(result.flip) === 1 ? 1 : 0;
            const won = Number(result.M1uXj3sZpU) === 1;
            landedFlipRef.current = landed;
            tossOutcomeRef.current = {
                playerFlip: choice,
                landedFlip: landed,
                isWin: won,
            };
            setOutcomeCode(won ? 1 : 0);
            if (won) {
                setWinPayoutDisplay(Math.round(parseFloat(betAmount) * 1.95 * 100) / 100);
            }
            setCoinFace(landed === 1 ? 'HEADS' : 'TAILS');
            setRevealKey((v) => v + 1);
        } else {
            setIsTossing(false);
        }
    };

    const completeToss = async () => {
        if (!isTossing) return;

        const { playerFlip, landedFlip, isWin: win } = tossOutcomeRef.current;
        const data = {
            isWin: Boolean(win),
            flip: playerFlip,
            result: landedFlip,
            betAmount: parseFloat(betAmount),
        };

        await coinSpinComplete(data, dispatch, history);
    };

    return (
        <Card
            p={{ base: '12px', md: '16px' }}
            minH={{ base: '420px', md: '750px' }}
            h="100%"
            display="flex"
            flexDirection="column"
            // bg="#03070f"
            border="1px solid rgba(0, 212, 255, 0.2)"
            backgroundImage={`url(${backgroundImage})`}
            backgroundSize="cover"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            overflow="hidden"
        >
            <VStack align="stretch" spacing={0} h="100%">
                <Box flex="1" minH="0" position="relative" py={{ base: 6, md: 8 }}>
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
                    <VStack spacing={{ base: 6, md: 10 }} h="100%" justify="space-between">
                        <Box w="100%" maxW="340px" mx="auto">
                            
                            <HStack spacing={{ base: 2, md: 3 }} justify="center" w="100%">
                                {recentResultSlots.map((entry, i) => {
                                    const heads = isHistoryHeads(entry);
                                    return (
                                        <Box
                                            key={i}
                                            w={{ base: '44px', md: '52px' }}
                                            h={{ base: '44px', md: '52px' }}
                                            borderRadius="full"
                                            border="2px solid"
                                            borderColor={
                                                heads === null
                                                    ? 'rgba(255,255,255,0.12)'
                                                    : heads
                                                      ? 'rgba(255, 63, 118, 0.45)'
                                                      : 'rgba(19, 216, 255, 0.45)'
                                            }
                                            bg="rgba(0,0,0,0.35)"
                                            boxShadow={
                                                heads === null
                                                    ? 'none'
                                                    : heads
                                                      ? '0 0 14px rgba(255, 63, 118, 0.25)'
                                                      : '0 0 14px rgba(19, 216, 255, 0.25)'
                                            }
                                            overflow="hidden"
                                            flexShrink={0}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            {heads !== null ? (
                                                <Image
                                                    src={heads ? CoinHeadImage : CoinTailImage}
                                                    alt={heads ? 'Heads' : 'Tails'}
                                                    w="88%"
                                                    h="88%"
                                                    objectFit="contain"
                                                    pointerEvents="none"
                                                />
                                            ) : (
                                                <Box
                                                    w="28%"
                                                    h="28%"
                                                    borderRadius="full"
                                                    bg="rgba(255,255,255,0.08)"
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </HStack>
                        </Box>

                        <Box
                            w={{ base: '300px', md: '300px' }}
                            h={{ base: '300px', md: '300px' }}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            position="relative"
                            overflow="visible"
                        >
                            <AnimatePresence>
                                {!isTossing && outcomeCode === 1 && outcomeBurstId > 0 && (
                                    <MotionBox
                                        key={`win-glow-${outcomeBurstId}`}
                                        position="absolute"
                                        inset="-12%"
                                        borderRadius="full"
                                        pointerEvents="none"
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.35 }}
                                        bg="radial-gradient(circle at 50% 45%, rgba(74,222,128,0.45) 0%, rgba(34,211,238,0.12) 42%, transparent 70%)"
                                        boxShadow="0 0 80px rgba(74,222,128,0.35), inset 0 0 60px rgba(74,222,128,0.15)"
                                        zIndex={0}
                                    />
                                )}
                                {!isTossing && outcomeCode === 0 && outcomeBurstId > 0 && (
                                    <MotionBox
                                        key={`lose-veil-${outcomeBurstId}`}
                                        position="absolute"
                                        inset="-8%"
                                        borderRadius="full"
                                        pointerEvents="none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 0.55, 0.25] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6, times: [0, 0.35, 1] }}
                                        bg="radial-gradient(circle at 50% 50%, rgba(239,68,68,0.35) 0%, rgba(127,29,29,0.2) 50%, transparent 72%)"
                                        zIndex={0}
                                    />
                                )}
                            </AnimatePresence>

                            {!isTossing && outcomeCode === 1 && outcomeBurstId > 0 && (
                                <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} overflow="visible">
                                    {confettiSpecs.map((p) => (
                                        <MotionBox
                                            key={`${outcomeBurstId}-${p.id}`}
                                            position="absolute"
                                            left={`${p.x}%`}
                                            top="42%"
                                            w={`${p.w}px`}
                                            h={`${p.h}px`}
                                            borderRadius="2px"
                                            bg={p.color}
                                            initial={{ opacity: 1, y: 0, rotate: p.rot, scale: 1 }}
                                            animate={{
                                                opacity: [1, 1, 0],
                                                y: [-10, -90 - p.id * 4],
                                                x: [(p.id % 2 === 0 ? 1 : -1) * (20 + p.id * 3), 0],
                                                rotate: p.rot + 180,
                                                scale: [1, 0.6],
                                            }}
                                            transition={{
                                                duration: p.duration,
                                                delay: p.delay,
                                                ease: 'easeOut',
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}

                            {!isTossing && (
                                <MotionBox
                                    key={`coin-wrap-${revealKey}-${outcomeBurstId}`}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    position="relative"
                                    zIndex={1}
                                    animate={
                                        outcomeCode === 0 && outcomeBurstId > 0
                                            ? { x: [0, -9, 9, -7, 7, -4, 4, 0] }
                                            : outcomeCode === 1 && outcomeBurstId > 0
                                              ? { scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] }
                                              : { x: 0, scale: 1, rotate: 0 }
                                    }
                                    transition={
                                        outcomeCode === 0
                                            ? { duration: 0.48, ease: 'easeInOut' }
                                            : { duration: 0.55, ease: 'easeOut' }
                                    }
                                >
                                    <MotionImage
                                        key={`${coinFace}-${revealKey}`}
                                        src={coinFace === 'HEADS' ? CoinHeadImage : CoinTailImage}
                                        alt="Coin"
                                        w={{ base: '300px', md: '350px' }}
                                        h={{ base: '300px', md: '350px' }}
                                        objectFit="contain"
                                        filter={`drop-shadow(0 0 10px ${coinFace === 'HEADS' ? '#ff3f76' : '#13d8ff'})`}
                                        initial={{ opacity: 0, scale: 0.78, rotateY: 90 }}
                                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                        transition={{ duration: 0.22, ease: 'easeOut' }}
                                    />
                                </MotionBox>
                            )}

                            

                            {isTossing && (
                                <MotionBox
                                    w={{ base: '135px', md: '155px' }}
                                    h={{ base: '135px', md: '155px' }}
                                    borderRadius="full"
                                    bg="radial-gradient(circle at 50% 50%, rgba(170,220,255,0.95) 0%, rgba(70,130,180,0.9) 44%, rgba(28,45,69,0.86) 72%, rgba(15,26,44,0.6) 100%)"
                                    border="2px solid rgba(180,230,255,0.6)"
                                    boxShadow="0 0 26px rgba(19,216,255,0.35), inset 0 0 24px rgba(255,255,255,0.22)"
                                    style={{ transformStyle: 'preserve-3d' }}
                                    initial={{ opacity: 1, rotateY: 0, scaleX: 1, scale: 1 }}
                                    animate={{
                                        // 4320° = 12 full flips (was 1800° / 5 flips in 1.2s)
                                        rotateY: [0, 720, 1440, 2160, 2880, 3600, 4320],
                                        scaleX: [1, 0.11, 1, 0.11, 1, 0.09, 1],
                                        scale: [1, 0.97, 0.94, 0.97, 0.95, 0.98, 1],
                                        opacity: [1, 1, 1, 1, 1, 0.75, 0],
                                    }}
                                    transition={{
                                        duration: COIN_SPIN_DURATION_SEC,
                                        ease: 'easeInOut',
                                        times: [0, 0.14, 0.28, 0.42, 0.56, 0.72, 1],
                                    }}
                                    onAnimationComplete={() => {
                                        // Must match API outcome (pendingFaceRef was never set before).
                                        setCoinFace(landedFlipRef.current === 1 ? 'HEADS' : 'TAILS');
                                        setIsTossing(false);
                                        completeToss();
                                        setRevealKey((v) => v + 1);
                                        setOutcomeBurstId((v) => v + 1);
                                    }}
                                />
                            )}
                        </Box>

                        <VStack spacing={4} w="100%" maxW="560px" px={{ base: 2, md: 4 }}>
                            <Box w="100%">
                                <Text
                                    fontSize="xs"
                                    fontWeight="700"
                                    letterSpacing="0.12em"
                                    color="rgba(255,255,255,0.45)"
                                    mb={2}
                                    textAlign="center"
                                >
                                    BET AMOUNT
                                </Text>
                                <Flex
                                    align="center"
                                    justify="center"
                                    gap={{ base: '6px', md: '10px' }}
                                    flexWrap="wrap"
                                    w="100%"
                                >
                                    <Button
                                        size="sm"
                                        h={{ base: '46px', md: '52px' }}
                                        minW="52px"
                                        px="10px"
                                        fontSize="xs"
                                        fontWeight="800"
                                        borderRadius="10px"
                                        bg="rgba(15, 56, 66, 0.55)"
                                        color="rgba(23, 219, 255, 0.95)"
                                        border="1px solid rgba(23, 219, 255, 0.45)"
                                        boxShadow="inset 0 0 12px rgba(23, 219, 255, 0.12)"
                                        _hover={{
                                            bg: 'rgba(20, 67, 80, 0.65)',
                                            borderColor: 'rgba(23, 219, 255, 0.65)',
                                        }}
                                        onClick={() => {
                                            const n = clampBet(MIN_BET);
                                            setBetAmount(n);
                                            if (betFocused) setBetDraft(formatBetDisplay(n));
                                        }}
                                        isDisabled={isTossing}
                                    >
                                        Min
                                    </Button>
                                    <HStack
                                        spacing={0}
                                        bg="rgba(5, 12, 22, 0.92)"
                                        borderRadius="14px"
                                        border="1px solid rgba(0, 212, 255, 0.28)"
                                        boxShadow="0 0 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
                                        px={{ base: '4px', md: '6px' }}
                                        h={{ base: '50px', md: '56px' }}
                                        flex="1"
                                        minW="0"
                                        maxW={{ base: '100%', sm: '280px' }}
                                    >
                                        <IconButton
                                            aria-label="Decrease bet"
                                            icon={<RemoveIcon style={{ fontSize: 20 }} />}
                                            size="sm"
                                            h="40px"
                                            w="40px"
                                            minW="40px"
                                            borderRadius="10px"
                                            bg="transparent"
                                            color="rgba(23, 219, 255, 0.9)"
                                            _hover={{ bg: 'rgba(23, 219, 255, 0.12)' }}
                                            onClick={() => adjustBetByStep(-BET_STEP)}
                                            isDisabled={isTossing || betAmount <= MIN_BET - 1e-9}
                                        />
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={betFocused ? betDraft : formatBetDisplay(betAmount)}
                                            onChange={(e) => setBetDraft(sanitizeBetDraft(e.target.value))}
                                            onFocus={() => {
                                                setBetFocused(true);
                                                setBetDraft(formatBetDisplay(betAmount));
                                            }}
                                            onBlur={commitBetFromDraft}
                                            flex="1"
                                            minW="72px"
                                            h="100%"
                                            textAlign="center"
                                            fontSize={{ base: 'lg', md: 'xl' }}
                                            fontWeight="800"
                                            color="#fff"
                                            bg="transparent"
                                            border="none"
                                            p="0"
                                            _focus={{ outline: 'none', boxShadow: 'none' }}
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
                                            icon={<AddIcon style={{ fontSize: 20 }} />}
                                            size="sm"
                                            h="40px"
                                            w="40px"
                                            minW="40px"
                                            borderRadius="10px"
                                            bg="transparent"
                                            color="rgba(23, 219, 255, 0.9)"
                                            _hover={{ bg: 'rgba(23, 219, 255, 0.12)' }}
                                            onClick={() => adjustBetByStep(BET_STEP)}
                                            isDisabled={isTossing || betAmount >= MAX_BET - 1e-9}
                                        />
                                    </HStack>
                                    <Button
                                        size="sm"
                                        h={{ base: '46px', md: '52px' }}
                                        minW="52px"
                                        px="10px"
                                        fontSize="xs"
                                        fontWeight="800"
                                        borderRadius="10px"
                                        bg="linear-gradient(180deg, rgba(62,18,27,0.75) 0%, rgba(45,12,23,0.85) 100%)"
                                        color="rgba(255, 228, 236, 0.95)"
                                        border="1px solid rgba(255, 57, 96, 0.5)"
                                        boxShadow="inset 0 0 14px rgba(255, 46, 99, 0.15)"
                                        _hover={{
                                            bg: 'linear-gradient(180deg, rgba(75,22,33,0.85) 0%, rgba(55,16,28,0.92) 100%)',
                                            borderColor: 'rgba(255, 61, 109, 0.65)',
                                        }}
                                        onClick={() => {
                                            const n = clampBet(MAX_BET);
                                            setBetAmount(n);
                                            if (betFocused) setBetDraft(formatBetDisplay(n));
                                        }}
                                        isDisabled={isTossing}
                                    >
                                        Max
                                    </Button>
                                </Flex>
                            </Box>

                            <HStack spacing={{ base: 2, md: 2.5 }} justify="center" w="100%" flexWrap="wrap">
                                {amounts.map((amt) => {
                                    const active = Math.abs(betAmount - Number(amt)) < 0.005;
                                    return (
                                        <Button
                                            key={amt}
                                            flex="1"
                                            minW="58px"
                                            maxW="88px"
                                            h={{ base: '42px', md: '48px' }}
                                            borderRadius="md"
                                            variant="unstyled"
                                            border="1px solid"
                                            borderColor={
                                                active
                                                    ? 'rgba(23, 219, 255, 0.65)'
                                                    : 'rgba(255,255,255,0.12)'
                                            }
                                            bg={
                                                active
                                                    ? 'linear-gradient(180deg, rgba(15,56,66) 0%, rgba(8,32,42) 100%)'
                                                    : 'rgba(3, 8, 16)'
                                            }
                                            boxShadow={
                                                active
                                                    ? '0 0 16px rgba(23, 219, 255, 0.25), inset 0 0 12px rgba(23, 219, 255, 0.08)'
                                                    : 'none'
                                            }
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            isDisabled={isTossing}
                                            onClick={() => setFromPreset(amt)}
                                            _hover={{
                                                borderColor: 'rgba(23, 219, 255, 0.45)',
                                                bg: 'rgba(12, 28, 38, 0.9)',
                                            }}
                                        >
                                            <Text
                                                color={
                                                    active
                                                        ? 'rgba(190, 245, 255, 0.98)'
                                                        : 'rgba(255,255,255,0.5)'
                                                }
                                                fontWeight="800"
                                                fontSize="sm"
                                            >
                                                {amt}
                                            </Text>
                                        </Button>
                                    );
                                })}
                            </HStack>

                            <Flex gap={{ base: 3, md: 4 }} w="100%">
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(62,18,27,0.92) 0%, rgba(45,12,23,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(255, 57, 96, 0.55)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(255, 61, 109, 0.35), inset 0 0 18px rgba(255, 46, 99, 0.2), 0 0 18px rgba(255, 46, 99, 0.35)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(75,22,33,0.96) 0%, rgba(55,16,28,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(255, 61, 109, 0.45), inset 0 0 24px rgba(255, 46, 99, 0.28), 0 0 24px rgba(255, 46, 99, 0.45)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={() => handleThrowCoin(1)}
                                >
                                    HEADS
                                </Button>
                                <Button
                                    flex="1"
                                    h={{ base: '48px', md: '56px' }}
                                    borderRadius="full"
                                    bg="linear-gradient(180deg, rgba(15,56,66,0.92) 0%, rgba(10,41,54,0.96) 100%)"
                                    color="rgba(255,255,255,0.92)"
                                    border="2px solid rgba(23, 219, 255, 0.58)"
                                    fontSize={{ base: 'xl', md: '2xl' }}
                                    fontWeight="900"
                                    letterSpacing="0.02em"
                                    boxShadow="0 0 0 1px rgba(23, 219, 255, 0.35), inset 0 0 20px rgba(23, 219, 255, 0.2), 0 0 20px rgba(23, 219, 255, 0.32)"
                                    _hover={{
                                        bg: 'linear-gradient(180deg, rgba(20,67,80,0.96) 0%, rgba(14,50,64,0.98) 100%)',
                                        boxShadow: '0 0 0 1px rgba(23, 219, 255, 0.45), inset 0 0 26px rgba(23, 219, 255, 0.28), 0 0 28px rgba(23, 219, 255, 0.42)',
                                        transform: 'translateY(-1px)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    isDisabled={isTossing}
                                    onClick={() => handleThrowCoin(0)}
                                >
                                    TAILS
                                </Button>
                            </Flex>
                        </VStack>
                    </VStack>
                </Box>
            </VStack>
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                         How to Play Coin Flip
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                     Step into the action and test your luck in Coin Flip!
                                </Text>
                                <Text mb={1}>
                                     -The coin will be tossed and the result will be displayed.
                                </Text>
                                <Text mb={1}>
                                     -You can choose to bet on HEADS or TAILS.
                                </Text>
                                <Text mb={1}>
                                     -if your choice is correct, earn 1.95× your bet instantly.
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Card>
    );
}   