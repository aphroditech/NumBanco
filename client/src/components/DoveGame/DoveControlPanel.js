import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
    Box,
    Flex,
    Grid,
    HStack,
    Button,
    IconButton,
    Input,
    Select,
} from "@chakra-ui/react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

const MIN_AMOUNT = 0.1;
const MAX_BET_AMOUNT = 20;
const PRESET_AMOUNTS = [1, 5, 10, 20];

const GOLD = "#FFD700";
const GOLD_DARK = "#B8860B";
const GOLD_HOVER = "#FFC107";
const GREEN = "#22c55e";
const GREEN_HOVER = "#16a34a";
const GOLD_BG = "rgba(255, 215, 0, 0.2)";
const GOLD_BORDER = "rgba(255, 215, 0, 0.5)";
const DIFFICULTY_OPTIONS = [
    { value: "easy", label: "Easy" },
    { value: "med", label: "Med" },
    { value: "difficult", label: "Difficult" },
    { value: "ace", label: "Ace" },
];

function DoveControlPanel({
    onPlay,
    onGo,
    onCashOut,
    onDifficultyChange,
    onDisplayModeChange,
    gameStarted,
    step,
    betAmount,
    cashOutAmount,
    canMove,
}) {
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_BET_AMOUNT, Math.max(MIN_AMOUNT, balance));

    const [amount, setAmount] = useState("0.1");
    const [difficulty, setDifficulty] = useState("easy");
    const [winMode, setWinMode] = useState("multiplier");

    const currentAmount = parseFloat(amount) || MIN_AMOUNT;
    const clampedAmount = Math.max(MIN_AMOUNT, Math.min(maxAmount, currentAmount));

    const setClampedAmount = (val) => {
        const v = Math.max(MIN_AMOUNT, Math.min(maxAmount, val));
        const str = v.toFixed(1);
        setAmount(str);
        onDisplayModeChange?.({ winMode, amount: parseFloat(str) });
    };

    const handleAmountChange = (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
            setClampedAmount(v);
        } else {
            setAmount(e.target.value);
        }
    };

    const handleAmountBlur = () => {
        const v = parseFloat(amount);
        let finalVal;
        if (isNaN(v) || v < MIN_AMOUNT) {
            finalVal = MIN_AMOUNT;
            setAmount(MIN_AMOUNT.toFixed(1));
        } else if (v > maxAmount) {
            finalVal = maxAmount;
            setAmount(maxAmount.toFixed(1));
        } else {
            finalVal = parseFloat(amount) || MIN_AMOUNT;
            setAmount(finalVal.toFixed(1));
        }
        onDisplayModeChange?.({ winMode, amount: finalVal });
    };

    const handlePlay = () => {
        const bet = parseFloat(amount) || MIN_AMOUNT;
        if (bet < MIN_AMOUNT || bet > maxAmount) return;
        onPlay?.({ amount: bet, difficulty, winMode });
    };

    const canPlay = !gameStarted && amount && currentAmount >= MIN_AMOUNT && currentAmount <= maxAmount && balance >= currentAmount;

    useEffect(() => {
        onDisplayModeChange?.({ winMode: "multiplier", amount: 0.1 });
    }, []);

    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const DESIGN_WIDTH = 1280;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const updateScale = () => {
            const w = el.offsetWidth;
            setScale(Math.min(1, w / DESIGN_WIDTH));
        };
        updateScale();
        const ro = new ResizeObserver(updateScale);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <Box
            ref={containerRef}
            w="100%"
            px={{ base: "14px", sm: "22px", md: "29px" }}
            py="18px"
            bg="rgba(0,0,0,0.85)"
            bgImage="url('/assets/panelground.png')"
            bgSize="cover"
            bgPosition="center"
            bgRepeat="no-repeat"
            borderTop="2px solid rgba(255, 215, 0, 0.4)"
            pointerEvents="auto"
        >
            <Flex
                flexDirection="column"
                gap="14px"
                maxW="1280px"
                mx="auto"
                style={{ zoom: scale }}
            >
                {!gameStarted ? (
                    <Grid templateColumns="2fr 2fr 1fr" gap={7} alignItems="center" w="100%" minH="209px">
                        <Flex flexDirection="column" gap="14px" align="center" justify="center" w="100%" minH="209px">
                            <HStack spacing="11px" align="center" justify="center" flexWrap="wrap">
                                <Box as="span" fontSize="sm" color="rgba(255,255,255,0.9)" whiteSpace="nowrap">Difficulty:</Box>
                                <Select size="sm" w="180px" h="58px" fontSize="sm" bg="#323738" color="#fff" borderColor={GOLD_BORDER} borderRadius="11px" value={difficulty} onChange={(e) => { const val = e.target.value; setDifficulty(val); onDifficultyChange?.(val); }} sx={{ option: { bg: "#323738", color: "#fff" } }}>
                                    {DIFFICULTY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Select>
                            </HStack>
                            <HStack align="center" justify="center" spacing="7px" flexWrap="nowrap">
                                <Button size="sm" h="58px" minW="72px" fontSize="sm" fontWeight="bold" bg={GOLD_BG} color={GOLD} border="2px solid" borderColor={GOLD_BORDER} borderRadius="11px" _hover={{ bg: "rgba(255, 215, 0, 0.3)" }} onClick={() => setClampedAmount(MIN_AMOUNT)}>
                                    Min
                                </Button>
                                <HStack spacing="4px" bg="#323738" borderRadius="11px" px="7px" h="58px" border="2px solid rgba(255,255,255,0.2)" flexShrink={0}>
                                    <IconButton aria-label="Decrease" icon={<RemoveIcon style={{ fontSize: 22 }} />} size="sm" h="40px" w="40px" minW="40px" bg="transparent" color="#fff" borderRadius="7px" _hover={{ bg: "rgba(255,255,255,0.1)" }} onClick={() => setClampedAmount(currentAmount - 0.1)} isDisabled={currentAmount <= MIN_AMOUNT} />
                                    <Input type="number" value={amount} onChange={(e) => handleAmountChange(e)} onBlur={handleAmountBlur} min={MIN_AMOUNT} max={maxAmount} step={0.1} w="65px" minW="65px" h="47px" textAlign="center" fontSize="sm" fontWeight="bold" color="#fff" bg="transparent" border="none" p="0" _focus={{ outline: "none", boxShadow: "none", border: "none" }} _hover={{ border: "none" }} />
                                    <IconButton aria-label="Increase" icon={<AddIcon style={{ fontSize: 22 }} />} size="sm" h="40px" w="40px" minW="40px" bg="transparent" color="#fff" borderRadius="7px" _hover={{ bg: "rgba(255,255,255,0.1)" }} onClick={() => setClampedAmount(currentAmount + 0.1)} isDisabled={currentAmount >= maxAmount} />
                                </HStack>
                                <Button size="sm" h="58px" minW="72px" fontSize="sm" fontWeight="bold" bg={GOLD_BG} color={GOLD} border="2px solid" borderColor={GOLD_BORDER} borderRadius="11px" _hover={{ bg: "rgba(255, 215, 0, 0.3)" }} onClick={() => setClampedAmount(maxAmount)}>
                                    Max
                                </Button>
                            </HStack>
                            <HStack spacing="11px" justify="center" flexWrap="wrap">
                                {PRESET_AMOUNTS.map((preset) => (
                                    <Button key={preset} size="sm" h="50px" minW="65px" fontSize="sm" fontWeight="bold" bg={Math.abs(currentAmount - preset) < 0.01 ? GOLD : "#323738"} color={Math.abs(currentAmount - preset) < 0.01 ? "#000" : "#fff"} border="2px solid" borderColor={GOLD_BORDER} borderRadius="11px" _hover={{ bg: "rgba(255, 215, 0, 0.3)", color: "#fff" }} onClick={() => setClampedAmount(Math.min(preset, maxAmount))} isDisabled={preset > maxAmount}>
                                        {preset}
                                    </Button>
                                ))}
                            </HStack>
                        </Flex>
                        <Flex flexDirection="column" align="center" justify="center" gap="14px">
                            <HStack spacing="7px" bg="#323738" borderRadius="11px" p="4px" border="2px solid" borderColor={GOLD_BORDER}>
                                <Button size="sm" h="47px" px="18px" fontSize="sm" fontWeight="bold" bg={winMode === "flat" ? GOLD : "transparent"} color={winMode === "flat" ? "#000" : "#fff"} borderRadius="7px" _hover={{ bg: winMode === "flat" ? GOLD : "rgba(255,255,255,0.1)" }} onClick={() => { setWinMode("flat"); onDisplayModeChange?.({ winMode: "flat", amount: parseFloat(amount) || MIN_AMOUNT }); }}>
                                    Flat Win
                                </Button>
                                <Button size="sm" h="47px" px="18px" fontSize="sm" fontWeight="bold" bg={winMode === "multiplier" ? GOLD : "transparent"} color={winMode === "multiplier" ? "#000" : "#fff"} borderRadius="7px" _hover={{ bg: winMode === "multiplier" ? GOLD : "rgba(255,255,255,0.1)" }} onClick={() => { setWinMode("multiplier"); onDisplayModeChange?.({ winMode: "multiplier", amount: parseFloat(amount) || MIN_AMOUNT }); }}>
                                    Multiplier
                                </Button>
                            </HStack>
                            <Button size="md" h="100px" w="270px" minW="270px" maxW="270px" px="86px" fontSize="xl" fontWeight="bold" bg={GREEN} color="#fff" borderRadius="7px" _hover={{ bg: GREEN_HOVER, transform: "translateY(-2px)" }} _active={{ transform: "translateY(0)" }} _disabled={{ opacity: 0.5, cursor: "not-allowed" }} onClick={handlePlay} isDisabled={!canPlay}>
                                Play
                            </Button>
                        </Flex>
                        <Box w="100%" minH="72px" />
                    </Grid>
                ) : (
                    <Grid templateColumns="2fr 2fr 1fr" gap={7} alignItems="center" w="100%" minH="209px">
                        <Flex flexDirection="column" align="center" justify="center" gap="14px" minH="209px">
                            <Box h="47px" minW="162px" px="18px" display="flex" alignItems="center" justifyContent="center" bg="#323738" borderRadius="7px" border="2px solid" borderColor={GOLD_BORDER} fontSize="sm" fontWeight="bold" color={GOLD}>
                                {(betAmount ?? parseFloat(amount) ?? 0.1).toFixed(2)}
                            </Box>
                            <Button size="md" h="100px" w="270px" minW="270px" maxW="270px" px="86px" fontSize="xl" fontWeight="bold" bg={step > 0 && canMove ? GOLD : "#323738"} color={step > 0 && canMove ? "#000" : "#666"} border="2px solid" borderColor={GOLD_BORDER} borderRadius="7px" _hover={step > 0 && canMove ? { bg: GOLD_HOVER, transform: "translateY(-2px)" } : {}} _active={{ transform: "translateY(0)" }} _disabled={{ opacity: 0.5, cursor: "not-allowed" }} onClick={onCashOut} isDisabled={step < 1 || !canMove}>
                                {step > 0 ? `${cashOutAmount.toFixed(2)} Cash Out` : "Cash Out"}
                            </Button>
                        </Flex>
                        <Flex flexDirection="column" align="center" justify="center" gap="14px">
                            <HStack spacing="7px" bg="#323738" borderRadius="11px" p="4px" border="2px solid" borderColor={GOLD_BORDER}>
                                <Button size="sm" h="47px" px="18px" fontSize="sm" fontWeight="bold" bg={winMode === "flat" ? GOLD : "transparent"} color={winMode === "flat" ? "#000" : "#fff"} borderRadius="7px" _hover={{ bg: winMode === "flat" ? GOLD : "rgba(255,255,255,0.1)" }} onClick={() => { setWinMode("flat"); onDisplayModeChange?.({ winMode: "flat", amount: betAmount || parseFloat(amount) || MIN_AMOUNT }); }} isDisabled={!canMove}>
                                    Flat Win
                                </Button>
                                <Button size="sm" h="47px" px="18px" fontSize="sm" fontWeight="bold" bg={winMode === "multiplier" ? GOLD : "transparent"} color={winMode === "multiplier" ? "#000" : "#fff"} borderRadius="7px" _hover={{ bg: winMode === "multiplier" ? GOLD : "rgba(255,255,255,0.1)" }} onClick={() => { setWinMode("multiplier"); onDisplayModeChange?.({ winMode: "multiplier", amount: betAmount || parseFloat(amount) || MIN_AMOUNT }); }} isDisabled={!canMove}>
                                    Multiplier
                                </Button>
                            </HStack>
                            <Button size="md" h="100px" w="270px" minW="270px" maxW="270px" px="86px" fontSize="xl" fontWeight="bold" bg={GREEN} color="#fff" borderRadius="7px" _hover={{ bg: GREEN_HOVER, transform: "translateY(-2px)" }} _active={{ transform: "translateY(0)" }} _disabled={{ opacity: 0.5, cursor: "not-allowed" }} onClick={onGo} isDisabled={!canMove}>
                                Go
                            </Button>
                        </Flex>
                        <Box w="100%" minH="72px" />
                    </Grid>
                )}
            </Flex>
        </Box>
    );
}

export default DoveControlPanel;
