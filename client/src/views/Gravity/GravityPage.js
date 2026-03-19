import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Box,
    Grid,
    Flex,
    Text,
    Button,
    HStack,
    VStack,
    Input,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
} from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";
import truncateToTwo from "variables/truncateToTwo";
import History from "./gravityItems/History";
import GravityChart from "./GravityChart";
import GravityChartFlowContainer from "./GravityChartFlowContainer";
import axiosInstance from "api/axiosConfig";
import { useAblyUpDownLive } from "hooks/useAblyUpDownLive";
import { useAblyUpDownState } from "hooks/useAblyUpDownState";
import { useAblyUpDownBets } from "hooks/useAblyUpDownBets";
import { useAblyUpDownResult } from "hooks/useAblyUpDownResult";
import { placeBetUpDown, addBetToDisplay, clearUpDownBets } from "action/UpDownActions";
import Loading from 'components/Loading/Loading';
import { toast } from "react-toastify"
import { onlineUser, offlineUser } from "action/BetActions";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000;
const PREVIEW_SECONDS = 5;
const BETTING_SECONDS = 10;
const COUNTDOWN_SECONDS = 5;
const TRADING_SECONDS = 5;
const RESULT_SECONDS = 3;
const INITIAL_VALUE = 100;
/** Graph duration during place bets (10s); trading uses 5s */
const BETTING_GRAPH_SECONDS = 10;
/** Graph flowing speed: 0.1 s per point (must match server) */
const GRAPH_FLOW_STEP_SEC = 0.1;
/** Expected points for place-bets graph (10s) and trading graph (5s) */
/** Matches server: 101 betting points at 0.1s (0–10s) + 25 trading = 126 total */
const EXPECTED_BETTING_POINTS = 101;
const INTERPOLATION_STEP_SEC = 0.02;
/** Same as GravityChartFlowContainer: 0.2s display step so result graph shape matches end of trading */
const PLACE_BETS_DISPLAY_STEP_SEC = 0.2;
const COMBINED_GRAPH_SECONDS = BETTING_GRAPH_SECONDS + TRADING_SECONDS;

function interpolateAtTimeForGraph(gd, t) {
    // console.log(gd, t)
    if (!gd || gd.length === 0) return null;
    const time = (p) => (p.time != null ? p.time : 0);
    if (t <= time(gd[0])) return { time: t, price: gd[0].value };
    if (t >= time(gd[gd.length - 1])) return { time: t, price: gd[gd.length - 1].value };
    for (let i = 0; i < gd.length - 1; i++) {
        const t0 = time(gd[i]);
        const t1 = time(gd[i + 1]);
        if (t >= t0 && t <= t1) {
            const frac = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
            const price = gd[i].value + frac * (gd[i + 1].value - gd[i].value);
            return { time: t, price };
        }
    }
    return { time: t, price: gd[gd.length - 1].value };
}

function interpolateBetweenPoints(points, stepSec = INTERPOLATION_STEP_SEC) {
    if (points.length <= 1) return points;
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        out.push(a);
        const dt = b.time - a.time;
        const n = Math.max(1, Math.floor(dt / stepSec));
        for (let k = 1; k < n; k++) {
            const t = a.time + (dt * k) / n;
            const frac = (t - a.time) / dt;
            out.push({ time: t, price: a.price + frac * (b.price - a.price) });
        }
    }
    out.push(points[points.length - 1]);
    return out;
}

/** Circular countdown with smooth arc animation (RAF so timeline flows smoothly) */
function CountdownCircle({
    phaseEndAtMs,
    phaseTotalMs,
    lastServerTimeMsRef,
    lastClientReceiveTimeMsRef,
    roundPhase,
    roundResult,
    bettingCountdown,
    previewCountdown,
    roundCountdown,
    resultCountdown,
}) {
    const [progress, setProgress] = useState(0);
    const remainingSeconds = Math.max(
    0,
    Math.ceil(
        phaseEndAtMs > 0
        ? (
            (typeof lastServerTimeMsRef?.current === "number"
                ? (phaseEndAtMs - lastServerTimeMsRef.current)
                : phaseEndAtMs - Date.now()
            ) / 1000
            )
        : phaseTotalMs / 1000
    )
    );
    useEffect(() => {
        if (phaseTotalMs <= 0) return;
        let rafId;
        const tick = () => {
            const now = Date.now();
            const serverMs = lastServerTimeMsRef?.current;
            const clientReceiveMs = lastClientReceiveTimeMsRef?.current;
            const useServerTime = typeof serverMs === "number" && typeof clientReceiveMs === "number";
            const remainingMs = phaseEndAtMs > 0
                ? (useServerTime ? (phaseEndAtMs - serverMs) - (now - clientReceiveMs) : phaseEndAtMs - now)
                : phaseTotalMs;
            // console.log(remainingMs);
            const p = Math.max(0, Math.min(1, 1 - remainingMs / phaseTotalMs));
            setProgress(p);
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => (rafId != null && cancelAnimationFrame(rafId));
    }, [phaseEndAtMs, phaseTotalMs, lastServerTimeMsRef, lastClientReceiveTimeMsRef]);

    const size = 320;
    const stroke = 12;
    const r = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const isUrgent = (roundPhase === "betting" && bettingCountdown <= 5);
    const arcColor = roundPhase === "result"
        ? (roundResult === "up" ? "#4ade80" : "#e74c3c")
        : isUrgent
            ? "#e74c3c"
            : "#00d4ff";
    const numberColor = isUrgent ? "#e74c3c" : "white";

    return (
        <>
            <Box position="absolute" top={0} left={0} w="100%" h="100%">
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} preserveAspectRatio="xMidYMid meet">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3a3a3a" strokeWidth={stroke} />
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={arcColor}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - progress)}
                    />
                </svg>
            </Box>
            <Box position="relative" zIndex={1} display="flex" alignItems="center" justifyContent="center" w="100%" h="100%">
                {roundPhase === "result" ? (
                    <VStack spacing="4px">
                        <Text fontSize="3xl" fontWeight="bold" color={roundResult === "up" ? "#4ade80" : "#e74c3c"}>
                            {roundResult === "up" ? "↑" : "↓"}
                        </Text>
                        <Text color="white" fontSize="lg">{resultCountdown}s</Text>
                    </VStack>
                ) : (
                    <Text
                        fontSize="3xl"
                        fontWeight="bold"
                        color={numberColor}
                        animation={isUrgent ? "countdownPulse 0.6s ease-in-out infinite" : undefined}
                    >
                        {remainingSeconds}s
                    </Text>
                )}
            </Box>
        </>
    );
}

export default function GravityPage() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

    const [amount, setAmount] = useState("50");
    const [currentValue, setCurrentValue] = useState(INITIAL_VALUE);
    const [roundHistory, setRoundHistory] = useState([]);
    const [previousGraphData, setPreviousGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upBets, setUpBets] = useState([]);
    const [downBets, setDownBets] = useState([]);
    const [pendingBet, setPendingBet] = useState({ up: false, down: false });
    // Use a ref for immediate synchronous guarding to prevent duplicate submits
    const pendingBetRef = useRef({ up: false, down: false });
    const [serverPhase, setServerPhase] = useState("preview");
    const [serverPhaseEndAt, setServerPhaseEndAt] = useState(null);
    const [serverRound, setServerRound] = useState(null);
    // const [countdownTick, setCountdownTick] = useState(0);
    // const [showStartOverlay, setShowStartOverlay] = useState(false);
    // const prevPhaseRef = useRef(null);
    // const startOverlayTimerRef = useRef(null);
    const { liveGraphPoints, setLiveGraphPoints, cycleStartValue, setCycleStartValue } = useAblyUpDownLive(serverPhase);
    const [serverGraphPoints, setServerGraphPoints] = useState([]);
    const [graphTimeStart, setGraphTimeStart] = useState(null);
    // const [serverGraphPoints, setServerGraphPoints] = useState([]);
    const lastResultRoundIdRef = useRef(null);
    const lastWinToastRoundIdRef = useRef(null);
    const currentRoundIdRef = useRef(null);
    const tradingStartMsRef = useRef(null);
    const lastServerTimeMsRef = useRef(null);
    const lastClientReceiveTimeMsRef = useRef(null);
    const serverGraphDisplaySecRef = useRef(null);
    const lastRoundGraphRef = useRef(null);
    const lastFlowReceiveMsRef = useRef(0);
    const prevFlowPointsLengthRef = useRef(0);
    const fetchedRoundsRef = useRef(new Set());
    const { upDownResults, setUpDownResults } = useAblyUpDownResult();
    const results = useSelector((state) => state.user.userInfo?.updownHistory);

    useEffect(() => {
        onlineUser(5);
        return () => {
            offlineUser(5);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function fetchInitial() {
            try {
                const [historyRes] = await Promise.all([
                    axiosInstance.get("/updown/history?limit=10")
                ]);

                if (cancelled) return;
                if (historyRes.data?.success && historyRes.data?.data) {
                    const list = historyRes.data.data.map((r) => ({
                        roundId: r.roundId,
                        result: r.result,
                        startPrice: r.startValue,
                        endPrice: r.endValue,
                    }));
                    setRoundHistory(list);
                }
            } catch (e) {
                console.warn("UpDown fetch initial:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchInitial();
        return () => { cancelled = true; };
    }, [setCycleStartValue, setLiveGraphPoints]);
    useEffect(() => {
        // Only show "You won" during result phase, and only once per round
        if (serverPhase !== "result" || !upDownResults?.result) return;
        const roundId = upDownResults?.roundId;
        if (roundId == null || lastWinToastRoundIdRef.current === roundId) return;

        const winners = upDownResults?.result?.winners;
        const targetUserId = user?.userId;
        const exists = winners?.find((w) => w.userId === targetUserId);

        if (exists && serverRound?.roundId === roundId) {
            console.log("exists===========>",exists)
            lastWinToastRoundIdRef.current = roundId;
            const winMsg = `You won $${exists.payout} in round ${roundId}!`;
            toast.success(winMsg);
        }
    }, [serverPhase, upDownResults, serverRound?.roundId, user?.userId, toast]);
    // Graph data comes from Ably (updown:live-point, updown:live-start); no polling of /live-state

    // Track when we last received flow points (Ably or server seed) so we can extend the chart smoothly by real time
    useEffect(() => {
        const isFlowPhase = serverPhase === "preview" || serverPhase === "betting" || serverPhase === "countdown";
        const flowLen = liveGraphPoints.length > 0 ? liveGraphPoints.length : serverGraphPoints.length;
        if (isFlowPhase && flowLen > 0) {
            if (flowLen !== prevFlowPointsLengthRef.current) {
                lastFlowReceiveMsRef.current = Date.now();
            }
            prevFlowPointsLengthRef.current = flowLen;
        }
    }, [serverPhase, serverGraphPoints.length, liveGraphPoints.length]);

    // Game state from Ably; initial /updown/current already set phase/round on first load
    useAblyUpDownState(({ phase, phaseEndAt, round, serverTime, graphTimeStart: gts, graphDisplaySec: gds }) => {
        setLoading(false);
        if (phase != null) setServerPhase(phase);
        setServerPhaseEndAt(phaseEndAt ?? null);
        setServerRound(round ?? null);
        if (typeof gts === "number") {
            setGraphTimeStart(gts);
        }
        if (phase !== "trading" && phase !== "result") setGraphTimeStart(null);
        if (typeof gds === "number") serverGraphDisplaySecRef.current = gds;
        else if (phase !== "betting" && phase !== "trading") serverGraphDisplaySecRef.current = null;
        if (typeof serverTime === "number") {
            lastServerTimeMsRef.current = serverTime < 1e12 ? serverTime * 1000 : serverTime;
            lastClientReceiveTimeMsRef.current = Date.now();
        }
        if (phase === "result" && round && round.roundId !== lastResultRoundIdRef.current) {
            lastResultRoundIdRef.current = round.roundId;
            setPreviousGraphData(round);
            if (typeof gts === "number" && round.graphData?.length) {
                lastRoundGraphRef.current = { graphTimeStart: gts, graphData: round.graphData };
            }
            setRoundHistory((prev) => {
                if (prev.some((r) => r.roundId === round.roundId)) return prev;
                return [
                    { roundId: round.roundId, result: round.result, startPrice: round.startValue, endPrice: round.endValue },
                    ...prev.slice(0, 19),
                ];
            });
        }
        // Only clear bets when a truly new round starts (not just when round object updates)
        if (round && round.roundId && round.roundId !== currentRoundIdRef.current) {
            currentRoundIdRef.current = round.roundId;
            // Don't clear bets here - they will be fetched in the useEffect below
            clearUpDownBets(dispatch);
        }
    });


    // Fetch existing bets when round changes (only once per round)
    useEffect(() => {
        if (!serverRound || !serverRound.roundId) return;

        // Skip if we already fetched this round
        if (fetchedRoundsRef.current.has(serverRound.roundId)) return;

        const fetchBets = async () => {
            try {
                const response = await axiosInstance.get(`/updown/bets/${serverRound.roundId}`);
                if (response.data.success && response.data.data) {
                    const { upBets, downBets } = response.data.data;
                    setUpBets(upBets || []);
                    setDownBets(downBets || []);
                    // Mark this round as fetched
                    fetchedRoundsRef.current.add(serverRound.roundId);
                }
            } catch (err) {
                console.warn("Failed to fetch existing bets:", err);
                setUpBets([]);
                setDownBets([]);
            }
        };

        fetchBets();
    }, [serverRound?.roundId]);

    // Handle new bets from Ably with memoization to prevent unnecessary re-subscriptions
    const handleBetPlaced = useCallback((bet) => {
        addBetToDisplay(bet, dispatch);
        if (bet.direction === "up") {
            setUpBets((prev) => {
                // Avoid duplicates
                if (prev.some((b) => b.userId === bet.userId && b.createdAt === bet.createdAt)) {
                    return prev;
                }
                return [
                    ...prev,
                    {
                        userId: bet.userId,
                        userName: bet.userName,
                        avatar: bet.avatar || null,
                        amount: bet.amount,
                        createdAt: bet.createdAt,
                    },
                ];
            });
        } else if (bet.direction === "down") {
            setDownBets((prev) => {
                // Avoid duplicates
                if (prev.some((b) => b.userId === bet.userId && b.createdAt === bet.createdAt)) {
                    return prev;
                }
                return [
                    ...prev,
                    {
                        userId: bet.userId,
                        userName: bet.userName,
                        avatar: bet.avatar || null,
                        amount: bet.amount,
                        createdAt: bet.createdAt,
                    },
                ];
            });
        }
    }, [dispatch]);

    // Listen for real-time bets from other players via Ably
    useAblyUpDownBets(handleBetPlaced);

    const roundPhase = serverPhase;
    const now = Date.now();
    const phaseEndAtMs = serverPhaseEndAt ? serverPhaseEndAt.getTime() : 0;
    const serverMs = lastServerTimeMsRef.current;
    const clientReceiveMs = lastClientReceiveTimeMsRef.current;
    const useServerTime = typeof serverMs === "number" && typeof clientReceiveMs === "number";
    const remainingMs = useServerTime
        ? (phaseEndAtMs - serverMs) - (now - clientReceiveMs)
        : phaseEndAtMs - now;
    const countdownSeconds = phaseEndAtMs > 0
        ? Math.max(0, Math.ceil(remainingMs / 1000))
        : (roundPhase === "preview" ? PREVIEW_SECONDS : roundPhase === "betting" ? BETTING_SECONDS : roundPhase === "trading" ? TRADING_SECONDS : roundPhase === "result" ? RESULT_SECONDS : 0);
    // console.log("countdownseconds======>", countdownSeconds);
    const previewCountdown = roundPhase === "preview" ? countdownSeconds : PREVIEW_SECONDS;
    const bettingCountdown = roundPhase === "betting" ? countdownSeconds : BETTING_SECONDS;
    const roundCountdown = roundPhase === "trading" ? countdownSeconds : TRADING_SECONDS;
    const resultCountdown = roundPhase === "result" ? countdownSeconds : RESULT_SECONDS;
    const startValue = serverRound?.startValue ?? INITIAL_VALUE;
    const endValue = serverRound?.endValue ?? null;
    const roundResult = serverRound?.result ?? null;

    // Trading period start/end (like bc.game): from round createdAt when in trading/result, or upcoming when in countdown
    const tradingStartTime = (() => {
        if (serverRound?.createdAt) return new Date(serverRound.createdAt);
        if (roundPhase === "countdown" && serverPhaseEndAt) return new Date(serverPhaseEndAt.getTime());
        return null;
    })();
    const tradingEndTime = tradingStartTime
        ? new Date(tradingStartTime.getTime() + (BETTING_SECONDS + TRADING_SECONDS) * 1000)
        : null;
    const formatTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const handleBet = async (direction) => {
        if (pendingBetRef.current[direction]) return; // synchronous guard
        if (pendingBet[direction]) return;
        // If user already has a bet on this side (from fetched bets), don't call API again
        try {
            const myId = user?.userId || user?._id;
            if (direction === 'up') {
                if (upBets.some((b) => String(b.userId) === String(myId))) return;
            } else if (direction === 'down') {
                if (downBets.some((b) => String(b.userId) === String(myId))) return;
            }
        } catch (e) {
            // ignore matching errors and proceed
        }
        if (!amount || parseFloat(amount) < MIN_AMOUNT || balance < parseFloat(amount)) return;

        // set ref immediately to block further clicks synchronously
        pendingBetRef.current = { ...pendingBetRef.current, [direction]: true };
        setPendingBet((p) => ({ ...p, [direction]: true }));
        try {
            await placeBetUpDown(
                serverRound.roundId,
                direction,
                parseFloat(amount),
                dispatch
            );
            setAmount("50");
        } catch (err) {
            // Error toast is already shown by the action
        } finally {
            // clear both ref and state
            pendingBetRef.current = { ...pendingBetRef.current, [direction]: false };
            setPendingBet((p) => ({ ...p, [direction]: false }));
        }
    };

    const handleAmountChange = (value) => {
        const num = parseFloat(value) || 0;
        if (num >= MIN_AMOUNT && num <= MAX_AMOUNT) setAmount(value);
    };

    const upTotal = upBets.reduce((s, b) => s + b.amount, 0);
    const downTotal = downBets.reduce((s, b) => s + b.amount, 0);
    const totalBets = upTotal + downTotal;
    const upMultiplier = totalBets > 0 ? (totalBets / (upTotal || 1)) : 2;
    const downMultiplier = totalBets > 0 ? (totalBets / (downTotal || 1)) : 2;

    const getPhaseText = () => {
        switch (roundPhase) {
            case "preview":
                return `Watching - ${previewCountdown}s`;
            case "betting":
                return `Place Bets - ${bettingCountdown}s`;
            case "trading":
                return `Trading - ${Math.ceil(roundCountdown)}s`;
            case "result":
                return roundResult === "up" ? "UP WINS!" : "DOWN WINS!";
            default:
                return "Waiting...";
        }
    };
    const hasPreviousGraph = previousGraphData?.graphData?.length > 0;
    const isFlowPhase = roundPhase === "preview" || roundPhase === "betting" || roundPhase === "countdown";
    const graphStepSec = GRAPH_FLOW_STEP_SEC;
    // Same graph for everyone after refresh: use server canonical segment (anchored to flow cycle), then append Ably points newer than last server point
    const flowPoints = (() => {
        if (serverGraphPoints.length > 0) {
            const lastServerTime = serverGraphPoints[serverGraphPoints.length - 1].time;
            const newerFromAbly = liveGraphPoints.filter((p) => p.time > lastServerTime);
            const combined = [...serverGraphPoints, ...newerFromAbly];
            const byTime = new Map(combined.map((p) => [p.time, p]));
            return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
        }
        return liveGraphPoints;
    })();
    const hasFlowPoints = flowPoints.length > 0;
    const hasCycleStart = cycleStartValue != null;

    function getServerNow() {
        return Date.now(); // replace with synced server time if you have it
    }

    const globalPoints = flowPoints.map((p) => ({ time: p.time, price: p.value }));
    let roundSegment = [];
    // Re-render periodically so countdown (remainingMs) and phase display update
    // const _ = countdownTick;
    if (roundPhase === "result" && serverRound?.graphData?.length && typeof graphTimeStart === "number") {
        if (roundPhase === "result") {
            roundSegment = serverRound.graphData.map((p) => ({ time: graphTimeStart + p.time, price: p.value }));
        } 
    } else if (isFlowPhase && lastRoundGraphRef.current?.graphData?.length) {
        const { graphTimeStart: gts, graphData } = lastRoundGraphRef.current;
        roundSegment = graphData.map((p) => ({ time: gts + p.time, price: p.value }));
    }
    let fullData;
    if (roundPhase === "result" && roundSegment.length > 0) {
        fullData = roundSegment;
    } else if (isFlowPhase && !hasCycleStart && !hasFlowPoints && hasPreviousGraph) {
        fullData = previousGraphData.graphData.map((p) => ({ time: p.time, price: p.value }));
    } else {
        const merged = [...globalPoints, ...roundSegment];
        const byTime = new Map(merged.map((p) => [p.time, p]));
        fullData = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p);
    }
    fullData = interpolateBetweenPoints(fullData);
    // Show data from the previous CHART_WINDOW_SECONDS (10s): filter by time window, x-axis 0 to 10 seconds
    let chartDataDisplay = [];

    const hasFullBettingData = serverRound?.graphData && serverRound.graphData.length >= EXPECTED_BETTING_POINTS;
    if (roundPhase === "result" && hasFullBettingData && serverRound?.graphData) {
        const gd = serverRound.graphData;
        chartDataDisplay = [];
        for (let t = 0; t <= COMBINED_GRAPH_SECONDS; t += PLACE_BETS_DISPLAY_STEP_SEC) {
            const pt = interpolateAtTimeForGraph(gd, t);
            if (pt) chartDataDisplay.push({ time: pt.time, price: pt.price });
        }
    }
    const showPreviousGraph = isFlowPhase && !hasCycleStart && !hasFlowPoints && hasPreviousGraph;

    const chartThreshold = (roundPhase === "trading" || roundPhase === "result" || roundPhase === "betting")
        ? (serverRound?.startValue ?? startValue)
        : (isFlowPhase && hasCycleStart) ? cycleStartValue : (chartDataDisplay.length ? chartDataDisplay[0].price : startValue);
        let chartMin = chartDataDisplay.length ? Math.min(...chartDataDisplay.map((d) => d.price)) : chartThreshold - 5;
        let chartMax = chartDataDisplay.length ? Math.max(...chartDataDisplay.map((d) => d.price)) : chartThreshold + 5;
        // Result phase: use same Y domain as place-bets/trading (betting segment 0–10s only) so graph shape doesn't change at the end
        if (roundPhase === "result" && serverRound?.graphData?.length) {
            const gd = serverRound.graphData;
            const bettingEndIndex = gd.findIndex((p) => (p.time ?? 0) > BETTING_GRAPH_SECONDS);
            const segment = bettingEndIndex <= 0 ? gd : gd.slice(0, bettingEndIndex);
            if (segment.length > 0) {
                const fullMin = Math.min(...segment.map((p) => p.value));
                const fullMax = Math.max(...segment.map((p) => p.value));
                const pad = Math.max((fullMax - fullMin) * 0.1, 0.5);
                chartMin = fullMin - pad;
                chartMax = fullMax + pad;
            }
        }
        const lastPrice = chartDataDisplay.length ? chartDataDisplay[chartDataDisplay.length - 1].price : currentValue;

    // Value at start of trading (time 10s) for standard line in result view
    let tradingStartPrice = null;
    if (roundPhase === "result" && serverRound?.graphData?.length >= 2) {
        const gd = serverRound.graphData;
        const tTarget = BETTING_GRAPH_SECONDS;
        const idx = gd.findIndex((p) => (p.time ?? 0) >= tTarget);
        if (idx === 0) tradingStartPrice = gd[0].value;
        else if (idx === -1) tradingStartPrice = gd[gd.length - 1].value;
        else {
            const p0 = gd[idx - 1], p1 = gd[idx];
            const t0 = p0.time ?? 0, t1 = p1.time ?? tTarget;
            const frac = t1 > t0 ? (tTarget - t0) / (t1 - t0) : 1;
            tradingStartPrice = p0.value + frac * (p1.value - p0.value);
        }
    }

    if (loading) {
        return <Loading />;
    }

    return (
        <Box pt={{ base: "120px", md: "75px" }} px={{ base: "16px", md: "24px" }} pb="24px" minH="100vh">
            <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2a2a" color="white" borderRadius="12px">
                    <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">How to play Gravity (Up/Down)</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={6}>
                        <VStack align="stretch" spacing={4}>
                            <Text><strong>1. Phases:</strong> Watch the preview graph, then place bets when "Place Bets" is active. After countdown, the round runs for 5 seconds (trading). </Text>
                            <Text><strong>2. Betting:</strong> Choose <strong>Up</strong> (graph ends above start) or <strong>Down</strong> (graph ends below start). Enter your amount and click Up or Down. You can only bet during the "Place Bets" phase.</Text>
                            <Text><strong>3. Payout:</strong> If your side wins, you get <strong>2×</strong> your bet. If your side loses, you lose your bet.</Text>
                            <Text><strong>4. Graph:</strong> The line shows the price over time. The result is decided by which side had more total money bet (the bigger side loses). The graph you see matches the outcome.</Text>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="24px">
                <VStack spacing="16px" align="stretch">
                    <Grid templateColumns="1fr 1fr" gap="16px">

                        <Card bg="#2a2a2a" p="15px 20px" borderRadius="12px" minH="120px" w="100%">
                            <style>
                                {`
                                @keyframes countdownPulse {
                                    0%, 100% { transform: scale(1); opacity: 1; }
                                    50% { transform: scale(1.15); opacity: 0.9; }
                                }
                                `}
                            </style>
                            <Flex direction="column" align="center" justify="center" minH="120px" w="100%">
                                <Text color="gray.400" fontSize="sm" mb="8px">{getPhaseText()}</Text>
                                <Box
                                    position="relative"
                                    w="150px"
                                    h="120px"
                                    maxW="380px"
                                    maxH="380px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <CountdownCircle
                                        phaseEndAtMs={phaseEndAtMs}
                                        phaseTotalMs={
                                            roundPhase === "preview" ? PREVIEW_SECONDS * 1000
                                                : roundPhase === "betting" ? BETTING_SECONDS * 1000
                                                    : roundPhase === "countdown" ? COUNTDOWN_SECONDS * 1000
                                                        : roundPhase === "trading" ? TRADING_SECONDS * 1000
                                                            : RESULT_SECONDS * 1000
                                        }
                                        lastServerTimeMsRef={lastServerTimeMsRef}
                                        lastClientReceiveTimeMsRef={lastClientReceiveTimeMsRef}
                                        roundPhase={roundPhase}
                                        roundResult={roundResult}
                                        bettingCountdown={bettingCountdown}
                                        previewCountdown={previewCountdown}
                                        roundCountdown={roundCountdown}
                                        resultCountdown={resultCountdown}
                                    />
                                </Box>
                            </Flex>
                        </Card>

                        <Card bg="#2a2a2a" p="15px 20px" borderRadius="12px">
                            <VStack align="stretch" spacing="12px" textAlign="center">
                                <Text color="gray.400" fontSize="sm">Your investment</Text>
                                <Text color="white" fontSize="2xl" fontWeight="bold">
                                    ${truncateToTwo(parseFloat(amount) || 0)}
                                </Text>
                                <Text color="gray.400" fontSize="sm" mt="8px">Potential Return (Down)</Text>
                                <Text color="#e74c3c" fontSize="2xl" fontWeight="bold">
                                    ${truncateToTwo((parseFloat(amount) || 0) * 2)}
                                </Text>
                            </VStack>
                        </Card>
                    </Grid>

                    {/* Single graph instance: one source of truth so shape/data stay identical everywhere */}
                    <Card bg="#2a2a2a" p="15px 24px" borderRadius="12px">
                        <style>
                            {`
                            @keyframes startOverlayFadeIn {
                                0% { opacity: 0; }
                                100% { opacity: 1; }
                            }
                            @keyframes startLettersEffect {
                                0% { opacity: 0; transform: scale(0.6); }
                                70% { opacity: 1; transform: scale(1.08); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                            `}
                        </style>
                        <Flex justify="space-between" align="center" mb="16px">
                            <HStack spacing="16px">
                                <Text color="white" fontSize="lg" fontWeight="bold">
                                    {showPreviousGraph ? "Previous Round" : "Live Graph"}
                                </Text>
                            </HStack>
                            <HStack spacing="8px">
                                <IconButton
                                    aria-label="How to play"
                                    icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                    size="md"
                                    bg="transparent"
                                    color="#00d4ff"
                                    borderRadius="50%"
                                    _hover={{ bg: "rgba(255,255,255,0.1)", color: "#00D4FF" }}
                                    onClick={onHelpOpen}
                                />
                            </HStack>
                        </Flex>
                        <Box position="relative" bg="#1a1a1a" borderRadius="8px" overflow="hidden" minH="320px">
                            {roundPhase === "preview" ? (
                                <Flex h="320px" align="center" justify="center" color="gray.500" fontSize="md">
                                    <Text>Graph will appear when place bets starts</Text>
                                </Flex>
                                ) : (
                                <GravityChartFlowContainer
                                    serverRound={serverRound}
                                    roundPhase={roundPhase}
                                    phaseEndAtMs={phaseEndAtMs}
                                    lastServerTimeMsRef={lastServerTimeMsRef}
                                    lastClientReceiveTimeMsRef={lastClientReceiveTimeMsRef}
                                    serverGraphDisplaySecRef={serverGraphDisplaySecRef}
                                    startValue={startValue}
                                    formatTime={formatTime}
                                    tradingStartTime={tradingStartTime}
                                    tradingEndTime={tradingEndTime}
                                    roundResult={roundResult}
                                    endValue={endValue}
                                    showPreviousGraph={showPreviousGraph}
                                    hasCycleStart={hasCycleStart}
                                    isFlowPhase={isFlowPhase}
                                    currentRoundId={roundHistory.roundId}
                                />
                            )}
                            {roundPhase === "result" && roundResult && (
                                <Box
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    right={0}
                                    bottom={0}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    pointerEvents="none"
                                    bg="rgba(26, 26, 26, 0.5)"
                                    animation="startOverlayFadeIn 0.3s ease-out forwards"
                                >
                                    <Text
                                        fontSize={{ base: "4xl", md: "5xl" }}
                                        fontWeight="bold"
                                        color={roundResult === "up" ? "#4ade80" : "#e74c3c"}
                                        letterSpacing="0.15em"
                                        textShadow={roundResult === "up"
                                            ? "0 0 20px rgba(74, 222, 128, 0.6)"
                                            : "0 0 20px rgba(231, 76, 60, 0.6)"}
                                        animation="startLettersEffect 0.5s ease-out 0.1s both"
                                    >
                                        {roundResult === "up" ? "Up Wins!" : "Down Wins!"}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    <Card bg="#2a2a2a" p="15px 24px" borderRadius="12px">
                        <VStack spacing="16px" align="stretch">
                            <HStack spacing="8px" justify="space-between">
                                <Text color="white" fontSize="sm">
                                    Amount ≈ ${truncateToTwo(parseFloat(amount) || 0)}
                                </Text>
                                <HStack spacing="6px">
                                    {roundHistory.slice(0, 10).map((r) => (
                                        <Box
                                            key={r.roundId}
                                            w="25px"
                                            h="25px"
                                            borderRadius="50%"
                                            bg="#323738"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color={r.result === "up" ? "#4ade80" : "#e74c3c"}
                                        >
                                            {r.result === "up" ? <ArrowUpward fontSize="14px" /> : <ArrowDownward fontSize="14px" />}
                                        </Box>
                                    ))}
                                </HStack>
                            </HStack>
                            <HStack spacing="12px">
                                <Input
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    bg="#1a1a1a"
                                    color="white"
                                    borderColor="#3a3a3a"
                                    placeholder="Amount"
                                    flex="1"
                                    isDisabled={roundPhase !== "betting"}
                                />
                                <Button
                                    _hover={{ bg: "#00D4FF" }}
                                    bg={amount === "50" ? "#00D4FF" : "#3a3a3a"}
                                    color="white"
                                    onClick={() => setAmount("50")}
                                    isDisabled={roundPhase !== "betting"}
                                >
                                    $50
                                </Button>
                                <Button
                                    _hover={{ bg: "#00D4FF" }}
                                    bg={amount === "100" ? "#00D4FF" : "#3a3a3a"}
                                    color="white"
                                    onClick={() => setAmount("100")}
                                    isDisabled={roundPhase !== "betting"}
                                >
                                    $100
                                </Button>
                                <Button
                                    _hover={{ bg: "#00D4FF" }}
                                    bg="#3a3a3a"
                                    color="white"
                                    onClick={() => setAmount(String(Math.max(MIN_AMOUNT, (parseFloat(amount) || 0) / 2)))}
                                    isDisabled={roundPhase !== "betting"}
                                >
                                    1/2
                                </Button>
                                <Button
                                    _hover={{ bg: "#00D4FF" }}
                                    bg="#3a3a3a"
                                    color="white"
                                    onClick={() => setAmount(String(Math.min(MAX_AMOUNT, (parseFloat(amount) || 0) * 2)))}
                                    isDisabled={roundPhase !== "betting"}
                                >
                                    2x
                                </Button>
                            </HStack>
                            <Grid templateColumns="1fr 1fr" gap="16px">
                                <Button
                                    bg="#4ade80"
                                    color="white"
                                    h="60px"
                                    fontSize="xl"
                                    fontWeight="bold"
                                    leftIcon={<ArrowUpward />}
                                    onClick={() => handleBet("up")}
                                    disabled={
                                        roundPhase !== "betting" ||
                                        !amount ||
                                        parseFloat(amount) < MIN_AMOUNT ||
                                        balance < parseFloat(amount) ||
                                        pendingBet.up
                                    }
                                    _hover={{ bg: "#3acd70" }}
                                >
                                    Up
                                </Button>
                                <Button
                                    bg="#e74c3c"
                                    color="white"
                                    h="60px"
                                    fontSize="xl"
                                    fontWeight="bold"
                                    leftIcon={<ArrowDownward />}
                                    onClick={() => handleBet("down")}
                                    disabled={
                                        roundPhase !== "betting" ||
                                        !amount ||
                                        parseFloat(amount) < MIN_AMOUNT ||
                                        balance < parseFloat(amount) ||
                                        pendingBet.down
                                    }
                                    _hover={{ bg: "#d63c2c" }}
                                >
                                    Down
                                </Button>
                            </Grid>
                        </VStack>
                    </Card>
                </VStack>

                <Grid templateColumns="1fr 1fr" gap="16px">
                    <Card bg="#2a2a2a" p="24px" borderRadius="12px">
                        <Flex align="center" justify="space-between" bg="#323738" p="12px" borderRadius="8px" mb="12px">
                            <HStack spacing="8px">
                                <Box
                                    w="40px"
                                    h="40px"
                                    borderRadius="50%"
                                    bg="rgba(255,255,255,0.2)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <ArrowUpward style={{ color: "white" }} />
                                </Box>
                                <Text color="white" fontWeight="bold">Up</Text>
                            </HStack>
                        </Flex>
                        <Flex justify="space-between" mb="12px">
                            <Text color="gray.400" fontSize="sm">Players {upBets.length}</Text>
                            <Text color="white" fontWeight="bold">${truncateToTwo(upTotal)}</Text>
                        </Flex>
                        <VStack spacing="8px" align="stretch">
                            {upBets.map((bet, idx) => (
                                <Flex key={idx} justify="space-between" align="center">
                                    <HStack spacing="8px">
                                        {bet.avatar ? (
                                            <Box
                                                w="24px"
                                                h="24px"
                                                borderRadius="50%"
                                                backgroundImage={`url(${bet.avatar})`}
                                                backgroundSize="cover"
                                                backgroundPosition="center"
                                            />
                                        ) : (
                                            <Box
                                                w="24px"
                                                h="24px"
                                                borderRadius="50%"
                                                bg="rgba(74, 222, 128, 0.3)"
                                            />
                                        )}
                                        <Text color="#4ade80" fontSize="sm" fontWeight="bold">{bet.userName}</Text>
                                    </HStack>
                                    <Text color="#4ade80" fontSize="sm" fontWeight="bold">${truncateToTwo(bet.amount)}</Text>
                                </Flex>
                            ))}
                        </VStack>
                    </Card>
                    <Card bg="#2a2a2a" p="24px" borderRadius="12px">
                        <Flex align="center" justify="space-between" bg="#323738" p="12px" borderRadius="8px" mb="12px">
                            <HStack spacing="8px">
                                <Box
                                    w="40px"
                                    h="40px"
                                    borderRadius="50%"
                                    bg="rgba(255,255,255,0.2)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <ArrowDownward style={{ color: "white" }} />
                                </Box>
                                <Text color="white" fontWeight="bold">Down</Text>
                            </HStack>
                        </Flex>
                        <Flex justify="space-between" mb="12px">
                            <Text color="gray.400" fontSize="sm">Players {downBets.length}</Text>
                            <Text color="white" fontWeight="bold">${truncateToTwo(downTotal)}</Text>
                        </Flex>
                        <VStack spacing="8px" align="stretch">
                            {downBets.map((bet, idx) => (
                                <Flex key={idx} justify="space-between" align="center">
                                    <HStack spacing="8px">
                                        {bet.avatar ? (
                                            <Box
                                                w="24px"
                                                h="24px"
                                                borderRadius="50%"
                                                backgroundImage={`url(${bet.avatar})`}
                                                backgroundSize="cover"
                                                backgroundPosition="center"
                                            />
                                        ) : (
                                            <Box
                                                w="24px"
                                                h="24px"
                                                borderRadius="50%"
                                                bg="rgba(231, 76, 60, 0.3)"
                                            />
                                        )}
                                        <Text color="#e74c3c" fontSize="sm" fontWeight="bold">{bet.userName}</Text>
                                    </HStack>
                                    <Text color="#e74c3c" fontSize="sm" fontWeight="bold">${truncateToTwo(bet.amount)}</Text>
                                </Flex>
                            ))}
                        </VStack>
                        </Card>
                </Grid>
            </Grid>
            <History results={results} />
        </Box>
    );
}
