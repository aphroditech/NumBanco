import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Image,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
    VStack,
} from '@chakra-ui/react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import History from './RockItems/History';
import RealView from './RockItems/RealView';

import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { betRock, rockCashOut, rockBang, setRockLastHouse } from '../../action/rockActions';

import KeyboardImage from "assets/img/Rock/keyboard.jpg"
import rockSvg from 'assets/img/Rock/rock.svg';
import paperSvg from 'assets/img/Rock/paper.svg';
import scissorsSvg from 'assets/img/Rock/scissors.svg';

import thinking from "assets/img/Rock/thinking.gif";
import win from "assets/img/Rock/win.gif";
import lose from "assets/img/Rock/lose.gif";

const CHOICES = {
    rock: { key: 'rock', label: 'Rock', src: rockSvg },
    paper: { key: 'paper', label: 'Paper', src: paperSvg },
    scissors: { key: 'scissors', label: 'Scissors', src: scissorsSvg },
};

/** n = 1-based card index (1st card n=1, 2nd n=2, …). */
function multiplierForCard(n) {
    return 1 + 0.1 * n + 0.05 * n * n;
}

/** 0-based slot index i → uses n = i + 1. */
function multiplierForSlotIndex(i0) {
    return multiplierForCard(i0 + 1);
}

/** Layout: must match `LadderSlot` column width + `gap` on the row Flex. */
const CARD_W_PX = 104;
const COLUMN_W_PX = CARD_W_PX + 8;
const COL_GAP_PX = 20;
const COL_STRIDE_PX = COLUMN_W_PX + COL_GAP_PX;
/** How many face-down cards to render ahead of the current position. */
const PREVIEW_AHEAD = 28;

const C = {
    panel: '#2a2d2e',
    inputBg: '#323738',
    border: 'rgba(255,255,255,0.08)',
    muted: 'rgba(255,255,255,0.55)',
    accent: '#55ccff',
    accentHover: '#47b8e6',
    accentBorder: 'rgba(85, 204, 255, 0.55)',
    green: '#68d391',
    greenGlow: 'rgba(104, 211, 145, 0.45)',
    yellow: '#f6e05e',
    red: '#ff4d4d',
    stage: '#0a0e14',
    disabledBg: 'rgba(55, 65, 70, 0.9)',
    disabledText: 'rgba(255,255,255,0.35)',
};

/** User pick tiles — sizes / plinth (visual only) */
const RPS_PICK = {
    w: { base: '86px', md: '102px' },
    h: { base: '90px', md: '106px' },
    baseH: '11px',
};

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
/** Full-screen win celebration after cash out (Jackal-style). */
const OUTCOME_WIN_MS = 1400;
/** Bust flash: show then auto-hide quickly; round resets to idle so BET is ready. */
const BUST_FX_MS = 1020;

function clampBet(raw, maxBal) {
    const n = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n)) return MIN_AMOUNT;
    const fixed = Math.round(n * 100) / 100;
    return Math.max(MIN_AMOUNT, Math.min(Math.min(MAX_AMOUNT, maxBal || MAX_AMOUNT), fixed));
}

function pickWinner(player, house) {
    if (player === house) return 'tie';
    if (
        (player === 'rock' && house === 'scissors') ||
        (player === 'paper' && house === 'rock') ||
        (player === 'scissors' && house === 'paper')
    ) {
        return 'player';
    }
    return 'house';
}

function randomChoice() {
    const keys = Object.keys(CHOICES);
    return keys[Math.floor(Math.random() * keys.length)];
}

/** House play that loses to `player` (player wins). */
function houseChoicePlayerWins(player) {
    if (player === 'rock') return 'scissors';
    if (player === 'paper') return 'rock';
    return 'paper';
}

/** House play that beats `player` (house wins). */
function houseChoiceHouseWins(player) {
    if (player === 'rock') return 'paper';
    if (player === 'paper') return 'scissors';
    return 'rock';
}

/** Single ladder column: face-down (card back), revealed hand, multiplier below. */
function LadderSlot({
    mult,
    result,
    isNextToReveal,
    isResolving,
    actualMultiplier, // The actual multiplier that was active when this result occurred
}) {
    const faceDown = !result;
    const outcome = result?.outcome;

    let borderColor = 'rgba(255,255,255,0.14)';
    let ringGradient = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 100%)';
    let outerGlow = '0 8px 32px rgba(0,0,0,0.55)';
    if (result) {
        if (outcome === 'player') {
            borderColor = '#4ade80';
            ringGradient =
                'linear-gradient(135deg, rgba(134,239,172,0.95) 0%, rgba(34,197,94,0.5) 50%, rgba(21,128,61,0.4) 100%)';
            outerGlow = `0 0 28px rgba(74, 222, 128, 0.45), 0 12px 40px rgba(0,0,0,0.5)`;
        } else if (outcome === 'tie') {
            borderColor = '#facc15';
            ringGradient = 'linear-gradient(135deg, rgba(253,224,71,0.9) 0%, rgba(234,179,8,0.45) 100%)';
            outerGlow = `0 0 24px rgba(250, 204, 21, 0.35), 0 12px 40px rgba(0,0,0,0.5)`;
        } else if (outcome === 'house') {
            borderColor = '#f87171';
            ringGradient = 'linear-gradient(135deg, rgba(252,165,165,0.95) 0%, rgba(239,68,68,0.55) 100%)';
            outerGlow = `0 0 26px rgba(248, 113, 113, 0.4), 0 12px 40px rgba(0,0,0,0.5)`;
        }
    } else if (isNextToReveal) {
        borderColor = 'rgba(56, 189, 248, 0.85)';
        ringGradient =
            'linear-gradient(135deg, rgba(125,211,252,0.95) 0%, rgba(14,165,233,0.55) 45%, rgba(59,130,246,0.35) 100%)';
        outerGlow = `0 0 32px rgba(56, 189, 248, 0.42), 0 0 60px rgba(99, 102, 241, 0.15), 0 12px 40px rgba(0,0,0,0.45)`;
    }

    const box = `${CARD_W_PX}px`;
    /** Fixed body height so every ladder column matches (face-down and revealed). */
    const cardH = { base: '124px', md: '136px' };

    // Use actual multiplier for ties (the multiplier that was active when the tie occurred)
    // For other outcomes, use the slot's theoretical multiplier
    const displayMultiplier = (result && outcome === 'tie' && actualMultiplier) ? actualMultiplier : mult;

    const multTone =
        isNextToReveal && faceDown
            ? {
                bg: 'linear-gradient(135deg, rgba(56,189,248,0.35) 0%, rgba(99,102,241,0.2) 100%)',
                color: '#7dd3fc',
                border: 'rgba(125,211,252,0.45)',
            }
            : result && outcome === 'player'
                ? {
                    bg: 'linear-gradient(135deg, rgba(74,222,128,0.28) 0%, rgba(22,163,74,0.12) 100%)',
                    color: '#86efac',
                    border: 'rgba(134,239,172,0.35)',
                }
                : result && outcome === 'tie'
                    ? {
                        bg: 'linear-gradient(135deg, rgba(250,204,21,0.22) 0%, rgba(202,138,4,0.1) 100%)',
                        color: '#fde047',
                        border: 'rgba(253,224,71,0.35)',
                    }
                    : result && outcome === 'house'
                        ? {
                            bg: 'linear-gradient(135deg, rgba(248,113,113,0.25) 0%, rgba(185,28,28,0.12) 100%)',
                            color: '#fca5a5',
                            border: 'rgba(248,113,113,0.35)',
                        }
                        : {
                            bg: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.45)',
                            border: 'rgba(255,255,255,0.1)',
                        };

    return (
        <Flex
            direction="column"
            align="center"
            gap={2}
            flexShrink={0}
            w={`${CARD_W_PX + 8}px`}
            minW={`${CARD_W_PX + 8}px`}
        >
            <Box position="relative" w={box} maxW={box}>
                {(isNextToReveal && faceDown) || (result && !faceDown) ? (
                    <Box
                        position="absolute"
                        inset="-3px"
                        borderRadius="18px"
                        bg={ringGradient}
                        opacity={isNextToReveal && faceDown ? 0.55 : 0.35}
                        zIndex={0}
                        filter="blur(10px)"
                        pointerEvents="none"
                        aria-hidden
                    />
                ) : null}
                <Flex
                    position="relative"
                    zIndex={1}
                    w={box}
                    h={cardH}
                    minH={cardH}
                    maxH={cardH}
                    maxW={box}
                    flexShrink={0}
                    borderRadius="16px"
                    align="center"
                    justify="center"
                    border="2px solid"
                    borderColor={borderColor}
                    boxShadow={`${outerGlow}, inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -12px 28px rgba(0,0,0,0.35)`}
                    transition="all 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
                    opacity={isResolving && isNextToReveal ? 0.9 : 1}
                    overflow="hidden"
                    sx={
                        faceDown
                            ? {
                                background:
                                    'radial-gradient(ellipse 100% 80% at 50% -10%, rgba(56,189,248,0.18) 0%, transparent 52%), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(99,102,241,0.12) 0%, transparent 45%), linear-gradient(168deg, #1a2a42 0%, #0d1524 42%, #121c2e 100%)',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                        'repeating-linear-gradient(-52deg, transparent, transparent 5px, rgba(255,255,255,0.025) 5px, rgba(255,255,255,0.025) 6px)',
                                    pointerEvents: 'none',
                                },
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                        'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 48%, transparent 62%)',
                                    pointerEvents: 'none',
                                },
                            }
                            : {
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                background:
                                    'linear-gradient(168deg, rgba(48,56,72,0.88) 0%, rgba(22,26,34,0.94) 55%, rgba(16,20,28,0.96) 100%)',
                            }
                    }
                >
                    {faceDown ? (
                        <Text
                            position="relative"
                            zIndex={1}
                            fontSize={{ base: '2xl', md: '3xl' }}
                            fontWeight="900"
                            letterSpacing="0.2em"
                            bgGradient="linear(to-br, rgba(255,255,255,0.55), rgba(125,211,252,0.35), rgba(99,102,241,0.25))"
                            bgClip="text"
                            sx={{
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: isNextToReveal ? 'drop-shadow(0 0 12px rgba(56,189,248,0.55))' : undefined,
                            }}
                        >
                            ?
                        </Text>
                    ) : (
                        <Box
                            position="relative"
                            zIndex={1}
                            w="62%"
                            h="62%"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Box
                                position="absolute"
                                inset="-15%"
                                borderRadius="full"
                                bg="radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)"
                                filter="blur(8px)"
                            />
                            <Image
                                src={CHOICES[result.house].src}
                                alt=""
                                w="100%"
                                h="100%"
                                objectFit="contain"
                                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 20px rgba(255,255,255,0.08))"
                                draggable={false}
                            />
                        </Box>
                    )}
                </Flex>
            </Box>
            <Box
                px={{ base: '10px', md: '12px' }}
                py="4px"
                minH={{ base: '30px', md: '32px' }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="full"
                border="1px solid"
                borderColor={multTone.border}
                bg={multTone.bg}
                boxShadow="0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)"
            >
                <Text
                    fontSize={{ base: 'xs', md: 'sm' }}
                    fontWeight="900"
                    color={multTone.color}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontfeaturesettings="'tnum'"
                    letterSpacing="0.04em"
                >
                    {displayMultiplier.toFixed(2)}×
                </Text>
            </Box>
        </Flex>
    );
}

/** Player portrait — layered box-shadow only (rim, depth, cyan bloom). */
function RockPlayerAvatar({ user }) {
    const src = user?.avatar || '/avatars/pfp1.png';
    const box = { base: '50px', sm: '58px', md: '68px' };

    return (
        <Flex direction="column" align="center" justify="flex-end" flexShrink={0} pb={{ base: 0.5, md: 0 }}>
            <Box
                position="relative"
                w={box}
                h={box}
                borderRadius="full"
                overflow="hidden"
                bg="#0c0f14"
            >
                <Image src={src} alt="Your avatar" w="100%" h="100%" objectFit="cover" draggable={false} />
            </Box>
            <Text
                mt={1.5}
                fontSize="8px"
                fontWeight="800"
                letterSpacing="0.18em"
                color="rgba(255,255,255,0.4)"
                textTransform="uppercase"
            >
                You
            </Text>
        </Flex>
    );
}

export default function RockPage() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const rockRecentHouses = useSelector((state) => state.histories?.rockRecentHouses) ?? [];
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance || MAX_AMOUNT));

    const [mode, setMode] = useState('manual');
    const [amount, setAmount] = useState('0.50');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [pick, setPick] = useState(null);

    const history = useHistory();
    const dispatch = useDispatch();

    /** idle | playing */
    const [phase, setPhase] = useState('idle');
    const [lockedBet, setLockedBet] = useState(null);
    /** Index of the card BET will flip next (0, 1, 2, … — unlimited). */
    const [nextSlot, setNextSlot] = useState(0);
    /** Payout multiplier = the tier M of the **last card you won** (ties advance without changing it). */
    const [accumulatedMult, setAccumulatedMult] = useState(1);
    /** Per-slot: { house, outcome } after reveal (sparse object by index). */
    const [slotResults, setSlotResults] = useState({});
    const [isResolving, setIsResolving] = useState(false);
    const [autoRunning, setAutoRunning] = useState(false);
    const [bustFxVisible, setBustFxVisible] = useState(false);
    const [bustFxKey, setBustFxKey] = useState(0);
    const [bustReason, setBustReason] = useState('');
    const [winFxVisible, setWinFxVisible] = useState(false);
    const [winFxKey, setWinFxKey] = useState(0);
    const [winFlash, setWinFlash] = useState(null);
    const winFxTimerRef = useRef(null);
    const bustFxTimerRef = useRef(null);
    const [sessionProfit, setSessionProfit] = useState(0);
    // Timer for showing win image for 1 second after regular wins
    const winImageTimerRef = useRef(null);
    const [showWinImage, setShowWinImage] = useState(false);
    /** Multiplier M from the last **passed** card (win or tie); shapes next reveal odds. */
    const [passOddsMult, setPassOddsMult] = useState(null);
    /** After first BET of a round, hands are enabled; each hand click places a bet. */
    const [pickingUnlocked, setPickingUnlocked] = useState(false);

    const ladderContainerRef = useRef(null);
    const [rowTranslateX, setRowTranslateX] = useState(0);

    const amountNum = useMemo(() => clampBet(amount, maxAmount), [amount, maxAmount]);

    // Determine which GIF to display based on game state
    const getCurrentGif = () => {
        // Win conditions: cashout success or win flash visible
        if (winFxVisible || winFlash) {
            return win;
        }
        
        // Check if we should show win image for 1 second after regular win
        if (showWinImage) {
            return win;
        }
        
        // Check if there's a recent win in slot results (but don't show win image immediately)
        const slotIndices = Object.keys(slotResults).map(Number).sort((a, b) => b - a);
        if (slotIndices.length > 0) {
            const latestSlot = slotIndices[0];
            const latestResult = slotResults[latestSlot];
            if (latestResult && latestResult.outcome === 'player') {
                // Don't immediately return win - let timer handle it
                return thinking;
            }
            if (latestResult && latestResult.outcome === 'house') {
                return lose;
            }
        }
        
        // Lose conditions: bust effect visible
        if (bustFxVisible) {
            return lose;
        }
        
        // Default: thinking
        return thinking;
    };

    const currentGif = getCurrentGif();

    const clearWinFxTimer = useCallback(() => {
        if (winFxTimerRef.current != null) {
            window.clearTimeout(winFxTimerRef.current);
            winFxTimerRef.current = null;
        }
    }, []);

    const clearBustFxTimer = useCallback(() => {
        if (bustFxTimerRef.current != null) {
            window.clearTimeout(bustFxTimerRef.current);
            bustFxTimerRef.current = null;
        }
    }, []);

    useEffect(
        () => () => {
            clearWinFxTimer();
            clearBustFxTimer();
        },
        [clearBustFxTimer, clearWinFxTimer],
    );

    const winCelebrationConfetti = useMemo(() => {
        if (!winFxVisible) return [];
        return Array.from({ length: 32 }).map((_, i) => {
            const leftPct = 6 + Math.random() * 88;
            const delay = Math.random() * 0.35;
            const rot = Math.random() * 360;
            const gold = Math.random() < 0.45;
            const hue = gold ? 38 + Math.random() * 28 : 168 + Math.random() * 55;
            const drift = (Math.random() - 0.5) * 70;
            const size = 5 + Math.random() * 7;
            const duration = 1.35 + Math.random() * 0.55;
            return { i, leftPct, delay, rot, hue, drift, size, duration };
        });
    }, [winFxVisible, winFxKey]);

    useLayoutEffect(() => {
        const el = ladderContainerRef.current;
        if (!el) return;
        const update = () => {
            const w = el.offsetWidth;
            if (!w) return;
            const centerOfNext = nextSlot * COL_STRIDE_PX + COLUMN_W_PX / 2;
            setRowTranslateX(w / 2 - centerOfNext);
        };
        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [nextSlot]);

    const resetGameOnly = useCallback(() => {
        setPhase('idle');
        setLockedBet(null);
        setNextSlot(0);
        setAccumulatedMult(1);
        setSlotResults({});
        setPassOddsMult(null);
        setBustReason('');
        setPickingUnlocked(false);
        setPick(null);
        // Clear win image timer
        if (winImageTimerRef.current) {
            clearTimeout(winImageTimerRef.current);
            winImageTimerRef.current = null;
        }
        setShowWinImage(false);
    }, []);

    const resetBoard = useCallback(() => {
        clearBustFxTimer();
        clearWinFxTimer();
        setWinFxVisible(false);
        setWinFlash(null);
        setBustFxVisible(false);
        resetGameOnly();
    }, [clearBustFxTimer, clearWinFxTimer, resetGameOnly]);

    const cashOut = useCallback(async () => {
        if (phase !== 'playing') return;
        const bet = lockedBet ?? amountNum;
        const multSnap = accumulatedMult;
        const payout = bet * multSnap;
        const pickSnap = pick;
        const data = {
            betAmount: bet,
            multiplier: multSnap,
        };

        await rockCashOut(data, dispatch, history);
        setSessionProfit((s) => s + payout);
        toast.success(`Cashed out $${payout.toFixed(2)}`);
        setWinFlash({
            cashOut: true,
            mult: multSnap,
            payout,
            pickKey: pickSnap || 'rock',
        });


        setWinFxKey((k) => k + 1);
        setWinFxVisible(true);
        resetGameOnly();
        clearWinFxTimer();
        winFxTimerRef.current = window.setTimeout(() => {
            winFxTimerRef.current = null;
            setWinFxVisible(false);
            setWinFlash(null);
        }, OUTCOME_WIN_MS);
    }, [
        accumulatedMult,
        amountNum,
        clearWinFxTimer,
        lockedBet,
        phase,
        pick,
        resetGameOnly,
    ]);

    const startRoundFromBet = useCallback(() => {
        if (isResolving || bustFxVisible) return;
        if (phase !== 'idle') return;

        const bet = clampBet(amount, maxAmount);
        if (bet > balance) {
            toast.error('Insufficient balance');
            return;
        }

        setLockedBet(bet);
        setPhase('playing');
        setPickingUnlocked(true);
        setPick(null);
    }, [amount, balance, bustFxVisible, isResolving, maxAmount, phase]);

    const resolveBetWithPick = useCallback(
        async (playerChoice) => {
            if (isResolving) return;
            if (!pickingUnlocked || phase !== 'playing') return;

            const bet = lockedBet ?? clampBet(amount, maxAmount);
            if (bet > balance) {
                toast.error('Insufficient balance');
                return;
            }

            setPick(playerChoice);
            setIsResolving(true);

            const data = {
                betAmount: bet,
                multiplier: multiplierForSlotIndex(nextSlot),
                isStart: nextSlot === 0,
            };
            const isWin = await betRock(data, dispatch, history);
            if (isWin !== 0 && isWin !== 1 && isWin !== 2) {
                setIsResolving(false);
                toast.error('Could not resolve this bet. Please try again.');
                return;
            }
            await new Promise((r) => setTimeout(r, 380));

            const slotIdx = nextSlot;
            const tierMult = multiplierForSlotIndex(slotIdx);

            const { house, outcome } =
                isWin === 2
                    ? { house: houseChoicePlayerWins(playerChoice), outcome: 'player' }
                    : isWin === 1
                        ? { house: playerChoice, outcome: 'tie' }
                        : { house: houseChoiceHouseWins(playerChoice), outcome: 'house' };

            setSlotResults((prev) => ({
                ...prev,
                [slotIdx]: { house, outcome, actualMultiplier: accumulatedMult },
            }));
            dispatch(setRockLastHouse({ house, outcome }));

            // If player won a regular round, show win image for 1 second
            if (outcome === 'player') {
                // Clear any existing timer
                if (winImageTimerRef.current) {
                    clearTimeout(winImageTimerRef.current);
                }
                // Show win image immediately
                setShowWinImage(true);
                // Hide win image after 1 second and return to thinking
                winImageTimerRef.current = setTimeout(() => {
                    setShowWinImage(false);
                    winImageTimerRef.current = null;
                }, 1000);
            }

            if (outcome === 'house') {
                const bangPayload = {
                    betAmount: bet,
                    multiplier: tierMult,
                };
                await rockBang(bangPayload, dispatch, history);

                setBustFxKey((k) => k + 1);
                setBustReason(`${CHOICES[house].label} beats ${CHOICES[playerChoice].label}.`);
                setBustFxVisible(true);
                setIsResolving(false);
                setPhase('idle');
                setLockedBet(null);
                setPassOddsMult(null);
                setPickingUnlocked(false);
                setPick(null);
                toast.error('Bust!');
                clearBustFxTimer();
                bustFxTimerRef.current = window.setTimeout(() => {
                    bustFxTimerRef.current = null;
                    setBustFxVisible(false);
                    setBustReason('');
                    setNextSlot(0);
                    setAccumulatedMult(1);
                    setSlotResults({});
                }, BUST_FX_MS);
                return;
            }

            if (outcome === 'player') {
                setAccumulatedMult(tierMult);
            }

            setPassOddsMult(tierMult);
            setNextSlot(slotIdx + 1);
            setPhase('playing');
            setIsResolving(false);
            setPick(null);
        },
        [
            amount,
            balance,
            clearBustFxTimer,
            dispatch,
            history,
            isResolving,
            lockedBet,
            maxAmount,
            nextSlot,
            phase,
            pickingUnlocked,
        ],
    );

    const onBet = useCallback(() => {
        startRoundFromBet();
    }, [startRoundFromBet]);

    useEffect(() => {
        if (mode !== 'auto' || !autoRunning || isResolving || bustFxVisible) return undefined;
        const t = window.setTimeout(() => {
            if (phase === 'idle') {
                startRoundFromBet();
            } else if (phase === 'playing' && pickingUnlocked) {
                resolveBetWithPick(randomChoice());
            }
        }, 850);
        return () => window.clearTimeout(t);
    }, [
        autoRunning,
        bustFxVisible,
        isResolving,
        mode,
        phase,
        pickingUnlocked,
        resolveBetWithPick,
        startRoundFromBet,
    ]);

    const handleHalf = useCallback(() => {
        const cur = parseFloat(amount || String(MIN_AMOUNT));
        const base = Number.isFinite(cur) ? cur : MIN_AMOUNT;
        setAmount(Math.max(MIN_AMOUNT, base / 2).toFixed(2));
    }, [amount]);

    const handleDouble = useCallback(() => {
        const cur = parseFloat(amount || String(MIN_AMOUNT));
        const base = Number.isFinite(cur) ? cur : MIN_AMOUNT;
        setAmount(Math.min(maxAmount, base * 2).toFixed(2));
    }, [amount, maxAmount]);

    const handleMax = useCallback(() => {
        setAmount(maxAmount.toFixed(2));
    }, [maxAmount]);

    const onRandomPick = useCallback(() => {
        if (!pickingUnlocked || phase !== 'playing' || isResolving || bustFxVisible) return;
        resolveBetWithPick(randomChoice());
    }, [bustFxVisible, isResolving, phase, pickingUnlocked, resolveBetWithPick]);

    const canCashOut = phase === 'playing' && nextSlot > 0;

    const betDisabled =
        isResolving ||
        (mode === 'auto' && autoRunning) ||
        bustFxVisible ||
        phase !== 'idle';

    const handsDisabled =
        !pickingUnlocked ||
        phase !== 'playing' ||
        isResolving ||
        bustFxVisible;

    const effectivePayout =
        (lockedBet ?? amountNum) * accumulatedMult;

    const nextWinProbPct = useMemo(() => {
        if (passOddsMult == null) return null;
        const pWin = Math.min(0.45, Math.max(0.12, 1 / passOddsMult));
        return Math.round(pWin * 1000) / 10;
    }, [passOddsMult]);


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
                handleHalf();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                handleDouble();
                return;
            }
            if (e.key === 'r') {
                e.preventDefault();
                onRandomPick();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                cashOut();
                return;
            }
            if (e.keyCode === 32 || e.code === 'Space') {
                if (e.repeat) return;
                e.preventDefault();
                startRoundFromBet();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [cashOut, handleDouble, handleHalf, isHelpModalOpen, onRandomPick, startRoundFromBet]);

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
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
                <GridItem area="panel" minW={0} display="flex" flexDirection="column">
                    <Card
                        pt={{ base: '22px', md: '28px' }}
                        pb={{ base: '18px', md: '22px' }}
                        px={{ base: '16px', md: '22px' }}
                        overflow="visible"
                        bg={C.panel}
                        border={`1px solid ${C.border}`}
                        borderRadius="16px"
                        flex="1"
                        boxShadow="0 8px 32px rgba(0,0,0,0.35)"
                    >
                        <CardBody p={0} display="flex" flexDirection="column" position="relative">
                            <Box position="absolute" top="-8px" right="-12px" zIndex={2}>
                                <IconButton
                                    aria-label="Help"
                                    icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                    size="md"
                                    bg="transparent"
                                    color={C.accent}
                                    borderRadius="50%"
                                    _hover={{ bg: 'rgba(255,255,255,0.08)', color: C.accentHover }}
                                    onClick={() => setIsHelpModalOpen(true)}
                                />
                            </Box>

                            <VStack spacing="20px" align="stretch" w="100%" maxW={{ base: '100%', sm: '320px' }} mx="auto">
                                <Flex align="center" gap="8px">
                                    <WhatshotIcon style={{ fontSize: 22, color: C.accent }} />
                                    <Text fontSize="sm" color="#fff" fontWeight="700">
                                        Rock · Paper · Scissors
                                    </Text>
                                </Flex>


                                <FormControl w="100%">
                                    <Flex justify="space-between" align="baseline" mt="10px" mb="8px" gap="8px">
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
                                            bg={C.inputBg}
                                            borderRadius="22px"
                                            h="48px"
                                            pl="12px"
                                            pr="0"
                                            overflow="hidden"
                                            border={`1px solid ${C.border}`}
                                            boxShadow="inset 0 2px 6px rgba(0,0,0,0.25)"
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
                                                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                                onBlur={() => setAmount(clampBet(amount, maxAmount).toFixed(2))}
                                                placeholder="0.50"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
                                                minW="0"
                                                isDisabled={phase === 'playing'}
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
                                                        borderLeft={`1px solid ${C.border}`}
                                                        _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                        onClick={handleHalf}
                                                        isDisabled={isResolving || phase === 'playing'}
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
                                                        borderLeft={`1px solid ${C.border}`}
                                                        _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                        onClick={handleDouble}
                                                        isDisabled={isResolving || phase === 'playing'}
                                                    >
                                                        2×
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        h="100%"
                                                        minW="52px"
                                                        px="10px"
                                                        bg="transparent"
                                                        color={C.accent}
                                                        fontSize="xs"
                                                        fontWeight="800"
                                                        borderRadius="0"
                                                        borderLeft={`1px solid ${C.border}`}
                                                        _hover={{ bg: 'rgba(255,255,255,0.08)' }}
                                                        onClick={handleMax}
                                                        isDisabled={isResolving || phase === 'playing'}
                                                    >
                                                        Max
                                                    </Button>
                                                </HStack>
                                            </HStack>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                <VStack spacing="15px" mb="8px" w="100%">
                                    <Button
                                        mt={3}
                                        h="46px"
                                        borderRadius="20px"
                                        bg={C.accent}
                                        color="#fff"
                                        fontWeight="800"
                                        w="100%"
                                        _hover={{ bg: C.accentHover }}
                                        isDisabled={betDisabled}
                                        onClick={onBet}
                                    >
                                        BET
                                    </Button>


                                    <Button
                                        mt={3}
                                        h="46px"
                                        borderRadius="20px"
                                        w="100%"
                                        fontWeight="800"
                                        bg={canCashOut ? 'rgba(34, 197, 94, 0.22)' : C.disabledBg}
                                        color={canCashOut ? '#86efac' : C.disabledText}
                                        border={`1px solid ${canCashOut ? 'rgba(74, 222, 128, 0.45)' : C.border}`}
                                        _hover={canCashOut ? { bg: 'rgba(34, 197, 94, 0.32)' } : {}}
                                        isDisabled={!canCashOut}
                                        onClick={cashOut}
                                    >
                                        Cash out
                                    </Button>
                                </VStack>

                                <Button
                                    h="42px"
                                    borderRadius="12px"
                                    bg="rgba(255,255,255,0.06)"
                                    color="rgba(255,255,255,0.9)"
                                    fontWeight="700"
                                    border={`1px solid ${C.border}`}
                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                    onClick={onRandomPick}
                                    isDisabled={handsDisabled}
                                >
                                    Random pick
                                </Button>

                                <Box mt={1}>
                                    <Flex justify="space-between" align="baseline" mb="8px" gap="8px">
                                        <Text fontSize="sm" color="#fff" fontWeight="700">
                                            Current multiplier
                                        </Text>
                                        <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                            ${effectivePayout.toFixed(2)} payout
                                        </Text>
                                    </Flex>
                                    <GradientBorder borderRadius="24px" w="100%">
                                        <Flex
                                            w="100%"
                                            align="center"
                                            justify="space-between"
                                            bg={C.inputBg}
                                            borderRadius="22px"
                                            h="48px"
                                            pl="16px"
                                            pr="12px"
                                            border={`1px solid ${C.border}`}
                                            boxShadow="inset 0 2px 6px rgba(0,0,0,0.25)"
                                        >
                                            <Text fontSize="md" fontWeight="bold" color="rgba(255,255,255,0.95)">
                                                {accumulatedMult.toFixed(2)}×
                                            </Text>
                                        </Flex>
                                    </GradientBorder>
                                </Box>


                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="game" minH={{ base: '420px', md: '480px' }} minW={0}>
                    <Card
                        position="relative"
                        pt={{ base: '20px', md: '28px' }}
                        pb={{ base: '24px', md: '32px' }}
                        px={{ base: 4, md: 6 }}
                        h="100%"
                        minH="100%"
                        bg={C.stage}
                        border={`1px solid ${C.border}`}
                        borderRadius="20px"
                        boxShadow="0 24px 48px rgba(0,0,0,0.4)"
                        overflow="visible"
                        sx={{
                            backgroundImage: `
                radial-gradient(ellipse 100% 80% at 50% -30%, rgba(85, 204, 255, 0.12) 0%, transparent 55%),
                linear-gradient(180deg, #0c1218 0%, #070b0f 100%)
              `,
                        }}
                    >
                        {/* GIF Display Circle - Top Left */}
                        <Box
                            position="absolute"
                            top="20px"
                            left="20px"
                            w="80px"
                            h="80px"
                            overflow="hidden"
                            zIndex={10}
                        >
                            <Image
                                src={currentGif}
                                alt="Game state"
                                w="100%"
                                h="100%"
                                objectFit="cover"
                                draggable={false}
                            />
                        </Box>
                        <AnimatePresence>
                            {winFxVisible && winFlash && (
                                <motion.div
                                    key={`rock-win-${winFxKey}`}
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
                                        padding: '48px 12px 72px',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Box
                                        position="absolute"
                                        inset={0}
                                        bg="linear-gradient(165deg, rgba(0,40,48,0.55) 0%, rgba(0,0,0,0.72) 45%, rgba(20,10,8,0.65) 100%)"
                                        backdropFilter="blur(10px)"
                                        sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                    />
                                    <motion.div
                                        aria-hidden
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 0.5, scale: 1 }}
                                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            position: 'absolute',
                                            width: 'min(420px, 90vw)',
                                            height: 'min(420px, 90vw)',
                                            borderRadius: '50%',
                                            border: '1px solid rgba(0, 212, 255, 0.18)',
                                            boxShadow:
                                                '0 0 80px rgba(0, 212, 255, 0.12), inset 0 0 60px rgba(0, 212, 255, 0.06)',
                                        }}
                                    />
                                    <motion.div
                                        aria-hidden
                                        animate={{ scale: [1, 1.04, 1], opacity: [0.25, 0.4, 0.25] }}
                                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{
                                            position: 'absolute',
                                            width: 'min(360px, 85vw)',
                                            height: 'min(360px, 85vw)',
                                            borderRadius: '50%',
                                            border: '1px solid rgba(255, 200, 120, 0.12)',
                                        }}
                                    />
                                    {winCelebrationConfetti.map((c) => (
                                        <motion.div
                                            key={`${winFxKey}-c-${c.i}`}
                                            initial={{ opacity: 0, y: -20, x: 0, rotate: c.rot, scale: 0.6 }}
                                            animate={{
                                                opacity: [0, 1, 0.9, 0],
                                                y: 220,
                                                x: c.drift,
                                                rotate: c.rot + 180,
                                                scale: 1,
                                            }}
                                            transition={{ duration: c.duration, delay: c.delay, ease: [0.22, 1, 0.36, 1] }}
                                            style={{
                                                position: 'absolute',
                                                top: '18%',
                                                left: `${c.leftPct}%`,
                                                width: `${c.size}px`,
                                                height: `${c.size * 1.6}px`,
                                                borderRadius: '3px',
                                                background: `hsl(${c.hue} 78% 58%)`,
                                                boxShadow: '0 0 14px rgba(255,255,255,0.15)',
                                            }}
                                        />
                                    ))}
                                    <motion.div
                                        initial={{ opacity: 0, y: 16, scale: 0.94 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.06 }}
                                        style={{
                                            position: 'relative',
                                            maxWidth: 'min(340px, 92vw)',
                                            width: '100%',
                                        }}
                                    >
                                        <Box
                                            borderRadius="20px"
                                            overflow="hidden"
                                            border="1px solid rgba(255,255,255,0.14)"
                                            bg="rgba(12, 18, 24, 0.55)"
                                            backdropFilter="blur(16px)"
                                            sx={{ WebkitBackdropFilter: 'blur(16px)' }}
                                            boxShadow="0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,212,255,0.08) inset"
                                            px={{ base: 5, md: 7 }}
                                            py={{ base: 5, md: 6 }}
                                            textAlign="center"
                                        >
                                            <Text
                                                fontSize="10px"
                                                fontWeight="800"
                                                letterSpacing="0.35em"
                                                color="rgba(180, 240, 255, 0.85)"
                                                mb={3}
                                            >
                                                CASHED OUT
                                            </Text>
                                            <motion.div
                                                initial={{ scale: 0.88, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.12 }}
                                                style={{ marginBottom: 12 }}
                                            >
                                                <Image
                                                    src={CHOICES[winFlash.pickKey]?.src}
                                                    alt=""
                                                    mx="auto"
                                                    maxH="72px"
                                                    objectFit="contain"
                                                    filter="drop-shadow(0 12px 28px rgba(0,0,0,0.65))"
                                                    draggable={false}
                                                />
                                            </motion.div>
                                            <Text
                                                fontSize={{ base: '36px', md: '42px' }}
                                                fontWeight="900"
                                                lineHeight="1"
                                                letterSpacing="-0.03em"
                                                fontFamily="system-ui, -apple-system, sans-serif"
                                                bgGradient="linear(to-br, #ffffff, #7aebff, #c8f7ff)"
                                                bgClip="text"
                                                sx={{
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}
                                                mb={1}
                                            >
                                                ×{Number(winFlash.mult).toFixed(2)}
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.55)" mb={1}>
                                                You secured your payout
                                            </Text>
                                            <Text fontSize="xl" fontWeight="800" color="rgba(255,255,255,0.95)">
                                                +${Number(winFlash.payout).toFixed(2)}
                                            </Text>
                                        </Box>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {bustFxVisible && (
                                <motion.div
                                    key={`rock-bust-${bustFxKey}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.14 }}
                                    style={{
                                        position: 'absolute',
                                        top: 10,
                                        left: 0,
                                        right: 0,
                                        zIndex: 12,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        padding: '0 12px',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18, ease: 'easeOut' }}
                                        style={{ position: 'relative', maxWidth: 'min(640px, 95vw)', width: '100%' }}
                                    >
                                        <Box
                                            borderRadius="10px"
                                            border="1px solid rgba(248, 113, 113, 0.45)"
                                            bg="rgba(35, 12, 16, 0.9)"
                                            boxShadow="0 8px 22px rgba(0,0,0,0.35)"
                                            px={{ base: 3, md: 4 }}
                                            py={{ base: 2.5, md: 3 }}
                                            textAlign="center"
                                        >
                                            <Text
                                                fontSize={{ base: '13px', md: '14px' }}
                                                fontWeight="800"
                                                color="rgba(248, 113, 113, 0.98)"
                                                lineHeight="1.3"
                                            >
                                                Bust - {bustReason || 'House beats your pick.'}
                                            </Text>
                                        </Box>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Box position="relative" w="100%" zIndex={1}>
                            <Flex direction="column" align="stretch" gap={6}>
                                <Box w="100%">
                                    <Text
                                        mb={3}
                                        fontSize="xs"
                                        fontWeight="800"
                                        color={C.muted}
                                        textAlign="center"
                                        letterSpacing="0.14em"
                                        textTransform="uppercase"
                                        w="100%"
                                    >
                                        House cards · your pick: {pick ? CHOICES[pick].label : '—'}
                                    </Text>
                                    <Flex w="100%" justify="center" align="center" minH={{ base: 'auto', md: '44px' }}>
                                        <VStack align="center" spacing={1} w={{ base: '100%', md: 'auto' }} maxW="100%">
                                            <Text
                                                fontSize="8px"
                                                fontWeight="800"
                                                letterSpacing="0.14em"
                                                color={C.muted}
                                                textTransform="uppercase"
                                                textAlign="center"
                                            >
                                                Recent house (3)
                                            </Text>
                                            <HStack
                                                spacing={1.5}
                                                align="stretch"
                                                justify="center"
                                                w="100%"
                                                maxW={{ base: '100%', md: '280px' }}
                                            >
                                                {[0, 1, 2].map((i) => {
                                                    const entry = rockRecentHouses[i];
                                                    const c =
                                                        entry?.house && CHOICES[entry.house]
                                                            ? CHOICES[entry.house]
                                                            : null;
                                                    return (
                                                        <Box
                                                            key={i}
                                                            flex="1"
                                                            minW="0"
                                                            maxW={{ base: '33%', md: '88px' }}
                                                            bg="rgba(18, 22, 30, 0.92)"
                                                            border="1px solid rgba(85, 204, 255, 0.2)"
                                                            borderRadius="10px"
                                                            px={1.5}
                                                            py={1.5}
                                                            boxShadow="0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
                                                        >
                                                            <VStack spacing={0.5} align="center">
                                                                {c ? (
                                                                    <Image
                                                                        src={c.src}
                                                                        alt=""
                                                                        w="26px"
                                                                        h="26px"
                                                                        objectFit="contain"
                                                                        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.5))"
                                                                        draggable={false}
                                                                    />
                                                                ) : (
                                                                    <Box
                                                                        w="26px"
                                                                        h="26px"
                                                                        borderRadius="6px"
                                                                        bg="rgba(255,255,255,0.06)"
                                                                    />
                                                                )}

                                                            </VStack>
                                                        </Box>
                                                    );
                                                })}
                                            </HStack>
                                        </VStack>
                                    </Flex>
                                </Box>

                                <Box
                                    ref={ladderContainerRef}
                                    w="100%"
                                    overflow="hidden"
                                    pt={{ base: 8, md: 10 }}
                                    pb={{ base: 7, md: 9 }}
                                    px={{ base: 2, md: 3 }}
                                    minH={{ base: '228px', md: '252px' }}
                                    position="relative"
                                >
                                    <Flex
                                        align="flex-end"
                                        justify="flex-start"
                                        gap={`${COL_GAP_PX}px`}
                                        flexWrap="nowrap"
                                        w="max-content"
                                        style={{
                                            transform: `translateX(${rowTranslateX}px)`,
                                            transition: 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
                                        }}
                                    >
                                        {Array.from(
                                            { length: Math.max(nextSlot + PREVIEW_AHEAD, 12) },
                                            (_, idx) => (
                                                <LadderSlot
                                                    key={idx}
                                                    mult={multiplierForSlotIndex(idx)}
                                                    result={slotResults[idx]}
                                                    isNextToReveal={idx === nextSlot}
                                                    isResolving={isResolving}
                                                    actualMultiplier={slotResults[idx]?.actualMultiplier}
                                                />
                                            ),
                                        )}
                                    </Flex>
                                </Box>

                                <Flex align="center" justify="center" gap={6} pt={2} borderTop={`1px solid ${C.border}`} flexWrap="wrap">
                                    <Text fontSize="xs" color={C.muted} fontWeight="600">
                                        Next card: {nextSlot + 1} · ∞
                                    </Text>
                                    <Text fontSize="xs" color={C.muted} fontWeight="600">
                                        {bustFxVisible
                                            ? 'Bust'
                                            : phase === 'idle'
                                                ? 'Tap BET to choose hands'
                                                : 'Pick a hand to bet'}
                                    </Text>
                                </Flex>

                                <Flex direction="column" align="center" mt={2}>
                                    <Flex
                                        align="flex-end"
                                        justify="center"
                                        gap={{ base: 2, sm: 3, md: 4 }}
                                        w="100%"
                                        maxW={{ base: '100%', md: '760px' }}
                                        mx="auto"
                                        position="relative"
                                        py={{ base: 2, md: 3 }}
                                        flexWrap={{ base: 'wrap', md: 'nowrap' }}
                                    >
                                        <Flex
                                            align="flex-end"
                                            justify="center"
                                            gap={{ base: 3, md: 8 }}
                                            flex={{ base: '1 1 100%', md: '1 1 auto' }}
                                            minW={0}
                                            maxW="560px"
                                        >
                                            {(['rock', 'paper', 'scissors']).map((key) => {
                                                const c = CHOICES[key];
                                                const selected = pick === key;
                                                const activeLook = !handsDisabled;
                                                const housingBg = activeLook
                                                    ? selected
                                                        ? 'linear-gradient(165deg, #2f3a4a 0%, #1e2633 42%, #121820 100%)'
                                                        : 'linear-gradient(165deg, #2c3644 0%, #1c242f 45%, #10161e 100%)'
                                                    : 'linear-gradient(165deg, #2a303c 0%, #1c202a 100%)';
                                                const rimColor = activeLook
                                                    ? selected
                                                        ? 'rgba(120, 200, 255, 0.65)'
                                                        : 'rgba(100, 170, 210, 0.38)'
                                                    : 'rgba(255,255,255,0.08)';
                                                const outerShadow = activeLook
                                                    ? selected
                                                        ? `0 0 0 1px rgba(255,255,255,0.1), 0 -6px 22px rgba(85, 204, 255, 0.22), 0 18px 44px rgba(0,0,0,0.6)`
                                                        : `0 0 0 1px rgba(255,255,255,0.06), 0 -4px 18px rgba(85, 204, 255, 0.14), 0 14px 40px rgba(0,0,0,0.55)`
                                                    : '0 8px 24px rgba(0,0,0,0.45)';
                                                return (
                                                    <Button
                                                        key={key}
                                                        variant="unstyled"
                                                        display="flex"
                                                        flexDirection="column"
                                                        alignItems="center"
                                                        justifyContent="flex-end"
                                                        h="auto"
                                                        minW={RPS_PICK.w}
                                                        p={0}
                                                        zIndex={1}
                                                        cursor={handsDisabled ? 'not-allowed' : 'pointer'}
                                                        onClick={() => !handsDisabled && resolveBetWithPick(key)}
                                                        opacity={activeLook ? (isResolving ? 0.72 : 1) : 0.4}
                                                        isDisabled={handsDisabled}
                                                        transition="opacity 0.25s ease, transform 0.2s ease"
                                                        _hover={
                                                            activeLook
                                                                ? { transform: 'translateY(-4px)' }
                                                                : undefined
                                                        }
                                                        _active={activeLook ? { transform: 'translateY(0px)' } : undefined}
                                                    >
                                                        <Flex direction="column" align="center" w={RPS_PICK.w}>
                                                            <Box position="relative" w={RPS_PICK.w} maxW={RPS_PICK.w}>
                                                                {activeLook ? (
                                                                    <Box
                                                                        position="absolute"
                                                                        inset="-6px"
                                                                        borderRadius="18px"
                                                                        bg="radial-gradient(ellipse 85% 70% at 50% 0%, rgba(85,204,255,0.45), rgba(85,204,255,0.08) 55%, transparent 72%)"
                                                                        filter="blur(14px)"
                                                                        opacity={0.55}
                                                                        zIndex={0}
                                                                        pointerEvents="none"
                                                                        aria-hidden
                                                                    />
                                                                ) : null}
                                                                <Box
                                                                    position="relative"
                                                                    zIndex={1}
                                                                    w={RPS_PICK.w}
                                                                    h={RPS_PICK.h}
                                                                    borderRadius="15px"
                                                                    border="2px solid"
                                                                    borderColor={rimColor}
                                                                    bg={housingBg}
                                                                    boxShadow={`${outerShadow}, inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -14px 28px rgba(0,0,0,0.55)`}
                                                                    p={{ base: '6px', md: '8px' }}
                                                                    transition="box-shadow 0.25s ease, border-color 0.25s ease"
                                                                    sx={
                                                                        activeLook
                                                                            ? {
                                                                                '&::before': {
                                                                                    content: '""',
                                                                                    position: 'absolute',
                                                                                    inset: 0,
                                                                                    borderRadius: '13px',
                                                                                    background:
                                                                                        'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, transparent 42%, transparent 58%, rgba(0,0,0,0.2) 100%)',
                                                                                    pointerEvents: 'none',
                                                                                },
                                                                            }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <Flex
                                                                        w="100%"
                                                                        h="100%"
                                                                        borderRadius="10px"
                                                                        align="center"
                                                                        justify="center"
                                                                        bg={
                                                                            activeLook
                                                                                ? 'linear-gradient(180deg, #3a424e 0%, #2f353f 45%, #262b34 100%)'
                                                                                : 'rgba(6,8,14,0.72)'
                                                                        }
                                                                        backdropFilter={activeLook ? undefined : 'blur(12px)'}
                                                                        sx={
                                                                            activeLook
                                                                                ? undefined
                                                                                : { WebkitBackdropFilter: 'blur(12px)' }
                                                                        }
                                                                        boxShadow={
                                                                            activeLook
                                                                                ? 'inset 0 4px 16px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.07)'
                                                                                : 'inset 0 2px 14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)'
                                                                        }
                                                                        border="1px solid"
                                                                        borderColor={
                                                                            activeLook
                                                                                ? 'rgba(0,0,0,0.45)'
                                                                                : 'rgba(255,255,255,0.06)'
                                                                        }
                                                                    >
                                                                        <Image
                                                                            src={c.src}
                                                                            alt={c.label}
                                                                            w={activeLook ? '66%' : '54%'}
                                                                            h={activeLook ? '66%' : '54%'}
                                                                            maxW={activeLook ? '64px' : '56px'}
                                                                            maxH={activeLook ? '64px' : '56px'}
                                                                            objectFit="contain"
                                                                            filter={
                                                                                activeLook
                                                                                    ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.55)) saturate(1.12)'
                                                                                    : 'grayscale(1) brightness(0.65) opacity(0.75)'
                                                                            }
                                                                            draggable={false}
                                                                        />
                                                                    </Flex>
                                                                </Box>
                                                            </Box>
                                                            <Box
                                                                w="calc(100% + 4px)"
                                                                h={RPS_PICK.baseH}
                                                                mt="-1px"
                                                                borderRadius="0 0 8px 8px"
                                                                bg={
                                                                    activeLook
                                                                        ? 'linear-gradient(180deg, rgba(55,65,80,0.95) 0%, rgba(35,42,52,0.98) 100%)'
                                                                        : 'linear-gradient(180deg, #a8b0bc 0%, #6b7280 35%, #4b5563 70%, #374151 100%)'
                                                                }
                                                                boxShadow={
                                                                    activeLook
                                                                        ? '0 4px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)'
                                                                        : '0 5px 0 #1f2937, inset 0 1px 0 rgba(255,255,255,0.35)'
                                                                }
                                                                border="1px solid"
                                                                borderColor={
                                                                    activeLook ? 'rgba(85, 204, 255, 0.12)' : 'transparent'
                                                                }
                                                                borderTop="none"
                                                                position="relative"
                                                                overflow="hidden"
                                                            >
                                                                <Box
                                                                    position="absolute"
                                                                    inset="0 0 35% 0"
                                                                    bg="linear-gradient(90deg, #1a1f28 0%, #3d4656 50%, #1a1f28 100%)"
                                                                    opacity={activeLook ? 0.35 : 0.28}
                                                                />
                                                            </Box>
                                                            <Box
                                                                mt={2}
                                                                px={{ base: 2.5, md: 3 }}
                                                                py="5px"
                                                                borderRadius="full"
                                                                border="1px solid"
                                                                borderColor={
                                                                    activeLook
                                                                        ? 'rgba(85, 204, 255, 0.55)'
                                                                        : 'rgba(255,255,255,0.08)'
                                                                }
                                                                bg={
                                                                    activeLook
                                                                        ? 'linear-gradient(180deg, rgba(22,28,38,0.95) 0%, rgba(12,16,24,0.98) 100%)'
                                                                        : 'rgba(255,255,255,0.04)'
                                                                }
                                                                boxShadow={
                                                                    activeLook
                                                                        ? '0 0 14px rgba(85, 204, 255, 0.12), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                                                                        : '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
                                                                }
                                                            >
                                                                <Text
                                                                    fontSize="9px"
                                                                    fontWeight="800"
                                                                    letterSpacing="0.14em"
                                                                    color={
                                                                        activeLook
                                                                            ? '#ffffff'
                                                                            : 'rgba(255,255,255,0.28)'
                                                                    }
                                                                    textTransform="uppercase"
                                                                >
                                                                    {c.label}
                                                                </Text>
                                                            </Box>
                                                        </Flex>
                                                    </Button>
                                                );
                                            })}
                                        </Flex>
                                        <Flex
                                            justify={{ base: 'flex-end', md: 'flex-start' }}
                                            w={{ base: '100%', md: 'auto' }}
                                            position="absolute"
                                            right={-2}
                                            bottom={2}
                                            pr={{ base: 1, sm: 2, md: 0 }}
                                        >
                                            <RockPlayerAvatar user={user} />
                                        </Flex>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Box>
                    </Card>
                </GridItem>

                <GridItem area="empty" minH={{ base: '200px', '1550px': 0 }} display="flex" flexDirection="column" minW={0}>
                    <RealView />
                </GridItem>
            </Grid>
            <History />

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} isCentered size="md">
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg={C.panel} border={`1px solid ${C.accentBorder}`}>
                    <ModalHeader color={C.accent}>Rock · Paper · Scissors</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: C.accent }} />
                    <ModalBody pb={6}>
                        <Text color="gray.300" fontSize="sm" mb={2}>
                            -Tap BET to start the round and unlock hands. Each time you tap Stone, Paper, or Scissors, that play is your bet
                            for the next card (row stays centered on it).
                        </Text>
                        <Text color="gray.300" fontSize="sm" mb={2}>
                            -When you win a card, your current multiplier becomes that
                            card’s M (it is not compounded across wins).
                        </Text>
                        <Text color="gray.300" fontSize="sm" mb={2}>
                            -Ties advance the ladder without changing your multiplier.
                        </Text>
                        <Text color="gray.300" fontSize="sm" mb={2}>
                            -The ladder has no last card — play until bust or cash out.
                        </Text>
                        <Image src={KeyboardImage} alt="Keyboard" />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
