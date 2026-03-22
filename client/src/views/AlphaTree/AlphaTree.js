import React, { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import ForestIcon from '@mui/icons-material/Forest';
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
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Text,
} from "@chakra-ui/react";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ClickButton from 'components/Input/ClickButton';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';
import {
    alphaTreeStart,
    alphaTreePick,
    alphaTreeCashOut,
    getAlphaTreeState,
} from "action/AlphaTreeActions";
import { onlineUser, offlineUser } from "action/BetActions";
import { allowedLettersForStep } from "constants/alphaTreeSteps";
import AlphaTreeRealView from "./AlphaTreeItem/AlphaTreeView";
import BetHistory from "./AlphaTreeItem/BetHistory";

const MIN_AMOUNT = 0.1;
const MAX_AMOUNT = 20;

/** High-band upper bound for step s (2–10): 0.6 × 2^(s−1); matches server */
function alphaTreeMaxForRandomStep(step) {
    const s = Number(step);
    if (!Number.isFinite(s) || s < 2 || s > 10) return null;
    return Math.round(0.6 * Math.pow(2, s - 1) * 100) / 100;
}

export default function AlphaTreePage() {

    const dispatch = useDispatch();
    const history = useHistory();
    const [amount, setAmount] = useState("0.1");
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    /** Server game state (null = no active round) */
    const [treeState, setTreeState] = useState(null);
    const [playLoading, setPlayLoading] = useState(false);
    const [pickLoading, setPickLoading] = useState(false);
    const [cashLoading, setCashLoading] = useState(false);
    /** Last step result shown (e.g. "0.60" after A, or random draw) */
    const [lastStepResult, setLastStepResult] = useState(null);
    /** Band label for last pick (from server lastDraw.band) */
    const [lastBandLabel, setLastBandLabel] = useState(null);
    const amountRef = useRef('0.10');
    const updateAmount = (value) => {
        setAmount(value);
        amountRef.current = value;
    };
    useEffect(() => {
        amountRef.current = amount;
    }, [amount]);
    useEffect(() => {
        onlineUser(13);
        return () => {
            offlineUser(13);
        };
    }, []);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        // Allow empty
        if (value === '') {
            updateAmount('');
            return;
        }

        // Allow typing numbers with up to 2 decimals
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            updateAmount(value);
        }
    };

    const handleAmountBlur = () => {
        let num = parseFloat(amount);

        if (isNaN(num)) {
            updateAmount('0.10');
            return;
        }

        num = Math.max(0.10, Math.min(1000, num));
        updateAmount(num.toFixed(2));
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await getAlphaTreeState(history);
                if (!cancelled && d?.alphaTree) setTreeState(d.alphaTree);
            } catch (_) {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [history]);

    const amountLocked = Boolean(treeState);

    const handlePlayGame = async () => {
        const bet = parseFloat(amountRef.current || amount);
        if (!Number.isFinite(bet) || bet < MIN_AMOUNT || bet > MAX_AMOUNT) {
            toast.error(`Enter a bet between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
            return;
        }
        setPlayLoading(true);
        setLastStepResult(null);
        setLastBandLabel(null);
        try {
            const data = await alphaTreeStart({ betAmount: bet }, dispatch, history);
            setTreeState(data.alphaTree ?? null);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Could not start game";
            toast.error(msg);
        } finally {
            setPlayLoading(false);
        }
    };

    const handlePickLetter = async (letter) => {
        setPickLoading(true);
        try {
            const data = await alphaTreePick({ letter }, dispatch, history);
            const ld = data.lastDraw;
            if (ld?.kind === "fixed_a") {
                setLastStepResult("0.60");
                setLastBandLabel(null);
            } else if (ld?.kind === "fixed_z" && typeof ld.value === "number") {
                setLastStepResult(ld.value.toFixed(2));
                setLastBandLabel("Fixed: 0.6 × 2^9");
            } else if (ld && typeof ld.value === "number") {
                setLastStepResult(ld.value.toFixed(2));
                if (ld.band === "zero") {
                    setLastBandLabel("0 (bust)");
                } else if (ld.band === "mid") {
                    setLastBandLabel("Between 0 and 1");
                } else if (ld.band === "high") {
                    const cap = alphaTreeMaxForRandomStep(ld.step);
                    setLastBandLabel(
                        cap != null ? `Between 1 and ${cap.toFixed(2)}` : "Between 1 and max"
                    );
                } else {
                    setLastBandLabel(null);
                }
            }
            if (ld?.busted) {
                setTreeState(null);
                setLastStepResult("0");
                setLastBandLabel("0 (bust)");
                toast.error("Round ended — result was 0");
                return;
            }
            setTreeState(data.alphaTree ?? null);
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Invalid move";
            toast.error(msg);
        } finally {
            setPickLoading(false);
        }
    };

    const handleCashOutGame = async () => {
        setCashLoading(true);
        try {
            const data = await alphaTreeCashOut(dispatch, history);
            const win = data.cashout?.win;
            setTreeState(null);
            setLastStepResult(null);
            setLastBandLabel(null);
            toast.success(
                win != null ? `Cashed out $${Number(win).toFixed(2)}` : "Cashed out"
            );
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Cash out failed";
            toast.error(msg);
        } finally {
            setCashLoading(false);
        }
    };

    const lettersToShow =
        treeState &&
        (treeState.allowedLetters?.length
            ? treeState.allowedLetters
            : allowedLettersForStep(treeState.step, treeState.phase));

    /** After step 1 (playing) or after step 10 (await_cashout). Not available on step 1 before A. */
    const canCashOutAlpha =
        treeState &&
        (treeState.phase === "playing" || treeState.phase === "await_cashout");

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
                    '1550px': '"panel game empty"'
                }}
                templateColumns={{
                    sm: '1fr',
                    md: '1fr 1fr',
                    '1550px': '3fr 6fr 2fr'
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto'
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
            >
                <GridItem area="panel" minW={"350px"}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <ForestIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                        </CardHeader>
                        <Box position="absolute" top="12px" right="12px" zIndex={10}>
                            <IconButton
                                type="button"
                                aria-label="Help"
                                icon={<HelpOutlineIcon style={{ fontSize: 24 }} />}
                                size="md"
                                bg="transparent"
                                color="#00d4ff"
                                borderRadius="50%"
                                _hover={{ bg: 'rgba(255,255,255,0.1)', color: '#00D4FF' }}
                                onClick={() => setIsHelpModalOpen(true)}
                            />
                        </Box>
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%">
                            <VStack spacing="24px" align="center" w="100%">
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }}>
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Bet
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
                                                name="amount"
                                                bg="transparent"
                                                border="transparent"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                h="auto"
                                                p="0"
                                                color="white"
                                                type="text"
                                                inputMode="decimal"
                                                min={MIN_AMOUNT}
                                                max={MAX_AMOUNT}
                                                step="0.01"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.10"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
                                                disabled={amountLocked || playLoading}
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
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(MAX_AMOUNT, current / 2);
                                                        setAmount(Math.max(MIN_AMOUNT, newValue).toFixed(2));
                                                    }}
                                                    isDisabled={amountLocked || playLoading}
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
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(MAX_AMOUNT, current * 2);
                                                        setAmount(newValue.toFixed(2));
                                                    }}
                                                    isDisabled={amountLocked || playLoading}
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
                                                                    aria-label="Open slider dropdown"
                                                                    icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                                    size="xs"
                                                                    h="100%"
                                                                    w="24px"
                                                                    minW="24px"
                                                                    bg="transparent"
                                                                    color="#fff"
                                                                    borderRadius="0"
                                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                                />
                                                            </VStack>
                                                        </Box>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        bg="#323738"
                                                        border="1px solid rgba(255, 255, 255, 0.2)"
                                                        borderRadius="12px"
                                                        w="300px"
                                                        _focus={{ boxShadow: 'none' }}
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
                                                                        max={MAX_AMOUNT}
                                                                        step={0.01}
                                                                        value={parseFloat(amount || MIN_AMOUNT)}
                                                                        onChange={(val) => setAmount(val.toFixed(2))}
                                                                        focusThumbOnChange={false}
                                                                    >
                                                                        <SliderTrack
                                                                            bg="#2a2d2e"
                                                                            h="6px"
                                                                            borderRadius="3px"
                                                                        >
                                                                            <SliderFilledTrack bg="transparent" />
                                                                        </SliderTrack>
                                                                        <SliderThumb
                                                                            bg="#fff"
                                                                            w="12px"
                                                                            h="24px"
                                                                            borderRadius="6px"
                                                                            border="none"
                                                                            boxShadow="none"
                                                                            _focus={{ boxShadow: 'none' }}
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
                                                                    {/* Indicator dots */}
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
                                                                            <Box
                                                                                key={i}
                                                                                w="2px"
                                                                                h="2px"
                                                                                borderRadius="50%"
                                                                                bg="rgba(255, 255, 255, 0.3)"
                                                                            />
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
                                                                    onClick={() => setAmount(MAX_AMOUNT.toFixed(2))}
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
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }} mt="5">
                                    <Grid templateColumns="1fr 1fr" gap="8px">
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={Boolean(treeState) || playLoading}
                                            onClick={handlePlayGame}
                                            label={playLoading ? "..." : "Play Game"}
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg="#00D4FF"
                                            color="#fff"
                                            border="1px solid rgba(0, 212, 255, 0.3)"
                                            _hover={{
                                                borderColor: "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={!canCashOutAlpha || cashLoading}
                                            onClick={handleCashOutGame}
                                            label={cashLoading ? "..." : "Cash Out"}
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        <CardHeader>
                            <Text fontSize="lg" color="#fff" fontWeight="bold" textAlign="center" w="100%">
                                Alpha Tree
                            </Text>
                        </CardHeader>
                        <CardBody minH="100%" w={{ base: '100%' }} minW={{ base: '100%', sm: '450px' }} maxW="450px" mx="auto" overflow="visible" position="relative">
                            {!treeState ? (
                                <Text color="rgba(255,255,255,0.75)" textAlign="center" py="40px">
                                    Press <Text as="span" color="#00D4FF" fontWeight="bold">Play Game</Text> to
                                    start. Step 1: choose <Text as="span" fontWeight="bold">A</Text> (result{" "}
                                    <Text as="span" color="#FFD700">0.6</Text>). Steps 2–9: three letters — each step
                                    randomly assigns <Text as="span" color="#FFD700">0</Text> (bust), a value in{" "}
                                    <Text as="span" color="#FFD700">(0, 1)</Text>, and a value in{" "}
                                    <Text as="span" color="#FFD700">(1, max)</Text> to the letters (max = 0.6 ×
                                    2^(step − 1)). Step 9: W, X, Y. Step 10: only{" "}
                                    <Text as="span" fontWeight="bold">Z</Text>, fixed{" "}
                                    <Text as="span" color="#FFD700">0.6 × 2^9</Text>.
                                </Text>
                            ) : (
                                <VStack spacing="20px" w="100%" align="stretch">
                                    <Flex justify="space-between" wrap="wrap" gap={2}>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                                            Step:{" "}
                                            <Text as="span" color="#00D4FF" fontWeight="bold">
                                                {treeState.phase === "await_cashout" ? 10 : treeState.step}
                                            </Text>
                                            / 10
                                        </Text>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                                            Total ×:{" "}
                                            <Text as="span" color="#FFD700" fontWeight="bold">
                                                {Number(treeState.cumulativeMultiplier ?? 1).toFixed(4)}
                                            </Text>
                                        </Text>
                                    </Flex>
                                    {lastStepResult != null && (
                                        <Box
                                            bg="rgba(0, 212, 255, 0.12)"
                                            border="1px solid rgba(0, 212, 255, 0.35)"
                                            borderRadius="12px"
                                            py="12px"
                                            textAlign="center"
                                        >
                                            <Text fontSize="xs" color="rgba(255,255,255,0.7)" mb="4px">
                                                Last result
                                            </Text>
                                            <Text fontSize="2xl" fontWeight="black" color="#FFD700">
                                                {lastStepResult}
                                            </Text>
                                            {lastBandLabel ? (
                                                <Text fontSize="xs" color="rgba(255,255,255,0.65)" mt="8px">
                                                    {lastBandLabel}
                                                </Text>
                                            ) : null}
                                        </Box>
                                    )}
                                    {treeState.phase === "await_cashout" ? (
                                        <Text color="#68d391" textAlign="center" fontWeight="bold">
                                            All 10 steps done — use Cash Out in the panel to collect.
                                        </Text>
                                    ) : (
                                        <>
                                            {treeState.phase === "playing" ? (
                                                <Text
                                                    fontSize="sm"
                                                    color="rgba(255,255,255,0.75)"
                                                    textAlign="center"
                                                >
                                                    You can <Text as="span" fontWeight="bold">Cash Out</Text> in the
                                                    panel after each step to lock in{" "}
                                                    <Text as="span" color="#FFD700" fontWeight="bold">
                                                        ≈ $
                                                        {(
                                                            Number(treeState.betAmount ?? 0) *
                                                            Number(treeState.cumulativeMultiplier ?? 1)
                                                        ).toFixed(2)}
                                                    </Text>{" "}
                                                    (bet × {Number(treeState.cumulativeMultiplier ?? 1).toFixed(4)}),
                                                    or keep playing.
                                                </Text>
                                            ) : null}
                                            <Flex wrap="wrap" gap="10px" justify="center">
                                                {(lettersToShow || []).map((ch) => (
                                                    <Button
                                                        key={`${treeState.step}-${ch}`}
                                                        type="button"
                                                        minW="56px"
                                                        h="52px"
                                                        fontSize="xl"
                                                        fontWeight="bold"
                                                        color="#000"
                                                        bg="#FFD700"
                                                        border="2px solid #000"
                                                        borderRadius="12px"
                                                        boxShadow="3px 3px 0 #000"
                                                        isLoading={pickLoading}
                                                        isDisabled={pickLoading}
                                                        onClick={() => handlePickLetter(ch)}
                                                        _hover={{ bg: "#ffe066" }}
                                                    >
                                                        {ch}
                                                    </Button>
                                                ))}
                                            </Flex>
                                            {treeState.phase === "playing" &&
                                            treeState.step >= 2 &&
                                            treeState.step <= 9 &&
                                            (lettersToShow || []).length === 3 ? (
                                                <Text
                                                    fontSize="xs"
                                                    color="rgba(255,255,255,0.65)"
                                                    textAlign="center"
                                                    lineHeight="1.5"
                                                    px={1}
                                                >
                                                    Each letter is one of:{" "}
                                                    <Text as="span" fontWeight="semibold">
                                                        0 (bust)
                                                    </Text>
                                                    ,{" "}
                                                    <Text as="span" fontWeight="semibold">
                                                        (0, 1)
                                                    </Text>
                                                    , or{" "}
                                                    <Text as="span" fontWeight="semibold">
                                                        (1, {treeState.nextRandomMax != null
                                                            ? Number(treeState.nextRandomMax).toFixed(2)
                                                            : "…"}
                                                        )
                                                    </Text>{" "}
                                                    — assigned randomly to B/C/D (or this step’s letters) each step.
                                                </Text>
                                            ) : null}
                                            {treeState.phase === "playing" &&
                                            treeState.step === 10 &&
                                            (lettersToShow || []).length === 1 ? (
                                                <Text
                                                    fontSize="xs"
                                                    color="rgba(255,255,255,0.65)"
                                                    textAlign="center"
                                                    lineHeight="1.5"
                                                    px={1}
                                                >
                                                    Z → fixed{" "}
                                                    {treeState.nextRandomMax != null
                                                        ? Number(treeState.nextRandomMax).toFixed(2)
                                                        : alphaTreeMaxForRandomStep(10)?.toFixed(2) ?? "…"}{" "}
                                                    (0.6 × 2^9)
                                                </Text>
                                            ) : null}
                                        </>
                                    )}
                                </VStack>
                            )}
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
                    <AlphaTreeRealView />
                </GridItem>
            </Grid>
            <BetHistory />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent
                    bg="#2a2d2e"
                    border="1px solid rgba(0, 212, 255, 0.3)"
                    maxH="80vh"
                    h="auto"
                    overflowY="auto"
                    className="pumping-modal-content"
                >
                    <ModalHeader color="white" >
                        How to Play Alpha Tree Game
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody py="0" maxH="calc(80vh - 60px)" overflowY="auto" className="pumping-modal-body">
                        <Tabs colorScheme="cyan" variant="enclosed">
                            <TabList borderColor="rgba(0, 212, 255, 0.2)">
                                <Tab
                                    color="rgba(255,255,255,0.7)"
                                    _selected={{ color: '#00D4FF', borderColor: '#00D4FF' }}
                                    _hover={{ color: '#00D4FF' }}
                                >
                                    How to Play
                                </Tab>
                            </TabList>
                            <TabPanels>
                                <TabPanel py="24px">
                                    <VStack spacing="16px" align="stretch">
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                1. Bet and start
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Enter your stake and press Play Game. Step 1 is only the letter A — it
                                                always applies multiplier 0.6 to your running total.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                2. Steps 2–9 and step 10
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Steps 2–9 show three letters. Each step,{" "}
                                                <Text as="span" fontWeight="bold">0</Text> (bust),{" "}
                                                <Text as="span" fontWeight="bold">(0, 1)</Text>, and{" "}
                                                <Text as="span" fontWeight="bold">(1, max)</Text> with max = 0.6 ×
                                                2^(step−1) are <Text as="span" fontWeight="bold">randomly assigned</Text>{" "}
                                                to those three letters (order changes every step). Step 9: W, X, Y. Step
                                                10: only <Text as="span" fontWeight="bold">Z</Text> — fixed{" "}
                                                <Text as="span" fontWeight="bold">0.6 × 2^9</Text>.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                3. Cash out
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                After completing step 1, you can Cash Out anytime to collect your bet ×
                                                the current cumulative multiplier, or keep going to step 10. After the
                                                final step you must Cash Out to collect.
                                            </Text>
                                        </Box>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}