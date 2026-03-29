import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
    Flex,
    VStack,
    HStack,
    IconButton,
    Text,
    keyframes,
} from "@chakra-ui/react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DiamondIcon from "@mui/icons-material/Diamond";
import ClickButton from "components/Input/ClickButton";
import GradientBorder from "components/GradientBorder/GradientBorder";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";
import CardHeader from "components/Card/CardHeader.js";
import DiamondBetHistory from "./DiamondItem/DiamondBetHistory";
import DiamondRealView from "./DiamondItem/DiamondRealView";
import { diamondPlay, getDiamondSettings } from "action/DiamondActions";

const publicUrl = process.env.PUBLIC_URL || "";
/**
 * Board gems: each slot picks independently (duplicates allowed).
 * Pedestal tint matches the diamond when that slot is filled.
 */
const BOARD_DIAMONDS = [
    {
        key: "blue",
        src: `${publicUrl}/diamond/blue.png`,
        pedestal:
            "linear-gradient(180deg, rgba(80,210,255,0.55) 0%, rgba(0,120,200,0.7) 100%)",
    },
    {
        key: "green",
        src: `${publicUrl}/diamond/green.png`,
        pedestal:
            "linear-gradient(180deg, rgba(100,220,140,0.5) 0%, rgba(20,140,70,0.72) 100%)",
    },
    {
        key: "purple",
        src: `${publicUrl}/diamond/purple.png`,
        pedestal:
            "linear-gradient(180deg, rgba(180,120,255,0.5) 0%, rgba(100,50,180,0.72) 100%)",
    },
    {
        key: "red",
        src: `${publicUrl}/diamond/red.png`,
        pedestal:
            "linear-gradient(180deg, rgba(255,120,130,0.5) 0%, rgba(180,40,50,0.72) 100%)",
    },
    {
        key: "yellow",
        src: `${publicUrl}/diamond/yellow.png`,
        pedestal:
            "linear-gradient(180deg, rgba(255,230,120,0.5) 0%, rgba(200,150,20,0.72) 100%)",
    },
];

const PEDESTAL_EMPTY = "linear-gradient(180deg, #2a3038 0%, #1c2128 100%)";

function pedestalForImageSrc(src) {
    if (!src) return PEDESTAL_EMPTY;
    const found = BOARD_DIAMONDS.find((d) => d.src === src);
    return found ? found.pedestal : PEDESTAL_EMPTY;
}

function srcForDiamondKey(key) {
    const d = BOARD_DIAMONDS.find((x) => x.key === key);
    return d?.src ?? null;
}

const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;

const DIAMOND_PANEL_MIN_H = { base: "auto", md: "360px" };
const DIAMOND_MAIN_CARD_MIN_H = { base: "auto", md: "min(520px, 88vh)" };

/** Fallback if `/diamond/settings` fails — keep aligned with server `DEFAULT_DIAMOND_TIERS`. */
const DIAMOND_PAYTABLE_FALLBACK_TIERS = [
    { rate: 0, weight: 0.15 },
    { rate: 0.2, weight: 0.6 },
    { rate: 1.2, weight: 0.12 },
    { rate: 2.5, weight: 0.07 },
    { rate: 6, weight: 0.03 },
    { rate: 15, weight: 0.02 },
    { rate: 70, weight: 0.01 },
];

/** Abstract pip patterns (grey / black / grey-border) — same multiset story as server gem layouts. */
const DIAMOND_PAYTABLE_PATTERNS = [
    ["black", "black", "black", "black", "black"],
    ["grey", "grey", "black", "black", "black"],
    ["grey", "grey", "border", "border", "black"],
    ["grey", "grey", "grey", "black", "black"],
    ["grey", "grey", "grey", "border", "border"],
    ["grey", "grey", "grey", "grey", "black"],
    ["grey", "grey", "grey", "grey", "grey"],
];

function buildDefaultPaytableRows() {
    const sum =
        DIAMOND_PAYTABLE_FALLBACK_TIERS.reduce((s, t) => s + Math.max(0, t.weight), 0) || 1;
    return DIAMOND_PAYTABLE_FALLBACK_TIERS.map((t, index) => ({
        index,
        mult: t.rate,
        chance: Math.max(0, t.weight) / sum,
        pattern: DIAMOND_PAYTABLE_PATTERNS[index],
    }));
}

const gemPopIn = keyframes`
    0% {
        opacity: 0;
        transform: translateY(14px) scale(0.78);
    }
    55% {
        opacity: 1;
        transform: translateY(-4px) scale(1.06);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
`;

function PaytablePip({ variant, compact }) {
    const base = compact
        ? {
              w: { base: "8px", md: "9px" },
              h: { base: "8px", md: "9px" },
              transform: "rotate(45deg)",
              borderRadius: "2px",
              flexShrink: 0,
          }
        : {
              w: { base: "10px", md: "12px" },
              h: { base: "10px", md: "12px" },
              transform: "rotate(45deg)",
              borderRadius: "2px",
              flexShrink: 0,
          };
    if (variant === "black") {
        return (
            <Box
                {...base}
                bg="#07090d"
                border="1px solid rgba(255,255,255,0.12)"
                boxShadow="inset 0 1px 2px rgba(0,0,0,0.6)"
            />
        );
    }
    if (variant === "grey") {
        return (
            <Box
                {...base}
                bg="linear-gradient(135deg, #c5d0e0 0%, #7a8aa0 55%, #5a6578 100%)"
                border="1px solid rgba(255,255,255,0.22)"
                boxShadow="0 0 6px rgba(200, 210, 225, 0.25)"
            />
        );
    }
    if (variant === "border") {
        return (
            <Box
                {...base}
                bg="#07090d"
                border="2px solid #a8b8c8"
                boxShadow="inset 0 0 0 1px rgba(0,0,0,0.5)"
            />
        );
    }
    return <Box {...base} bg="#333" />;
}

function StatField({ label, children, rightAdornment }) {
    return (
        <Box
            flex="1"
            minW={0}
            bg="rgba(12, 16, 22, 0.92)"
            border="1px solid rgba(255,255,255,0.08)"
            borderRadius="10px"
            px={3}
            py={2.5}
        >
            <Text fontSize="10px" fontWeight="700" color="rgba(255,255,255,0.45)" letterSpacing="0.06em" mb={1}>
                {label}
            </Text>
            <Flex align="center" justify="space-between" gap={2}>
                <Box flex="1" minW={0}>
                    {children}
                </Box>
                {rightAdornment}
            </Flex>
        </Box>
    );
}

/** Fixed square viewport — every PNG scales inside the same box (object-fit: contain). */
const BOARD_GEM_BOX = { base: "72px", md: "84px" };

/**
 * Pedestal + optional PNG gem. Empty board = no image (only neutral pedestal).
 * When filled, pedestal uses the same color family as that diamond asset.
 */
function DiamondBoardSlot({ imageSrc, animKey }) {
    const pedestalBg = imageSrc ? pedestalForImageSrc(imageSrc) : PEDESTAL_EMPTY;

    return (
        <VStack spacing={2} flex="1" minW={0} maxW="120px" mx="auto">
            <Box
                w={BOARD_GEM_BOX}
                h={BOARD_GEM_BOX}
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                flexShrink={0}
            >
                {imageSrc ? (
                    <Box
                        key={animKey}
                        as="img"
                        src={imageSrc}
                        alt=""
                        w="100%"
                        h="100%"
                        objectFit="contain"
                        objectPosition="center"
                        draggable={false}
                        sx={{
                            animation: `${gemPopIn} 0.52s cubic-bezier(0.33, 1.15, 0.52, 1) forwards`,
                            filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.5))",
                        }}
                    />
                ) : null}
            </Box>
            <Box
                w="100%"
                h={{ base: "10px", md: "12px" }}
                borderRadius="4px"
                bg={pedestalBg}
                border="1px solid rgba(255,255,255,0.06)"
                boxShadow="0 4px 12px rgba(0,0,0,0.35)"
            />
        </VStack>
    );
}

const REVEAL_INITIAL_MS = 280;
const REVEAL_STEP_MS = 340;
/** After the 5th gem appears, hold Live Results until pop-in animation (~0.52s) finishes. */
const REVEAL_POST_ANIM_MS = 560;

export default function DiamondPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const revealTimeoutsRef = useRef([]);
    const [amount, setAmount] = useState("0.10");
    const [playLoading, setPlayLoading] = useState(false);
    const [profit, setProfit] = useState("0.00000000");
    /** PNG src per slot; each slot draws independently so duplicates are allowed. */
    const [boardImages, setBoardImages] = useState(() => [null, null, null, null, null]);
    const [winMult, setWinMult] = useState(null);
    const [winRateIndex, setWinRateIndex] = useState(null);
    const boardRoundRef = useRef(0);
    const paytableWrapRef = useRef(null);
    const rowRefs = useRef([]);
    const [bubbleAnchorY, setBubbleAnchorY] = useState(null);
    const [diamondLiveSuppressUntil, setDiamondLiveSuppressUntil] = useState(0);
    const [paytableRows, setPaytableRows] = useState(() => buildDefaultPaytableRows());

    useEffect(() => {
        let cancelled = false;
        getDiamondSettings()
            .then((data) => {
                if (cancelled || !Array.isArray(data?.tiers) || data.tiers.length === 0) return;
                setPaytableRows(
                    data.tiers.map((t) => ({
                        index: t.index,
                        mult: Number(t.rate),
                        chance: Number(t.chance),
                        pattern: DIAMOND_PAYTABLE_PATTERNS[t.index] ?? DIAMOND_PAYTABLE_PATTERNS[0],
                    }))
                );
            })
            .catch(() => {
                /* keep buildDefaultPaytableRows() */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const chancePct =
        winRateIndex != null && paytableRows[winRateIndex]
            ? (paytableRows[winRateIndex].chance * 100).toFixed(0)
            : null;

    const measureBubbleAnchor = useCallback(() => {
        if (winRateIndex == null) {
            setBubbleAnchorY(null);
            return;
        }
        const wrap = paytableWrapRef.current;
        const rowEl = rowRefs.current[winRateIndex];
        if (!wrap || !rowEl) return;
        const wrapRect = wrap.getBoundingClientRect();
        const rowRect = rowEl.getBoundingClientRect();
        setBubbleAnchorY(rowRect.top - wrapRect.top + rowRect.height / 2);
    }, [winRateIndex]);

    useLayoutEffect(() => {
        measureBubbleAnchor();
    }, [measureBubbleAnchor]);

    useLayoutEffect(() => {
        if (winRateIndex == null) return undefined;
        const wrap = paytableWrapRef.current;
        if (!wrap || typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(() => measureBubbleAnchor());
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [winRateIndex, measureBubbleAnchor]);

    useEffect(() => {
        window.addEventListener("resize", measureBubbleAnchor);
        return () => window.removeEventListener("resize", measureBubbleAnchor);
    }, [measureBubbleAnchor]);

    const clearRevealTimers = () => {
        revealTimeoutsRef.current.forEach((id) => clearTimeout(id));
        revealTimeoutsRef.current = [];
    };

    useEffect(() => () => clearRevealTimers(), []);

    const amountNum = Number(amount || 0);
    const canDecrease = amountNum > MIN_AMOUNT + 1e-9;
    const canIncrease = amountNum < MAX_AMOUNT - 1e-9;

    const clampAmount = (v) => {
        if (!Number.isFinite(v)) return MIN_AMOUNT;
        return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v));
    };

    const commitAmount = (v) => setAmount(clampAmount(v).toFixed(2));

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === "") {
            setAmount("");
            return;
        }
        if (/^\d*\.?\d{0,2}$/.test(value)) setAmount(value);
    };

    const handleAmountBlur = () => commitAmount(Number(amount));

    const runBet = async () => {
        const bet = Number(amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT || bet > MAX_AMOUNT) {
            toast.error(`Enter amount between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
            return;
        }
        if (bet > balance + 1e-9) {
            toast.error("Insufficient balance");
            return;
        }

        clearRevealTimers();
        setPlayLoading(true);
        boardRoundRef.current += 1;
        setBoardImages([null, null, null, null, null]);
        setWinMult(null);
        setWinRateIndex(null);

        let keys;
        let mult;
        let win;
        let rateIndex;
        try {
            const data = await diamondPlay({ betAmount: bet }, dispatch, history);
            const round = data?.diamond;
            keys = round?.keys;
            mult = Number(round?.mult ?? 0);
            win = Number(round?.win ?? 0);
            rateIndex = Number(round?.rateIndex ?? -1);
            if (!Array.isArray(keys) || keys.length !== 5) {
                throw new Error("Invalid round from server");
            }
            if (
                !Number.isInteger(rateIndex) ||
                rateIndex < 0 ||
                rateIndex >= DIAMOND_PAYTABLE_PATTERNS.length
            ) {
                throw new Error("Invalid round from server");
            }

            setDiamondLiveSuppressUntil(
                Date.now() + REVEAL_INITIAL_MS + 4 * REVEAL_STEP_MS + REVEAL_POST_ANIM_MS
            );
        } catch (err) {
            setPlayLoading(false);
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Round failed";
            toast.error(msg);
            return;
        }

        for (let i = 0; i < 5; i++) {
            const delay = REVEAL_INITIAL_MS + i * REVEAL_STEP_MS;
            const t = window.setTimeout(() => {
                const src = srcForDiamondKey(keys[i]);
                setBoardImages((prev) => {
                    const next = [...prev];
                    next[i] = src;
                    return next;
                });

                if (i === 4) {
                    setWinMult(mult);
                    setWinRateIndex(rateIndex);
                    setProfit(win.toFixed(8));
                    if (mult > 0) {
                        toast.success(`Hit ${mult.toFixed(2)}x`);
                    } else {
                        toast.info("0.00x — no win");
                    }
                    setPlayLoading(false);
                }
            }, delay);
            revealTimeoutsRef.current.push(t);
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
                        w="100%"
                        minH={DIAMOND_PANEL_MIN_H}
                        h={{ base: "auto", "1550px": "100%" }}
                        pt="22px"
                        pb="20px"
                        px="22px"
                        overflow="visible"
                    >
                        <CardHeader mb="12px" p={0} flexShrink={0}>
                            <Text fontSize="lg" color="#fff" fontWeight="bold" mb="4px">
                                Diamond Controls
                            </Text>
                        </CardHeader>
                        <CardBody flex="1" display="flex" flexDirection="column" p={0} minH={0}>
                            <VStack spacing="14px" align="stretch" w="100%" maxW={{ base: "100%", sm: "300px" }} mx="auto">
                                <FormControl mb={0}>
                                    <FormLabel color="rgba(255,255,255,0.82)" fontSize="sm" fontWeight="700" mb="6px">
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
                                <ClickButton
                                    h="52px"
                                    borderRadius="16px"
                                    mt={0}
                                    mb={0}
                                    label={playLoading ? "..." : "Bet"}
                                    onClick={runBet}
                                    disabled={playLoading}
                                />
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="game" minW={0} display="flex" flexDirection="column" alignSelf="stretch" minH={0}>
                    <Box
                        flex="1"
                        display="flex"
                        flexDirection="column"
                        minH={DIAMOND_MAIN_CARD_MIN_H}
                        h={{ base: "auto", "1550px": "100%" }}
                        w="100%"
                        minW={0}
                    >
                        <Card
                            flex="1"
                            display="flex"
                            flexDirection="column"
                            pt={{ base: "16px", md: "20px" }}
                            pb={{ base: "16px", md: "20px" }}
                            px={{ base: "14px", md: "20px" }}
                            minH={DIAMOND_MAIN_CARD_MIN_H}
                            h="100%"
                            minW={0}
                            overflow="hidden"
                            alignItems="stretch"
                            w="100%"
                            bg="linear-gradient(180deg, #1a1f26 0%, #14181e 100%)"
                            border="1px solid rgba(0, 212, 255, 0.12)"
                        >
                            <CardBody p={0} display="flex" flexDirection="column" alignItems="stretch" flex="1">
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    pb={2}
                                    mb={2}
                                    borderBottom="1px solid rgba(0, 212, 255, 0.2)"
                                    gap={2}
                                >
                                    <HStack spacing={2} color="#00D4FF">
                                        <DiamondIcon style={{ fontSize: 22 }} />
                                        <Text fontWeight="800" color="#fff" fontSize="md" letterSpacing="0.02em">
                                            Diamonds
                                        </Text>
                                    </HStack>
                                    {winMult != null && (
                                        <Text fontSize="sm" fontWeight="800" color="#00D4FF">
                                            Result: {winMult.toFixed(2)}x
                                        </Text>
                                    )}
                                </Flex>

                                <Text fontSize="xs" fontWeight="700" color="rgba(255,255,255,0.5)" mb={2} letterSpacing="0.08em">
                                    RESULT MINIMUM (PAYOUT TABLE)
                                </Text>

                                <Flex
                                    flexShrink={0}
                                    direction={{ base: "column", md: "row" }}
                                    gap={{ base: 3, md: 4 }}
                                    align="stretch"
                                    minH={0}
                                    minW={0}
                                >
                                    <Box
                                        ref={paytableWrapRef}
                                        flex={{ base: "1", md: "0 0 60%" }}
                                        w={{ base: "100%", md: "auto" }}
                                        minW={0}
                                        maxW={{ md: "60%" }}
                                    >
                                        <VStack
                                            align="stretch"
                                            spacing={0}
                                            w="100%"
                                            bg="rgba(8, 10, 14, 0.55)"
                                            borderRadius="10px"
                                            border="1px solid rgba(255,255,255,0.06)"
                                            p={{ base: "6px", md: "8px" }}
                                        >
                                            {paytableRows.map((row) => {
                                                const isHit = winRateIndex != null && winRateIndex === row.index;
                                                const pct = (row.chance * 100).toFixed(0);
                                                return (
                                                    <Flex
                                                        key={row.index}
                                                        ref={(el) => {
                                                            rowRefs.current[row.index] = el;
                                                        }}
                                                        align="center"
                                                        py={{ base: "6px", md: "7px" }}
                                                        px={{ base: 1.5, md: 2 }}
                                                        borderRadius="6px"
                                                        gap={{ base: 1.5, md: 2 }}
                                                        bg={
                                                            isHit
                                                                ? "rgba(80, 110, 140, 0.45)"
                                                                : "transparent"
                                                        }
                                                        border={
                                                            isHit
                                                                ? "1px solid rgba(0, 212, 255, 0.35)"
                                                                : "1px solid transparent"
                                                        }
                                                        transition="background 0.2s, border-color 0.2s"
                                                    >
                                                        <HStack
                                                            spacing={{ base: "4px", md: "6px" }}
                                                            flex="1"
                                                            minW={0}
                                                        >
                                                            {row.pattern.map((cell, idx) => (
                                                                <PaytablePip
                                                                    key={`${row.index}-${idx}`}
                                                                    variant={cell}
                                                                    compact
                                                                />
                                                            ))}
                                                        </HStack>
                                                        <VStack
                                                            align="flex-end"
                                                            spacing={0}
                                                            minW={{ base: "52px", md: "58px" }}
                                                            flexShrink={0}
                                                        >
                                                            <Text
                                                                fontWeight="800"
                                                                fontSize={{ base: "xs", md: "sm" }}
                                                                color="rgba(255,255,255,0.92)"
                                                                fontVariantNumeric="tabular-nums"
                                                                lineHeight="1.1"
                                                            >
                                                                {row.mult.toFixed(2)}x
                                                            </Text>
                                                            <Text
                                                                fontSize="9px"
                                                                fontWeight="600"
                                                                color="rgba(255,255,255,0.4)"
                                                                fontVariantNumeric="tabular-nums"
                                                                lineHeight="1.1"
                                                            >
                                                                {pct}%
                                                            </Text>
                                                        </VStack>
                                                    </Flex>
                                                );
                                            })}
                                        </VStack>
                                    </Box>

                                    <Box
                                        flex={{ base: "1", md: "1 1 0%" }}
                                        minW={0}
                                        w={{ base: "100%", md: "auto" }}
                                        position={{ md: "relative" }}
                                        alignSelf={{ md: "stretch" }}
                                        display="flex"
                                        flexDirection="column"
                                        justifyContent={{ base: "stretch", md: "flex-start" }}
                                        alignItems={{ base: "stretch", md: "stretch" }}
                                    >
                                        <Box
                                            position={{ base: "relative", md: "absolute" }}
                                            left={{ md: 0 }}
                                            right={{ md: 0 }}
                                            top={{
                                                md:
                                                    winRateIndex != null && bubbleAnchorY != null
                                                        ? `${bubbleAnchorY}px`
                                                        : "50%",
                                            }}
                                            transform={{ md: "translateY(-50%)" }}
                                            w="100%"
                                            maxW="100%"
                                            zIndex={1}
                                        >
                                            <Box position="relative">
                                                <Box
                                                    display={{ base: "none", md: "block" }}
                                                    position="absolute"
                                                    left="-10px"
                                                    top="50%"
                                                    transform="translateY(-50%)"
                                                    w="0"
                                                    h="0"
                                                    borderTop="9px solid transparent"
                                                    borderBottom="9px solid transparent"
                                                    borderRight="10px solid rgba(12, 16, 22, 0.92)"
                                                    zIndex={1}
                                                    filter="drop-shadow(-2px 0 4px rgba(0,0,0,0.3))"
                                                />
                                                <VStack
                                                    spacing={3}
                                                    align="stretch"
                                                    bg="rgba(12, 16, 22, 0.92)"
                                                    borderRadius="12px"
                                                    border="1px solid rgba(255,255,255,0.08)"
                                                    p={{ base: 3, md: 2.5 }}
                                                    boxShadow="0 8px 32px rgba(0,0,0,0.35)"
                                                >
                                                    <StatField label="Profit">
                                                        <Text
                                                            fontSize="sm"
                                                            fontWeight="700"
                                                            color="#fff"
                                                            fontVariantNumeric="tabular-nums"
                                                            noOfLines={1}
                                                        >
                                                            {profit}
                                                        </Text>
                                                    </StatField>
                                                    <StatField
                                                        label="Chance"
                                                        rightAdornment={
                                                            <Text
                                                                fontWeight="800"
                                                                color="rgba(255,255,255,0.5)"
                                                                fontSize="sm"
                                                            >
                                                                %
                                                            </Text>
                                                        }
                                                    >
                                                        <Text
                                                            fontSize="sm"
                                                            fontWeight="700"
                                                            color="#fff"
                                                            fontVariantNumeric="tabular-nums"
                                                        >
                                                            {chancePct ?? "—"}
                                                        </Text>
                                                    </StatField>
                                                </VStack>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Flex>

                                <Box
                                    mt={6}
                                    pt={5}
                                    borderTop="1px solid rgba(0, 212, 255, 0.15)"
                                    flexShrink={0}
                                >
                                    <Text
                                        fontSize="xs"
                                        fontWeight="700"
                                        color="rgba(255,255,255,0.45)"
                                        mb={3}
                                        textAlign="center"
                                        letterSpacing="0.06em"
                                    >
                                        FIVE DIAMOND BOARDS (LEFT → RIGHT)
                                    </Text>
                                    <Flex
                                        justify="space-between"
                                        align="flex-end"
                                        gap={{ base: 2, md: 4 }}
                                        px={{ base: 0, md: 2 }}
                                    >
                                        {boardImages.map((src, i) => (
                                            <DiamondBoardSlot
                                                key={i}
                                                imageSrc={src}
                                                animKey={
                                                    src
                                                        ? `${boardRoundRef.current}-${i}-${src}`
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </Flex>
                                </Box>
                            </CardBody>
                        </Card>
                    </Box>
                </GridItem>

                <GridItem area="empty" minW={0} display="flex" flexDirection="column" alignSelf="stretch" minH={0}>
                    <Box
                        flex="1"
                        minH={{ base: "250px", "1550px": "100%" }}
                        h={{ base: "auto", "1550px": "100%" }}
                        w="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <DiamondRealView suppressFeedUntil={diamondLiveSuppressUntil} />
                    </Box>
                </GridItem>
            </Grid>

            <DiamondBetHistory />
        </Box>
    );
}
