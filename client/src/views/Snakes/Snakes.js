import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Image,
    Grid,
    GridItem,
    HStack,
    Input,
    useBreakpointValue,

    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Text,
    VStack,
} from '@chakra-ui/react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import History from './SnakesItem/History';
import RealView from './SnakesItem/RealView';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { snakesBet, snakesCashOut, bangSnake } from 'action/SnakesActions';
import { useHistory } from 'react-router-dom';
import snakeImage from 'assets/img/Snakes/snake.png';
import keyboardImage from "assets/img/Snakes/keyboard.jpg"

const MotionFlex = motion(Flex);
const MotionBox = motion(Box);

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const MAX_ROLLS_PER_BET = 5;
/** Delay between each tile when walking the ring (dice sum path). */
const PATH_STEP_MS = 78;
/** Pause on final tile before resolving multiplier / snake. */
const PATH_END_PAUSE_MS = 110;
/** Full-screen cash-out / snake bust FX (matches Jackal outcome timing). */
const OUTCOME_FX_MS = 1500;

/** Clockwise path from `fromIdx` to `toIdx` inclusive (12-ring). */
function buildRingPathInclusive(fromIdx, toIdx) {
    const path = [fromIdx];
    let c = fromIdx;
    while (c !== toIdx) {
        c = (c + 1) % 12;
        path.push(c);
    }
    return path;
}

/** Ring index 0 = top-left, then clockwise. Maps to grid (row, col) on 4×4 perimeter. */
const RING_TO_CELL = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [3, 2],
    [3, 1],
    [3, 0],
    [2, 0],
    [1, 0],
];

function cellToRingIndex(row, col) {
    const i = RING_TO_CELL.findIndex(([r, c]) => r === row && c === col);
    return i >= 0 ? i : -1;
}

/**
 * @typedef {{ kind: 'start'|'multiplier'|'snake'; mult?: number }} RingTile
 */

/** Stake-style Low board (clockwise from top-left). */
const BOARD_LOW = [
    { kind: 'start' },
    { kind: 'multiplier', mult: 2.0 },
    { kind: 'multiplier', mult: 1.3 },
    { kind: 'multiplier', mult: 1.2 },
    { kind: 'multiplier', mult: 1.1 },
    { kind: 'multiplier', mult: 1.01 },
    { kind: 'snake' },
    { kind: 'multiplier', mult: 1.01 },
    { kind: 'multiplier', mult: 1.1 },
    { kind: 'multiplier', mult: 1.2 },
    { kind: 'multiplier', mult: 1.3 },
    { kind: 'multiplier', mult: 2.0 },
];

/** Stake-style Medium board (Three snakes). */
const BOARD_MEDIUM = [
    { kind: 'start' },
    { kind: 'multiplier', mult: 4.0 },
    { kind: 'multiplier', mult: 2.5 },
    { kind: 'multiplier', mult: 1.4 },
    { kind: 'multiplier', mult: 1.11 },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'multiplier', mult: 1.11 },
    { kind: 'multiplier', mult: 1.4 },
    { kind: 'multiplier', mult: 2.5 },
    { kind: 'multiplier', mult: 4.0 },
];

/**
 * Hard: five snakes in a band on the right and bottom (ring indices 4–8),
 * high multipliers on top and left (7.50× / 3.00× / 1.38×), clockwise from (0,0).
 */
const BOARD_HARD = [
    { kind: 'start' },
    { kind: 'multiplier', mult: 7.5 },
    { kind: 'multiplier', mult: 3.0 },
    { kind: 'multiplier', mult: 1.38 },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'snake' },
    { kind: 'multiplier', mult: 1.38 },
    { kind: 'multiplier', mult: 3.0 },
    { kind: 'multiplier', mult: 7.5 },
];

const BOARDS = {
    low: BOARD_LOW,
    medium: BOARD_MEDIUM,
    hard: BOARD_HARD,
};

const DIFFICULTY = {
    low: { key: 'low', label: 'LOW' },
    medium: { key: 'medium', label: 'MEDIUM' },
    hard: { key: 'hard', label: 'HARD' },
};

/** Don’t steal keys from inputs, textareas, selects, buttons, or Chakra modals. */
function snakesHotkeysShouldIgnoreTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (target.isContentEditable) return true;
    const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!el) return true;
    if (el.closest?.('[role="dialog"]')) return true;
    const tag = el.tagName?.toUpperCase?.() ?? '';
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return true;
    return false;
}

function clampBetAmount(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return MIN_AMOUNT;
    const fixed = Math.round(n * 100) / 100;
    return Math.max(MIN_AMOUNT, Math.min(MAX_AMOUNT, fixed));
}

/** Server / API dice total; clamp to a valid two-dice range. */
function clampDiceSum(raw) {
    const s = Math.round(Number(raw));
    if (!Number.isFinite(s)) return null;
    if (s < 2 || s > 12) return null;
    return s;
}

/** Pick two faces 1–6 that add to `sum` (for display only). */
function splitDiceSum(sum) {
    const s = clampDiceSum(sum);
    if (s == null) return [1, 1];
    const d1 = Math.min(6, Math.max(1, s - 6));
    const d2 = s - d1;
    return [d1, d2];
}

function SnakeTileIcon() {
    return (
        <Box as="svg" viewBox="0 0 32 32" w="68%" h="68%" maxW="34px" maxH="34px" fill="none" aria-hidden>
            <path
                d="M16 6c-2.5 0-4 2-4 4.5 0 2 1.2 3.5 3 4.2 1 .5 1.5 1.2 1.5 2v1.5c0 1.5-1 2.8-2.5 3.2l-3 .8"
                stroke="#64748b"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
            />
            <ellipse cx="16" cy="7" rx="3.2" ry="2.8" fill="#475569" />
            <circle cx="14.2" cy="6.4" r="1" fill="#1e293b" />
            <circle cx="17.8" cy="6.4" r="1" fill="#1e293b" />
            <path d="M16 9.2v2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
        </Box>
    );
}

const DIE_LAYOUTS = {
    1: `". . ." ". a ." ". . ."`,
    2: `"a . ." ". . ." ". . c"`,
    3: `"a . ." ". b ." ". . c"`,
    4: `"a . c" ". . ." "d . f"`,
    5: `"a . c" ". b ." "d . f"`,
    6: `"a . c" "d . f" "g . i"`,
};

function DieFace({ value }) {
    const v = Math.min(6, Math.max(1, Math.round(Number(value)) || 1));
    const areas = DIE_LAYOUTS[v];
    const pips =
        v === 1
            ? ['a']
            : v === 2
                ? ['a', 'c']
                : v === 3
                    ? ['a', 'b', 'c']
                    : v === 4
                        ? ['a', 'c', 'd', 'f']
                        : v === 5
                            ? ['a', 'b', 'c', 'd', 'f']
                            : ['a', 'c', 'd', 'f', 'g', 'i'];

    return (
        <Flex
            w={{ base: '44px', md: '52px' }}
            h={{ base: '44px', md: '52px' }}
            bg="#cbd5e1"
            borderRadius="12px"
            boxShadow="0 4px 12px rgba(0,0,0,0.4), inset 0 -3px 0 rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.75)"
            border="1px solid rgba(255,255,255,0.35)"
            align="center"
            justify="center"
            p="7px"
        >
            <Grid
                templateAreas={areas}
                templateColumns="repeat(3, 1fr)"
                templateRows="repeat(3, 1fr)"
                w="100%"
                h="100%"
                gap="2px"
                alignItems="center"
                justifyItems="center"
            >
                {pips.map((name) => (
                    <GridItem key={name} area={name}>
                        <Box w="7px" h="7px" borderRadius="full" bg="#0f172a" />
                    </GridItem>
                ))}
            </Grid>
        </Flex>
    );
}

function PerimeterTile({
    children,
    isActive,
    isLanded,
    isSnake,
    wasVisited,
    onTransitPath,
    transitPing,
    transitBurstKey,
    landingImpact,
    landingImpactKey,
    ...rest
}) {
    const baseBg = isSnake
        ? 'linear-gradient(155deg, #363453 0%, #2a283f 45%, #1e1c32 100%)'
        : 'linear-gradient(155deg, #35556a 0%, #2a4554 42%, #1e343f 100%)';

    const visitedTint = isSnake
        ? 'linear-gradient(155deg, #3f3d5c 0%, #32304a 45%, #26243c 100%)'
        : 'linear-gradient(155deg, #3a6280 0%, #2d4f63 45%, #214251 100%)';

    const activeBg = isSnake
        ? 'linear-gradient(155deg, #4a4872 0%, #3a3858 45%, #2d2b45 100%)'
        : 'linear-gradient(155deg, #3d7a9a 0%, #2d6278 45%, #214a5c 100%)';

    const landedBg = isSnake
        ? 'linear-gradient(155deg, #4a2f56 0%, #3a2a4c 45%, #2b1f3b 100%)'
        : 'linear-gradient(155deg, #2b7ea0 0%, #256a86 42%, #1c5267 100%)';

    const transitBg = isSnake
        ? 'linear-gradient(155deg, #403e5e 0%, #34324c 45%, #282642 100%)'
        : 'linear-gradient(155deg, #3a5f78 0%, #2e4d60 45%, #254456 100%)';

    const tileBg = isLanded ? landedBg : isActive ? activeBg : onTransitPath ? transitBg : wasVisited ? visitedTint : baseBg;

    return (
        <MotionFlex
            position="relative"
            align="center"
            justify="center"
            minH={{ base: '58px', md: '70px' }}
            borderRadius="18px"
            overflow="hidden"
            bg={tileBg}
            borderWidth="1px"
            borderColor={
                isLanded
                    ? 'rgba(125, 249, 255, 0.98)'
                    : isActive
                        ? 'rgba(0, 212, 255, 0.85)'
                        : onTransitPath
                            ? 'rgba(0, 212, 255, 0.5)'
                            : wasVisited
                                ? 'rgba(0, 212, 255, 0.35)'
                                : 'rgba(255,255,255,0.10)'
            }
            boxShadow={
                isLanded
                    ? '0 0 0 1px rgba(170,250,255,0.58), 0 16px 34px rgba(0,0,0,0.56), 0 0 32px rgba(125,249,255,0.4), inset 0 0 26px rgba(125,249,255,0.16), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : isActive
                        ? '0 0 0 1px rgba(0,212,255,0.35), 0 12px 32px rgba(0,0,0,0.55), 0 0 28px rgba(0,212,255,0.35), inset 0 1px 0 rgba(255,255,255,0.18)'
                        : onTransitPath
                            ? '0 0 0 1px rgba(0,212,255,0.2), 0 10px 26px rgba(0,0,0,0.42), 0 0 18px rgba(0,212,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)'
                            : wasVisited
                                ? '0 8px 22px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,212,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : '0 8px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -4px 12px rgba(0,0,0,0.25)'
            }
            initial={false}
            animate={{
                scale: isLanded ? 1.085 : isActive ? 1.06 : onTransitPath ? 1.04 : wasVisited ? 1.02 : 1,
                y: isLanded ? -3 : isActive ? -2 : onTransitPath ? -1 : 0,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            opacity={isSnake && !isActive && !wasVisited && !onTransitPath ? 0.92 : 1}
            {...rest}
        >
            <Box
                position="absolute"
                inset={0}
                bg="linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 42%, rgba(0,0,0,0.18) 100%)"
                pointerEvents="none"
                borderRadius="18px"
            />
            {isLanded && (
                <>
                    <MotionBox
                        position="absolute"
                        inset="-2px"
                        borderRadius="20px"
                        pointerEvents="none"
                        border="2px solid rgba(170, 250, 255, 0.95)"
                        animate={{ opacity: [0.72, 1, 0.72], scale: [1, 1.035, 1] }}
                        transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <MotionBox
                        position="absolute"
                        top="7px"
                        right="7px"
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        pointerEvents="none"
                        bg="rgba(170,250,255,0.95)"
                        boxShadow="0 0 12px rgba(170,250,255,0.9)"
                        animate={{ opacity: [0.55, 1, 0.55], scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </>
            )}
            {isActive && (
                <>
                    <MotionBox
                        position="absolute"
                        inset="-1px"
                        borderRadius="18px"
                        border="2px solid rgba(0, 212, 255, 0.7)"
                        pointerEvents="none"
                        animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.04, 1] }}
                        transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <MotionBox
                        position="absolute"
                        inset={0}
                        borderRadius="18px"
                        bg="linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)"
                        pointerEvents="none"
                        initial={{ x: '-100%', opacity: 0.9 }}
                        animate={{ x: '120%', opacity: 0 }}
                        transition={{ duration: 0.65, ease: 'easeOut' }}
                    />
                </>
            )}
            {onTransitPath && !isActive && (
                <MotionBox
                    position="absolute"
                    inset={0}
                    borderRadius="18px"
                    pointerEvents="none"
                    bg="radial-gradient(circle at 50% 50%, rgba(0,212,255,0.28) 0%, transparent 72%)"
                    animate={{ opacity: [0.5, 0.95, 0.5] }}
                    transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}
            {transitPing && (
                <MotionBox
                    key={transitBurstKey}
                    position="absolute"
                    inset="-2px"
                    borderRadius="20px"
                    pointerEvents="none"
                    border="2px solid rgba(0, 212, 255, 0.75)"
                    initial={{ scale: 0.75, opacity: 0.95 }}
                    animate={{ scale: 1.35, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            )}
            {landingImpact && (
                <>
                    <MotionBox
                        key={`landing-core-${landingImpactKey}`}
                        position="absolute"
                        inset="4px"
                        borderRadius="15px"
                        pointerEvents="none"
                        bg="radial-gradient(circle at 50% 50%, rgba(125, 249, 255, 0.9) 0%, rgba(0, 212, 255, 0.35) 45%, transparent 75%)"
                        initial={{ opacity: 0.95, scale: 0.72 }}
                        animate={{ opacity: 0, scale: 1.28 }}
                        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <MotionBox
                        key={`landing-ring-${landingImpactKey}`}
                        position="absolute"
                        inset="-5px"
                        borderRadius="24px"
                        pointerEvents="none"
                        border="2px solid rgba(125, 249, 255, 0.9)"
                        initial={{ opacity: 0.92, scale: 0.65 }}
                        animate={{ opacity: 0, scale: 1.46 }}
                        transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <MotionBox
                        key={`landing-diag-a-${landingImpactKey}`}
                        position="absolute"
                        top="50%"
                        left="50%"
                        w="56px"
                        h="2px"
                        borderRadius="full"
                        pointerEvents="none"
                        bg="linear-gradient(90deg, transparent, rgba(170, 250, 255, 0.95), transparent)"
                        initial={{ opacity: 0.9, x: '-50%', y: '-50%', scaleX: 0.45, rotate: -28 }}
                        animate={{ opacity: 0, scaleX: 1.35 }}
                        transition={{ duration: 0.36, ease: 'easeOut' }}
                    />
                    <MotionBox
                        key={`landing-diag-b-${landingImpactKey}`}
                        position="absolute"
                        top="50%"
                        left="50%"
                        w="56px"
                        h="2px"
                        borderRadius="full"
                        pointerEvents="none"
                        bg="linear-gradient(90deg, transparent, rgba(170, 250, 255, 0.95), transparent)"
                        initial={{ opacity: 0.9, x: '-50%', y: '-50%', scaleX: 0.45, rotate: 28 }}
                        animate={{ opacity: 0, scaleX: 1.35 }}
                        transition={{ duration: 0.36, ease: 'easeOut' }}
                    />
                </>
            )}
            {wasVisited && !isActive && !onTransitPath && (
                <MotionBox
                    position="absolute"
                    inset={0}
                    borderRadius="18px"
                    pointerEvents="none"
                    animate={{ opacity: [0.25, 0.55, 0.25] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    bg="radial-gradient(circle at 50% 50%, rgba(0,212,255,0.2) 0%, transparent 70%)"
                />
            )}
            <Box position="relative" zIndex={1}>
                {children}
            </Box>
        </MotionFlex>
    );
}

function formatMult(m) {
    const x = Number(m);
    if (!Number.isFinite(x)) return '—';
    return x.toFixed(2);
}

export default function SnakesPage() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance || MAX_AMOUNT));

    const history = useHistory();
    const [amount, setAmount] = useState('0.50');
    const [difficulty, setDifficulty] = useState('medium');
    const dispatch = useDispatch();
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const helpModalSize = useBreakpointValue({ base: 'full', md: 'lg' }) || 'lg';

    /** 1–5 maps to server keys step1…step5 */
    const [step, setStep] = useState(1);

    /** idle | playing | rolling */
    const [phase, setPhase] = useState('idle');
    const [ringIndex, setRingIndex] = useState(0);
    const [totalMult, setTotalMult] = useState(1);
    const [die1, setDie1] = useState(1);
    const [die2, setDie2] = useState(1);
    const [stake, setStake] = useState(0);
    /** Successful rolls this round (Bet + each Roll); capped at MAX_ROLLS_PER_BET then auto cash out. */
    const [rollsCompleted, setRollsCompleted] = useState(0);
    /** Ring indices landed on this round (trail glow). */
    const [visitedRing, setVisitedRing] = useState(() => new Set());
    /** During `rolling`, tiles stepped through so far (glow trail while walking). */
    const [pathTransitSet, setPathTransitSet] = useState(() => new Set());
    const [lastTransitIdx, setLastTransitIdx] = useState(null);
    const [transitWave, setTransitWave] = useState(0);
    const [landingFxIdx, setLandingFxIdx] = useState(null);
    const [landingFxKey, setLandingFxKey] = useState(0);
    const autoCashOutHandledRef = useRef(false);
    const ringIndexRef = useRef(0);
    const pathTimersRef = useRef([]);
    const outcomeFxTimerRef = useRef(null);
    /** null | { type: 'snake' } | { type: 'cashout'; win: number; mult: number } */
    const [outcomeFx, setOutcomeFx] = useState(null);
    const [outcomeFxKey, setOutcomeFxKey] = useState(0);

    const board = BOARDS[difficulty] || BOARDS.low;

    useEffect(() => {
        ringIndexRef.current = ringIndex;
    }, [ringIndex]);

    const clearPathTimers = useCallback(() => {
        pathTimersRef.current.forEach((id) => window.clearTimeout(id));
        pathTimersRef.current = [];
    }, []);

    const clearOutcomeFxTimer = useCallback(() => {
        if (outcomeFxTimerRef.current != null) {
            window.clearTimeout(outcomeFxTimerRef.current);
            outcomeFxTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => clearPathTimers(), [clearPathTimers]);
    useEffect(() => () => clearOutcomeFxTimer(), [clearOutcomeFxTimer]);

    const handleAmountChange = (e) => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(v);
    };

    const handleAmountBlur = () => {
        setAmount(clampBetAmount(amount).toFixed(2));
    };

    const bet = clampBetAmount(amount);
    const potentialWin = useMemo(() => Math.round(stake * totalMult * 100) / 100, [stake, totalMult]);

    const showCashOutFxOverlay = outcomeFx?.type === 'cashout';
    const showSnakeFxOverlay = outcomeFx?.type === 'snake';

    const cashOutConfetti = useMemo(() => {
        if (!showCashOutFxOverlay) return [];
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
    }, [showCashOutFxOverlay, outcomeFxKey]);

    const snakeAmbientParticles = useMemo(() => {
        if (!showSnakeFxOverlay) return [];
        return Array.from({ length: 22 }).map((_, i) => ({
            i,
            leftPct: Math.random() * 100,
            delay: Math.random() * 0.8,
            duration: 2.8 + Math.random() * 1.8,
            y0: 10 + Math.random() * 40,
            opacity: 0.14 + Math.random() * 0.22,
            w: 2 + Math.random() * 3,
        }));
    }, [showSnakeFxOverlay, outcomeFxKey]);

    const resetRound = useCallback(() => {
        clearPathTimers();
        clearOutcomeFxTimer();
        setOutcomeFx(null);
        setPhase('idle');
        setRingIndex(0);
        setTotalMult(1);
        setStake(0);
        setRollsCompleted(0);
        setStep(1);
        setDie1(1);
        setDie2(1);
        setVisitedRing(new Set());
        setPathTransitSet(new Set());
        setLastTransitIdx(null);
        setLandingFxIdx(null);
        autoCashOutHandledRef.current = false;
    }, [clearPathTimers, clearOutcomeFxTimer]);

    const armOutcomeFxThenReset = useCallback(() => {
        clearOutcomeFxTimer();
        outcomeFxTimerRef.current = window.setTimeout(() => {
            outcomeFxTimerRef.current = null;
            setOutcomeFx(null);
            resetRound();
        }, OUTCOME_FX_MS);
    }, [clearOutcomeFxTimer, resetRound]);

    const resolveLanding = useCallback(
        async (nextIdx) => {
            const tile = board[nextIdx];
            if (!tile) return;
            setLandingFxIdx(nextIdx);
            setLandingFxKey((k) => k + 1);

            if (tile.kind === 'snake') {
                const data = {
                    multiplier: parseFloat(totalMult.toFixed(2)),
                    betAmount: parseFloat(amount),
                    step: `step${step}`,
                    level: difficulty === 'low' ? 'easy' : difficulty,
                }
                await bangSnake(data, dispatch, history);
                toast.error('Bang! You hit a snake.');
                setOutcomeFxKey((k) => k + 1);
                setOutcomeFx({ type: 'snake' });
                setPhase('outcome');
                armOutcomeFxThenReset();
                return;
            }

            if (tile.kind === 'multiplier' && tile.mult != null) {
                setTotalMult((m) => Math.round(m * tile.mult * 10000) / 10000);
            }
            setRollsCompleted((rc) => Math.min(rc + 1, MAX_ROLLS_PER_BET));
            setPhase('playing');
        },
        [board, armOutcomeFxThenReset],
    );

    /**
     * Move by `diceSum` from API: S tiles along path (start is tile 1) → ring index (S - 1) mod 12.
     * Die faces are derived from `diceSum` for display only.
     */
    const applyRoll = useCallback(
        (diceSum) => {
            const s = clampDiceSum(diceSum);
            if (s == null) return;
            const [d1, d2] = splitDiceSum(s);
            setDie1(d1);
            setDie2(d2);

            clearPathTimers();

            const fromIdx = ringIndexRef.current;
            const toIdx = (fromIdx + s - 1 + 12) % 12;
            const path = buildRingPathInclusive(fromIdx, toIdx);

            path.forEach((idx, step) => {
                const id = window.setTimeout(() => {
                    setRingIndex(idx);
                    setPathTransitSet(new Set(path.slice(0, step + 1)));
                    setLastTransitIdx(idx);
                    setTransitWave((w) => w + 1);
                }, step * PATH_STEP_MS);
                pathTimersRef.current.push(id);
            });

            const endDelay = Math.max(0, (path.length - 1) * PATH_STEP_MS) + PATH_END_PAUSE_MS;
            const endId = window.setTimeout(() => {
                clearPathTimers();
                setPathTransitSet(new Set());
                setLastTransitIdx(null);
                setVisitedRing((prev) => {
                    const next = new Set(prev);
                    path.forEach((i) => next.add(i));
                    return next;
                });
                resolveLanding(toIdx);
            }, endDelay);
            pathTimersRef.current.push(endId);
        },
        [resolveLanding, clearPathTimers],
    );

    /** When `resetToStart`, path resets to tile 0 before this roll. `diceSum` comes from the server. */
    const runRollSequence = useCallback(
        (resetToStart, diceSum) => {
            const s = clampDiceSum(diceSum);
            if (s == null) {
                setPhase('idle');
                return;
            }
            setPhase('rolling');
            if (resetToStart) {
                setRingIndex(0);
            }
            window.setTimeout(() => {
                applyRoll(s);
            }, 520);
        },
        [applyRoll],
    );

    const onBet = () => {
        if (phase !== 'idle') return;

        const b = clampBetAmount(amount);
        if (b > balance) {
            toast.error('Insufficient balance');
            return;
        }
        if (b < MIN_AMOUNT || b > MAX_AMOUNT) {
            toast.error(`Bet amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
            return;
        }
        setStake(b);
        setRingIndex(0);
        setTotalMult(1);
        setRollsCompleted(0);
        setStep(1);
        setPhase('playing');
        autoCashOutHandledRef.current = false;
        onRoll({ fromFreshBet: true });
    };

    const onRoll = async (options = {}) => {
        if (phase === 'rolling') return;
        const canStartFromBet = phase === 'idle' && (stake > 0 || options.fromFreshBet);
        if (phase !== 'playing' && !canStartFromBet) return;

        const level = difficulty === 'low' ? 'easy' : difficulty;
        const data = {
            betAmount: parseFloat(amount),
            level,
            step: `step${step}`,
            isStart: options.fromFreshBet ? true : false,
            multiplier: parseFloat(totalMult.toFixed(2)),
        };

        const diceSumRaw = await snakesBet(data, dispatch, history);
        const diceSum = clampDiceSum(diceSumRaw);
        if (diceSum == null) {
            toast.error('Roll failed. Please try again.');
            return;
        }

        runRollSequence(true, diceSum);
        setStep((prev) => Math.min(prev + 1, MAX_ROLLS_PER_BET));
    };

    const onCashOut = async () => {
        if (phase !== 'playing' || stake <= 0) return;
        const win = potentialWin;
        const data = {
            multiplier: parseFloat(totalMult.toFixed(2)),
            betAmount: parseFloat(amount),
            step: `step${step}`,
            level: difficulty === 'low' ? 'easy' : difficulty,
        }
        await snakesCashOut(data, dispatch);
        toast.success(`Cashed out $${win.toFixed(2)} at ${totalMult.toFixed(4)}×`);
        const multSnapshot = parseFloat(totalMult.toFixed(4));
        setOutcomeFxKey((k) => k + 1);
        setOutcomeFx({ type: 'cashout', win, mult: multSnapshot });
        setPhase('outcome');
        armOutcomeFxThenReset();
    };

    useEffect(() => {
        if (rollsCompleted < MAX_ROLLS_PER_BET) {
            autoCashOutHandledRef.current = false;
        }
    }, [rollsCompleted]);

    useEffect(() => {
        if (phase !== 'playing' || rollsCompleted !== MAX_ROLLS_PER_BET || stake <= 0) return;
        if (autoCashOutHandledRef.current) return;
        autoCashOutHandledRef.current = true;
        const win = Math.round(stake * totalMult * 100) / 100;
        const multSnapshot = parseFloat(totalMult.toFixed(4));
        toast.success(`Auto cashed out $${win.toFixed(2)} at ${totalMult.toFixed(4)}× (5 rolls)`);
        setOutcomeFxKey((k) => k + 1);
        setOutcomeFx({ type: 'cashout', win, mult: multSnapshot });
        setPhase('outcome');
        armOutcomeFxThenReset();
    }, [rollsCompleted, phase, stake, totalMult, armOutcomeFxThenReset]);

    const renderRingCell = (row, col) => {
        const idx = cellToRingIndex(row, col);
        if (idx < 0) return null;
        const tile = board[idx];
        const isLanded = phase === 'playing' && ringIndex === idx;
        const isActive = phase === 'rolling' && ringIndex === idx;
        const wasVisited = visitedRing.has(idx);
        const onTransitPath = phase === 'rolling' && pathTransitSet.has(idx) && !isActive;
        const transitPing = phase === 'rolling' && lastTransitIdx === idx;
        const landingImpact = landingFxIdx === idx;

        let inner;
        if (tile.kind === 'start') {
            inner = (
                <PlayArrowIcon
                    sx={{
                        fontSize: 28,
                        color: isActive ? '#7aebff' : '#5ea3c1',
                        filter: isActive ? 'drop-shadow(0 0 10px rgba(0,212,255,0.7))' : undefined,
                    }}
                />
            );
        } else if (tile.kind === 'snake') {
            inner = <Image src={snakeImage} alt="Snake" w="50px" h="50px" />;
        } else {
            inner = (
                <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    fontWeight="800"
                    color="#fff"
                    textShadow={
                        isActive
                            ? '0 0 16px rgba(0,212,255,0.55), 0 0 2px rgba(0,0,0,0.4)'
                            : wasVisited
                                ? '0 0 10px rgba(0,212,255,0.25)'
                                : '0 1px 2px rgba(0,0,0,0.45)'
                    }
                >
                    {formatMult(tile.mult)}×
                </Text>
            );
    }

    return (
            <PerimeterTile
                isActive={isActive}
                isLanded={isLanded}
                isSnake={tile.kind === 'snake'}
                wasVisited={wasVisited && !isActive}
                onTransitPath={onTransitPath}
                transitPing={transitPing}
                transitBurstKey={transitWave}
                landingImpact={landingImpact}
                landingImpactKey={landingFxKey}
            >
                {inner}
            </PerimeterTile>
        );
    };

    const canBet = phase === 'idle';
    const canRoll = phase === 'playing' && rollsCompleted < MAX_ROLLS_PER_BET;
    const showCashOutSlot = phase === 'playing' || phase === 'rolling';
    const canKeyboardCashOut = canRoll && phase !== 'rolling' && phase !== 'outcome';

    useEffect(() => {
        const onKeyDown = (e) => {
            if (isHelpModalOpen) return;
            if (snakesHotkeysShouldIgnoreTarget(e.target)) return;

            if (e.key === 'a' || e.key === 'A') {
                if (!canBet) return;
                e.preventDefault();
                setDifficulty('low');
                return;
            }
            if (e.key === 's' || e.key === 'S') {
                if (!canBet) return;
                e.preventDefault();
                setDifficulty('medium');
                return;
            }
            if (e.key === 'd' || e.key === 'D') {
                if (!canBet) return;
                e.preventDefault();
                setDifficulty('hard');
                return;
            }
            if (e.key === 'ArrowDown') {
                if (!canBet) return;
                e.preventDefault();
                const current = parseFloat(amount || String(MIN_AMOUNT));
                const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                setAmount(Math.max(MIN_AMOUNT, base / 2).toFixed(2));
                return;
            }
            if (e.key === 'ArrowUp') {
                if (!canBet) return;
                e.preventDefault();
                const current = parseFloat(amount || String(MIN_AMOUNT));
                const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                const next = Math.min(maxAmount, base * 2);
                setAmount(next.toFixed(2));
                return;
            }
            if (e.key === 'Enter') {
                if (!canKeyboardCashOut) return;
                if (e.repeat) return;
                e.preventDefault();
                void onCashOut();
                return;
            }
            if (e.key === ' ' || e.code === 'Space') {
                if (e.repeat) return;
                if (canBet) {
                    e.preventDefault();
                    onBet();
                    return;
                }
                /** Same as "Roll again" (enabled when `canRoll`; not during `rolling` / `outcome`). */
                if (canRoll) {
                    e.preventDefault();
                    void onRoll();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        isHelpModalOpen,
        canBet,
        canRoll,
        canKeyboardCashOut,
        amount,
        maxAmount,
        onBet,
        onCashOut,
        onRoll,
    ]);

    return (
        <Box
            px={{ base: '12px', sm: '16px', md: '24px' }}
            minH="100vh"
            bg="transparent"
            mt={{ base: '72px', md: '100px' }}
            pt={{ base: '8px', md: 0 }}
            w="100%"
            maxW="100%"
            overflowX="hidden"
        >
            <Grid
                templateAreas={{
                    sm: '"game" "panel" "live"',
                    md: '"game game" "panel live"',
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
                    '1550px': 'auto',
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem
                    area="panel"
                    minW={{ base: 0, md: 0, '1550px': 'min(100%, 320px)' }}
                    display="flex"
                    flexDirection="column"
                    minH="0"
                >
                    <Card
                        pt={{ base: '22px', md: '30px' }}
                        pb={{ base: '18px', md: '22px' }}
                        px={{ base: '16px', md: '22px' }}
                        minH={{ base: 'auto', md: '450px' }}
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
                            <VStack spacing="20px" align="stretch" w="100%" maxW={{ base: '100%', sm: '320px' }} mx="auto">

                                <Box display="flex" alignItems="center" gap="8px">
                                    <WhatshotIcon style={{ fontSize: 22, color: '#00D4FF' }} />
                                    <Text fontSize="sm" color="#fff" fontWeight="700">
                                        Snakes
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
                                                        onClick={() => {
                                                            const current = parseFloat(amount || String(MIN_AMOUNT));
                                                            const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                                                            setAmount(Math.max(MIN_AMOUNT, base / 2).toFixed(2));
                                                        }}
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
                                                        onClick={() => {
                                                            const current = parseFloat(amount || String(MIN_AMOUNT));
                                                            const base = Number.isFinite(current) ? current : MIN_AMOUNT;
                                                            const next = Math.min(maxAmount, base * 2);
                                                            setAmount(next.toFixed(2));
                                                        }}
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

                                <Box>
                                    <Text fontSize="sm" color="#fff" fontWeight="700" mb="8px">
                                        Difficulty
                                    </Text>
                                    <HStack spacing="8px">
                                        {Object.keys(DIFFICULTY).map((k) => (
                                            <Button
                                                key={k}
                                                flex="1"
                                                h="42px"
                                                borderRadius="10px"
                                                variant="unstyled"
                                                border="1px solid"
                                                borderColor={
                                                    difficulty === k ? 'rgba(0,212,255,0.6)' : 'rgba(255,255,255,0.16)'
                                                }
                                                bg={difficulty === k ? 'rgba(8,52,62,0.85)' : 'rgba(20,24,28,0.75)'}
                                                color={difficulty === k ? '#9ff4ff' : 'rgba(255,255,255,0.8)'}
                                                fontWeight="800"
                                                fontSize="xs"
                                                isDisabled={!canBet}
                                                onClick={() => setDifficulty(k)}
                                                _hover={{ borderColor: 'rgba(0,212,255,0.45)' }}
                                            >
                                                {DIFFICULTY[k].label}
                                            </Button>
                                        ))}
                                    </HStack>
                                </Box>

                                <VStack spacing="10px" w="100%">

                                    {showCashOutSlot ? (
                                        <Button
                                            h="46px"
                                            borderRadius="20px"
                                            w="100%"
                                            fontWeight="800"
                                            bg="rgba(34, 197, 94, 0.28)"
                                            color="#86efac"
                                            border="1px solid rgba(74, 222, 128, 0.45)"
                                            _hover={
                                                phase === 'rolling'
                                                    ? undefined
                                                    : { bg: 'rgba(34, 197, 94, 0.38)' }
                                            }
                                            onClick={onRoll}
                                            isDisabled={phase === 'rolling'}
                                        >
                                            {phase === 'rolling' ? 'Rolling dice…' : 'Roll again'}
                                        </Button>
                                    ) : (
                                        <Button
                                            h="46px"
                                            borderRadius="20px"
                                            bg="#00D4FF"
                                            color="#fff"
                                            fontWeight="800"
                                            w="100%"
                                            _hover={{ bg: '#00b8dc' }}
                                            onClick={onBet}
                                        >
                                            BET
                                        </Button>
                                    )}
                                    <Button
                                        h="46px"
                                        borderRadius="20px"
                                        w="100%"
                                        fontWeight="800"
                                        bg={canRoll ? 'rgba(55, 65, 70, 0.95)' : 'rgba(55, 65, 70, 0.9)'}
                                        color={canRoll ? '#fff' : 'rgba(255,255,255,0.35)'}
                                        border="1px solid rgba(255,255,255,0.12)"

                                        onClick={onCashOut}
                                        isDisabled={!canRoll || phase === 'rolling' || phase === 'outcome'}
                                    >
                                        Cash out
                                    </Button>

                                </VStack>

                                <Box>
                                    <Flex justify="space-between" align="baseline" mb="8px">
                                        <Text fontSize="sm" color="#fff" fontWeight="700">
                                            Current multiplier
                                        </Text>
                                        <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                            ${potentialWin.toFixed(2)} payout
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
                                                {totalMult.toFixed(4)}×
                                            </Text>
                                        </Flex>
                                    </GradientBorder>
                                </Box>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                {/* Game */}
                <GridItem area="game" display="flex" flexDirection="column" minH="0" minW={0}>
                    <Card
                        pt={{ base: '18px', md: '24px' }}
                        pb={{ base: '16px', md: '18px' }}
                        px={{ base: '14px', md: '20px' }}
                        minH={{ base: 'auto', md: '450px' }}
                        h="100%"
                        display="flex"
                        flexDirection="column"
                        flex="1"
                        overflow="visible"
                        position="relative"
                    >
                        <CardBody
                            flex="1"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            borderRadius="20px"
                            mx={{ base: -2, md: -1 }}
                            px={{ base: 4, md: 6 }}
                            py={{ base: 6, md: 8 }}
                            position="relative"
                            overflow="visible"
                            bg="#070b12"
                            backgroundImage="
                                radial-gradient(ellipse 85% 65% at 50% -5%, rgba(0, 212, 255, 0.14) 0%, transparent 52%),
                                radial-gradient(ellipse 70% 50% at 80% 100%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),
                                radial-gradient(ellipse 55% 45% at 15% 85%, rgba(0, 212, 255, 0.06) 0%, transparent 42%),
                                linear-gradient(180deg, #0b1220 0%, #0a1018 40%, #070b12 100%)
                            "
                            sx={{
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage:
                                        'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                    opacity: 0.45,
                                    pointerEvents: 'none',
                                },
                            }}
                        >
                            <Text
                                as="h1"
                                position="absolute"
                                top={{ base: '8px', md: '12px' }}
                                left="50%"
                                transform="translateX(-50%)"
                                zIndex={3}
                                fontFamily="'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive"
                                fontSize={{ base: '2.75rem', md: '3.35rem' }}
                                fontWeight="700"
                                color="#dff9ff"
                                letterSpacing="0.06em"
                                lineHeight="1"
                                textShadow="0 0 28px rgba(0, 212, 255, 0.5), 0 2px 12px rgba(0, 0, 0, 0.45)"
                                pointerEvents="none"
                                userSelect="none"
                            >
                                Snakes
                            </Text>
                            <MotionBox
                                position="absolute"
                                w="70%"
                                h="45%"
                                top="-8%"
                                left="50%"
                                transform="translateX(-50%)"
                                borderRadius="full"
                                bg="radial-gradient(circle, rgba(0, 212, 255, 0.13) 0%, transparent 68%)"
                                pointerEvents="none"
                                filter="blur(40px)"
                                animate={{ opacity: [0.55, 0.9, 0.55], scale: [1, 1.08, 1] }}
                                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <Box
                                w="100%"
                                maxW="440px"
                                mx="auto"
                                position="relative"
                                zIndex={1}
                                pt={{ base: '42px', md: '48px' }}
                            >
                                <Grid templateColumns="repeat(4, 1fr)" templateRows="repeat(4, 1fr)" gap={{ base: 2, md: 3 }}>
                                    {/* Explicit lines so ring (0,0) stays top-left; auto-placement was shifting the first column. */}
                                    <GridItem rowStart={1} colStart={1}>
                                        {renderRingCell(0, 0)}
                                    </GridItem>
                                    <GridItem rowStart={1} colStart={2}>
                                        {renderRingCell(0, 1)}
                                    </GridItem>
                                    <GridItem rowStart={1} colStart={3}>
                                        {renderRingCell(0, 2)}
                                    </GridItem>
                                    <GridItem rowStart={1} colStart={4}>
                                        {renderRingCell(0, 3)}
                                    </GridItem>

                                    <GridItem rowStart={2} colStart={1}>
                                        {renderRingCell(1, 0)}
                                    </GridItem>
                                    <GridItem rowStart={2} colStart={2} rowSpan={2} colSpan={2}>
                                        <Flex
                                            direction="column"
                                            align="center"
                                            justify="center"
                                            gap={4}
                                            h="100%"
                                            minH={{ base: '124px', md: '148px' }}
                                            borderRadius="22px"
                                            position="relative"
                                            overflow="hidden"
                                            border="1px solid rgba(0, 212, 255, 0.35)"
                                            bg="linear-gradient(165deg, rgba(26, 38, 52, 0.95) 0%, rgba(12, 18, 28, 0.98) 100%)"
                                            boxShadow="
                                                0 0 0 1px rgba(0,212,255,0.08),
                                                0 16px 40px rgba(0,0,0,0.45),
                                                inset 0 1px 0 rgba(255,255,255,0.1),
                                                inset 0 -8px 24px rgba(0,0,0,0.35)
                                            "
                                        >
                                            {/* Framer cannot tween box-shadows with different layer counts; pulse glow via opacity only. */}
                                            <MotionBox
                                                position="absolute"
                                                inset="-4px"
                                                borderRadius="24px"
                                                pointerEvents="none"
                                                zIndex={0}
                                                border="1px solid rgba(0, 212, 255, 0.35)"
                                                boxShadow="0 0 28px rgba(0, 212, 255, 0.4)"
                                                initial={false}
                                                animate={{
                                                    opacity: phase === 'rolling' ? [0.45, 1, 0.45] : 0,
                                                }}
                                                transition={{
                                                    duration: 1.1,
                                                    repeat: phase === 'rolling' ? Infinity : 0,
                                                    ease: 'easeInOut',
                                                }}
                                            />
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                bg="radial-gradient(circle at 50% 0%, rgba(0, 212, 255, 0.12) 0%, transparent 55%)"
                                                pointerEvents="none"
                                            />
                                            <HStack spacing={3} position="relative" zIndex={1}>
                                                <MotionBox
                                                    animate={phase === 'rolling' ? { rotate: [0, -8, 8, 0], y: [0, -2, 0] } : {}}
                                                    transition={{ duration: 0.5, repeat: phase === 'rolling' ? Infinity : 0, repeatDelay: 0.15 }}
                                                >
                                                    <DieFace value={die1} />
                                                </MotionBox>
                                                <MotionBox
                                                    animate={phase === 'rolling' ? { rotate: [0, 8, -8, 0], y: [0, -2, 0] } : {}}
                                                    transition={{ duration: 0.55, repeat: phase === 'rolling' ? Infinity : 0, repeatDelay: 0.12 }}
                                                >
                                                    <DieFace value={die2} />
                                                </MotionBox>
                                            </HStack>
                                            <Box
                                                px={8}
                                                py={3}
                                                borderRadius="16px"
                                                position="relative"
                                                zIndex={1}
                                                bg="linear-gradient(180deg, #0c121c 0%, #070a10 100%)"
                                                border="1px solid rgba(0, 212, 255, 0.22)"
                                                boxShadow="inset 0 2px 14px rgba(0,0,0,0.55), 0 0 20px rgba(0,212,255,0.08)"
                                            >
                                                <Text
                                                    fontSize={{ base: '2xl', md: '3xl' }}
                                                    fontWeight="900"
                                                    color="#fff"
                                                    textShadow="0 0 24px rgba(0,212,255,0.35)"
                                                >
                                                    {totalMult.toFixed(2)}×
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </GridItem>
                                    <GridItem rowStart={2} colStart={4}>
                                        {renderRingCell(1, 3)}
                                    </GridItem>

                                    <GridItem rowStart={3} colStart={1}>
                                        {renderRingCell(2, 0)}
                                    </GridItem>
                                    <GridItem rowStart={3} colStart={4}>
                                        {renderRingCell(2, 3)}
                                    </GridItem>

                                    <GridItem rowStart={4} colStart={1}>
                                        {renderRingCell(3, 0)}
                                    </GridItem>
                                    <GridItem rowStart={4} colStart={2}>
                                        {renderRingCell(3, 1)}
                                    </GridItem>
                                    <GridItem rowStart={4} colStart={3}>
                                        {renderRingCell(3, 2)}
                                    </GridItem>
                                    <GridItem rowStart={4} colStart={4}>
                                        {renderRingCell(3, 3)}
                                    </GridItem>
                                </Grid>
                            </Box>

                            <HStack spacing={2} mt={8} justify="center" aria-label="Roll progress">
                                {[0, 1, 2, 3, 4].map((i) => {
                                    const completed = i < rollsCompleted;
                                    const inProgress = phase === 'rolling' && i === rollsCompleted;
                                    return (
                                        <Box
                                            key={i}
                                            w={completed || inProgress ? '9px' : '8px'}
                                            h={completed || inProgress ? '9px' : '8px'}
                                            borderRadius="full"
                                            bg={
                                                completed
                                                    ? 'rgba(0,212,255,0.65)'
                                                    : inProgress
                                                        ? 'rgba(255,255,255,0.45)'
                                                        : 'rgba(255,255,255,0.12)'
                                            }
                                            boxShadow={inProgress ? '0 0 10px rgba(0,212,255,0.35)' : undefined}
                                        />
                                    );
                                })}
                            </HStack>

                            <AnimatePresence>
                                {showCashOutFxOverlay && outcomeFx?.type === 'cashout' && (
                                    <motion.div
                                        key={`snakes-win-${outcomeFxKey}`}
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
                                            padding: '72px 12px 100px',
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
                                        {cashOutConfetti.map((c) => (
                                            <motion.div
                                                key={`${outcomeFxKey}-c-${c.i}`}
                                                initial={{ opacity: 0, y: -20, x: 0, rotate: c.rot, scale: 0.6 }}
                                                animate={{
                                                    opacity: [0, 1, 0.9, 0],
                                                    y: 220,
                                                    x: c.drift,
                                                    rotate: c.rot + 180,
                                                    scale: 1,
                                                }}
                                                transition={{
                                                    duration: c.duration,
                                                    delay: c.delay,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
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
                                                    <WhatshotIcon
                                                        style={{
                                                            fontSize: 72,
                                                            color: '#7aebff',
                                                            filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.65))',
                                                        }}
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
                                                    ×{Number(outcomeFx.mult).toFixed(2)}
                                                </Text>
                                                <Text fontSize="sm" color="rgba(255,255,255,0.55)" mb={1}>
                                                    Locked in multiplier
                                                </Text>
                                                <Text fontSize="xl" fontWeight="800" color="rgba(255,255,255,0.95)">
                                                    +${Number(outcomeFx.win).toFixed(2)}
                                                </Text>
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {showSnakeFxOverlay && (
                                    <motion.div
                                        key={`snakes-loss-${outcomeFxKey}`}
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
                                            padding: '72px 12px 100px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            inset={0}
                                            bg="linear-gradient(195deg, rgba(40, 15, 18, 0.72) 0%, rgba(15, 15, 25, 0.82) 50%, rgba(25, 12, 18, 0.78) 100%)"
                                            backdropFilter="blur(10px)"
                                            sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                        />
                                        {snakeAmbientParticles.map((p) => (
                                            <motion.div
                                                key={`${outcomeFxKey}-p-${p.i}`}
                                                initial={{ opacity: 0, y: `${p.y0}%` }}
                                                animate={{ opacity: [0, p.opacity, 0], y: ['10%', '110%'] }}
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
                                                        'linear-gradient(180deg, rgba(248, 113, 113, 0.4) 0%, transparent 100%)',
                                                }}
                                            />
                                        ))}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 280, damping: 30, delay: 0.08 }}
                                            style={{ position: 'relative', maxWidth: 'min(320px, 90vw)', width: '100%' }}
                                        >
                                            <Box
                                                borderRadius="20px"
                                                border="1px solid rgba(248, 113, 113, 0.28)"
                                                bg="rgba(22, 12, 16, 0.55)"
                                                backdropFilter="blur(18px)"
                                                sx={{ WebkitBackdropFilter: 'blur(18px)' }}
                                                boxShadow="0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                                                px={{ base: 5, md: 7 }}
                                                py={{ base: 6, md: 7 }}
                                                textAlign="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    letterSpacing="0.32em"
                                                    color="rgba(252, 165, 165, 0.95)"
                                                    mb={3}
                                                >
                                                    SNAKE
                                                </Text>
                                                <motion.div
                                                    initial={{ scale: 0.88, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                                                    style={{ marginBottom: 12 }}
                                                >
                                                    <Image
                                                        src={snakeImage}
                                                        alt="Snake"
                                                        mx="auto"
                                                        maxH="88px"
                                                        objectFit="contain"
                                                        filter="drop-shadow(0 12px 28px rgba(0,0,0,0.65))"
                                                    />
                                                </motion.div>
                                                <Text
                                                    fontSize={{ base: '22px', md: '24px' }}
                                                    fontWeight="800"
                                                    color="rgba(248, 250, 252, 0.96)"
                                                    lineHeight="1.35"
                                                    mb={2}
                                                >
                                                    You hit a snake
                                                </Text>
                                                <Text fontSize="sm" color="rgba(248, 180, 180, 0.88)" lineHeight="1.5">
                                                    This round is over — bet again when you are ready.
                                                </Text>
                                                <Box
                                                    mt={4}
                                                    h="2px"
                                                    w="40px"
                                                    mx="auto"
                                                    borderRadius="full"
                                                    bg="linear-gradient(90deg, transparent, rgba(248,113,113,0.45), transparent)"
                                                />
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="live" display="flex" flexDirection="column" minH="0" minW={0}>
                    <RealView />
                </GridItem>
            </Grid>
            <History />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size={helpModalSize} isCentered scrollBehavior="inside">
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                        How to Play Snakes
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    Step into the action and test your luck in Snakes!
                                </Text>
                                <Text mb={1}>
                                    -Choose your bet amount and difficulty level, then hit ROLL to start.
                                </Text>
                                <Text mb={1}>
                                    -The dice will roll and land on a multiplier.
                                </Text>
                                <Text mb={1}>
                                    -Win rewards based on where it stops — or lose your bet if it hits a snake.
                                </Text>
                                <Image src={keyboardImage} alt="Keyboard" />
                                <Text mb={1} fontSize="xs" color="gray.400">
                                    Tip:You can roll the highest die 5 times, and each time you roll, if you do not encounter a snake, the corresponding multipliers are multiplied consecutively.
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
