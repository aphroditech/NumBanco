import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import {
    Box,
    Grid,
    GridItem,
    FormControl,
    FormLabel,
    Input,
    Button,
    Flex,
    VStack,
    HStack,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Text,
    keyframes,
} from "@chakra-ui/react";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ClickButton from "components/Input/ClickButton";
import GradientBorder from "components/GradientBorder/GradientBorder";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";
import CardHeader from "components/Card/CardHeader.js";
import BangBurstEffect from "components/Effects/BangBurstEffect";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import { onlineUser, offlineUser } from "action/BetActions";
import { climbCashOut, climbPick, climbStart, getClimbState } from "action/ClimbActions";
import BetHistory from "./ClimbItem/BetHistory";
import ClimbRealView from "./ClimbItem/ClimbRealView";
const ban = "/climb/ban.png";
const star = "/climb/star.png";
const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;
/** Minimum game card height — mirrors FishingPage game `minH` (~450px) on tablet+, compact min on phones. */
const CLIMB_MAIN_CARD_MIN_H = { base: "min(72vh, 520px)", md: "560px" };
const CLIMB_GRID_CELL_H = { base: "38px", sm: "42px", md: "46px" };
const CLIMB_STAR_WIN_SIZE = { base: "30px", md: "36px" };
const CLIMB_STAR_WIN_WRAPPER = { base: "38px", md: "44px" };
const CLIMB_STAR_GHOST_SIZE = { base: "26px", md: "30px" };
const CLIMB_MODES = {
    easy: { label: "Easy", cols: 5, rows: 5 },
    normal: { label: "Normal", cols: 3, rows: 5 },
    hard: { label: "Hard", cols: 2, rows: 5 },
};
/** Display ladder — keep in sync with server `DEFAULT_CLIMB_SETTINGS` multipliers. */
const CLIMB_STEP_MULTIPLIERS = {
    easy: [1.10, 1.25, 1.40, 1.60, 2.00],
    normal: [1.15, 1.35, 1.65, 2.10, 3.00],
    hard: [1.20, 1.50, 2.00, 3.00, 5.00],
};

/** Underlay for star cells while yellow “fills” from the bottom */
const CLIMB_STAR_CELL_BLUE_UNDERLAY =
    "linear-gradient(180deg, rgba(92,155,255,0.9) 0%, rgba(62,116,211,0.95) 100%)";
const CLIMB_STAR_CELL_YELLOW =
    "linear-gradient(180deg, #fff8d4 0%, #ffe94a 42%, #f0c010 100%)";

const climbYellowFillBg = keyframes`
    0% {
        background-size: 100% 0%, 100% 100%;
    }
    100% {
        background-size: 100% 100%, 100% 100%;
    }
`;

const climbStarCellReveal = keyframes`
    0% {
        transform: scale(0.94);
        box-shadow: inset 0 0 0 rgba(255, 255, 255, 0), 0 2px 5px rgba(4, 22, 56, 0.35);
    }
    45% {
        transform: scale(1.06);
        box-shadow:
            inset 0 0 22px rgba(255, 255, 255, 0.4),
            0 0 22px rgba(255, 200, 50, 0.6),
            0 0 28px rgba(255, 235, 140, 0.45),
            0 2px 8px rgba(4, 22, 56, 0.4);
    }
    100% {
        transform: scale(1);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.32),
            0 0 12px rgba(255, 190, 40, 0.5),
            0 2px 5px rgba(4, 22, 56, 0.35);
    }
`;

/** Pop, short dip (“starfall”), small bounce, settle — keep vertical travel subtle. */
const climbStarFallSettle = keyframes`
    0% {
        transform: translate3d(0, 0, 0) scale(0.18) rotate(-18deg);
        opacity: 0;
        filter: drop-shadow(0 0 0 transparent);
    }
    14% {
        transform: translate3d(2px, -1px, 0) scale(1.22) rotate(7deg);
        opacity: 1;
        filter: drop-shadow(0 0 12px rgba(255, 220, 140, 0.95));
    }
    24% {
        transform: translate3d(-1px, 0, 0) scale(1) rotate(-1deg);
        opacity: 1;
        filter: drop-shadow(0 0 9px rgba(255, 200, 80, 0.88));
    }
    42% {
        transform: translate3d(1px, 5px, 0) scale(0.97) rotate(-2deg);
        filter: drop-shadow(0 4px 6px rgba(255, 160, 40, 0.45));
    }
    56% {
        transform: translate3d(-1px, 8px, 0) scale(0.96) rotate(1deg);
        opacity: 1;
    }
    72% {
        transform: translate3d(0, -2px, 0) scale(1.03) rotate(0deg);
        filter: drop-shadow(0 0 12px rgba(255, 220, 120, 0.75));
    }
    86% {
        transform: translate3d(0, 1px, 0) scale(1) rotate(0deg);
    }
    100% {
        transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
        opacity: 1;
        filter: drop-shadow(0 0 7px rgba(0, 212, 255, 0.8));
    }
`;

/** Small golden trails falling from the star (cosmetic). */
const climbStarfallSpark = keyframes`
    0% {
        transform: translate3d(-50%, -50%, 0) translate3d(0, 0, 0) scale(1);
        opacity: 1;
    }
    100% {
        transform: translate3d(-50%, -50%, 0) translate3d(var(--spark-dx), var(--spark-dy), 0) scale(0.15);
        opacity: 0;
    }
`;

const CLIMB_STARFALL_SPARKS = [
    { dx: "-4px", dy: "10px", delay: "0.22s", size: "5px" },
    { dx: "2px", dy: "12px", delay: "0.26s", size: "4px" },
    { dx: "6px", dy: "9px", delay: "0.3s", size: "5px" },
    { dx: "0px", dy: "13px", delay: "0.34s", size: "4px" },
    { dx: "5px", dy: "11px", delay: "0.38s", size: "4px" },
];

/** Deterministic RNG for cosmetic “full grid” ban positions after bust (not from server). */
function mulberry32(a) {
    let seed = a >>> 0;
    return function mulberry() {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function displayBanColForRow(seed, rowIndex, cols, excludeCol) {
    const rng = mulberry32(((seed >>> 0) + rowIndex * 100003 + cols * 97) >>> 0);
    if (excludeCol == null || cols <= 1) {
        return Math.min(cols - 1, Math.max(0, Math.floor(rng() * cols)));
    }
    let c = Math.floor(rng() * cols);
    for (let i = 0; i < 60 && c === excludeCol; i++) {
        c = Math.floor(rng() * cols);
    }
    if (c === excludeCol) {
        c = (excludeCol + 1) % cols;
    }
    return c;
}

const climbBanCellReveal = keyframes`
    0%,
    100% {
        transform: translateX(0);
    }
    15% {
        transform: translateX(-5px);
    }
    30% {
        transform: translateX(5px);
    }
    45% {
        transform: translateX(-4px);
    }
    60% {
        transform: translateX(4px);
    }
    75% {
        transform: translateX(-2px);
    }
    90% {
        transform: translateX(2px);
    }
`;

export default function ClimbPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [amount, setAmount] = useState("0.10");
    const [playLoading, setPlayLoading] = useState(false);
    const [cashLoading, setCashLoading] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [mode, setMode] = useState("easy");
    const [board, setBoard] = useState([]);
    const [activeRow, setActiveRow] = useState(4);
    const [gameState, setGameState] = useState("playing"); // playing | busted | cleared
    const [bustBangFx, setBustBangFx] = useState({ visible: false, anchorRect: null });
    const [cashOutWinFx, setCashOutWinFx] = useState({
        visible: false,
        amount: "0.00",
        subtitle: "",
        anchorRect: null,
    });
    const [bustGridSeed, setBustGridSeed] = useState(null);
    /** If set, cash-out would pay this much (bet × currentMultiplier from server). */
    const [cashOutPreviewWin, setCashOutPreviewWin] = useState(null);
    const climbMainCardRef = useRef(null);
    const bustBangTimeoutRef = useRef(null);
    const cashOutFxTimeoutRef = useRef(null);
    const terminalBoardResetTimeoutRef = useRef(null);
    /** Time to show full grid after bust / cash out / clear before resetting the board */
    const TERMINAL_GRID_REVEAL_MS = 2400;

    const amountNum = Number(amount || 0);
    const canDecrease = amountNum > MIN_AMOUNT + 1e-9;
    const canIncrease = amountNum < MAX_AMOUNT - 1e-9;

    const clampAmount = (v) => {
        if (!Number.isFinite(v)) return MIN_AMOUNT;
        return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v));
    };

    const commitAmount = (v) => {
        const next = clampAmount(v);
        setAmount(next.toFixed(2));
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === "") {
            setAmount("");
            return;
        }
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setAmount(value);
        }
    };

    const handleAmountBlur = () => {
        commitAmount(Number(amount));
    };

    const activeMode = CLIMB_MODES[mode] || CLIMB_MODES.easy;
    const stepMultipliers = CLIMB_STEP_MULTIPLIERS[mode] || CLIMB_STEP_MULTIPLIERS.easy;
    const totalCells = activeMode.cols * activeMode.rows;
    const clearedSteps = board.reduce((acc, row) => acc + (row?.result === "star" ? 1 : 0), 0);
    const currentStepIndex =
        !gameStarted || gameState !== "playing"
            ? -1
            : Math.min(clearedSteps, Math.max(0, stepMultipliers.length - 1));

    const createBoard = (modeKey) => {
        const cfg = CLIMB_MODES[modeKey] || CLIMB_MODES.easy;
        const rows = cfg.rows;
        return Array.from({ length: rows }, () => ({
            banCol: null,
            revealedCol: null,
            result: null, // star | ban
        }));
    };

    const resetGame = (modeKey = mode) => {
        const cfg = CLIMB_MODES[modeKey] || CLIMB_MODES.easy;
        setBoard(createBoard(modeKey));
        setActiveRow(cfg.rows - 1); // bottom row first
        setGameState("playing");
        setBustGridSeed(null);
    };

    /** Match server `settleActiveClimbWin`: win = round2(betAmount * currentMultiplier). */
    const applyCashOutPreviewFromClimb = (climb) => {
        if (!climb?.active) {
            setCashOutPreviewWin(null);
            return;
        }
        const bet = Number(climb.betAmount ?? 0);
        const mult = Number(climb.currentMultiplier ?? 1);
        const sc = Number(climb.successCount ?? 0);
        if (sc > 0 && bet > 0 && Number.isFinite(bet) && Number.isFinite(mult)) {
            setCashOutPreviewWin(Math.round(bet * mult * 100) / 100);
        } else {
            setCashOutPreviewWin(null);
        }
    };

    /** After any terminal outcome: one ban column per row so every cell can show star or ban (cosmetic where server didn’t roll). */
    const bustBanColByRow = useMemo(() => {
        if ((gameState !== "busted" && gameState !== "cleared") || bustGridSeed == null) return null;
        const cols = activeMode.cols;
        const rows = activeMode.rows;
        const arr = new Array(rows);
        for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
            const row = board[rowIndex];
            if (rowIndex === activeRow && row?.result === "ban" && row.revealedCol != null) {
                arr[rowIndex] = row.revealedCol;
            } else if (row?.result === "star" && row.revealedCol != null) {
                arr[rowIndex] = displayBanColForRow(bustGridSeed, rowIndex, cols, row.revealedCol);
            } else {
                arr[rowIndex] = displayBanColForRow(bustGridSeed, rowIndex, cols, null);
            }
        }
        return arr;
    }, [gameState, bustGridSeed, board, activeRow, activeMode.cols, activeMode.rows]);

    useEffect(() => {
        resetGame(mode);
        if (terminalBoardResetTimeoutRef.current != null) {
            clearTimeout(terminalBoardResetTimeoutRef.current);
            terminalBoardResetTimeoutRef.current = null;
        }
        if (cashOutFxTimeoutRef.current != null) {
            clearTimeout(cashOutFxTimeoutRef.current);
            cashOutFxTimeoutRef.current = null;
        }
        setCashOutWinFx({ visible: false, amount: "0.00", subtitle: "", anchorRect: null });
        setCashOutPreviewWin(null);
    }, [mode]);

    const scheduleTerminalBoardReset = (modeKey) => {
        const mk = modeKey ?? mode;
        if (terminalBoardResetTimeoutRef.current != null) {
            clearTimeout(terminalBoardResetTimeoutRef.current);
            terminalBoardResetTimeoutRef.current = null;
        }
        terminalBoardResetTimeoutRef.current = setTimeout(() => {
            terminalBoardResetTimeoutRef.current = null;
            const cfg = CLIMB_MODES[mk] || CLIMB_MODES.easy;
            setBoard(createBoard(mk));
            setActiveRow(cfg.rows - 1);
            setGameState("playing");
            setBustGridSeed(null);
            setGameStarted(false);
            setCashOutPreviewWin(null);
        }, TERMINAL_GRID_REVEAL_MS);
    };

    useEffect(() => {
        return () => {
            if (bustBangTimeoutRef.current != null) {
                clearTimeout(bustBangTimeoutRef.current);
                bustBangTimeoutRef.current = null;
            }
            if (terminalBoardResetTimeoutRef.current != null) {
                clearTimeout(terminalBoardResetTimeoutRef.current);
                terminalBoardResetTimeoutRef.current = null;
            }
            if (cashOutFxTimeoutRef.current != null) {
                clearTimeout(cashOutFxTimeoutRef.current);
                cashOutFxTimeoutRef.current = null;
            }
        };
    }, []);

    /** Presence: User.active === 20 (level 18 + 2), counted as climbUsers for dashboard. */
    useEffect(() => {
        onlineUser(18);
        return () => {
            offlineUser(18);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const data = await getClimbState(history);
            if (cancelled) return;
            const state = data?.climb;
            if (!state?.active) {
                setGameStarted(false);
                setCashOutPreviewWin(null);
                return;
            }
            const restoredMode = String(state.mode || "easy");
            const safeMode = CLIMB_MODES[restoredMode] ? restoredMode : "easy";
            const base = createBoard(safeMode);
            setMode(safeMode);
            setBoard(base);
            setActiveRow(Math.max(0, Number(state.activeRow ?? 4)));
            setGameStarted(true);
            setGameState("playing");
            applyCashOutPreviewFromClimb(state);
        })();
        return () => {
            cancelled = true;
        };
    }, [history]);

    const handlePick = (rowIndex, colIndex) => {
        if (!gameStarted) return;
        if (gameState !== "playing") return;
        if (rowIndex !== activeRow) return;
        const row = board[rowIndex];
        if (!row || row.revealedCol != null) return;
    };

    /** Final row cleared (all stars): same fireworks as cash out. Prefer `cashout.win` when server auto-credited. */
    const triggerClearGridFireworks = (st, lastPick, cashout) => {
        let totalStr;
        if (cashout != null && Number.isFinite(Number(cashout.win))) {
            totalStr = Number(cashout.win).toFixed(2);
        } else {
            const betAmt = Number(st?.betAmount ?? amountNum ?? 0);
            const mult = Number(lastPick?.multiplier ?? st?.currentMultiplier ?? 1);
            totalStr = (betAmt * mult).toFixed(2);
        }
        const cardRect = climbMainCardRef.current?.getBoundingClientRect?.();
        setCashOutWinFx({
            visible: true,
            amount: totalStr,
            subtitle:
                cashout != null && Number.isFinite(Number(cashout.win))
                    ? "Win credited to your balance"
                    : "You cleared every row!",
            anchorRect: cardRect
                ? {
                      left: cardRect.left,
                      top: cardRect.top,
                      width: cardRect.width,
                      height: cardRect.height,
                  }
                : null,
        });
        if (cashOutFxTimeoutRef.current != null) {
            clearTimeout(cashOutFxTimeoutRef.current);
        }
        cashOutFxTimeoutRef.current = setTimeout(() => {
            cashOutFxTimeoutRef.current = null;
            setCashOutWinFx((prev) => ({ ...prev, visible: false }));
        }, 2300);
    };

    const handlePickApi = async (rowIndex, colIndex) => {
        if (!gameStarted || gameState !== "playing" || rowIndex !== activeRow) return;
        const row = board[rowIndex];
        if (!row || row.revealedCol != null) return;

        try {
            const data = await climbPick({ colIndex }, dispatch, history);
            const last = data?.lastPick;
            const next = [...board];
            next[rowIndex] = {
                ...next[rowIndex],
                revealedCol: colIndex,
                result: last?.result === "ban" ? "ban" : "star",
            };
            setBoard(next);

            if (last?.result === "ban") {
                const cardRect = climbMainCardRef.current?.getBoundingClientRect?.();
                const anchorRect = cardRect
                    ? {
                          left: cardRect.left,
                          top: cardRect.top,
                          width: cardRect.width,
                          height: cardRect.height,
                      }
                    : null;
                setBustBangFx({ visible: true, anchorRect });
                if (bustBangTimeoutRef.current != null) {
                    clearTimeout(bustBangTimeoutRef.current);
                }
                bustBangTimeoutRef.current = setTimeout(() => {
                    bustBangTimeoutRef.current = null;
                    setBustBangFx((s) => ({ ...s, visible: false }));
                }, 1100);
                setBustGridSeed((Math.random() * 0x7fffffff) | 0);
                setGameState("busted");
                setGameStarted(false);
                setCashOutPreviewWin(null);
                toast.error("Bang! You hit ban.");
                scheduleTerminalBoardReset(mode);
                return;
            }

            const st = data?.climb;
            const pickCashout = data?.cashout;
            if (!st?.active) {
                setCashOutPreviewWin(null);
                if (last?.result === "star") {
                    triggerClearGridFireworks(st, last, pickCashout);
                    toast.success(
                        pickCashout != null && Number.isFinite(Number(pickCashout.win))
                            ? `Climb complete! +${Number(pickCashout.win).toFixed(2)} added to your balance.`
                            : "You cleared every row! Cash out to collect."
                    );
                }
                setBustGridSeed((Math.random() * 0x7fffffff) | 0);
                setGameState("cleared");
                setGameStarted(false);
                scheduleTerminalBoardReset(mode);
                return;
            }
            applyCashOutPreviewFromClimb(st);
            const nextRow = Number(st.activeRow);
            if (Number.isFinite(nextRow) && nextRow >= 0) {
                setActiveRow(nextRow);
                setGameState("playing");
            } else {
                setCashOutPreviewWin(null);
                triggerClearGridFireworks(st, last, pickCashout);
                toast.success(
                    pickCashout != null && Number.isFinite(Number(pickCashout.win))
                        ? `Climb complete! +${Number(pickCashout.win).toFixed(2)} added to your balance.`
                        : "You cleared every row! Cash out to collect."
                );
                setBustGridSeed((Math.random() * 0x7fffffff) | 0);
                setGameState("cleared");
                setGameStarted(false);
                scheduleTerminalBoardReset(mode);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || "Pick failed";
            toast.error(msg);
        }
    };

    return (
        <Box px={{ base: "16px", md: "24px" }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"game" "panel" "empty"',
                    md: '"game game" "panel empty"',
                    "1550px": '"panel game empty"',
                }}
                templateColumns={{
                    sm: "1fr",
                    md: "1fr 1fr",
                    "1550px": "3fr 6fr 2fr",
                }}
                templateRows={{
                    base: "auto auto auto",
                    md: "auto auto",
                    "1550px": "auto",
                }}
                gap={{ base: "16px", md: "24px" }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem
                    area="panel"
                    minW={{ base: 0, md: "350px" }}
                    w="100%"
                    display="flex"
                    flexDirection="column"
                    alignSelf="stretch"
                    minH={0}
                >
                    <Card
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        justifyContent="flex-start"
                        alignItems="stretch"
                        w="100%"
                        minH={CLIMB_MAIN_CARD_MIN_H}
                        h={{ base: "auto", "1550px": "100%" }}
                        pt="22px"
                        pb="20px"
                        px="22px"
                        overflow="visible"
                    >
                        <CardHeader mb="12px" p={0} flexShrink={0}>
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize="lg" color="#fff" fontWeight="bold" mb="4px">
                                    Climb Controls
                                </Text>
                            </Flex>
                        </CardHeader>
                        <CardBody
                            flex="1"
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            justifyContent="flex-start"
                            alignItems="stretch"
                            p={0}
                            minH={0}
                        >
                            <VStack
                                spacing="6px"
                                align="stretch"
                                w="100%"
                                maxW={{ base: "100%", sm: "300px" }}
                                mx="auto"
                                flex="1"
                                justifyContent="flex-start"
                                minH={0}
                            >
                            <FormControl w="100%" mb={0}>
                                <FormLabel
                                    color="rgba(255,255,255,0.82)"
                                    fontSize="sm"
                                    fontWeight="700"
                                    mb="6px"
                                >
                                    Bet Amount
                                </FormLabel>
                                <GradientBorder borderRadius="16px">
                                    <HStack bg="#323738" borderRadius="16px" px="8px" h="52px" spacing="6px">
                                        <IconButton
                                            aria-label="Decrease amount"
                                            icon={<RemoveIcon style={{ fontSize: 16 }} />}
                                            size="xs"
                                            h="30px"
                                            w="30px"
                                            minW="30px"
                                            bg="transparent"
                                            color="#fff"
                                            borderRadius="8px"
                                            _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                            onClick={() => commitAmount(amountNum - 0.1)}
                                            isDisabled={!canDecrease}
                                        />
                                        <Input
                                            value={amount}
                                            onChange={handleAmountChange}
                                            onBlur={handleAmountBlur}
                                            textAlign="center"
                                            bg="transparent"
                                            border="none"
                                            _focus={{ boxShadow: "none" }}
                                            color="#fff"
                                            fontWeight="bold"
                                            placeholder={MIN_AMOUNT.toFixed(2)}
                                        />
                                        <IconButton
                                            aria-label="Increase amount"
                                            icon={<AddIcon style={{ fontSize: 16 }} />}
                                            size="xs"
                                            h="30px"
                                            w="30px"
                                            minW="30px"
                                            bg="transparent"
                                            color="#fff"
                                            borderRadius="8px"
                                            _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                            onClick={() => commitAmount(amountNum + 0.1)}
                                            isDisabled={!canIncrease}
                                        />
                                    </HStack>
                                </GradientBorder>
                            </FormControl>
                                    <FormControl w="100%" mb={0} pt={0} mt={0}>
                                        <FormLabel color="rgba(255,255,255,0.82)" fontSize="sm" fontWeight="700">
                                            Mode
                                        </FormLabel>
                                        <HStack spacing={2} w="100%" flexWrap="wrap">
                                            {Object.entries(CLIMB_MODES).map(([key, cfg]) => {
                                                const active = mode === key;
                                                return (
                                                    <Button
                                                        key={key}
                                                        flex="1"
                                                        h="40px"
                                                        borderRadius="12px"
                                                        fontSize="sm"
                                                        fontWeight="700"
                                                        bg={active ? "#00D4FF" : "rgba(0, 212, 255, 0.15)"}
                                                        color={active ? "#07131a" : "#00D4FF"}
                                                        border="1px solid rgba(0, 212, 255, 0.45)"
                                                        _hover={{
                                                            bg: active ? "#00bfe6" : "rgba(0, 212, 255, 0.24)",
                                                        }}
                                                        onClick={() => setMode(key)}
                                                    >
                                                        {cfg.label}
                                                    </Button>
                                                );
                                            })}
                                        </HStack>
                                    </FormControl>

                                    <Flex
                                        direction={{ base: "column", sm: "row" }}
                                        gap={3}
                                        w="100%"
                                        flexShrink={0}
                                    >
                                        <ClickButton
                                            flex="1"
                                            h="52px"
                                            borderRadius="16px"
                                            label={playLoading ? "..." : "Bet"}
                                            onClick={async () => {
                                            const bet = Number(amount);
                                            if (!Number.isFinite(bet) || bet < MIN_AMOUNT || bet > MAX_AMOUNT) {
                                                toast.error(`Enter amount between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
                                                return;
                                            }
                                            if (bet > balance + 1e-9) {
                                                toast.error("Insufficient balance");
                                                return;
                                            }
                                            setPlayLoading(true);
                                            try {
                                                setCashOutWinFx({
                                                    visible: false,
                                                    amount: "0.00",
                                                    subtitle: "",
                                                    anchorRect: null,
                                                });
                                                setBustBangFx({ visible: false, anchorRect: null });
                                                setBustGridSeed(null);
                                                if (bustBangTimeoutRef.current != null) {
                                                    clearTimeout(bustBangTimeoutRef.current);
                                                    bustBangTimeoutRef.current = null;
                                                }
                                                if (cashOutFxTimeoutRef.current != null) {
                                                    clearTimeout(cashOutFxTimeoutRef.current);
                                                    cashOutFxTimeoutRef.current = null;
                                                }
                                                if (terminalBoardResetTimeoutRef.current != null) {
                                                    clearTimeout(terminalBoardResetTimeoutRef.current);
                                                    terminalBoardResetTimeoutRef.current = null;
                                                }
                                                const data = await climbStart({ betAmount: bet, mode }, dispatch, history);
                                                const st = data?.climb;
                                                const liveMode = String(st?.mode || mode);
                                                const safeMode = CLIMB_MODES[liveMode] ? liveMode : mode;
                                                const base = createBoard(safeMode);
                                                setMode(safeMode);
                                                setBoard(base);
                                                setActiveRow(Math.max(0, Number(st?.activeRow ?? 4)));
                                                setGameState("playing");
                                                setGameStarted(true);
                                                setCashLoading(false);
                                                applyCashOutPreviewFromClimb(st);
                                            } catch (err) {
                                                const msg = err.response?.data?.message || err.response?.data?.error || "Start failed";
                                                toast.error(msg);
                                            } finally {
                                                setPlayLoading(false);
                                            }
                                            }}
                                            disabled={gameStarted || cashLoading}
                                        />
                                        <ClickButton
                                            flex="1"
                                            h="52px"
                                            borderRadius="16px"
                                            bg="#2f855a"
                                            border="1px solid rgba(72, 187, 120, 0.45)"
                                            label={
                                                cashLoading
                                                    ? "..."
                                                    : cashOutPreviewWin != null && gameStarted
                                                      ? `Cash out · ${cashOutPreviewWin.toFixed(2)}`
                                                      : "Cash out"
                                            }
                                            onClick={async () => {
                                            if (!gameStarted) return;
                                            setCashLoading(true);
                                            try {
                                                const data = await climbCashOut(dispatch, history);
                                                const w = Number(data?.cashout?.win ?? 0);
                                                if (w > 0) {
                                                    toast.success(`Collected ${w.toFixed(2)}`);
                                                    const cardRect = climbMainCardRef.current?.getBoundingClientRect?.();
                                                    setCashOutWinFx({
                                                        visible: true,
                                                        amount: w.toFixed(2),
                                                        subtitle: "Cash out win",
                                                        anchorRect: cardRect
                                                            ? {
                                                                  left: cardRect.left,
                                                                  top: cardRect.top,
                                                                  width: cardRect.width,
                                                                  height: cardRect.height,
                                                              }
                                                            : null,
                                                    });
                                                    if (cashOutFxTimeoutRef.current != null) {
                                                        clearTimeout(cashOutFxTimeoutRef.current);
                                                    }
                                                    cashOutFxTimeoutRef.current = setTimeout(() => {
                                                        cashOutFxTimeoutRef.current = null;
                                                        setCashOutWinFx((prev) => ({ ...prev, visible: false }));
                                                    }, 2300);
                                                }
                                                setBustGridSeed((Math.random() * 0x7fffffff) | 0);
                                                setGameStarted(false);
                                                setGameState("cleared");
                                                setCashOutPreviewWin(null);
                                                scheduleTerminalBoardReset(mode);
                                            } catch (err) {
                                                const msg = err.response?.data?.message || err.response?.data?.error || "Cash out failed";
                                                toast.error(msg);
                                            } finally {
                                                setCashLoading(false);
                                            }
                                            }}
                                            disabled={!gameStarted || playLoading}
                                        />
                                    </Flex>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem
                    area="game"
                    minW={0}
                    display="flex"
                    flexDirection="column"
                    alignSelf="stretch"
                    minH={0}
                >
                    <Box
                        ref={climbMainCardRef}
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        minH={CLIMB_MAIN_CARD_MIN_H}
                        h={{ base: "auto", "1550px": "100%" }}
                        w="100%"
                        minW={0}
                    >
                        <Card
                            flex="1"
                            display="flex"
                            flexDirection="column"
                            pt={{ base: "16px", md: "22px" }}
                            pb={{ base: "16px", md: "22px" }}
                            px={{ base: "14px", md: "22px" }}
                            minH={CLIMB_MAIN_CARD_MIN_H}
                            h="100%"
                            minW={0}
                            position="relative"
                            overflowX="hidden"
                            overflowY="visible"
                            alignItems="stretch"
                            w="100%"
                        >
                        <CardBody p={0} display="flex" flexDirection="column" alignItems="stretch">
                            <VStack spacing={0} align="stretch" w="100%">
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    px={{ base: 0, sm: 2, md: 4 }}
                                    py={2.5}
                                    flexShrink={0}
                                    borderBottom="1px solid rgba(0, 212, 255, 0.25)"
                                    gap={2}
                                    flexWrap="wrap"
                                >
                                    <HStack spacing={2} color="#00D4FF">
                                        <ShowChartIcon style={{ fontSize: 20 }} />
                                        <Text fontWeight="700" color="#fff">
                                            Climb Game
                                        </Text>
                                    </HStack>
                                    <IconButton
                                        aria-label="How to play Climb"
                                        icon={<HelpOutlineIcon style={{ fontSize: 22 }} />}
                                        size="sm"
                                        bg="rgba(0, 0, 0, 0.35)"
                                        color="#00d4ff"
                                        borderRadius="full"
                                        _hover={{ bg: "rgba(0, 0, 0, 0.5)", color: "#00D4FF" }}
                                        onClick={() => setIsHelpModalOpen(true)}
                                    />
                                </Flex>
                                <Box
                                    px={{ base: 0, sm: 2, md: 4 }}
                                    py={2.5}
                                    flexShrink={0}
                                    borderBottom="1px solid rgba(0, 212, 255, 0.2)"
                                    display="flex"
                                    flexDirection="column"
                                    alignItems="center"
                                    w="100%"
                                >
                                    <Text
                                        color="rgba(255,255,255,0.75)"
                                        fontSize="xs"
                                        fontWeight="700"
                                        mb={2}
                                        textAlign="center"
                                        w="100%"
                                    >
                                        Step Multipliers
                                    </Text>
                                    <HStack spacing={2} flexWrap="wrap" justifyContent="center" w="100%">
                                        {stepMultipliers.map((m, idx) => {
                                            const isDone = clearedSteps > idx;
                                            const isCurrent = currentStepIndex === idx;
                                            return (
                                                <Box
                                                    key={`${mode}-m-${idx}`}
                                                    px={3}
                                                    py={1}
                                                    borderRadius="10px"
                                                    fontSize="xs"
                                                    fontWeight="800"
                                                    color={isDone || isCurrent ? "#07131a" : "rgba(255,255,255,0.82)"}
                                                    bg={
                                                        isDone
                                                            ? "#7be495"
                                                            : isCurrent
                                                              ? "#00D4FF"
                                                              : "rgba(0, 212, 255, 0.15)"
                                                    }
                                                    border={
                                                        isDone || isCurrent
                                                            ? "1px solid rgba(255,255,255,0.2)"
                                                            : "1px solid rgba(0, 212, 255, 0.35)"
                                                    }
                                                >
                                                    {m.toFixed(2)}x
                                                </Box>
                                            );
                                        })}
                                    </HStack>
                                </Box>
                                <Box px={{ base: 0, sm: 2, md: 4 }} pt={2} pb={4} flexShrink={0}>
                                    <VStack spacing={2} w="100%" maxW={{ base: "100%", md: "540px" }} mx="auto" align="stretch">
                                        <Text color="rgba(255,255,255,0.8)" fontWeight="700" fontSize="sm">
                                            {activeMode.label} mode grid ({activeMode.cols}x{activeMode.rows})
                                        </Text>
                                        <Text color="rgba(255,255,255,0.68)" fontSize="xs" fontWeight="600">
                                            {gameState === "busted"
                                                ? "Bang! You hit ban."
                                                : gameState === "cleared"
                                                  ? clearedSteps >= activeMode.rows
                                                    ? "Great! You cleared all rows."
                                                    : "Round complete. Full grid revealed."
                                                  : !gameStarted
                                                    ? "Press Play to start"
                                                    : gameState === "playing"
                                                      ? `Pick one in row ${activeRow + 1} (bottom to top)`
                                                      : "Press Play to start"}
                                        </Text>
                                        <Box w="100%" overflow="visible">
                                            <Grid
                                                templateColumns={`repeat(${activeMode.cols}, minmax(0, 1fr))`}
                                                gap={{ base: "6px", md: "8px" }}
                                                w="100%"
                                                overflow="visible"
                                            >
                                                {Array.from({ length: totalCells }).map((_, idx) => {
                                                    const rowIndex = Math.floor(idx / activeMode.cols);
                                                    const colIndex = idx % activeMode.cols;
                                                    const row = board[rowIndex];
                                                    const isCurrentRow = rowIndex === activeRow;
                                                    const isRevealed = row?.revealedCol === colIndex;
                                                    const isDisabled =
                                                        !gameStarted ||
                                                        gameState !== "playing" ||
                                                        !isCurrentRow ||
                                                        (row?.revealedCol != null);

                                                    const showTerminalFullGrid = bustBanColByRow != null;
                                                    const banColForRow = bustBanColByRow?.[rowIndex];
                                                    const isDisplayBan =
                                                        showTerminalFullGrid &&
                                                        Number.isInteger(banColForRow) &&
                                                        banColForRow === colIndex;

                                                    let icon = null;
                                                    let bg =
                                                        "linear-gradient(180deg, rgba(92,155,255,0.84) 0%, rgba(62,116,211,0.9) 100%)";
                                                    let border = "1px solid rgba(127, 187, 255, 0.35)";

                                                    const isWinStar = isRevealed && row?.result === "star";
                                                    const isBanReveal = isRevealed && row?.result === "ban";
                                                    const isRealBustBan = isBanReveal;
                                                    const isCosmeticBan = isDisplayBan && !isRealBustBan;

                                                    if (isDisplayBan) {
                                                        icon = (
                                                            <Box
                                                                as="img"
                                                                src={ban}
                                                                alt="ban"
                                                                w={{ base: "18px", md: "20px" }}
                                                                h={{ base: "18px", md: "20px" }}
                                                                objectFit="contain"
                                                                draggable={false}
                                                                opacity={isCosmeticBan ? 0.9 : 1}
                                                            />
                                                        );
                                                        bg =
                                                            "linear-gradient(180deg, rgba(255,120,120,0.85) 0%, rgba(185,68,68,0.92) 100%)";
                                                        border = "1px solid rgba(255, 150, 150, 0.45)";
                                                    } else if (isWinStar) {
                                                        icon = (
                                                            <Box
                                                                position="relative"
                                                                w={CLIMB_STAR_WIN_WRAPPER}
                                                                h={CLIMB_STAR_WIN_WRAPPER}
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                overflow="visible"
                                                                flexShrink={0}
                                                            >
                                                                {CLIMB_STARFALL_SPARKS.map((s, si) => (
                                                                    <Box
                                                                        key={`spark-${idx}-${si}`}
                                                                        position="absolute"
                                                                        left="50%"
                                                                        top="50%"
                                                                        w={s.size}
                                                                        h={s.size}
                                                                        borderRadius="full"
                                                                        bg="linear-gradient(180deg, #fffce8 0%, #ffc940 100%)"
                                                                        boxShadow="0 0 6px rgba(255, 215, 80, 0.95)"
                                                                        pointerEvents="none"
                                                                        sx={{
                                                                            "--spark-dx": s.dx,
                                                                            "--spark-dy": s.dy,
                                                                            animation: `${climbStarfallSpark} 0.72s ease-out forwards`,
                                                                            animationDelay: s.delay,
                                                                        }}
                                                                    />
                                                                ))}
                                                                <Box
                                                                    as="img"
                                                                    src={star}
                                                                    alt="star"
                                                                    w={CLIMB_STAR_WIN_SIZE}
                                                                    h={CLIMB_STAR_WIN_SIZE}
                                                                    objectFit="contain"
                                                                    draggable={false}
                                                                    position="relative"
                                                                    zIndex={1}
                                                                    animation={`${climbStarFallSettle} 1.1s cubic-bezier(0.33, 1, 0.68, 1) forwards`}
                                                                />
                                                            </Box>
                                                        );
                                                        bg = "transparent";
                                                        border = "1px solid rgba(255, 210, 90, 0.85)";
                                                    } else if (showTerminalFullGrid) {
                                                        icon = (
                                                            <Box
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                            >
                                                                <Box
                                                                    as="img"
                                                                    src={star}
                                                                    alt="star"
                                                                    w={CLIMB_STAR_GHOST_SIZE}
                                                                    h={CLIMB_STAR_GHOST_SIZE}
                                                                    objectFit="contain"
                                                                    draggable={false}
                                                                    opacity={0.92}
                                                                />
                                                            </Box>
                                                        );
                                                        bg = "transparent";
                                                        border = "1px solid rgba(255, 210, 90, 0.65)";
                                                    } else if (isCurrentRow && gameState === "playing") {
                                                        bg =
                                                            "linear-gradient(180deg, rgba(111,179,255,0.95) 0%, rgba(74,142,221,0.95) 100%)";
                                                    }

                                                    const starFilledBg = {
                                                        backgroundImage: `${CLIMB_STAR_CELL_YELLOW}, ${CLIMB_STAR_CELL_BLUE_UNDERLAY}`,
                                                        backgroundPosition: "bottom, bottom",
                                                        backgroundRepeat: "no-repeat, no-repeat",
                                                        backgroundSize: "100% 100%, 100% 100%",
                                                    };

                                                    const revealSx = isWinStar
                                                        ? {
                                                              backgroundImage: `${CLIMB_STAR_CELL_YELLOW}, ${CLIMB_STAR_CELL_BLUE_UNDERLAY}`,
                                                              backgroundPosition: "bottom, bottom",
                                                              backgroundRepeat: "no-repeat, no-repeat",
                                                              backgroundSize: "100% 0%, 100% 100%",
                                                              animation: `${climbYellowFillBg} 0.5s ease-out forwards, ${climbStarCellReveal} 0.72s cubic-bezier(0.34, 1.25, 0.64, 1) forwards`,
                                                          }
                                                        : showTerminalFullGrid && !isDisplayBan
                                                          ? starFilledBg
                                                          : isRealBustBan
                                                            ? {
                                                                  animation: `${climbBanCellReveal} 0.48s ease-out`,
                                                              }
                                                            : {};

                                                    const hoverActiveBg =
                                                        isWinStar ||
                                                        (showTerminalFullGrid && !isDisplayBan)
                                                            ? starFilledBg
                                                            : { bg };

                                                    return (
                                                        <Button
                                                            key={idx}
                                                            h={CLIMB_GRID_CELL_H}
                                                            borderRadius="8px"
                                                            bg={bg}
                                                            border={border}
                                                            boxShadow="inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 5px rgba(4,22,56,0.35)"
                                                            _hover={hoverActiveBg}
                                                            _active={hoverActiveBg}
                                                            p={0}
                                                            minW={0}
                                                            sx={{
                                                                ...revealSx,
                                                                ...(isWinStar ? { overflow: "visible" } : {}),
                                                            }}
                                                            onClick={() => handlePickApi(rowIndex, colIndex)}
                                                            isDisabled={isDisabled}
                                                            _disabled={
                                                                isDisabled && gameState !== "playing"
                                                                    ? { opacity: 1, cursor: "default" }
                                                                    : undefined
                                                            }
                                                        >
                                                            {icon}
                                                        </Button>
                                                    );
                                                })}
                                            </Grid>
                                        </Box>
                                    </VStack>
                                </Box>
                            </VStack>
                        </CardBody>
                    </Card>
                    </Box>
                </GridItem>

                <GridItem
                    area="empty"
                    minW={0}
                    display="flex"
                    flexDirection="column"
                    alignSelf="stretch"
                    minH={0}
                >
                    <Box
                        flex="1"
                        minH={{ base: "250px", "1550px": "100%" }}
                        h={{ base: "auto", "1550px": "100%" }}
                        w="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <ClimbRealView />
                    </Box>
                </GridItem>
            </Grid>

            <WinFireworksEffect
                isVisible={cashOutWinFx.visible}
                totalEarn={cashOutWinFx.amount}
                subtitle={cashOutWinFx.subtitle}
                duration={2200}
                anchorRect={cashOutWinFx.anchorRect ?? undefined}
            />
            <BangBurstEffect
                isVisible={bustBangFx.visible}
                anchorRect={bustBangFx.anchorRect ?? undefined}
                duration={950}
            />

            <BetHistory />

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent
                    bg="#2a2d2e"
                    border="1px solid rgba(0, 212, 255, 0.3)"
                    maxH="80vh"
                    overflowY="auto"
                    className="pumping-modal-content"
                >
                    <ModalHeader color="white">How to play Climb</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: "#00D4FF" }} />
                    <ModalBody py="0" maxH="calc(80vh - 60px)" overflowY="auto" className="pumping-modal-body">
                        <VStack align="stretch" spacing={4} pb={4}>
                            <Box>
                                <Text color="#fff" fontSize="sm" fontWeight="800" mb={1.5}>
                                    Goal
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall">
                                    Move up the grid from the <strong>bottom row to the top</strong>. Each successful pick
                                    raises your <strong>cash-out multiplier</strong>. You decide when to take profit—or
                                    push for the next step and risk a bust.
                                </Text>
                            </Box>
                            <Box>
                                <Text color="#fff" fontSize="sm" fontWeight="800" mb={1.5}>
                                    Start a round
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall">
                                    Set your <strong>bet</strong> (within the shown min and max), choose{" "}
                                    <strong>Easy, Normal, or Hard</strong>, then tap <strong>Play</strong>. The bet is
                                    deducted from your balance and the first row you play is the{" "}
                                    <strong>bottom</strong> row.
                                </Text>
                            </Box>
                            <Box>
                                <Text color="#fff" fontSize="sm" fontWeight="800" mb={1.5}>
                                    Picking boxes
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall" mb={2}>
                                    Tap <strong>one box</strong> in the active (highlighted) row. The server resolves
                                    your pick right away.
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall" mb={2}>
                                    <strong>Star</strong> — you cleared that row. Your multiplier updates using the{" "}
                                    <strong>Step Multipliers</strong> strip above the grid, and you advance to the next
                                    row up.
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall">
                                    <strong>Ban</strong> — the round ends immediately. You do not get a cash-out for
                                    that round; try again with <strong>Play</strong>.
                                </Text>
                            </Box>
                            <Box>
                                <Text color="#fff" fontSize="sm" fontWeight="800" mb={1.5}>
                                    Cash out
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall">
                                    After at least <strong>one star</strong>, <strong>Cash out</strong> pays roughly{" "}
                                    <strong>bet × current multiplier</strong> (rounded) and closes the round. You can
                                    cash out instead of picking the next row whenever you have a star—locking in profit
                                    before a possible ban.
                                </Text>
                            </Box>
                            <Box>
                                <Text color="#fff" fontSize="sm" fontWeight="800" mb={1.5}>
                                    Modes
                                </Text>
                                <Text color="rgba(255,255,255,0.82)" fontSize="sm" lineHeight="tall" mb={2}>
                                    <strong>Easy</strong> uses more columns per row (wider grid).{" "}
                                    <strong>Normal</strong> is in between. <strong>Hard</strong> uses fewer columns; the
                                    ladder usually offers higher multipliers per step for the same number of successful
                                    climbs.
                                </Text>
                                <Text color="rgba(255,255,255,0.72)" fontSize="sm" lineHeight="tall">
                                    Step multipliers follow the <strong>Easy / Normal / Hard</strong> mode you pick for the
                                    round.
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
