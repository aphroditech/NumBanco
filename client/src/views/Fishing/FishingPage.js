import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import {
    Box,
    Text,
    Grid,
    GridItem,
    VStack,
    HStack,
    Button,
    IconButton,
    FormControl,
    FormLabel,
    Flex,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Input,
    keyframes
} from '@chakra-ui/react';
import ClickButton from 'components/Input/ClickButton';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import History from './FishingItem/History';
import Result from './FishingItem/Results';
import RealView from './FishingItem/RealView';
import Loading from 'components/Loading/Loading';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import background from 'assets/img/Fishing/background.png'
import fish from 'assets/img/Fishing/fish.png'



import { GiFishingHook } from "react-icons/gi";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';


import { getFishingView, fishingBet, fishingPullStay, fishingCashOut } from 'action/FishingActions';
const MIN_AMOUNT = 0.1;

const strengthRiseUp = keyframes`
  from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0px); filter: blur(0px); }
`;

// Multi pop: rise + fade away (different feel than strength label).
const multiRiseFade = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.92); filter: blur(3px); }
  25% { opacity: 1; }
  to { opacity: 0; transform: translateY(-28px) scale(1.04); filter: blur(0px); }
`;

const confirmFadeAway = keyframes`
  from { opacity: 1; transform: translateY(0px) scale(1); filter: blur(0px); }
  70% { opacity: 1; }
  to { opacity: 1; transform: translateY(-12px) scale(0.98); filter: blur(0px); }
`;

export default function FishingPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('0.10');
    const [bet, setBet] = useState(null);
    const [step, setStep] = useState(0);
    const [multi, setMulti] = useState(1);
    const [info, setInfo] = useState([]);
    const [strength, setStrength] = useState(50);
    const [status, setStatus] = useState("continue");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [confirmKind, setConfirmKind] = useState("finish"); // win | bang | cashout | finish
    const confirmTimeoutRef = useRef(null);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const strengthValue = clamp(Number(strength ?? 0), 0, 100);

    const openConfirmAndReset = (kind, text) => {
        if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
        setConfirmKind(kind);
        setConfirmText(text);
        setConfirmOpen(true);

        // Keep current fish/strength briefly, then reset.
        confirmTimeoutRef.current = window.setTimeout(() => {
            setConfirmOpen(false);
            setBet(null);
            setMulti(1);
            setStep(0);
            setInfo([]);
            setStrength(50);
        }, 1000);
    };

    // Gauge styling constants (0..100 strength scale)
    const GAUGE_STEP = 5;
    const GAUGE_REFERENCE = 50;
    const TRACK_HEIGHT = 8;
    const THUMB_SIZE = 18;
    const TICK_MAJOR_HEIGHT = 18;
    const TICK_MINOR_HEIGHT = 12;
    const LABEL_STRIP_HEIGHT = 26;

    // Fish move bar (0..10)
    const FISH_BAR_MAX = 10;
    const fishStepValue = clamp(Math.round(Number(step ?? 0)), 0, FISH_BAR_MAX);
    // Right-to-left: step 0 => right, step 10 => left
    const FISH_EDGE_MARGIN_PERCENT = 0; // keep dot fully visible inside rounded card
    const fishXPercent = clamp(
        (1 - fishStepValue / FISH_BAR_MAX) * 100,
        FISH_EDGE_MARGIN_PERCENT,
        100 - FISH_EDGE_MARGIN_PERCENT
    );

    const mixRgb = (a, b, t) => ({
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
    });

    const toRgba = (c, alpha) => `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;

    // HSL -> RGB conversion (h: 0..360, s/l: 0..100)
    const hslToRgb = (h, s, l) => {
        const sat = s / 100;
        const light = l / 100;
        const chroma = (1 - Math.abs(2 * light - 1)) * sat;
        const hp = (h % 360) / 60;
        const x = chroma * (1 - Math.abs((hp % 2) - 1));
        let r1 = 0, g1 = 0, b1 = 0;
        if (0 <= hp && hp < 1) [r1, g1, b1] = [chroma, x, 0];
        else if (1 <= hp && hp < 2) [r1, g1, b1] = [x, chroma, 0];
        else if (2 <= hp && hp < 3) [r1, g1, b1] = [0, chroma, x];
        else if (3 <= hp && hp < 4) [r1, g1, b1] = [0, x, chroma];
        else if (4 <= hp && hp < 5) [r1, g1, b1] = [x, 0, chroma];
        else [r1, g1, b1] = [chroma, 0, x];

        const m = light - chroma / 2;
        return {
            r: Math.round((r1 + m) * 255),
            g: Math.round((g1 + m) * 255),
            b: Math.round((b1 + m) * 255),
        };
    };

    const getDangerRainbowColor = (value, variant = "underlay") => {
        const v = clamp(value, 0, 100);
        const dist = Math.abs(v - GAUGE_REFERENCE); // symmetric around 50: 0..50
        // Rainbow is based on distance from 50 (mirrored left/right).
        // dist=0 -> hue=0 (red-ish); dist=50 -> hue=300 (magenta-ish)
        const baseHue = (dist / GAUGE_REFERENCE) * 300;
        const rainbow = hslToRgb(baseHue, 95, 48);

        // Danger increases the farther we are from reference 50 (both directions)
        const dangerFactor = dist / GAUGE_REFERENCE; // 0..1
        const dangerT = Math.pow(dangerFactor, 1.35);
        const dangerRed = { r: 255, g: 60, b: 60 };
        const blended = mixRgb(rainbow, dangerRed, dangerT);

        // Filled version looks brighter/stronger
        const brightened = variant === "fill"
            ? mixRgb(blended, { r: 255, g: 255, b: 255 }, 0.18)
            : blended;

        const alpha = variant === "fill" ? 0.95 : 0.55;
        return toRgba(brightened, alpha);
    };

    const updateAmount = (value) => {
        setAmount(value);
        // amountRef.current = value;
    };

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

    const handleBet = () => {
        const data = {
            amount
        }
        fishingBet(data, dispatch, history);
        setStatus("continue");
    }

    const handlefishing = async (e) =>  {
        const data = { act: e };

        const res = await fishingPullStay(data, dispatch, history);
        const strength = res?.strength;
        const status = res?.status;
        const updatedUser = res?.user;

        // Update gauge + state immediately so fish can move even when status != "continue".
        if (typeof strength === "number" && Number.isFinite(strength)) setStrength(strength);
        if (typeof status === "string") {
            setTimeout(() => {
                setStatus(status);
            }, 1000)
        }

        // Server updates the active history item each pull; when status changes (win/bang), the
        // history item's `active` flag flips, so our current `active === false` effect doesn't update UI.
        // Here we directly hydrate from the response so fish movement + label animations work.
        const lastHistoryItem = updatedUser?.fishingHistory?.[updatedUser?.fishingHistory?.length - 1];
        if (lastHistoryItem) {
            if (Array.isArray(lastHistoryItem.info)) setInfo(lastHistoryItem.info);
            if (typeof lastHistoryItem.step === "number" && Number.isFinite(lastHistoryItem.step)) setStep(lastHistoryItem.step);
            if (typeof lastHistoryItem.multi === "number" && Number.isFinite(lastHistoryItem.multi)) setMulti(lastHistoryItem.multi);
        }

        if(status !== "continue") {
            if (status === "win") openConfirmAndReset("win", "Win!");
            else if (status === "bang") openConfirmAndReset("bang", "Bang!");
            else if (status === "cashout") openConfirmAndReset("cashout", "Cash Out!");
            else openConfirmAndReset("finish", "Finished!");
        }
    }

    const handleCashOut = async () => {
        setStatus("cashout");
        await fishingCashOut(dispatch, history);
        openConfirmAndReset("cashout", "Cash Out!");
    }

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const pending = user.fishingHistory?.filter(item => item.active === false)[0];
        if(pending) {
            setAmount(pending.bet);
            setBet(pending.bet);
            setInfo(pending.info);
            setStrength(pending.info[pending.info.length - 1]?.strength || 50);
            setStep(pending.step);
            setMulti(pending.multi);
        }
    }, [user])

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            {/* <Result /> */}
            <Grid
                templateAreas={{
                    sm: '"game" "panel" "empty"',
                    md: '"game game" "panel empty"',
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
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <GiFishingHook style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                        </CardHeader>
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
                                                max={maxAmount}
                                                step="0.01"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                disabled={bet}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.10"
                                                _focus={{ boxShadow: 'none' }}
                                                flex="1"
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
                                                    disabled={bet}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(maxAmount, current / 2);
                                                        setAmount(Math.max(MIN_AMOUNT, newValue).toFixed(2));
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
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    disabled={bet}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        const newValue = Math.min(maxAmount, current * 2);
                                                        setAmount(newValue.toFixed(2));
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
                                                                    aria-label="Open slider dropdown"
                                                                    icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                                    size="xs"
                                                                    h="100%"
                                                                    w="24px"
                                                                    disabled={bet}
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
                                                                        max={maxAmount}
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
                                                                    onClick={() => setAmount(maxAmount.toFixed(2))}
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
                                            bg={"#ffc400ff"}
                                            hoverBg={"#ffc400ff"}
                                            color="#fff"
                                            border={"none"}
                                            disabled={!bet || status !== "continue"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    handleCashOut();
                                                }
                                            }
                                            label={bet? (bet*multi).toFixed(2) + "$ CASH OUT": "CASH OUT"}
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            disabled={bet}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    setBet(amount);
                                                    handleBet();
                                                }
                                            }
                                            label="BET"
                                        />
                                    </Grid>
                                    <Grid templateColumns="1fr 1fr" gap="8px">
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#6DC64B"}
                                            hoverBg={"#6DC64B"}
                                            color="#fff"
                                            border={"none"}
                                            disabled={!bet || status !== "continue"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    handlefishing(-1);
                                                }
                                            }
                                            label="HOLD"
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={"#E74C3C"}
                                            hoverBg={"#E74C3C"}
                                            color="#fff"
                                            border={"none"}
                                            disabled={!bet || status !== "continue"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={
                                                () => {
                                                    handlefishing(1);
                                                }
                                            }
                                            label="REEL"
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="22px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%" position="relative">
                        <Box
                            as="img"
                            src={background}
                            backgroundSize={"cover"}
                            w="100%"
                            h="406px"
                            borderRadius="14px"
                            display="block"
                        />

                        {confirmOpen && (
                            <Box
                                position="absolute"
                                inset="22px"
                                zIndex="20"
                                borderRadius="14px"
                                bg="rgba(0,0,0,0.45)"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                {/* Glass card */}
                                <Box
                                    p="2px"
                                    borderRadius="18px"
                            bg={
                                confirmKind === "win"
                                    ? "linear-gradient(135deg, rgba(37,246,168,0.55) 0%, rgba(0,212,255,0.45) 55%, rgba(0,0,0,0) 100%)"
                                    : confirmKind === "bang"
                                        ? "linear-gradient(135deg, rgba(255,77,109,0.55) 0%, rgba(231,76,60,0.45) 55%, rgba(0,0,0,0) 100%)"
                                        : confirmKind === "cashout"
                                            ? "linear-gradient(135deg, rgba(255,209,102,0.55) 0%, rgba(0,212,255,0.45) 55%, rgba(0,0,0,0) 100%)"
                                            : "linear-gradient(135deg, rgba(0,212,255,0.55) 0%, rgba(88,44,255,0.45) 55%, rgba(0,0,0,0) 100%)"
                            }
                                    animation={`${confirmFadeAway} 1s ease-out forwards`}
                                >
                                    <Box
                                        bg="rgba(42,45,46,0.92)"
                                        backdropFilter="blur(10px)"
                                        borderRadius="16px"
                                    width="320px"
                                        px={{ base: "16px", sm: "22px" }}
                                        py={{ base: "14px", sm: "18px" }}
                                        textAlign="center"
                                        border="1px solid rgba(255,255,255,0.10)"
                                    boxShadow={
                                        confirmKind === "win"
                                            ? "0 18px 60px rgba(37,246,168,0.14), 0 10px 30px rgba(0,0,0,0.35)"
                                            : confirmKind === "bang"
                                                ? "0 18px 60px rgba(255,77,109,0.14), 0 10px 30px rgba(0,0,0,0.35)"
                                                : confirmKind === "cashout"
                                                    ? "0 18px 60px rgba(255,209,102,0.14), 0 10px 30px rgba(0,0,0,0.35)"
                                                    : "0 18px 60px rgba(0, 212, 255, 0.14), 0 10px 30px rgba(0,0,0,0.35)"
                                    }
                                    >
                                    <Text
                                        fontSize={{ base: "18px", sm: "22px" }}
                                        fontWeight="900"
                                        color={
                                            confirmKind === "win"
                                                ? "#25F6A8"
                                                : confirmKind === "bang"
                                                    ? "#FF4D6D"
                                                    : confirmKind === "cashout"
                                                        ? "#FFD166"
                                                        : "#00D4FF"
                                        }
                                        mb="8px"
                                    >
                                        {confirmText}
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.75)" mb="14px">
                                        Resetting...
                                    </Text>
                                    <Button
                                        size="sm"
                                        h="40px"
                                        px="16px"
                                        bg={
                                            confirmKind === "win"
                                                ? "linear-gradient(135deg, #25F6A8 0%, #00D4FF 100%)"
                                                : confirmKind === "bang"
                                                    ? "linear-gradient(135deg, #FF4D6D 0%, #E74C3C 100%)"
                                                    : confirmKind === "cashout"
                                                        ? "linear-gradient(135deg, #FFD166 0%, #00D4FF 100%)"
                                                        : "linear-gradient(135deg, #00D4FF 0%, #582CFF 100%)"
                                        }
                                        color="#fff"
                                        borderRadius="14px"
                                        boxShadow="0 0 22px rgba(0,212,255,0.25)"
                                        _hover={{ filter: "brightness(1.05)" }}
                                        onClick={() => {
                                            if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
                                            setConfirmOpen(false);
                                            setBet(null);
                                            setMulti(1);
                                            setStep(0);
                                            setInfo([]);
                                            setStrength(50);
                                        }}
                                    >
                                        OK
                                    </Button>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {/* Strength gauge overlay (0..100) inside the sea view - LEFT to RIGHT */}
                        <Box
                            position="absolute"
                            left="70%"
                            top="58px"
                            transform="translateX(-50%)"
                            height="92px"
                            width="40%"
                            maxW="820px"
                            minW="320px"
                            pointerEvents="none"
                            userSelect="none"
                        >
                            {/* dark strip behind labels for readability */}
                            <Box
                                position="absolute"
                                left="-4%"
                                right="0"
                                bottom="0"
                                height={`${LABEL_STRIP_HEIGHT}px`}
                                width={`${110}%`}
                                bg="rgba(0,0,0,0.35)"
                                borderRadius="999px"
                                border="1px solid rgba(255,255,255,0.12)"
                            />

                            {/* reference marker at 50 (only around track area) */}
                            <Box
                                position="absolute"
                                left={`${GAUGE_REFERENCE}%`}
                                top="50%"
                                transform="translate(-50%, -50%)"
                                height="26px"
                                width="2px"
                                bg="rgba(0,212,255,0.55)"
                                boxShadow="0 0 12px rgba(0,212,255,0.35)"
                                borderRadius="2px"
                            />

                            {/* Modern rounded track container */}
                            <Box
                                position="absolute"
                                left="0"
                                right="0"
                                top="50%"
                                transform="translateY(-50%)"
                                height={`${TRACK_HEIGHT}px`}
                                borderRadius="999px"
                                bg="rgba(0,0,0,0.18)"
                                border="1px solid rgba(255,255,255,0.12)"
                                overflow="hidden"
                            >
                                {/* Colored scale (danger increases away from 50) */}
                                {Array.from({ length: Math.floor(100 / GAUGE_STEP) }).map((_, segIdx) => {
                                    const start = segIdx * GAUGE_STEP;
                                    const mid = start + GAUGE_STEP / 2;

                                    return (
                                        <Box
                                            key={`scale-${segIdx}`}
                                            position="absolute"
                                            left={`${start}%`}
                                            top="0"
                                            height="100%"
                                            width={`${GAUGE_STEP}%`}
                                            bg={getDangerRainbowColor(mid, "underlay")}
                                        />
                                    );
                                })}

                                {/* Bright fill up to current strength */}
                                {Array.from({ length: Math.floor(100 / GAUGE_STEP) }).map((_, segIdx) => {
                                    const start = segIdx * GAUGE_STEP;
                                    const filled = clamp(strengthValue - start, 0, GAUGE_STEP);
                                    if (filled <= 0) return null;

                                    const mid = start + Math.min(GAUGE_STEP, filled) / 2;
                                    const widthPercent = filled; // 1 strength point == 1% width

                                    return (
                                        <Box
                                            key={`fill-${segIdx}`}
                                            position="absolute"
                                            left={`${start}%`}
                                            top="0"
                                            height="100%"
                                            width={`${widthPercent}%`}
                                            bg={getDangerRainbowColor(mid, "fill")}
                                        />
                                    );
                                })}
                            </Box>

                            {/* thumb (outer glow ring + inner dot) */}
                            <Box
                                position="absolute"
                                left={`${strengthValue}%`}
                                top="50%"
                                transform="translate(-50%, -50%)"
                                width={`${THUMB_SIZE + 10}px`}
                                height={`${THUMB_SIZE + 10}px`}
                                borderRadius="50%"
                                bg="transparent"
                                boxShadow="0 0 18px rgba(0,212,255,0.45)"
                                transition="left 450ms ease, box-shadow 450ms ease"
                                willChange="left"
                            />
                            <Box
                                position="absolute"
                                left={`${strengthValue}%`}
                                top="50%"
                                transform="translate(-50%, -50%)"
                                width={`${THUMB_SIZE}px`}
                                height={`${THUMB_SIZE}px`}
                                borderRadius="50%"
                                bg={getDangerRainbowColor(strengthValue, "fill")}
                                boxShadow="0 0 12px rgba(0,212,255,0.55)"
                                border="2px solid rgba(255,255,255,0.65)"
                                transition="left 450ms ease, background-color 450ms ease, box-shadow 450ms ease"
                                willChange="left, background-color"
                            />

                            {/* tick marks (0..100, every 5) */}
                            {Array.from({ length: 101 }).map((_, i) => (i % GAUGE_STEP === 0 ? (
                                <Box
                                    key={i}
                                    position="absolute"
                                    left={`${i}%`}
                                    top="50%"
                                    transform="translate(-50%, -50%)"
                                    width={i % 10 === 0 ? "2px" : "1px"}
                                    height={i % 10 === 0 ? `${TICK_MAJOR_HEIGHT}px` : `${TICK_MINOR_HEIGHT}px`}
                                    bg={i === GAUGE_REFERENCE ? "rgba(0,212,255,0.95)" : "rgba(255,255,255,0.3)"}
                                />
                            ) : null))}

                            {/* numeric labels every 5: 0,5,10,...,100 */}
                            {Array.from({ length: 101 }).map((_, v) => (v % GAUGE_STEP === 0 ? (
                                <Text
                                    key={v}
                                    position="absolute"
                                    left={`${v}%`}
                                    bottom="8px"
                                    transform="translateX(-50%)"
                                    fontSize="10px"
                                    fontWeight={v === GAUGE_REFERENCE || v % 10 === 0 ? "bold" : "normal"}
                                    color={v === GAUGE_REFERENCE ? "rgba(0,212,255,0.95)" : "rgba(255,255,255,0.8)"}
                                    textShadow="0 2px 4px rgba(0,0,0,0.7)"
                                    textAlign="center"
                                    whiteSpace="nowrap"
                                >
                                    {v}
                                </Text>
                            ) : null))}
                        </Box>

                        {/* Bottom bar (0..10) moves fish */}
                        <Box
                            position="absolute"
                            left="60%"
                            top="65%"
                            transform="translateX(-50%)"
                            height="78px"
                            width="60%"
                            maxW="820px"
                            minW="320px"
                            pointerEvents="none"
                            userSelect="none"
                            overflow="visible"
                        >
                            {/* track container */}
                            <Box
                                position="absolute"
                                left="0"
                                right="0"
                                top="30px"
                                height="10px"
                                borderRadius="999px"
                                bg="rgba(255,255,255,0.18)"
                                border="1px solid rgba(255,255,255,0.12)"
                                overflow="hidden"
                            >
                                {/* simple single-color fill (no rainbow) */}
                                <Box
                                    position="absolute"
                                    right="0"
                                    top="0"
                                    height="100%"
                                    width={`${(fishStepValue / FISH_BAR_MAX) * 100}%`}
                                    bg="rgba(0, 212, 255, 0.70)"
                                    borderRadius="999px"
                                />
                            </Box>

                            {/* fish dot */}
                            <Box
                                position="absolute"
                                left={`${fishXPercent}%`}
                                top="33px"
                                transform="translate(-50%, -50%)"
                                transition="left 450ms ease"
                                willChange="left"
                                    w="54px"
                                zIndex="2"
                            >
                                <Box
                                    as="img"
                                    src={fish}
                                    w="54px"
                                    borderRadius="14px"
                                    display="block"
                                />
                            </Box>

                            {/* labels (0..10) */}
                            {/* <Box
                                position="absolute"
                                left="0"
                                right="0"
                                bottom="0"
                                height="26px"
                                bg="rgba(0,0,0,0.30)"
                                borderRadius="999px"
                                border="1px solid rgba(255,255,255,0.10)"
                            /> */}
                            {Array.from({ length: FISH_BAR_MAX + 1 }).map((_, v) => (
                                <Box
                                    key={`fish-label-${v}-${info[v - 1]?.strength ?? 'na'}`}
                                        position="absolute"
                                        left={`${(1 - v / FISH_BAR_MAX) * 100}%`}
                                        bottom="4px"
                                        transform="translateX(-50%)"
                                        fontSize="10px"
                                        fontWeight={v === 5 ? "bold" : "normal"}
                                        color={v === 5 ? "rgba(0,212,255,0.95)" : "rgba(255,255,255,0.80)"}
                                        textShadow="0 2px 4px rgba(0,0,0,0.7)"
                                        whiteSpace="nowrap"
                                >
                                    <Text 
                                    position='absolute' 
                                    left="-6" 
                                    top="-100px" 
                                    fontSize="20px"
                                    color={info[v - 1]?.status === 1 ? "#25F6A8" : "#FF4D6D"}
                                    fontWeight="800"
                                    lineHeight="1"
                                    px="8px"
                                    py="2px"
                                    borderRadius="10px"
                                    // bg={info[v - 1]?.status === 1 ? "rgba(37,246,168,0.18)" : "rgba(255,77,109,0.18)"}
                                    animation={`${strengthRiseUp} 0.45s ease-out`}>
                                        {info[v - 1]?.strength}
                                    </Text>
                                    {info[v - 1]?.multi ? (
                                        <Text
                                            position="absolute"
                                            left="-6"
                                            top="-180px"
                                            fontSize="28px"
                                            color={info[v - 1]?.status === 1 ? "#25F6A8" : "#FF4D6D"}
                                            fontWeight="900"
                                            lineHeight="1"
                                            px="8px"
                                            py="2px"
                                            borderRadius="10px"
                                            bg={
                                                info[v - 1]?.status === 1
                                                    ? "rgba(255, 209, 102, 0.18)"
                                                    : "rgba(255, 77, 109, 0.18)"
                                            }
                                            boxShadow={
                                                info[v - 1]?.status === 1
                                                    ? "0 0 20px rgba(255, 209, 102, 0.25)"
                                                    : "0 0 20px rgba(255, 77, 109, 0.20)"
                                            }
                                            animation={`${multiRiseFade} 1.75s ease-out forwards`}
                                        >
                                            {info[v - 1].status === 1 ? "+" : "-"} {Math.abs(info[v - 1]?.strength - 50) / 5}
                                        </Text>
                                    ) : null}
                                </Box>
                            ))}
                        </Box>

                        {/* Optional debug info (kept small so it doesn't cover the sea view) */}
                        {/* <Box position="absolute" left="26px" top="10px">
                            <Text fontSize="12px" color="rgb(0, 0, 0)">Step: {step}</Text>
                            <Text fontSize="12px" color="rgb(0, 0, 0)">Strength: {strengthValue}</Text>
                            <Text fontSize="12px" color="rgb(0, 0, 0)">Multi: {multi}</Text>
                            <Text fontSize="12px" color="rgb(0, 0, 0)">Amount: {amount}</Text>
                        </Box> */}
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
                    <RealView />
                </GridItem>
            </Grid>
            <History />
        </Box>
    );
}