import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import {
    Box,
    Grid,
    GridItem,
    Text,
    VStack,
    Button,
    Flex,
    Wrap,
    WrapItem,
    HStack,
    FormControl,
    FormLabel,
    Input,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useBreakpointValue,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import History from './DiceItem/History';
import Result from './DiceItem/Results';
import RealView from './DiceItem/RealView';
import Loading from 'components/Loading/Loading';
import DiceCanvas3D from './DiceItem/DiceCanvas3D';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import ClickButton from 'components/Input/ClickButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { FaDice } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { diceBet, getDiceView } from 'action/DiceActions';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';

const MIN_AMOUNT = 0.1;
/** Must stay in sync with roll animation duration in `DiceCanvas3D` (~3200ms). */
const DICE_ROLL_ANIM_MS = 3400;
const AUTO_BET_GAP_MS = 250;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;

export default function DicePage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true);
    const [lastRoll, setLastRoll] = useState(null);
    const [isBetting, setIsBetting] = useState(false);
    /** After a manual BET, keep buttons disabled until the dice animation finishes. */
    const [isRollCooldown, setIsRollCooldown] = useState(false);
    const [isMultiBetActive, setMultiBetActive] = useState(false);
    /** 1~3, 4~6, even, odd, random = betting options */
    const [targetTop, setTargetTop] = useState(/** @type {string} */ (0));
    const [amount, setAmount] = useState('0.1');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const diceRef = useRef(null);
    const isBettingRef = useRef(false);
    const isAutoBetRef = useRef(false);
    const rollCooldownTimerRef = useRef(null);
    const diceFxAnchorRef = useRef(null);
    /** Set when a bet succeeds and a roll starts; consumed in `onRollComplete`. */
    const pendingOutcomeRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);

    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFxVisible, setBangFxVisible] = useState(false);

    const placeBetRef = useRef(
        /** @returns {Promise<boolean>} */
        async () => false
    );

    // Mock user balance - in real app this would come from Redux/store
    const balance = 100;
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const clearRollCooldownTimer = useCallback(() => {
        if (rollCooldownTimerRef.current != null) {
            clearTimeout(rollCooldownTimerRef.current);
            rollCooldownTimerRef.current = null;
        }
    }, []);

    useEffect(() => () => clearRollCooldownTimer(), [clearRollCooldownTimer]);

    const clearWinBangTimers = useCallback(() => {
        if (winFxTimeoutRef.current != null) {
            clearTimeout(winFxTimeoutRef.current);
            winFxTimeoutRef.current = null;
        }
        if (bangFxTimeoutRef.current != null) {
            clearTimeout(bangFxTimeoutRef.current);
            bangFxTimeoutRef.current = null;
        }
    }, []);

    useEffect(
        () => () => {
            clearWinBangTimers();
        },
        [clearWinBangTimers]
    );

    const placeBet = useCallback(async () => {
        if (isBettingRef.current) return false;
        isBettingRef.current = true;
        setIsBetting(true);
        try {
            const res = await diceBet({ targetTop, amount }, dispatch, history);
            if (!res || res.error === 409) {
                return false;
            }
            const diceVal = res?.data?.dice;
            if (diceVal != null) {
                const winRaw = Number(res?.data?.win ?? 0);
                pendingOutcomeRef.current = {
                    win: Number.isFinite(winRaw) ? winRaw : 0,
                };
                diceRef.current?.roll(diceVal);
                if (!isAutoBetRef.current) {
                    clearRollCooldownTimer();
                    setIsRollCooldown(true);
                    rollCooldownTimerRef.current = setTimeout(() => {
                        rollCooldownTimerRef.current = null;
                        setIsRollCooldown(false);
                    }, DICE_ROLL_ANIM_MS + AUTO_BET_GAP_MS);
                }
            } else {
                pendingOutcomeRef.current = null;
            }
            return true;
        } catch {
            pendingOutcomeRef.current = null;
            return false;
        } finally {
            isBettingRef.current = false;
            setIsBetting(false);
        }
    }, [targetTop, amount, dispatch, history, clearRollCooldownTimer]);

    placeBetRef.current = placeBet;

    const handleRoll = useCallback(() => {
        void placeBet();
    }, [placeBet]);

    const startMultiBet = useCallback(() => {
        isAutoBetRef.current = true;
        setMultiBetActive(true);
    }, []);

    const stopMultiBet = useCallback(() => {
        isAutoBetRef.current = false;
        setMultiBetActive(false);
        clearRollCooldownTimer();
        setIsRollCooldown(false);
        clearWinBangTimers();
        setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
        setBangFxVisible(false);
        pendingOutcomeRef.current = null;
    }, [clearRollCooldownTimer, clearWinBangTimers]);

    useEffect(() => {
        isAutoBetRef.current = isMultiBetActive;
    }, [isMultiBetActive]);

    useEffect(() => {
        if (!isMultiBetActive) return undefined;

        let cancelled = false;

        const run = async () => {
            while (!cancelled && isAutoBetRef.current) {
                const ok = await placeBetRef.current();
                if (cancelled || !isAutoBetRef.current) break;
                if (!ok) {
                    stopMultiBet();
                    break;
                }
                await new Promise((r) => setTimeout(r, DICE_ROLL_ANIM_MS + AUTO_BET_GAP_MS));
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [isMultiBetActive, stopMultiBet]);

    const onRollComplete = useCallback(
        (pair) => {
            setLastRoll(pair);
            const pending = pendingOutcomeRef.current;
            pendingOutcomeRef.current = null;
            if (!pending) return;

            const win = pending.win;

            clearWinBangTimers();

            if (win > 0) {
                const anchorEl = diceFxAnchorRef.current;
                const anchorRect = anchorEl?.getBoundingClientRect?.() ?? null;
                const label = Number(win).toFixed(2);
                setWinFx({ visible: true, totalEarn: label, anchorRect });
                winFxTimeoutRef.current = setTimeout(() => {
                    winFxTimeoutRef.current = null;
                    setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
                }, WIN_FIREWORKS_MS);
            } else {
                // Full-viewport BANG (omit anchorRect — matches Pumping-style coverage)
                setBangFxVisible(true);
                bangFxTimeoutRef.current = setTimeout(() => {
                    bangFxTimeoutRef.current = null;
                    setBangFxVisible(false);
                }, BANG_EFFECT_MS);
            }
        },
        [clearWinBangTimers]
    );

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
            const num = parseFloat(value);
            if (value !== '' && !isNaN(num) && num > maxAmount) {
                toast.warning(`Max amount is ${Number(maxAmount).toFixed(2)}`);
                setAmount(Number(maxAmount).toFixed(2));
            } else {
                setAmount(value);
            }
        }
    };

    const handleAmountBlur = () => {
        const num = parseFloat(amount);
        if (isNaN(num) || num < MIN_AMOUNT) {
            setAmount(MIN_AMOUNT.toFixed(2));
        } else if (num > maxAmount) {
            setAmount(Number(maxAmount).toFixed(2));
        } else {
            setAmount(num.toFixed(2));
        }
    };

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    const diceCanvasHeight =
        useBreakpointValue({
            base: 260,
            sm: 300,
            md: 340,
            lg: 380,
            xl: 400,
        }) ?? 400;

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box
            px={{ base: '16px', md: '24px' }}
            minH="100vh"
            bg="transparent"
            marginTop="100px"
            w="100%"
            maxW="100%"
            minW={0}
            overflowX="hidden"
        >
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
                    '1550px': '"panel game empty"'
                }}
                templateColumns={{
                    sm: 'minmax(0, 1fr)',
                    md: 'minmax(0, 1fr) minmax(0, 1fr)',
                    '1550px': 'minmax(0, 3fr) minmax(0, 6fr) minmax(0, 2fr)'
                }}
                templateRows={{
                    base: 'auto auto auto',
                    md: 'auto auto',
                    '1550px': 'auto'
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                maxW="100%"
                minW={0}
            >
                <GridItem area="panel" minW={0} maxW="100%" overflow="hidden">
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <FaDice style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                            <Box position="absolute" top="0" right="0" zIndex={2}>
                                <IconButton
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
                        </CardHeader>
                        <CardBody
                            overflow="visible"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            minH="100%"
                            position="relative"
                        >
                            <VStack spacing="20px" align="stretch" w="100%">
                                <Box mb="24px">
                                    <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }} mx="auto">
                                        <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                            Bet Amount
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
                                                    onBlur={handleAmountBlur}
                                                    placeholder="0.10"
                                                    _focus={{ boxShadow: 'none' }}
                                                    flex="1"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.target.blur();
                                                        }
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
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
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
                                                                        aria-label="Open amount slider"
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
                                                                        onClick={() => setAmount(Number(maxAmount).toFixed(2))}
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
                                </Box>

                                <Box width={{ base: "100%", sm: "300px" }} mt="5" alignSelf="center">
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Bet Type
                                    </FormLabel>
                                    <Wrap spacing="8px">
                                        {['1~3', '4~6', 'Even', 'Odd'].map((option, index) => (
                                            <Button
                                                key={option}
                                                size="sm"
                                                flex="1"
                                                h="38px"
                                                px="12px"
                                                fontSize="xs"
                                                fontWeight="bold"
                                                borderRadius="10px"
                                                bg={
                                                    targetTop === index
                                                        ? 'rgba(0,212,255,0.28)'
                                                        : 'rgba(255,255,255,0.06)'
                                                }
                                                borderWidth="1px"
                                                borderColor={
                                                    targetTop === index
                                                        ? '#00D4FF'
                                                        : 'rgba(255,255,255,0.14)'
                                                }
                                                color="#fff"
                                                _hover={{
                                                    bg:
                                                        targetTop === index
                                                            ? 'rgba(0,212,255,0.35)'
                                                            : 'rgba(255,255,255,0.1)',
                                                }}
                                                onClick={() => setTargetTop(index)}
                                            >
                                                {option}
                                            </Button>
                                        ))}
                                    </Wrap>
                                </Box>
                                
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }} mt="5" alignSelf="center">
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
                                            disabled={isBetting || isMultiBetActive || isRollCooldown}
                                            onClick={handleRoll}
                                            label="BET"
                                        />
                                        <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={isMultiBetActive ? "#E74C3C" : "#00D4FF"}
                                            color="#fff"
                                            border={isMultiBetActive ? "2px solid #E74C3C" : "2px solid #00D4FF"}
                                            _hover={{
                                                borderColor: isMultiBetActive ? "#C0392B" : "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: isMultiBetActive ? "0 4px 12px rgba(231, 76, 60, 0.4)" : "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={!isMultiBetActive && (isBetting || isRollCooldown)}
                                            onClick={
                                                () => {
                                                    if (isMultiBetActive) {
                                                        stopMultiBet();
                                                    } else {
                                                        startMultiBet();
                                                    }
                                                }
                                            }
                                            label={isMultiBetActive ? "STOP" : "Auto BET"}
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minW={0} maxW="100%" minH="450px" overflow="hidden">
                    <Card
                        pt="22px"
                        pb="22px"
                        px="22px"
                        minH="100%"
                        alignItems="center"
                        w="100%"
                        maxW="100%"
                        minW={0}
                        overflow="hidden"
                    >
                        <Flex
                            w="100%"
                            maxW="100%"
                            minW={0}
                            justify="center"
                            direction="column"
                            align="center"
                            gap="12px"
                        >
                            <Box ref={diceFxAnchorRef} w="100%" maxW="100%" minW={0} position="relative">
                                <DiceCanvas3D
                                    ref={diceRef}
                                    height={diceCanvasHeight}
                                    onRollComplete={onRollComplete}
                                />
                            </Box>
                        </Flex>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px" minW={0} maxW="100%" overflow="hidden">
                    <RealView />
                </GridItem>
            </Grid>

            <WinFireworksEffect
                isVisible={winFx.visible}
                totalEarn={winFx.totalEarn}
                duration={WIN_FIREWORKS_MS}
                zIndex={10000}
                anchorRect={winFx.anchorRect ?? undefined}
            />
            <BangBurstEffect
                isVisible={bangFxVisible}
                duration={BANG_EFFECT_MS}
                zIndex={10050}
            />

            <Box w="100%" maxW="100%" minW={0} overflowX="auto">
                <History />
            </Box>
            
            {/* Help Modal */}
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} isCentered>
                <ModalOverlay />
                <ModalContent bg="#1a1a1a" border="1px solid rgba(0, 212, 255, 0.3)" borderRadius="16px" maxW="500px">
                    <ModalHeader color="#fff" fontSize="xl" fontWeight="bold" borderBottom="1px solid rgba(255, 255, 255, 0.1)">
                        How to Play Dice
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody p="24px">
                        <VStack spacing="16px" align="start">
                            <Box>
                                <Text color="#00D4FF" fontSize="lg" fontWeight="bold" mb="8px">
                                    🎲 Objective
                                </Text>
                                <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                    Predict which face of the dice will land on top and place your bet!
                                </Text>
                            </Box>
                            
                            <Box>
                                <Text color="#00D4FF" fontSize="lg" fontWeight="bold" mb="8px">
                                    🎯 How to Play
                                </Text>
                                <VStack spacing="8px" align="start">
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        1. Set your bet amount using the input field
                                    </Text>
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        2. Choose a number (1-6) or select "Random" for a fair roll
                                    </Text>
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        3. Click "Roll dice" to start the roll
                                    </Text>
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        4. Win if your chosen number matches the top face!
                                    </Text>
                                </VStack>
                            </Box>
                            
                            <Box>
                                <Text color="#00D4FF" fontSize="lg" fontWeight="bold" mb="8px">
                                    💡 Tips
                                </Text>
                                <VStack spacing="8px" align="start">
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        • Use the /2 and ×2 buttons to quickly adjust your bet
                                    </Text>
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        • Click the dropdown arrow for a slider to set precise amounts
                                    </Text>
                                    <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                        • Drag on the dice canvas to rotate and view different angles
                                    </Text>
                                </VStack>
                            </Box>
                            
                            <Box>
                                <Text color="#00D4FF" fontSize="lg" fontWeight="bold" mb="8px">
                                    🏆 Payouts
                                </Text>
                                <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm" lineHeight="1.6">
                                    Correct prediction: 6x your bet amount
                                </Text>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}