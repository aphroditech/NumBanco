import React, { useState, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    Box,
    Grid,
    GridItem,
    Flex,
    Text,
    Button,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Input,
    IconButton,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Progress,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Tooltip,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
} from "@chakra-ui/react";
import Card from "components/Card/Card.js";
import GradientBorder from "components/GradientBorder/GradientBorder";
import CardBody from "components/Card/CardBody.js";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import truncateToTwo from "variables/truncateToTwo";
import { toast } from "react-toastify";
import { minesGetActiveGame, minesStartGame, minesReveal, minesCashOut } from "action/MinesActions";
import { getUserData } from "action";
import UserHistory from "./MinesItem/UserHistory";
import History from "./MinesItem/History";
import bomb from "assets/img/bomb.png";
import blast from "assets/img/blast.png";
import diamond from "assets/badge/377.png";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import { Gem, Bomb, Coins } from "lucide-react";

const MIN_AMOUNT = 0.1;
const MAX_BET_AMOUNT = 20;
const MIN_MINES = 1;

const GRID_SIZE = 25; // 5x5 fixed
const GRID_COLUMNS = 5;
const MODES = { easy: 2, normal: 4, hard: 6, ace: 8 }; // mine count per mode

// Full multiplier list per mode (must match server). Used for the multiplier bar.
const MULTIPLIER_BY_MODE = {
    easy: [0.5, 0.8, 1.1, 1.15, 1.21, 1.27, 1.34, 1.42, 1.51, 1.61, 1.72, 1.86, 2.01, 2.19, 2.41, 2.68, 3.02, 3.45, 4.02, 4.83, 6.03, 8.04, 12.06],
    normal: [0.6, 0.9, 1, 1.25, 1.38, 1.52, 1.69, 1.89, 2.13, 2.41, 2.76, 3.18, 3.8, 4.35, 5.4, 6.87, 8.56, 10.86, 20.5, 43.56, 89.88],
    hard: [0.7, 0.9, 1, 1.44, 1.66, 1.87, 2.04, 2.54, 2.79, 3.01, 3.69, 3.9, 4.24, 5.84, 10.87, 24.68, 50.65, 100.98, 210.65],
    ace: [0.7, 1, 1.44, 1.96, 2.34, 3.48, 4.92, 5.83, 8.64, 13.56, 25.68, 38.96, 68.48, 100.96, 200.12, 420.45, 842.56],
};

export default function MinesPage() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const historyResults = useSelector((state) => state.user.userInfo?.minesHistory) || [];
    const maxAmount = Math.min(MAX_BET_AMOUNT, Math.max(MIN_AMOUNT, balance));

    const [amount, setAmount] = useState("0.1");
    const [mode, setMode] = useState("normal"); // easy | normal | hard | ace
    const [gameState, setGameState] = useState("idle"); // idle | playing | win | lose
    const [gameId, setGameId] = useState(null); // server game id when playing
    const [revealLoading, setRevealLoading] = useState(false);
    const [revealingIndex, setRevealingIndex] = useState(null); // tile waiting for server (show spinner, don't show gem/multiplier until confirmed)
    const [buttonLoading, setButtonLoading] = useState(false); // Start Game / Cash out request in progress

    const totalTiles = GRID_SIZE;
    const gridColumns = GRID_COLUMNS;
    const minesCount = MODES[mode] ?? MODES.normal;
    const maxMines = totalTiles - 1;

    const [tiles, setTiles] = useState(() => Array(totalTiles).fill(null));
    const [mineIndices, setMineIndices] = useState([]); // only set on lose (from server)
    const [revealedCount, setRevealedCount] = useState(0);
    const [currentMultiplier, setCurrentMultiplier] = useState(1);
    const [effectTileIndex, setEffectTileIndex] = useState(null);
    const [effectMultiplier, setEffectMultiplier] = useState(0);
    const [explodingTileIndex, setExplodingTileIndex] = useState(null);
    const restoreInProgressRef = useRef(false);
    const [screenShake, setScreenShake] = useState(false);
    const [cashoutPulse, setCashoutPulse] = useState(false);
    const shakeTimeoutRef = useRef(null);
    const pulseTimeoutRef = useRef(null);
    const prevMultiplierRef = useRef(1);
    const bombRevealTimeoutsRef = useRef([]);
    const [showFireworks, setShowFireworks] = useState(false);
    const [fireworksAmount, setFireworksAmount] = useState("0.00");
    const fireworksTimeoutRef = useRef(null);
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

    React.useEffect(() => {
        prevMultiplierRef.current = currentMultiplier;
    }, [currentMultiplier]);

    React.useEffect(() => {
        return () => {
            if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
            if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
            if (bombRevealTimeoutsRef.current.length) {
                bombRevealTimeoutsRef.current.forEach((t) => clearTimeout(t));
                bombRevealTimeoutsRef.current = [];
            }
            if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
        };
    }, []);

    // Helper to compute multiplier for restore (uses explicit minesCount; same formula as getMultiplierForRevealed)
    const getMultiplierForRevealedRestore = (revealed, minesCountArg) => {
        const safe = GRID_SIZE - minesCountArg;
        if (revealed <= 0) return 1;
        let probability = 1;
        let remainingSafe = safe;
        let remainingTiles = GRID_SIZE;
        for (let i = 0; i < revealed; i++) {
            probability *= remainingSafe / remainingTiles;
            remainingSafe--;
            remainingTiles--;
        }
        return (1 / probability) * (1 - 0.05);
    };

    // On mount: restore active game if user refreshed during a round
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await minesGetActiveGame();
                if (cancelled || !data?.gameId) return;
                restoreInProgressRef.current = true;
                const rev = data.revealedIndices || [];
                const tilesRestored = Array(GRID_SIZE).fill(null).map((_, i) => (rev.includes(i) ? true : null));
                setMode(data.mode);
                setAmount(String(data.amount));
                setGameId(data.gameId);
                setTiles(tilesRestored);
                setMineIndices([]);
                setRevealedCount(rev.length);
                setCurrentMultiplier(getMultiplierForRevealedRestore(rev.length, data.minesCount));
                setGameState("playing");
                setEffectTileIndex(null);
                setExplodingTileIndex(null);
                setRevealingIndex(null);
            } catch (e) {
                // ignore
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // When mode changes: reset game (skip if we're restoring an active game)
    React.useEffect(() => {
        if (restoreInProgressRef.current) {
            restoreInProgressRef.current = false;
            return;
        }
        setGameId(null);
        setTiles(Array(totalTiles).fill(null));
        setMineIndices([]);
        setGameState("idle");
        setRevealedCount(0);
        setCurrentMultiplier(1);
        setEffectTileIndex(null);
        setExplodingTileIndex(null);
        setRevealingIndex(null);
    }, [mode, totalTiles]);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
            const num = parseFloat(value);
            if (value !== "" && !isNaN(num) && num > maxAmount) {
                toast.warning(`Max amount is ${truncateToTwo(maxAmount)}`);
                setAmount(truncateToTwo(maxAmount));
            } else {
                setAmount(value);
            }
        }
    };

    const handleAmountBlur = () => {
        const num = parseFloat(amount);
        if (isNaN(num) || num < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(2));
        else if (num > maxAmount) setAmount(truncateToTwo(maxAmount));
        else setAmount(num.toFixed(2));
    };

    const startGame = useCallback(async () => {
        const bet = parseFloat(amount);
        if (isNaN(bet) || bet < MIN_AMOUNT || bet > balance) {
            toast.warning("Invalid amount or insufficient balance.");
            return;
        }
        if (minesCount < MIN_MINES || minesCount > maxMines) {
            toast.warning(`Mines must be between ${MIN_MINES} and ${maxMines}.`);
            return;
        }
        setButtonLoading(true);
        try {
            const data = await minesStartGame(bet, mode, dispatch);
            if (!data?.gameId) {
                toast.error("Failed to start game.");
                return;
            }
            setGameId(data.gameId);
            setMineIndices([]);
            setTiles(Array(totalTiles).fill(null));
            setRevealedCount(0);
            setCurrentMultiplier(1);
            setEffectTileIndex(null);
            setExplodingTileIndex(null);
            setGameState("playing");
            toast.info(`Mines game started. Bet $${truncateToTwo(bet)}.`);
            // Avoid immediate full user refetch here: balance is already updated optimistically
            // in minesStartGame, and refetching right now can trigger extra header balance flips.
        } catch (e) {
            toast.error(e.message || "Failed to start game.");
        } finally {
            setButtonLoading(false);
        }
    }, [amount, balance, minesCount, totalTiles, maxMines, mode, dispatch]);

    // probability *= (remainingSafe / remainingTiles) per reveal; multiplier = 1 / probability; 5% house edge
    const getMultiplierForRevealed = (revealed) => {
        const safe = totalTiles - minesCount;
        if (revealed <= 0) return 1;
        let probability = 1;
        let remainingSafe = safe;
        let remainingTiles = totalTiles;
        for (let i = 0; i < revealed; i++) {
            probability *= remainingSafe / remainingTiles;
            remainingSafe--;
            remainingTiles--;
        }
        const multiplier = 1 / probability;
        const houseEdge = 0.05;
        return multiplier * (1 - houseEdge);
    };

    const revealTile = useCallback(
        async (index) => {
            if (gameState !== "playing" || tiles[index] !== null || !gameId) return;
            setRevealLoading(true);
            setRevealingIndex(index);

            try {
                const data = await minesReveal(gameId, index, dispatch);
                if (data.isMine) {
                    const indices = data.mineIndices || [];
                    setMineIndices(indices);
                    // Reveal bombs one-by-one (staggered). Clicked bomb shows immediately.
                    if (bombRevealTimeoutsRef.current.length) {
                        bombRevealTimeoutsRef.current.forEach((t) => clearTimeout(t));
                        bombRevealTimeoutsRef.current = [];
                    }
                    // Set exploding index first so the clicked tile flips to "blast" immediately.
                    setExplodingTileIndex(index);
                    setTiles((prev) => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                    });
                    setRevealingIndex(null);
                    setScreenShake(true);
                    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
                    shakeTimeoutRef.current = setTimeout(() => setScreenShake(false), 450);

                    const orderedBombs = [index, ...indices.filter((i) => i !== index)];
                    const stepMs = 90;
                    orderedBombs.slice(1).forEach((bombIndex, step) => {
                        const t = setTimeout(() => {
                            setTiles((prev) => {
                                const next = [...prev];
                                next[bombIndex] = false;
                                return next;
                            });
                        }, (step + 1) * stepMs);
                        bombRevealTimeoutsRef.current.push(t);
                    });

                    // After bombs are shown, reveal the rest of the board (keeps existing behavior).
                    const finalRevealDelay = Math.max(1, orderedBombs.length) * stepMs + 140;
                    const tFinal = setTimeout(() => {
                        setTiles((prev) => prev.map((v, i) => (orderedBombs.includes(i) ? false : v === null ? true : v)));
                    }, finalRevealDelay);
                    bombRevealTimeoutsRef.current.push(tFinal);

                    setTimeout(() => {
                        setGameState("lose");
                        getUserData(dispatch);
                        const betLoss = parseFloat(amount) || 0;
                        toast.error(`Boom! You lost $${truncateToTwo(betLoss)}.`);
                    }, 500);
                    return;
                }
                const nextRevealed = data.revealedCount ?? revealedCount + 1;
                const newMult = data.multiplier ?? getMultiplierForRevealed(nextRevealed);
                setTiles((prev) => {
                    const next = [...prev];
                    next[index] = true;
                    return next;
                });
                setRevealedCount(nextRevealed);
                setCurrentMultiplier(newMult);
                if (newMult > (prevMultiplierRef.current || 1)) {
                    setCashoutPulse(true);
                    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
                    pulseTimeoutRef.current = setTimeout(() => setCashoutPulse(false), 420);
                }
                setEffectTileIndex(index);
                setEffectMultiplier(newMult);
                setRevealingIndex(null);
                setTimeout(() => setEffectTileIndex(null), 1200);
                if (data.gameOver) {
                    setGameState("win");
                    getUserData(dispatch);
                    const betAmt = parseFloat(amount) || 0;
                    const payout = betAmt * newMult;
                    const profit = payout - betAmt;
                    toast.success(`You won $${truncateToTwo(Math.max(0, profit))}!`);
                    setFireworksAmount(truncateToTwo(Math.max(0, profit)));
                    setShowFireworks(true);
                    if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
                    fireworksTimeoutRef.current = setTimeout(() => setShowFireworks(false), 2200);
                }
            } catch (e) {
                setRevealingIndex(null);
                toast.error(e.message || "Reveal failed.");
            } finally {
                setRevealLoading(false);
            }
        },
        [gameState, tiles, revealedCount, totalTiles, minesCount, gameId, dispatch]
    );

    const randomClick = useCallback(() => {
        if (gameState !== "playing" || revealLoading || buttonLoading || explodingTileIndex !== null) return;
        const candidates = tiles
            .map((t, i) => (t === null ? i : null))
            .filter((v) => v !== null);
        if (candidates.length === 0) return;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        revealTile(pick);
    }, [gameState, revealLoading, buttonLoading, explodingTileIndex, tiles, revealTile]);

    const cashOut = useCallback(async () => {
        if (revealLoading) {
            toast.warning("Please wait for the current reveal to finish.");
            return;
        }
        if (gameState !== "playing" || revealedCount === 0 || !gameId) return;
        setButtonLoading(true);
        try {
            await minesCashOut(gameId, dispatch);
            setGameState("win");
            getUserData(dispatch);
            const betAmt = parseFloat(amount) || 0;
            const payout = betAmt * currentMultiplier;
            toast.success(`Cashed out! You won $${truncateToTwo(Math.max(0, payout))}.`);
            setFireworksAmount(truncateToTwo(Math.max(0, payout)));
            setShowFireworks(true);
            if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
            fireworksTimeoutRef.current = setTimeout(() => setShowFireworks(false), 2200);
        } catch (e) {
            toast.error(e.message || "Cash out failed.");
        } finally {
            setButtonLoading(false);
        }
    }, [gameState, revealedCount, gameId, dispatch, amount, currentMultiplier, revealLoading]);

    const resetGame = useCallback(() => {
        if (bombRevealTimeoutsRef.current.length) {
            bombRevealTimeoutsRef.current.forEach((t) => clearTimeout(t));
            bombRevealTimeoutsRef.current = [];
        }
        setGameId(null);
        setGameState("idle");
        setTiles(Array(totalTiles).fill(null));
        setMineIndices([]);
        setRevealedCount(0);
        setCurrentMultiplier(1);
        setEffectTileIndex(null);
        setExplodingTileIndex(null);
        setRevealingIndex(null);
    }, [totalTiles]);

    const canStart =
        gameState === "idle" &&
        amount &&
        parseFloat(amount) >= MIN_AMOUNT &&
        balance >= parseFloat(amount) &&
        minesCount >= MIN_MINES &&
        minesCount <= maxMines;

    const multiplierBarValues = MULTIPLIER_BY_MODE[mode] || MULTIPLIER_BY_MODE.normal;
    const maxMultiplier = multiplierBarValues.length ? multiplierBarValues[multiplierBarValues.length - 1] : 1;
    const safeTilesCount = totalTiles - minesCount;
    const isMaxWin = revealedCount >= safeTilesCount && safeTilesCount > 0;
    const filledSafeTilesCount = Math.min(isMaxWin ? safeTilesCount : revealedCount, safeTilesCount);

    return (
        <Box
            w="100%"
            minH="100vh"
            py={{ base: 4, md: 6 }}
            px={{ base: 2, md: 4 }}
        >
            <WinFireworksEffect isVisible={showFireworks} totalEarn={fireworksAmount} duration={2200} />
            <Flex direction="column" align="center" w="100%" mx="auto">
                <Text
                    fontSize={{ base: "xl", md: "2xl" }}
                    fontWeight="bold"
                    color="#fff"
                    mb={{ base: 4, md: 6 }}
                    textShadow="0 0 20px rgba(0, 212, 255, 0.5)"
                >
                    MINES
                </Text>

                <Grid
                    templateAreas={{
                        base: '"panel" "game" "live"',
                        md: '"panel game" "live live"',
                        "1550px": '"panel game live"',
                    }}
                    templateColumns={{
                        base: "1fr",
                        md: "340px 1fr",
                        "1550px": "340px 1fr 280px",
                    }}
                    templateRows={{
                        base: "auto auto auto",
                        md: "auto auto",
                        "1550px": "1fr",
                    }}
                    gap={{ base: "20px", md: "24px" }}
                    w="100%"
                    align="stretch"
                    minH={{ md: "420px" }}
                >
                    <GridItem area="panel" display="flex">
                        <Card
                            pt="24px"
                            pb="22px"
                            px="22px"
                            overflow="visible"
                            position="relative"
                            flex="1"
                            minH={{ base: "420px", md: "500px" }}
                            h="500px"
                            bg="#2a2a2a"
                            border="1px solid rgba(255,255,255,0.1)"
                            borderRadius="16px"
                            boxShadow="none"
                        >
                            <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" position="relative" minH="100%">
                                <Box position="absolute" top="-23px" right="-20px" zIndex={2}>
                                    <IconButton
                                        aria-label="Help"
                                        icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                        size="md"
                                        bg="transparent"
                                        color="#00d4ff"
                                        borderRadius="50%"
                                        _hover={{ bg: "rgba(255,255,255,0.1)", color: "#fff" }}
                                        onClick={onHelpOpen}
                                    />
                                </Box>
                                <VStack spacing="20px" align="stretch" w="100%">
                                    {/* Bet Amount - Rubic style */}
                                    <FormControl w="100%">
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Amount
                                        </FormLabel>
                                        <GradientBorder borderRadius="20px" w="100%">
                                            <Flex
                                                w="100%"
                                                align="center"
                                                justify="space-between"
                                                bg="#323738"
                                                borderRadius="18px"
                                                h="46px"
                                                pl="16px"
                                                pr="0"
                                            >
                                                <Input
                                                    bg="transparent"
                                                    border="transparent"
                                                    fontSize="xl"
                                                    fontWeight="bold"
                                                    h="auto"
                                                    p="0"
                                                    color="white"
                                                    type="text"
                                                    value={amount}
                                                    onChange={handleAmountChange}
                                                    onBlur={handleAmountBlur}
                                                    placeholder="0.10"
                                                    _focus={{ boxShadow: "none" }}
                                                    flex="1"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") e.target.blur();
                                                    }}
                                                />
                                                <HStack spacing="0" align="stretch" h="100%">
                                                    <Button
                                                        size="sm"
                                                        h="100%"
                                                        minW="36px"
                                                        px="8px"
                                                        bg="transparent"
                                                        color="#fff"
                                                        fontSize="xs"
                                                        fontWeight="normal"
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                                        onClick={() => {
                                                            const current = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(Math.max(MIN_AMOUNT, Math.min(maxAmount, current / 2)).toFixed(2));
                                                        }}
                                                    >
                                                        /2
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        h="100%"
                                                        minW="36px"
                                                        px="8px"
                                                        bg="transparent"
                                                        color="#fff"
                                                        fontSize="xs"
                                                        fontWeight="normal"
                                                        borderRadius="0"
                                                        borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                        _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                                        onClick={() => {
                                                            const current = parseFloat(amount || MIN_AMOUNT);
                                                            setAmount(Math.min(maxAmount, (current * 2)).toFixed(2));
                                                        }}
                                                    >
                                                        ×2
                                                    </Button>
                                                    <Popover placement="bottom-end" closeOnBlur={true}>
                                                        <PopoverTrigger>
                                                            <Box
                                                                borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                                borderTopRightRadius="18px"
                                                                borderBottomRightRadius="18px"
                                                                overflow="hidden"
                                                                cursor="pointer"
                                                            >
                                                                <VStack spacing="0" align="center" h="100%">
                                                                    <IconButton
                                                                        aria-label="Open amount slider"
                                                                        icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                                        size="xs"
                                                                        h="100%"
                                                                        w="24px"
                                                                        minW="24px"
                                                                        bg="transparent"
                                                                        color="#fff"
                                                                        borderRadius="0"
                                                                        _hover={{ bg: "rgba(255,255,255,0.1)" }}
                                                                    />
                                                                </VStack>
                                                            </Box>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            bg="#323738"
                                                            border="1px solid rgba(255, 255, 255, 0.2)"
                                                            borderRadius="12px"
                                                            w="300px"
                                                            _focus={{ boxShadow: "none" }}
                                                        >
                                                            <PopoverBody p="16px">
                                                                <Flex align="center" gap="12px" w="100%">
                                                                    <Text
                                                                        color="#fff"
                                                                        fontSize="sm"
                                                                        fontWeight="bold"
                                                                        minW="30px"
                                                                        cursor="pointer"
                                                                        onClick={() => setAmount(MIN_AMOUNT.toFixed(2))}
                                                                    >
                                                                        Min
                                                                    </Text>
                                                                    <Box flex="1" position="relative">
                                                                        <Slider
                                                                            aria-label="Amount slider"
                                                                            min={MIN_AMOUNT}
                                                                            max={maxAmount}
                                                                            step={0.01}
                                                                            value={parseFloat(amount || MIN_AMOUNT)}
                                                                            onChange={(val) => setAmount(val.toFixed(2))}
                                                                            focusThumbOnChange={false}
                                                                        >
                                                                            <SliderTrack bg="#2a2d2e" h="6px" borderRadius="3px">
                                                                                <SliderFilledTrack bg="transparent" />
                                                                            </SliderTrack>
                                                                            <SliderThumb
                                                                                bg="#fff"
                                                                                w="12px"
                                                                                h="24px"
                                                                                borderRadius="6px"
                                                                                border="none"
                                                                                boxShadow="none"
                                                                                _focus={{ boxShadow: "none" }}
                                                                                position="relative"
                                                                            >
                                                                                <Box
                                                                                    position="absolute"
                                                                                    top="50%"
                                                                                    left="50%"
                                                                                    transform="translate(-50%, -50%)"
                                                                                    w="8px"
                                                                                    h="12px"
                                                                                    display="flex"
                                                                                    flexDirection="column"
                                                                                    justifyContent="space-between"
                                                                                    pointerEvents="none"
                                                                                >
                                                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                                                    <Box w="100%" h="1px" bg="rgba(0, 0, 0, 0.2)" />
                                                                                </Box>
                                                                            </SliderThumb>
                                                                        </Slider>
                                                                        <Box
                                                                            position="absolute"
                                                                            top="50%"
                                                                            left="0"
                                                                            right="0"
                                                                            transform="translateY(-50%)"
                                                                            h="6px"
                                                                            display="flex"
                                                                            justifyContent="space-between"
                                                                            alignItems="center"
                                                                            px="6px"
                                                                            pointerEvents="none"
                                                                        >
                                                                            {[0, 1, 2, 3, 4].map((i) => (
                                                                                <Box key={i} w="2px" h="2px" borderRadius="50%" bg="rgba(255, 255, 255, 0.3)" />
                                                                            ))}
                                                                        </Box>
                                                                    </Box>
                                                                    <Text
                                                                        color="#fff"
                                                                        fontSize="sm"
                                                                        fontWeight="bold"
                                                                        minW="30px"
                                                                        textAlign="right"
                                                                        cursor="pointer"
                                                                        onClick={() => setAmount(truncateToTwo(maxAmount))}
                                                                    >
                                                                        Max
                                                                    </Text>
                                                                </Flex>
                                                            </PopoverBody>
                                                        </PopoverContent>
                                                    </Popover>
                                                </HStack>
                                            </Flex>
                                        </GradientBorder>
                                    </FormControl>

                                    {/* Mines / Safe indicators (between Amount and Mode) */}
                                    <HStack spacing="12px" w="100%" flexWrap="wrap">
                                        <HStack
                                            spacing="8px"
                                            bg="#E74C3C"
                                            borderRadius="10px"
                                            px="12px"
                                            py="8px"
                                            flex="1"
                                            minW="0"
                                            justify="center"
                                        >
                                            <Box as="img" src={bomb} alt="Mines" w="22px" h="22px" objectFit="contain" />
                                            <Text color="#fff" fontWeight="bold" fontSize="sm" whiteSpace="nowrap">
                                                Mines: {minesCount}
                                            </Text>
                                        </HStack>
                                        <HStack
                                            spacing="8px"
                                            bg="#00d4ff"
                                            borderRadius="10px"
                                            px="12px"
                                            py="8px"
                                            flex="1"
                                            minW="0"
                                            justify="center"
                                        >
                                            <Box as="img" src={diamond} alt="Safe" w="22px" h="22px" objectFit="contain" backgroundColor="transparent" />
                                            <Text color="#fff" fontWeight="bold" fontSize="sm" whiteSpace="nowrap">
                                                Safe: {totalTiles - minesCount}
                                            </Text>
                                        </HStack>
                                    </HStack>

                                    {/* Mode: Easy / Normal / Hard / Ace (5x5 grid, mines per mode) */}
                                    <FormControl>
                                        <FormLabel color="rgba(255,255,255,0.85)" fontSize="sm" fontWeight="medium" mb="8px">
                                            Mode
                                        </FormLabel>
                                        <HStack spacing="2" flexWrap="wrap">
                                            {(["easy", "normal", "hard", "ace"]).map((m) => (
                                                <Button
                                                    key={m}
                                                    size="sm"
                                                    h="40px"
                                                    flex={1}
                                                    fontSize="sm"
                                                    fontWeight="medium"
                                                    borderRadius="10px"
                                                    textTransform="capitalize"
                                                    bg={mode === m ? "#00d4ff" : "#323738"}
                                                    color={mode === m ? "#fff" : "rgba(255,255,255,0.7)"}
                                                    _hover={mode === m ? {} : { bg: "rgba(255,255,255,0.08)" }}
                                                    onClick={() => setMode(m)}
                                                    isDisabled={gameState === "playing"}
                                                >
                                                    {m}
                                                </Button>
                                            ))}
                                        </HStack>
                                        {/* <Flex mt="6px" justify="center" gap="12px">
                                            <HStack spacing="6px" bg="#00d4ff" borderRadius="8px" px="8px" py="4px">
                                                <Box as="img" src={diamond} alt="Safe" w="18px" h="18px" objectFit="contain" />
                                                <Text color="#fff" fontWeight="bold" fontSize="sm">{totalTiles - minesCount}</Text>
                                            </HStack>
                                            <HStack spacing="6px" bg="#B91C1C" borderRadius="8px" px="8px" py="4px">
                                                <Text color="#fff" fontWeight="bold" fontSize="sm">{minesCount}</Text>
                                                <Box as="img" src={bomb} alt="Mines" w="18px" h="18px" objectFit="contain" />
                                            </HStack>
                                        </Flex> */}
                                    </FormControl>

                                    {/* Same position: Start Game → Cash out; multiplier progress bar directly under the button. Reserved height prevents layout shift. */}
                                    {(gameState === "idle" || gameState === "playing") && (
                                        <Box>
                                            <VStack spacing="10px" align="stretch">
                                                <Button
                                                    h="48px"
                                                    w="100%"
                                                    minW="0"
                                                    fontSize="md"
                                                    fontWeight="bold"
                                                    borderRadius="12px"
                                                    overflow="hidden"
                                                    isLoading={buttonLoading}
                                                    loadingText={gameState === "playing" ? "Cashing out…" : "Starting…"}
                                                    onClick={gameState === "playing" ? cashOut : startGame}
                                                    bg={gameState === "playing" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "#00d4ff"}
                                                    color="#fff"
                                                    _hover={buttonLoading ? {} : (gameState === "playing" ? { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)" } : { bg: "#95D61A", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(132, 204, 22, 0.4)" })}
                                                    _active={{ transform: "translateY(0)" }}
                                                    animation={gameState === "playing" && cashoutPulse ? "mines-button-pulse 0.42s ease-out" : undefined}
                                                    isDisabled={gameState === "playing" ? (revealLoading || buttonLoading || explodingTileIndex !== null || revealedCount === 0) : (gameState === "idle" && !canStart) || buttonLoading}
                                                >
                                                    {gameState === "playing" ? `Cash out $${truncateToTwo((parseFloat(amount) || 0) * currentMultiplier)}` : "Start Game"}
                                                </Button>

                                                <Button
                                                    h="48px"
                                                    w="100%"
                                                    minW="0"
                                                    fontSize="md"
                                                    fontWeight="bold"
                                                    borderRadius="12px"
                                                    bg="#323738"
                                                    color="#fff"
                                                    visibility={gameState === "playing" ? "visible" : "hidden"}
                                                    pointerEvents={gameState === "playing" ? "auto" : "none"}
                                                    isDisabled={revealLoading || buttonLoading || explodingTileIndex !== null || gameState !== "playing"}
                                                    onClick={randomClick}
                                                    _hover={{ bg: "#3d4243", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(255,255,255,0.05)" }}
                                                    _active={{ transform: "translateY(0)" }}
                                                >
                                                    Random Click
                                                </Button>
                                            </VStack>
                                        </Box>
                                    )}

                                    {(gameState === "win" || gameState === "lose") && (
                                        <Box>
                                            <Button h="48px" w="100%" fontSize="md" fontWeight="bold" borderRadius="12px" bg={gameState === "win" ? "#22c55e" : "#e74c3c"} color="#fff" _hover={{ transform: "translateY(-1px)" }} onClick={resetGame}>
                                                {gameState === "win" ? "You won! Play again" : "Boom! Play again"}
                                            </Button>
                                            <Box minH="52px" pt="8px" />
                                        </Box>
                                    )}
                                </VStack>
                            </CardBody>
                        </Card>
                    </GridItem>

                    <GridItem area="game" display="flex">
                        <Card
                            p="20px"
                            overflow="visible"
                            position="relative"
                            flex="1"
                            h="500px"
                            bg="#2a2a2a"
                            border="1px solid rgba(255,255,255,0.1)"
                            borderRadius="16px"
                            boxShadow="none"
                            animation={screenShake ? "mines-screen-shake 0.45s ease-out" : undefined}
                        >
                            <style>{`
                                @keyframes mines-multiplier-pop {
                                    0% { transform: scale(0.5); opacity: 0; }
                                    30% { transform: scale(1.2); opacity: 1; }
                                    70% { transform: scale(1.1); opacity: 1; }
                                    100% { transform: scale(1.3); opacity: 0; }
                                }
                                @keyframes mines-screen-shake {
                                    0%, 100% { transform: translate(0, 0); }
                                    10% { transform: translate(-6px, 2px); }
                                    20% { transform: translate(6px, -2px); }
                                    30% { transform: translate(-5px, -1px); }
                                    40% { transform: translate(5px, 1px); }
                                    50% { transform: translate(-4px, 2px); }
                                    60% { transform: translate(4px, -2px); }
                                    70% { transform: translate(-3px, 1px); }
                                    80% { transform: translate(3px, -1px); }
                                    90% { transform: translate(-2px, 0px); }
                                }
                                @keyframes mines-button-pulse {
                                    0% { transform: scale(1); box-shadow: 0 0 0 rgba(245, 158, 11, 0.0); }
                                    35% { transform: scale(1.03); box-shadow: 0 0 18px rgba(245, 158, 11, 0.55); }
                                    100% { transform: scale(1); box-shadow: 0 0 0 rgba(245, 158, 11, 0.0); }
                                }
                                @keyframes mines-bomb-burst {
                                    0% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
                                    50% { transform: scale(1.4); opacity: 0.7; box-shadow: 0 0 30px 15px rgba(239, 68, 68, 0.6); }
                                    100% { transform: scale(1.8); opacity: 0; box-shadow: 0 0 60px 25px rgba(239, 68, 68, 0); }
                                }
                                @keyframes mines-explosion-pop {
                                    0% { transform: scale(0.9); filter: drop-shadow(0 0 0 rgba(255,140,0,0)); }
                                    35% { transform: scale(1.12); filter: drop-shadow(0 0 18px rgba(255,140,0,0.65)); }
                                    100% { transform: scale(1.0); filter: drop-shadow(0 0 10px rgba(255,140,0,0.35)); }
                                }
                                @keyframes mines-glow-burst {
                                    0% { transform: scale(0.6); opacity: 0.0; }
                                    30% { transform: scale(1.0); opacity: 0.95; }
                                    100% { transform: scale(1.65); opacity: 0.0; }
                                }
                                @keyframes mines-spark {
                                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                                    100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
                                }
                                .mines-spark {
                                    position: absolute;
                                    left: 50%;
                                    top: 50%;
                                    width: 6px;
                                    height: 2px;
                                    border-radius: 999px;
                                    background: linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,165,0,0.9) 45%, rgba(255,69,0,0.8) 100%);
                                    transform: translate(-50%, -50%);
                                    filter: drop-shadow(0 0 6px rgba(255, 140, 0, 0.65));
                                    animation: mines-spark 520ms ease-out forwards;
                                }
                                @keyframes mines-tile-shake {
                                    0%, 100% { transform: translateX(0); }
                                    20% { transform: translateX(-4px); }
                                    40% { transform: translateX(4px); }
                                    60% { transform: translateX(-3px); }
                                    80% { transform: translateX(3px); }
                                }
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                                .mines-tile-flip {
                                    perspective: 1000px;
                                }
                                .mines-tile-flipper {
                                    transform-style: preserve-3d;
                                    transition: transform 0.25s ease;
                                    width: 100%;
                                    height: 100%;
                                    position: relative;
                                }
                                .mines-tile-flipper.revealed {
                                    transform: rotateY(180deg);
                                }
                                .mines-tile-face {
                                    position: absolute;
                                    inset: 0;
                                    backface-visibility: hidden;
                                    -webkit-backface-visibility: hidden;
                                    border-radius: 10px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                }
                                .mines-tile-back {
                                    transform: rotateY(180deg);
                                }
                            `}</style>
                            <CardBody p={{ base: "12px", md: "20px" }} display="flex" flexDirection="column" justifyContent="center" minH="100%">
                                {/* Top progress bar: 0 → last multiplier; fill moves with current; on win charge to 100% */}
                                <Box
                                    w="100%"
                                    minW="220px"
                                    maxW="380px"
                                    mx="auto"
                                    mb="14px"
                                    position="relative"
                                    bg="#333738"
                                    borderRadius="10px"
                                    border="2px solid"
                                    borderColor="#d4af37"
                                    boxShadow="0 0 12px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
                                    overflow="visible"
                                    py="10px"
                                    px="10px"
                                >
                                    <Flex position="relative" align="center" justify="space-between" mb="6px">
                                        <Text fontSize="sm" fontWeight="bold" color="#fbbf24">0</Text>
                                        <Text fontSize="sm" fontWeight="bold" color="#fbbf24" textShadow="0 0 8px rgba(251, 191, 36, 0.6)">
                                            {maxMultiplier}x WIN!
                                        </Text>
                                    </Flex>
                                    <Box position="relative">
                                        <Flex
                                            position="relative"
                                            h="12px"
                                            borderRadius="full"
                                            bg="#333738"
                                            overflow="hidden"
                                            gap="2px"
                                        >
                                            {Array.from({ length: safeTilesCount }).map((_, i) => (
                                                <Box
                                                    key={i}
                                                    flex="1"
                                                    h="100%"
                                                    borderRadius="full"
                                                    bg={
                                                        i < filledSafeTilesCount
                                                            ? "linear-gradient(90deg, rgba(251, 191, 36, 0.5) 0%, rgba(212, 175, 55, 0.85) 100%)"
                                                            : "#2a2a2a"
                                                    }
                                                    transition="background 0.25s ease-out"
                                                />
                                            ))}
                                        </Flex>

                                        {(gameState === "playing" || gameState === "win") && safeTilesCount > 0 && filledSafeTilesCount > 0 && (
                                            <Tooltip
                                                isOpen={true}
                                                label={`${truncateToTwo(currentMultiplier)}x`}
                                                hasArrow
                                                placement="top"
                                                openDelay={0}
                                                closeDelay={0}
                                                closeOnClick={false}
                                                closeOnEsc={false}
                                                bg="#2d2d2d"
                                                color="#fff"
                                                borderRadius="12px"
                                                px="12px"
                                                py="8px"
                                                fontSize="sm"
                                                fontWeight="semibold"
                                                boxShadow="md"
                                            >
                                                <Box
                                                    position="absolute"
                                                    left={`${Math.max(0, Math.min(100, (filledSafeTilesCount / safeTilesCount) * 100))}%`}
                                                    top="50%"
                                                    transform="translate(-50%, -50%)"
                                                    w="18px"
                                                    h="18px"
                                                    bg="linear-gradient(135deg, #ff6b9d 0%, #c44569 50%, #8b2e5e 100%)"
                                                    boxShadow="0 0 12px rgba(255, 107, 157, 0.9), 0 0 20px rgba(196, 69, 105, 0.5)"
                                                    clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
                                                    zIndex={2}
                                                    cursor="default"
                                                    pointerEvents="none"
                                                />
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                                <Box
                                    w="100%"
                                    minW="220px"
                                    maxW="380px"
                                    mx="auto"
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                                        gridTemplateRows: `repeat(${gridColumns}, 1fr)`,
                                        gap: "6px",
                                        aspectRatio: "1",
                                        maxH: "380px",
                                    }}
                                >
                                    {tiles.slice(0, totalTiles).map((state, index) => (
                                            <Box
                                                key={index}
                                                className="mines-tile-flip"
                                                position="relative"
                                                w="100%"
                                                h="100%"
                                                minW={0}
                                                minH={0}
                                                borderRadius="10px"
                                                overflow="visible"
                                                cursor={gameState === "playing" && state === null && revealingIndex !== index && !revealLoading ? "pointer" : "default"}
                                                pointerEvents={gameState === "playing" && state === null && revealingIndex !== index && !revealLoading ? "auto" : "none"}
                                                onClick={() => {
                                                    if (gameState === "playing" && state === null && revealingIndex !== index && !revealLoading) revealTile(index);
                                                }}
                                                transition="transform 0.25s ease, box-shadow 0.25s ease"
                                                transform={state === true ? "scale(1.05)" : "scale(1)"}
                                                boxShadow={state === true ? "0 0 24px rgba(34, 197, 94, 0.5), 0 0 40px rgba(74, 222, 128, 0.25)" : "none"}
                                                sx={{
                                                    perspective: "1000px",
                                                    "&:hover .mines-tile-flipper:not(.revealed)": {
                                                        transform: "rotateY(0deg) scale(1.02)",
                                                        "& .mines-tile-front": {
                                                            boxShadow: "0 0 20px rgba(0, 212, 255, 0.4)",
                                                            borderColor: "rgba(0, 212, 255, 0.6)",
                                                        },
                                                    },
                                                }}
                                                animation={state === false && index === explodingTileIndex ? "mines-tile-shake 0.4s ease-out" : undefined}
                                            >
                                                <Box
                                                    className={`mines-tile-flipper${state !== null || index === explodingTileIndex ? " revealed" : ""}`}
                                                    w="100%"
                                                    h="100%"
                                                    position="relative"
                                                    sx={{
                                                        transformStyle: "preserve-3d",
                                                        transition: "transform 0.25s ease",
                                                        transform: state !== null || index === explodingTileIndex ? "rotateY(180deg)" : "rotateY(0deg)",
                                                    }}
                                                >
                                                    {/* Front face: ? or spinner */}
                                                    <Box
                                                        className="mines-tile-front mines-tile-face"
                                                        position="absolute"
                                                        inset="0"
                                                        borderRadius="10px"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        bg="linear-gradient(145deg, #3d4245 0%, #2a2d2e 100%)"
                                                        border="2px solid"
                                                        borderColor="rgba(255,255,255,0.12)"
                                                        boxShadow="inset 0 2px 4px rgba(0,0,0,0.2)"
                                                        sx={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                                                    >
                                                        {revealingIndex === index ? (
                                                            <Box
                                                                w="20px"
                                                                h="20px"
                                                                border="2px solid rgba(255,255,255,0.3)"
                                                                borderTopColor="#00D4FF"
                                                                borderRadius="full"
                                                                sx={{ animation: "spin 0.8s linear infinite" }}
                                                            />
                                                        ) : (
                                                            <Text as="span" fontSize="clamp(14px, 4vw, 20px)" fontWeight="bold" color="rgba(255,255,255,0.3)" userSelect="none">?</Text>
                                                        )}
                                                    </Box>
                                                    {/* Back face: chest or bomb */}
                                                    <Box
                                                        className="mines-tile-back mines-tile-face"
                                                        position="absolute"
                                                        inset="0"
                                                        borderRadius="10px"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        bg={state === true ? "linear-gradient(145deg, rgba(34, 197, 94, 0.35) 0%, rgba(22, 163, 74, 0.25) 100%)" : "linear-gradient(145deg, rgba(239, 68, 68, 0.5) 0%, rgba(185, 28, 28, 0.4) 100%)"}
                                                        border="2px solid"
                                                        borderColor={state === true ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.8)"}
                                                        boxShadow={state === true ? "0 0 16px rgba(34, 197, 94, 0.3)" : "0 0 16px rgba(239, 68, 68, 0.4)"}
                                                        sx={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                                    >
                                                        {state === true && (
                                                            <Box as="img" src={diamond} alt="Diamond" maxW="80%" maxH="80%" objectFit="contain" filter="drop-shadow(0 0 8px rgba(74, 222, 128, 0.5))" />
                                                        )}
                                                        {index === explodingTileIndex ? (
                                                            <Box
                                                                as="img"
                                                                src={blast}
                                                                alt="Blast"
                                                                maxW="85%"
                                                                maxH="85%"
                                                                objectFit="contain"
                                                                zIndex={5}
                                                                filter="drop-shadow(0 0 12px rgba(255,140,0,0.6))"
                                                                sx={{ animation: "mines-explosion-pop 0.62s ease-out" }}
                                                                pointerEvents="none"
                                                            />
                                                        ) : state === false ? (
                                                            <Box as="img" src={bomb} alt="Mine" maxW="70%" maxH="70%" objectFit="contain" pointerEvents="none" />
                                                        ) : null}
                                                    </Box>
                                                </Box>
                                                {/* Overlays on top of tile (multiplier pop, bomb burst) */}
                                                {state === true && index === effectTileIndex && (
                                                    <Box
                                                        position="absolute"
                                                        inset="0"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        pointerEvents="none"
                                                        sx={{ animation: "mines-multiplier-pop 1.2s ease-out forwards" }}
                                                    >
                                                        <Text fontSize="clamp(14px, 3.5vw, 20px)" fontWeight="bold" color="#4ade80" textShadow="0 0 10px rgba(74, 222, 128, 0.8)" whiteSpace="nowrap">
                                                            +{effectMultiplier.toFixed(2)}x
                                                        </Text>
                                                    </Box>
                                                )}
                                                {state === false && index === explodingTileIndex && (
                                                    <Box
                                                        position="absolute"
                                                        inset="-8px"
                                                        borderRadius="50%"
                                                        bg="radial-gradient(circle, rgba(239,68,68,0.7) 0%, rgba(239,68,68,0.3) 40%, transparent 70%)"
                                                        pointerEvents="none"
                                                        sx={{ animation: "mines-bomb-burst 0.5s ease-out 0.35s forwards" }}
                                                    />
                                                )}
                                                {state === false && index === explodingTileIndex && (
                                                    <>
                                                        {/* Glow burst */}
                                                        <Box
                                                            position="absolute"
                                                            inset="-10px"
                                                            borderRadius="50%"
                                                            pointerEvents="none"
                                                            bg="radial-gradient(circle, rgba(255,165,0,0.65) 0%, rgba(255,140,0,0.35) 35%, rgba(255,69,0,0.18) 55%, transparent 72%)"
                                                            sx={{ animation: "mines-glow-burst 0.62s ease-out forwards" }}
                                                        />
                                                        {/* Sparks / particles */}
                                                        <Box position="absolute" inset="0" pointerEvents="none">
                                                            <Box className="mines-spark" style={{ ["--dx"]: "34px", ["--dy"]: "-18px", transform: "translate(-50%, -50%) rotate(20deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "26px", ["--dy"]: "22px", transform: "translate(-50%, -50%) rotate(60deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "-30px", ["--dy"]: "-14px", transform: "translate(-50%, -50%) rotate(160deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "-22px", ["--dy"]: "26px", transform: "translate(-50%, -50%) rotate(210deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "10px", ["--dy"]: "-34px", transform: "translate(-50%, -50%) rotate(95deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "-12px", ["--dy"]: "34px", transform: "translate(-50%, -50%) rotate(275deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "36px", ["--dy"]: "6px", transform: "translate(-50%, -50%) rotate(10deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "-36px", ["--dy"]: "4px", transform: "translate(-50%, -50%) rotate(190deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "18px", ["--dy"]: "32px", transform: "translate(-50%, -50%) rotate(75deg)" }} />
                                                            <Box className="mines-spark" style={{ ["--dx"]: "-18px", ["--dy"]: "-32px", transform: "translate(-50%, -50%) rotate(255deg)" }} />
                                                        </Box>
                                                    </>
                                                )}
                                            </Box>
                                        ))}
                                </Box>
                            </CardBody>
                        </Card>
                    </GridItem>

                    <UserHistory />
                </Grid>

                <History results={historyResults} />
            </Flex>

            <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="md" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#1f2123" border="1px solid rgba(255,255,255,0.1)" borderRadius="16px">
                    <ModalHeader color="#00D4FF">How to play Mines</ModalHeader>
                    <ModalCloseButton color="#fff" />
                    <ModalBody pb="24px" color="rgba(255,255,255,0.85)">
                        <VStack align="stretch" spacing="3">
                            <Text>• Choose your <strong>bet amount</strong> and <strong>mode</strong> (Easy, Normal, Hard, Ace). The grid is always 5×5 (25 tiles).</Text>
                            <Text>• Click <strong>Start Game</strong>. Some tiles hide gems, others hide mines (Easy: 2, Normal: 4, Hard: 6, Ace: 8 mines).</Text>
                            <Text>• Click a tile to reveal it. Gem = safe and your multiplier increases. Mine = you lose the round.</Text>
                            <Text>• You can <strong>Cash out</strong> anytime to lock in your current multiplier and win.</Text>
                            <Text>• Reveal all safe tiles to win the maximum multiplier.</Text>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
