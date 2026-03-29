import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Tooltip,
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
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Text,
    keyframes,
    useDisclosure
} from '@chakra-ui/react';
import ClickButton from 'components/Input/ClickButton';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import History from './PumpingItem/History';
import Result from './PumpingItem/Results';
import RealView from './PumpingItem/RealView';
import { pumpingBet } from 'action/PumpingActions';
import { getUserData } from 'action';
import hammer from 'assets/img/hammer.png';
import tower from 'assets/img/tower.png';
import weight from 'assets/img/weight.png';
import Dialog from "components/Dialog/Dialog";
import PumpingBalanceGraph from "./PumpingItem/PumpingBalanceGraph";
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import HeatPumpIcon from '@mui/icons-material/HeatPump';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { toast } from "react-toastify"
import Loading from 'components/Loading/Loading';
import { onlineUser, offlineUser } from 'action/BetActions';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';

const MIN_AMOUNT = 0.1;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;

const hammerStrike = keyframes`
  0% { 
    transform: rotate(10deg);
  }
  10% { 
    transform: rotate(90deg);
  }
  90% { 
    transform: rotate(90deg);
  }
  100% { 
    transform: rotate(10deg);
  }
`;

export default function PumpingPage() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const membership = Number(user?.membership ?? 0);
    const maxAmountByTier = membership === 0 ? 1 : membership === 1 ? 1000 : balance;
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(maxAmountByTier, balance));
    const history = useHistory();
    const [target, setTarget] = useState('1.01');
    const targetRef = useRef('1.01');
    const amountRef = useRef('0.10');
    const balanceRef = useRef(balance);
    const [amount, setAmount] = useState('0.10');
    const [isLoading, setIsLoading] = useState(true);

    const updateTarget = (value) => {
        setTarget(value);
        targetRef.current = value;
    };

    const updateAmount = (value) => {
        setAmount(value);
        amountRef.current = value;
    };

    useEffect(() => {
        onlineUser(4);
        return () => {
            offlineUser(4);
        };
    }, []);

    useEffect(() => {
        targetRef.current = target;
        amountRef.current = amount;
        balanceRef.current = balance;
    }, [target, amount, balance]);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);
        return () => clearTimeout(timer);
    }, []);

    const [roll, setRoll] = useState(false);
    const [bet, setBet] = useState(1);
    const [pumpingResult, setPumpingResult] = useState(0);
    const [isHammerAnimating, setIsHammerAnimating] = useState(false);
    const [isWeightMoving, setIsWeightMoving] = useState(false);
    const WEIGHT_BOTTOM = 302;
    const WEIGHT_TOP = 90;
    const WEIGHT_RANGE = WEIGHT_BOTTOM - WEIGHT_TOP; // 212
    const [weightPosition, setWeightPosition] = useState(WEIGHT_BOTTOM);
    const [weightDirection, setWeightDirection] = useState('down'); // 'up' or 'down'
    const [ledCount, setLedCount] = useState(0);
    const ledTimeoutRef = useRef(null);
    const ledStepRef = useRef(null);
    const ledFlickerRef = useRef(null);
    const [displayHeight, setDisplayHeight] = useState(0);
    const [comparisonText, setComparisonText] = useState("");
    const [comparisonColor, setComparisonColor] = useState("#E74C3C");
    const [showComparisonLabel, setShowComparisonLabel] = useState(false);
    const heightAnimRef = useRef(null);
    const heightHoldRef = useRef(null);
    const comparisonDelayRef = useRef(null);
    const comparisonHoldRef = useRef(null);
    const [winLit, setWinLit] = useState(false);
    const winDelayRef = useRef(null);
    const winFlickerRef = useRef(null);
    const pumpingFxAnchorRef = useRef(null);
    const pumpingFxScheduleRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);
    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFx, setBangFx] = useState({ visible: false, anchorRect: null });
    const [isMultiBetActive, setIsMultiBetActive] = useState(false);
    const [isBetting, setIsBetting] = useState(false);
    const multiBetIntervalRef = useRef(null);

    const calcY = (x) => {
        const A = 231;
        const B = 226.91;
        const k = 0.6866;
        const n = 0.35;

        return A - B * Math.exp(-k * Math.pow(x, n)) - 302;
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const MARK_COLOR = "#E46A2E";
    const heightMarks = [0, 1, 2, 5, 10, 1000];
    const axisMin = calcY(0) + WEIGHT_BOTTOM;
    const axisMax = calcY(1000) + WEIGHT_BOTTOM;
    const axisSpan = axisMax - axisMin || 1;
    const getRiseHeight = (value) => {
        const raw = calcY(Number(value)) + WEIGHT_BOTTOM;
        const normalized = (raw - axisMin) / axisSpan;
        return clamp(normalized * WEIGHT_RANGE, 0, WEIGHT_RANGE);
    };
    const getWeightTopFromValue = (value) => {
        const baseTop = WEIGHT_BOTTOM - getRiseHeight(value);
        const extraOffset = Number(value) === 1 ? 15 : Number(value) <= 2 ? 9 : 0;
        return baseTop + extraOffset;
    };
    const getLedCount = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 1) return 0;
        if (numeric < 1.5) return 5;
        if (numeric < 2) return 6;
        if (numeric < 5) return 7;
        if (numeric < 10) return 8;
        return 9;
    };
    const animateLedCount = (target) => {
        if (ledStepRef.current) {
            clearInterval(ledStepRef.current);
            ledStepRef.current = null;
        }
        if (!target || target <= 0) {
            setLedCount(0);
            return;
        }
        const stepDuration = Math.max(50, Math.floor(800 / target));
        let current = 0;
        setLedCount(0);
        ledStepRef.current = setInterval(() => {
            current += 1;
            setLedCount(current);
            if (current >= target) {
                clearInterval(ledStepRef.current);
                ledStepRef.current = null;
            }
        }, stepDuration);
    };

    const startLedFlicker = (target) => {
        if (ledFlickerRef.current) {
            clearInterval(ledFlickerRef.current);
            ledFlickerRef.current = null;
        }
        if (!target || target <= 0) {
            setLedCount(0);
            return;
        }
        let toggles = 0;
        const maxToggles = 6;
        ledFlickerRef.current = setInterval(() => {
            toggles += 1;
            setLedCount(toggles % 2 === 1 ? 0 : target);
            if (toggles >= maxToggles) {
                clearInterval(ledFlickerRef.current);
                ledFlickerRef.current = null;
                setLedCount(0);
            }
        }, 200);
    };

    const startWinFlicker = () => {
        if (winFlickerRef.current) {
            clearInterval(winFlickerRef.current);
            winFlickerRef.current = null;
        }
        const holdDuration = 2000;
        const maxToggles = 6; // three full flickers (on/off)
        const intervalMs = 200;
        let toggles = 0;
        setWinLit(true);
        winDelayRef.current = setTimeout(() => {
            winFlickerRef.current = setInterval(() => {
                toggles += 1;
                setWinLit(toggles % 2 === 0);
                if (toggles >= maxToggles) {
                    clearInterval(winFlickerRef.current);
                    winFlickerRef.current = null;
                    setWinLit(false);
                }
            }, intervalMs);
        }, holdDuration);
    };
    const ledColors = [
        "#F06A5B",
        "#F27D57",
        "#F29C4B",
        "#F3C64A",
        "#F2E15A",
        "#CFE56D",
        "#91D67F",
        "#61C7A0",
        "#5BB7D8",
    ];
    const formatResult = (value) =>
        Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "";

    const animateHeightTo = (targetValue, durationMs = 800) => {
        if (heightAnimRef.current) {
            cancelAnimationFrame(heightAnimRef.current);
            heightAnimRef.current = null;
        }
        const startValue = displayHeight;
        const startTime = performance.now();
        const step = (now) => {
            const progress = Math.min((now - startTime) / durationMs, 1);
            const nextValue = startValue + (targetValue - startValue) * progress;
            setDisplayHeight(nextValue);
            if (progress < 1) {
                heightAnimRef.current = requestAnimationFrame(step);
            } else {
                heightAnimRef.current = null;
            }
        };
        heightAnimRef.current = requestAnimationFrame(step);
    };

    const startMultiBet = () => {
        if (isMultiBetActive) return;

        setIsMultiBetActive(true);
        setBet(2);
        handleBet(1);

        multiBetIntervalRef.current = setInterval(() => {
            handleBet(1);
        }, 3000);
    };

    const stopMultiBet = () => {
        if (multiBetIntervalRef.current) {
            clearInterval(multiBetIntervalRef.current);
            multiBetIntervalRef.current = null;
        }
        if (pumpingFxScheduleRef.current) {
            clearTimeout(pumpingFxScheduleRef.current);
            pumpingFxScheduleRef.current = null;
        }
        clearWinBangTimers();
        setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
        setBangFx({ visible: false, anchorRect: null });
        setIsMultiBetActive(false);
        setBet(1);
    };

    useEffect(() => {
        return () => {
            if (multiBetIntervalRef.current) {
                clearInterval(multiBetIntervalRef.current);
            }
        };
    }, []);

    const clearWinBangTimers = () => {
        if (winFxTimeoutRef.current != null) {
            clearTimeout(winFxTimeoutRef.current);
            winFxTimeoutRef.current = null;
        }
        if (bangFxTimeoutRef.current != null) {
            clearTimeout(bangFxTimeoutRef.current);
            bangFxTimeoutRef.current = null;
        }
    };

    useEffect(
        () => () => {
            if (pumpingFxScheduleRef.current != null) {
                clearTimeout(pumpingFxScheduleRef.current);
                pumpingFxScheduleRef.current = null;
            }
            clearWinBangTimers();
        },
        []
    );

    const handleBet = async (multiplier) => {
        const currentTarget = Number(targetRef.current || target);
        const currentAmount = Number(amountRef.current || amount);
        const currentBalance = Number(balanceRef.current || balance);


        if (Number(currentAmount) > currentBalance) {
            toast.error("Insufficient balance");
            return;
        }
        if (currentAmount > maxAmount || currentAmount < MIN_AMOUNT) {
            toast.error(`Bet amount must be between ${MIN_AMOUNT} and ${maxAmount.toFixed(2)}`);
            return;
        }
        if (currentTarget > 1000 || currentTarget < 1.01) {
            toast.error("Target must be between 1.01 and 1000");
            return;
        }
        
        const data = {
            multiplier: Number(multiplier),
            bet: currentAmount,
            target: currentTarget,
        };

        setIsBetting(true);
        let pumping;
        try {
            pumping = await pumpingBet(data, dispatch, history);
        } finally {
            setIsBetting(false);
        }

        if (pumping) {
            // Capture current target value from ref to ensure we get the latest value
            setRoll(true);
            setLedCount(0);
            setDisplayHeight(0);
            setComparisonText("");
            setComparisonColor("#E74C3C");
            setShowComparisonLabel(false);
            if (ledTimeoutRef.current) {
                clearTimeout(ledTimeoutRef.current);
                ledTimeoutRef.current = null;
            }
            if (ledStepRef.current) {
                clearInterval(ledStepRef.current);
                ledStepRef.current = null;
            }
            if (ledFlickerRef.current) {
                clearInterval(ledFlickerRef.current);
                ledFlickerRef.current = null;
            }
            if (heightAnimRef.current) {
                cancelAnimationFrame(heightAnimRef.current);
                heightAnimRef.current = null;
            }
            if (heightHoldRef.current) {
                clearTimeout(heightHoldRef.current);
                heightHoldRef.current = null;
            }
            if (comparisonDelayRef.current) {
                clearTimeout(comparisonDelayRef.current);
                comparisonDelayRef.current = null;
            }
            if (comparisonHoldRef.current) {
                clearTimeout(comparisonHoldRef.current);
                comparisonHoldRef.current = null;
            }
            if (winDelayRef.current) {
                clearTimeout(winDelayRef.current);
                winDelayRef.current = null;
            }
            if (winFlickerRef.current) {
                clearInterval(winFlickerRef.current);
                winFlickerRef.current = null;
            }
            if (pumpingFxScheduleRef.current) {
                clearTimeout(pumpingFxScheduleRef.current);
                pumpingFxScheduleRef.current = null;
            }
            clearWinBangTimers();
            setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            setBangFx({ visible: false, anchorRect: null });
            setWinLit(false);
            setIsHammerAnimating(true);
            setWeightPosition(WEIGHT_BOTTOM); // Reset weight to bottom
            setWeightDirection('down'); // Reset direction
    
            const result = Number(pumping?.betResult) || 0;
            const winAmount = Math.max(0, Number(pumping?.win ?? 0));
            setPumpingResult(result);

            const fxDelayMs = result > 0 ? 950 : 450;
            pumpingFxScheduleRef.current = setTimeout(() => {
                pumpingFxScheduleRef.current = null;
                const el = pumpingFxAnchorRef.current;
                const anchorRect = el?.getBoundingClientRect?.() ?? null;
                clearWinBangTimers();
                if (winAmount > 0) {
                    setWinFx({
                        visible: true,
                        totalEarn: winAmount.toFixed(2),
                        anchorRect,
                    });
                    winFxTimeoutRef.current = setTimeout(() => {
                        winFxTimeoutRef.current = null;
                        setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
                    }, WIN_FIREWORKS_MS);
                } else {
                    setBangFx({ visible: true, anchorRect });
                    bangFxTimeoutRef.current = setTimeout(() => {
                        bangFxTimeoutRef.current = null;
                        setBangFx({ visible: false, anchorRect: null });
                    }, BANG_EFFECT_MS);
                }
            }, fxDelayMs);

            setTimeout(() => {
                if (result && result > 0) {
                    setIsWeightMoving(true);
                    setWeightDirection('up');
                    setWeightPosition(getWeightTopFromValue(result));
                    const nextLedCount = getLedCount(result);
                    animateLedCount(nextLedCount);
                    animateHeightTo(Number(result), 800);
                    if (heightHoldRef.current) {
                        clearTimeout(heightHoldRef.current);
                    }
                    heightHoldRef.current = setTimeout(() => {
                        setDisplayHeight(0);
                        heightHoldRef.current = null;
                    }, 2000);
                    if (comparisonDelayRef.current) {
                        clearTimeout(comparisonDelayRef.current);
                    }
                    comparisonDelayRef.current = setTimeout(() => {
                        const resultText = formatResult(Number(result));
                        const targetText = formatResult(currentTarget);
                        const operator =
                            Number(result) > currentTarget
                                ? ">"
                                : Number(result) < currentTarget
                                    ? "<"
                                    : "=";
                        setComparisonText(`${resultText} ${operator} ${targetText}`);
                        setComparisonColor(
                            Number(result) >= currentTarget ? "#6DC64B" : "#E74C3C"
                        );
                        setShowComparisonLabel(true);
                        if (comparisonHoldRef.current) {
                            clearTimeout(comparisonHoldRef.current);
                        }
                        comparisonHoldRef.current = setTimeout(() => {
                            setShowComparisonLabel(false);
                            setComparisonText("");
                            comparisonHoldRef.current = null;
                        }, 2000);
                        comparisonDelayRef.current = null;
                    }, 600);
                    if (Number(result) > currentTarget) {
                        winDelayRef.current = setTimeout(() => {
                            startWinFlicker();
                            winDelayRef.current = null;
                        }, 800);
                    }
                    if (ledTimeoutRef.current) {
                        clearTimeout(ledTimeoutRef.current);
                    }
                    ledTimeoutRef.current = setTimeout(() => {
                        startLedFlicker(nextLedCount);
                        ledTimeoutRef.current = null;
                    }, 2000);
    
                    setTimeout(() => {
                        setIsWeightMoving(true);
                        setWeightDirection('down');
                        setWeightPosition(WEIGHT_BOTTOM);
                        getUserData(dispatch);
                        setTimeout(() => {
                            setIsHammerAnimating(false);
                            setIsWeightMoving(false);
                            setWeightDirection('down');
                            setRoll(false);
                        }, 800);
                    }, 800);
                } else {
                    window.setTimeout(() => {
                        setIsHammerAnimating(false);
                        setRoll(false);
                    }, 2000);
                }
            }, 200);
        }
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


    const handleTargetChange = (e) => {
        const value = e.target.value;
        // Allow empty
        if (value === '') {
            updateTarget('');
            return;
        }

        // Allow typing numbers with up to 2 decimals
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            updateTarget(value);
        }
    };

    const handleTargetBlur = () => {
        let num = parseFloat(target);

        if (isNaN(num)) {
            updateTarget('1.01');
            return;
        }

        num = Math.max(1.01, Math.min(1000, num));
        updateTarget(num.toFixed(2));
    };

    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    useEffect(() => {
        const typingTarget = (targetEl) => {
            if (!(targetEl instanceof HTMLElement)) return false;
            const tag = targetEl.tagName;
            return (
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                targetEl.isContentEditable
            );
        };

        const onKeyDown = (e) => {
            if (isLoading || isHelpModalOpen || isOpen) return;
            if (typingTarget(e.target)) return;

            const key = e.key.toLowerCase();

            if (key === 'w' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(targetRef.current || 1.01);
                const newValue = Math.min(1000, current * 2);
                updateTarget(newValue.toFixed(2));
            } else if (key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(targetRef.current || 1.01);
                const newValue = Math.max(1.01, current / 2);
                updateTarget(newValue.toFixed(2));
            } else if (key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(amount || MIN_AMOUNT);
                const newValue = Math.max(MIN_AMOUNT, current / 2);
                updateAmount(newValue.toFixed(2));
            } else if (key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (e.repeat) return;
                const current = parseFloat(amount || MIN_AMOUNT);
                const newValue = Math.min(maxAmount, current * 2);
                updateAmount(newValue.toFixed(2));
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                if (e.repeat) return;
                if (e.shiftKey) {
                    if (isMultiBetActive) {
                        stopMultiBet();
                    } else if (!isBetting && !roll) {
                        startMultiBet();
                    }
                } else if (!isBetting && !isMultiBetActive && !roll) {
                    setBet(1);
                    handleBet(1);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        isLoading,
        isHelpModalOpen,
        isOpen,
        bet,
        roll,
        amount,
        balance,
        target,
        maxAmount,
        isBetting,
        isMultiBetActive,
    ]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Result />
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
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
                        <Box position="absolute" top="0px" right="0px" zIndex={2}>
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
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <HeatPumpIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
                                </Text>
                            </Flex>
                        </CardHeader>
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%">
                            <VStack spacing="24px" align="center" w="100%">
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }}>
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Target
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
                                                name="target"
                                                bg="transparent"
                                                border="transparent"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                h="auto"
                                                p="0"
                                                color="white"
                                                type="text"
                                                inputMode="decimal"
                                                min="1.01"
                                                max="1000"
                                                step="0.01"
                                                value={target}
                                                onChange={handleTargetChange}
                                                onBlur={handleTargetBlur}
                                                placeholder="1.01"
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
                                                    onClick={() => {
                                                        const current = parseFloat(target || 1.01);
                                                        const newValue = Math.max(1.01, current / 2);
                                                        updateTarget(newValue.toFixed(2));
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
                                                    borderRight="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(target || 1.01);
                                                        const newValue = Math.max(1.01, Math.min(1000, current * 2));
                                                        updateTarget(newValue.toFixed(2));
                                                    }}
                                                >
                                                    ×2
                                                </Button>
                                                <Box
                                                    borderRadius="12px"
                                                    overflow="hidden"
                                                >
                                                    <VStack spacing="4px" align="center">
                                                        <IconButton
                                                            aria-label="Target up"
                                                            icon={<KeyboardArrowUpIcon style={{ fontSize: 14 }} />}
                                                            size="xs"
                                                            h="18px"
                                                            w="24px"
                                                            minW="24px"
                                                            bg="transparent"
                                                            color="#fff"
                                                            borderRadius="0"
                                                            _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                            onClick={() => {
                                                                const current = parseFloat(target || 1);
                                                                const newValue = Math.max(1.01, current + 0.01);
                                                                updateTarget(newValue.toFixed(2));
                                                            }}
                                                        />
                                                        <IconButton
                                                            aria-label="Target down"
                                                            icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                            size="xs"
                                                            h="18px"
                                                            w="24px"
                                                            minW="24px"
                                                            bg="transparent"
                                                            color="#fff"
                                                            borderRadius="0"
                                                            _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                            isDisabled={parseFloat(target || 1) <= 1}
                                                            onClick={() => {
                                                                const current = parseFloat(target || 1);
                                                                const newValue = Math.max(1.01, current - 0.01);
                                                                updateTarget(newValue.toFixed(2));
                                                            }}
                                                        />
                                                    </VStack>
                                                </Box>
                                            </HStack>

                                        </Flex>
                                    </GradientBorder>
                                </FormControl>
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
                                            bg={"#00D4FF"}
                                            color="#fff"
                                            border={"1px solid rgba(0, 212, 255, 0.3)"}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={isBetting || isMultiBetActive || roll}
                                            onClick={
                                                () => {
                                                    setBet(1)
                                                    handleBet(1)
                                                }
                                            }
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
                                            border={isMultiBetActive ? "2px solid #E74C3C" : bet === 2 ? "2px solid #00D4FF" : "1px solid rgba(0, 212, 255, 0.3)"}
                                            _hover={{
                                                borderColor: isMultiBetActive ? "#C0392B" : "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: isMultiBetActive ? "0 4px 12px rgba(231, 76, 60, 0.4)" : "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={!isMultiBetActive && (isBetting || roll)}
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
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        <CardBody
                            ref={pumpingFxAnchorRef}
                            minH="100%"
                            w={{ base: '100%' }}
                            minW="450px"
                            maxW="450px"
                            mx="auto"
                            overflow="visible"
                            position="relative"
                        >
                            <Box
                                position="absolute"
                                top="19px"
                                left="31px"
                                w="127px"
                                h="289px"
                                backgroundImage={`url(${hammer})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="5"
                                transformOrigin="bottom center"
                                animation={isHammerAnimating ? `${hammerStrike} 2.0s ease-in-out forwards` : 'none'}
                                style={{ transform: isHammerAnimating ? undefined : 'rotate(10deg)' }}
                            />
                            <Box
                                position="absolute"
                                top="0"
                                right="30px"
                                w="130px"
                                h="400px"
                                backgroundImage={`url(${tower})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="3"
                            />
                            <Text
                                position="absolute"
                                top="67px"
                                right="73px"
                                fontSize="15px"
                                fontWeight="bold"
                                color={winLit ? "#FF7A2E" : "whiteAlpha.600"}
                                textShadow={winLit ? "0 0 10px #FF7A2E" : "none"}
                                letterSpacing="1px"
                                zIndex="4"
                            >
                                WIN!
                            </Text>
                            <Box
                                position="absolute"
                                top="104px"
                                right="131px"
                                w="8px"
                                h="75px"
                                display="flex"
                                flexDirection="column"
                                justifyContent="space-between"
                                zIndex="4"
                            >
                                {Array.from({ length: 9 }).map((_, index) => {
                                    const isLit = index >= 9 - ledCount;
                                    return (
                                        <Box
                                            key={`led-${index}`}
                                            h="10px"
                                            w="100%"
                                            borderRadius="2px"
                                            bg={isLit ? ledColors[index] : "whiteAlpha.300"}
                                            boxShadow={isLit ? `0 0 6px ${ledColors[index]}` : "none"}
                                        />
                                    );
                                })}
                            </Box>
                            {heightMarks.map((value) => (
                                <Box
                                    key={`height-mark-${value}`}
                                    position="absolute"
                                    right="170px"
                                    top={`${getWeightTopFromValue(value)}px`}
                                    transform="translateY(-50%)"
                                    zIndex="4"
                                    display="flex"
                                    alignItems="center"
                                    gap="6px"
                                >
                                    <Text fontSize="xs" color={MARK_COLOR}>
                                        {value}
                                    </Text>
                                    <Box w="10px" h="1px" bg={MARK_COLOR} />
                                </Box>
                            ))}
                            <Box
                                position="absolute"
                                right="83px"
                                w="20px"
                                h="20px"
                                backgroundImage={`url(${weight})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                zIndex="4"
                                top={`${weightPosition}px`}
                                transition={isWeightMoving
                                    ? (weightDirection === 'up'
                                        ? "top 0.8s ease-out"
                                        : "top 0.8s ease-in")
                                    : "none"}
                            />
                            {Number.isFinite(Number(displayHeight)) && (
                                <Text
                                    position="absolute"
                                    right="24px"
                                    top={`${weightPosition + 9}px`}
                                    transform="translateY(-50%)"
                                    fontSize="xs"
                                    color="whiteAlpha.800"
                                    zIndex="5"
                                    transition={isWeightMoving
                                        ? (weightDirection === 'up'
                                            ? "top 0.8s ease-out"
                                            : "top 0.8s ease-in")
                                        : "none"}
                                >
                                    {formatResult(displayHeight)}
                                </Text>
                            )}
                            {showComparisonLabel && comparisonText && (
                                <Text
                                    position="absolute"
                                    right="-12px"
                                    top={`${getWeightTopFromValue(pumpingResult) + 9}px`}
                                    transform="translateY(-50%)"
                                    fontSize="xs"
                                    color={comparisonColor}
                                    zIndex="5"
                                >
                                    {comparisonText}
                                </Text>
                            )}
                        </CardBody>
                        <Box justifyItems="center" position="absolute" right="5px" bottom="5px">
                            <Tooltip label="Pumping Balance Graph" >
                                <Button
                                    onClick={() => { onOpen() }}
                                    width="40px"
                                    height="40px"
                                    borderRadius="50%"
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    bg="#00D4FF"
                                    color="white"
                                    position="relative"
                                    className="bet-graph-button"
                                    _hover={{
                                        bg: "white",
                                        color: "#00D4FF",
                                        transform: "scale(1.2)",
                                        boxShadow: "0 0 20px #00f5ff"
                                    }}
                                    style={{
                                        textShadow: "0 0 5px #00D4FF, 0 0 10px #00D4FF, 0 0 15px #00D4FF",
                                        boxShadow: "0 0 10px #00f5ff"
                                    }}
                                >
                                    <AutoGraphIcon style={{ fontSize: "16px" }} />
                                    <div className="neon-border"></div>
                                    <div className="neon-dot neon-dot-1"></div>
                                    <div className="neon-dot neon-dot-2"></div>
                                    <div className="neon-dot neon-dot-3"></div>
                                </Button>
                            </Tooltip>
                        </Box>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
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
                isVisible={bangFx.visible}
                duration={BANG_EFFECT_MS}
                zIndex={9999}
                anchorRect={bangFx.anchorRect ?? undefined}
            />

            <History />
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay
                    bg="rgba(0,0,0,0.72)"
                    sx={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                />
                <ModalContent
                    bg="linear-gradient(180deg, rgba(32,36,40,0.98) 0%, rgba(20,22,26,0.98) 100%)"
                    border="1px solid rgba(0, 212, 255, 0.22)"
                    borderRadius="16px"
                    boxShadow="0 24px 80px rgba(0,0,0,0.65)"
                    overflow="hidden"
                    maxH="80vh"
                >
                    <Box
                        px="6"
                        pt="5"
                        pb="4"
                        bg="linear-gradient(90deg, rgba(0,212,255,0.10) 0%, rgba(0,212,255,0.00) 60%)"
                        borderBottom="1px solid rgba(255,255,255,0.06)"
                    >
                        <ModalHeader p="0" color="white" fontSize="lg" fontWeight="800" letterSpacing="0.2px">
                            How to play Pumping
                        </ModalHeader>
                        <Text mt="2" fontSize="sm" color="rgba(255,255,255,0.75)">
                            Set a target multiplier and stake, strike with the hammer, then compare the result — or run Auto
                            BET on a timer.
                        </Text>
                    </Box>

                    <ModalCloseButton
                        color="rgba(255,255,255,0.85)"
                        _hover={{ color: '#00D4FF' }}
                        mt="2"
                        mr="2"
                        borderRadius="10px"
                    />

                    <ModalBody px="6" pt="5" pb="6" maxH="calc(80vh - 100px)" overflowY="auto" className="pumping-modal-body">
                        <VStack align="stretch" spacing="4">
                            <Box
                                p="4"
                                borderRadius="14px"
                                bg="rgba(255,255,255,0.04)"
                                border="1px solid rgba(255,255,255,0.06)"
                            >
                                <Text fontSize="sm" color="rgba(255,255,255,0.88)" lineHeight="1.55">
                                    You pick a <b>target</b> (the multiplier you are aiming for) and a <b>stake</b>. Each round
                                    heats the ball with the hammer; when it reaches the top, the outcome is revealed and
                                    compared to your target. Payout rules follow the game logic for hit or miss.
                                </Text>
                            </Box>

                            <Box
                                p="4"
                                borderRadius="14px"
                                bg="rgba(255,255,255,0.03)"
                                border="1px solid rgba(255,255,255,0.06)"
                            >
                                <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                    Steps
                                </Text>
                                <VStack align="stretch" spacing="2">
                                    <HStack spacing="3" align="flex-start">
                                        <Box
                                            w="22px"
                                            h="22px"
                                            borderRadius="999px"
                                            bg="rgba(0,212,255,0.14)"
                                            border="1px solid rgba(0,212,255,0.25)"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color="rgba(255,255,255,0.9)"
                                            fontSize="xs"
                                            fontWeight="800"
                                            flex="0 0 auto"
                                            mt="1px"
                                        >
                                            1
                                        </Box>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                            Set <b>target</b> between <b>1.01</b> and <b>1000.00</b> with the arrows or by
                                            typing. This is the multiplier you are betting on.
                                        </Text>
                                    </HStack>
                                    <HStack spacing="3" align="flex-start">
                                        <Box
                                            w="22px"
                                            h="22px"
                                            borderRadius="999px"
                                            bg="rgba(0,212,255,0.14)"
                                            border="1px solid rgba(0,212,255,0.25)"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color="rgba(255,255,255,0.9)"
                                            fontSize="xs"
                                            fontWeight="800"
                                            flex="0 0 auto"
                                            mt="1px"
                                        >
                                            2
                                        </Box>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                            Set your <b>stake</b> (min <b>0.10</b>). Use the slider, <b>Min</b> / <b>Max</b>, or{' '}
                                            <b>/2</b> and <b>×2</b>. Max stake depends on <b>membership</b> (see below).
                                        </Text>
                                    </HStack>
                                    <HStack spacing="3" align="flex-start">
                                        <Box
                                            w="22px"
                                            h="22px"
                                            borderRadius="999px"
                                            bg="rgba(0,212,255,0.14)"
                                            border="1px solid rgba(0,212,255,0.25)"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color="rgba(255,255,255,0.9)"
                                            fontSize="xs"
                                            fontWeight="800"
                                            flex="0 0 auto"
                                            mt="1px"
                                        >
                                            3
                                        </Box>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                            Press <b>BET</b> to strike. The ball rises; at the peak the <b>result</b> is shown
                                            and compared to your target.
                                        </Text>
                                    </HStack>
                                    <HStack spacing="3" align="flex-start">
                                        <Box
                                            w="22px"
                                            h="22px"
                                            borderRadius="999px"
                                            bg="rgba(0,212,255,0.14)"
                                            border="1px solid rgba(0,212,255,0.25)"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color="rgba(255,255,255,0.9)"
                                            fontSize="xs"
                                            fontWeight="800"
                                            flex="0 0 auto"
                                            mt="1px"
                                        >
                                            4
                                        </Box>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                            <b>Auto BET</b> repeats bets on a timer until you press <b>STOP</b>.
                                        </Text>
                                    </HStack>
                                </VStack>
                            </Box>

                            <Box
                                p="4"
                                borderRadius="14px"
                                bg="rgba(255,255,255,0.03)"
                                border="1px solid rgba(255,255,255,0.06)"
                            >
                                <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                    Keyboard
                                </Text>
                                <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.55">
                                    <b>W</b> / <b>S</b> — double / halve target &nbsp;·&nbsp; <b>D</b> / <b>A</b> — double / halve
                                    amount &nbsp;·&nbsp; <b>Space</b> — Bet &nbsp;·&nbsp; <b>Shift + Space</b> — start Auto BET
                                    (or Stop while it runs). Shortcuts are disabled while typing in a field.
                                </Text>
                            </Box>

                            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="4">
                                <Box
                                    p="4"
                                    borderRadius="14px"
                                    bg="rgba(255,255,255,0.03)"
                                    border="1px solid rgba(255,255,255,0.06)"
                                >
                                    <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                        Membership & limits
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.5">
                                        <b>Free</b>: max stake <b>1</b>. <b>Plus</b>: up to <b>1000</b>. <b>Pro</b>: up to your{' '}
                                        <b>balance</b>.
                                    </Text>
                                </Box>
                                <Box
                                    p="4"
                                    borderRadius="14px"
                                    bg="rgba(255,255,255,0.03)"
                                    border="1px solid rgba(255,255,255,0.06)"
                                >
                                    <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                        Auto BET
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.5">
                                        Same stake and target each round until you stop. Use the button or{' '}
                                        <b>Shift + Space</b> to start or stop.
                                    </Text>
                                </Box>
                            </Grid>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                top={"15%"}
                width={{ sm: "90%", '2lg': "1280px", '2xl': "1600px" }}
                isFooter
                content={<PumpingBalanceGraph />}
            />
        </Box>
    );
}