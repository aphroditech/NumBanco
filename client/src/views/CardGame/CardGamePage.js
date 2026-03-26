import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { useSelector, useDispatch } from 'react-redux';
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
    Input,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import ClickButton from 'components/Input/ClickButton';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import History from './CardGameItem/History';
import Result from './CardGameItem/Results';
import RealView from './CardGameItem/RealView';
import Loading from 'components/Loading/Loading';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StyleIcon from '@mui/icons-material/Style';
import { toast } from 'react-toastify';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';

const leftCard = '/CardGame/left.svg';
const rightCard = '/CardGame/right.svg';
import { cardGameBet } from 'action/CardGameActions';

const MIN_AMOUNT = 0.1;
const FLIP_MS = 800;

const AUTO_BET_SPIN_MS = 1400;
const ARROW_OVERLAY_HOLD_MS = 2600;
const ARROW_OVERLAY_FADE_MS = 700;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;

/** Normalize API arrow to a display token and optional wing glyphs (◀ ▶). */
function cardOutcomeArrowParts(arrow) {
    const raw = String(arrow ?? '').trim().toLowerCase();
    if (raw === '<' || raw === 'lt' || raw === 'less') return { main: '<', left: '◀', right: '' };
    if (raw === '>' || raw === 'gt' || raw === 'greater') return { main: '>', left: '', right: '▶' };
    if (raw === '=' || raw === 'eq' || raw === 'equal') return { main: '=', left: '◀', right: '▶' };
    return { main: String(arrow ?? '').trim() || '?', left: '', right: '' };
}

function CardOutcomeArrowRow({ arrow, win }) {
    const { main, left, right } = cardOutcomeArrowParts(arrow);
    const isWin = Number(win) > 0;
    const glow = isWin
        ? '0 0 32px rgba(72, 187, 120, 0.75), 0 0 60px rgba(56, 161, 105, 0.35)'
        : '0 0 32px rgba(245, 101, 101, 0.8), 0 0 60px rgba(229, 62, 62, 0.4)';
    const color = isWin ? 'green.400' : 'red.400';
    return (
        <HStack spacing={{ base: 2, sm: 3 }} align="center" justify="center" lineHeight="1">
            {/* {left ? (
                <Text
                    as="span"
                    fontSize={{ base: '5xl', sm: '6xl', md: '7xl' }}
                    fontWeight="800"
                    fontFamily="heading"
                    color={color}
                    opacity={0.9}
                    aria-hidden
                    sx={{ textShadow: glow }}
                >
                    {left}
                </Text>
            ) : null} */}
            <Text
                as="span"
                fontSize={{ base: '7xl', sm: '8xl', md: '9xl' }}
                fontWeight="800"
                lineHeight="1"
                fontFamily="heading"
                color={color}
                sx={{ textShadow: glow }}
            >
                {main}
            </Text>
            {/* {right ? (
                <Text
                    as="span"
                    fontSize={{ base: '5xl', sm: '6xl', md: '7xl' }}
                    fontWeight="800"
                    fontFamily="heading"
                    color={color}
                    opacity={0.9}
                    aria-hidden
                    sx={{ textShadow: glow }}
                >
                    {right}
                </Text>
            ) : null} */}
        </HStack>
    );
}

export default function CardGamePage() {
    const history = useHistory();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const [isLoading, setIsLoading] = useState(true);
    const [bet, setBet] = useState(false);
    const [amount, setAmount] = useState('0.1');
    const [operator, setOperator] = useState('=');
    const [arrow, setArrow] = useState(null);
    const [win, setWin] = useState(0);
    const [arrowOverlayOpacity, setArrowOverlayOpacity] = useState(0);
    const [arrowTick, setArrowTick] = useState(0);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const [innerRotate, setInnerRotate] = useState(0);
    const [flipTransitionEnabled, setFlipTransitionEnabled] = useState(true);
    const [flipDurationMs, setFlipDurationMs] = useState(FLIP_MS);
    const [isFlipping, setIsFlipping] = useState(false);
    const [isAutoBetActive, setIsAutoBetActive] = useState(false);
    const flipEndHandledRef = useRef(false);
    /** 180 = manual or auto first half; 360 = auto second half. */
    const flipTargetDegRef = useRef(180);
    /** Auto spin: `to180` then `to360` so we never swap front textures while the user still sees the front face. */
    const autoSpinPhaseRef = useRef(null);
    const pendingAutoFacesRef = useRef(null);

    const isAutoBetActiveRef = useRef(isAutoBetActive);
    const isFlippingRef = useRef(isFlipping);
    const betRef = useRef(bet);
    const amountRef = useRef(amount);
    const operatorRef = useRef(operator);
    const autoBetLoopRunningRef = useRef(false);
    const autoBetLoopTimeoutRef = useRef(null);
    /** Filled when a bet succeeds; shown only after the card flip fully reveals. */
    const pendingOutcomeRef = useRef(null);
    const cardFxAnchorRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);

    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFx, setBangFx] = useState({ visible: false, anchorRect: null });

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const flushPendingOutcomeAfterReveal = useCallback(() => {
        const p = pendingOutcomeRef.current;
        pendingOutcomeRef.current = null;
        if (!p) return;

        const run = () => {
            setArrow(p.arrow);
            setArrowTick((t) => t + 1);
            setWin(p.win);

            const el = cardFxAnchorRef.current;
            const anchorRect = el?.getBoundingClientRect?.() ?? null;
            clearWinBangTimers();
            const winAmount = Number(p.win);
            if (Number.isFinite(winAmount) && winAmount > 0) {
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
        };

        requestAnimationFrame(() => {
            requestAnimationFrame(run);
        });
    }, [clearWinBangTimers]);

    useEffect(() => () => clearWinBangTimers(), [clearWinBangTimers]);

    const [leftColFront, setLeftColFront] = useState(leftCard);
    const [leftColBack, setLeftColBack] = useState(rightCard);
    const [rightColFront, setRightColFront] = useState(rightCard);
    const [rightColBack, setRightColBack] = useState(leftCard);

    const innerRotateRef = useRef(0);
    const cardFacesRef = useRef({
        leftF: leftCard,
        leftB: rightCard,
        rightF: rightCard,
        rightB: leftCard,
    });

    useEffect(() => {
        innerRotateRef.current = innerRotate;
    }, [innerRotate]);

    useEffect(() => {
        isAutoBetActiveRef.current = isAutoBetActive;
    }, [isAutoBetActive]);

    useEffect(() => {
        isFlippingRef.current = isFlipping;
    }, [isFlipping]);

    useEffect(() => {
        betRef.current = bet;
    }, [bet]);

    useEffect(() => {
        amountRef.current = amount;
    }, [amount]);

    useEffect(() => {
        operatorRef.current = operator;
    }, [operator]);

    useEffect(() => {
        return () => {
            if (autoBetLoopTimeoutRef.current) clearTimeout(autoBetLoopTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        cardFacesRef.current = {
            leftF: leftColFront,
            leftB: leftColBack,
            rightF: rightColFront,
            rightB: rightColBack,
        };
    }, [leftColFront, leftColBack, rightColFront, rightColBack]);

    useEffect(() => {
        if (arrow == null) {
            setArrowOverlayOpacity(0);
            return undefined;
        }
        setArrowOverlayOpacity(0);
        const fadeIn = requestAnimationFrame(() => {
            requestAnimationFrame(() => setArrowOverlayOpacity(1));
        });
        const fadeOut = setTimeout(() => {
            setArrowOverlayOpacity(0);
        }, ARROW_OVERLAY_HOLD_MS);
        const clear = setTimeout(() => {
            setArrow(null);
            setWin(0);
        }, ARROW_OVERLAY_HOLD_MS + ARROW_OVERLAY_FADE_MS);
        return () => {
            cancelAnimationFrame(fadeIn);
            clearTimeout(fadeOut);
            clearTimeout(clear);
        };
    }, [arrow, arrowTick]);

    const startAutoBet = () => {
        setIsAutoBetActive(true);
    };

    const stopAutoBet = () => {
        setIsAutoBetActive(false);
    };

    const handleBet = async (data) => {
        if (isFlipping) return;
        const useAutoFullSpin = isAutoBetActiveRef.current;
        setBet(true);
        const res = await cardGameBet(
            { amount: amountRef.current, operator: operatorRef.current },
            dispatch,
            history
        );

        if (res) {
            clearWinBangTimers();
            setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            setBangFx({ visible: false, anchorRect: null });
            setArrow(null);
            setWin(0);
            pendingOutcomeRef.current = {
                arrow: res.arrow,
                win: res.win,
            };

            const leftFace = '/CardGame/spades/(' + res.left + ').svg';
            const rightFace = '/CardGame/spades/(' + res.right + ').svg';

            setIsFlipping(true);
            setFlipTransitionEnabled(true);
            setLeftColBack(leftFace);
            setRightColBack(rightFace);

            if (useAutoFullSpin) {
                const halfMs = Math.max(350, Math.round(AUTO_BET_SPIN_MS / 2));
                pendingAutoFacesRef.current = { leftSrc: leftFace, rightSrc: rightFace };
                autoSpinPhaseRef.current = 'to180';
                flipTargetDegRef.current = 180;
                setFlipDurationMs(halfMs);
                // Keep current fronts through 0→180; only backs are default — new faces apply at 180° (backs visible).
                setLeftColBack(leftCard);
                setRightColBack(rightCard);
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
                setBet(false);
            } else {
                flipTargetDegRef.current = 180;
                setFlipDurationMs(FLIP_MS);
                // Manual: hidden backs become result faces; classic 180° flip + second pass after delay.


                setTimeout(() => {
                    requestAnimationFrame(() => {
                        setInnerRotate(180);
                        setTimeout(() => {
                            setLeftColBack(leftCard);
                            setRightColBack(rightCard);
                            requestAnimationFrame(() => {
                                setInnerRotate(180);
                            });
                            setBet(false);
                        }, 1000);
                    });
                }, 1000);
            }
            return res;
        } else {
            pendingOutcomeRef.current = null;
            toast.error("Bet failed");
            setBet(false);
            return null;
        }
    };

    // Auto-bet loop (frontend-only)
    useEffect(() => {
        if (!isAutoBetActive) return;
        if (autoBetLoopRunningRef.current) return;

        autoBetLoopRunningRef.current = true;

        (async () => {
            try {
                while (isAutoBetActiveRef.current) {
                    // Wait until the current flip is done before placing another bet.
                    while (isAutoBetActiveRef.current && (isFlippingRef.current || betRef.current)) {
                        await sleep(120);
                    }
                    if (!isAutoBetActiveRef.current) break;

                    const res = await handleBet( { auto: true } );
                    // If server call fails, stop the auto loop to avoid spam.
                    if (!res) {
                        setIsAutoBetActive(false);
                        break;
                    }

                    // Wait until flip completes (isFlipping toggles off in handleFlipTransitionEnd).
                    while (isAutoBetActiveRef.current && isFlippingRef.current) {
                        await sleep(120);
                    }
                    // Small delay to avoid immediate retrigger.
                    await sleep(80);
                }
            } finally {
                autoBetLoopRunningRef.current = false;
            }
        })();
    }, [isAutoBetActive]);

    const handleFlipTransitionEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        const targetDeg = flipTargetDegRef.current;
        if (innerRotateRef.current !== targetDeg) return;
        if (flipEndHandledRef.current) return;
        flipEndHandledRef.current = true;

        // Auto-bet: end of 0→180 — user sees default backs; swap in result faces invisibly, then 180→360.
        if (autoSpinPhaseRef.current === 'to180' && targetDeg === 180) {
            const pending = pendingAutoFacesRef.current;
            if (pending) {
                setLeftColFront(pending.leftSrc);
                setRightColFront(pending.rightSrc);
            }
            setLeftColBack(leftCard);
            setRightColBack(rightCard);
            autoSpinPhaseRef.current = 'to360';
            flipTargetDegRef.current = 360;
            const halfMs = Math.max(350, Math.round(AUTO_BET_SPIN_MS / 2));
            setFlipDurationMs(halfMs);
            setFlipTransitionEnabled(false);
            requestAnimationFrame(() => {
                setFlipTransitionEnabled(true);
                flipEndHandledRef.current = false;
                requestAnimationFrame(() => {
                    setInnerRotate(360);
                });
            });
            return;
        }

        if (targetDeg === 360) {
            autoSpinPhaseRef.current = null;
            pendingAutoFacesRef.current = null;
            setFlipTransitionEnabled(false);
            setInnerRotate(0);
            flipTargetDegRef.current = 180;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setFlipDurationMs(FLIP_MS);
                    setFlipTransitionEnabled(true);
                    setIsFlipping(false);
                    flipEndHandledRef.current = false;
                    flushPendingOutcomeAfterReveal();
                });
            });
            return;
        }

        const { leftF, leftB, rightF, rightB } = cardFacesRef.current;

        setFlipTransitionEnabled(false);
        // Commit: what faced the user at 180° (backs) becomes the new front; old fronts go to the back for the next flip.
        setLeftColFront(leftB);
        setRightColFront(rightB);
        setLeftColBack(leftF);
        setRightColBack(rightF);

        requestAnimationFrame(() => {
            setInnerRotate(0);
            requestAnimationFrame(() => {
                setFlipTransitionEnabled(true);
                setIsFlipping(false);
                flipEndHandledRef.current = false;
                flushPendingOutcomeAfterReveal();
            });
        });
    };

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
                    '1550px': '"panel game empty"',
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
            >
                <GridItem area="panel" minW={'350px'}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <StyleIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Panel
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
                            <VStack spacing="24px" align="center" w="100%">
                                <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }}>
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

                                <FormControl w="100%" maxW="300px">
                                    <HStack spacing="12px" justify="center">
                                        {['<', '=', '>'].map((op) => (
                                            <Button
                                                key={op}
                                                w="60px"
                                                h="46px"
                                                fontSize="xl"
                                                fontWeight="bold"
                                                borderRadius="20px"
                                                bg={operator === op ? '#00D4FF' : '#323738'}
                                                color="#fff"
                                                border={
                                                    operator === op
                                                        ? '2px solid #00D4FF'
                                                        : '1px solid rgba(0, 212, 255, 0.3)'
                                                }
                                                _hover={{
                                                    bg: operator === op ? '#00D4FF' : 'rgba(0, 212, 255, 0.2)',
                                                    borderColor: '#00D4FF',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                                                }}
                                                _active={{
                                                    transform: 'translateY(0)',
                                                }}
                                                onClick={() => setOperator(op)}
                                            >
                                                {op}
                                            </Button>
                                        ))}
                                    </HStack>
                                </FormControl>

                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }} mt="5">
                                    <Grid templateColumns="1fr" gap="8px">
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
                                            disabled={
                                                bet ||
                                                isAutoBetActive ||
                                                isFlipping ||
                                                !amount ||
                                                parseFloat(amount) < MIN_AMOUNT ||
                                                balance < parseFloat(amount || '0')
                                            }
                                            onClick={() => handleBet({ auto: false })}
                                            label="BET"
                                        />
                                        {/* <ClickButton
                                            w="100%"
                                            h="46px"
                                            fontSize={{ base: 'md', sm: 'md' }}
                                            fontWeight="bold"
                                            borderRadius="20px"
                                            bg={isAutoBetActive ? "#E74C3C" : "#00D4FF"}
                                            color="#fff"
                                            border={isAutoBetActive ? "2px solid #E74C3C" : "2px solid #00D4FF"}
                                            _hover={{
                                                borderColor: isAutoBetActive ? "#C0392B" : "#00D4FF",
                                                transform: "translateY(-2px)",
                                                boxShadow: isAutoBetActive ? "0 4px 12px rgba(231, 76, 60, 0.4)" : "0 4px 12px rgba(0, 212, 255, 0.3)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            disabled={false}
                                            onClick={
                                                () => {
                                                    if (isAutoBetActive) {
                                                        stopAutoBet();
                                                    } else {
                                                        startAutoBet();
                                                    }
                                                }
                                            }
                                            label={isAutoBetActive ? "STOP" : "Auto BET"}
                                        /> */}
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="22px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%" position="relative">
                        <Box
                            ref={cardFxAnchorRef}
                            w="100%"
                            h={{ base: 'auto', sm: '406px' }}
                            minH={{ base: '360px', sm: '406px' }}
                            borderRadius="14px"
                            overflow="visible"
                            position="relative"
                        >
                            {arrow != null && (
                                <Box
                                    position="absolute"
                                    left="50%"
                                    top="50%"
                                    zIndex={5}
                                    pointerEvents="none"
                                    sx={{ transform: 'translate(-50%, -50%)' }}
                                >
                                    <Box
                                        opacity={arrowOverlayOpacity}
                                        transition={`opacity ${ARROW_OVERLAY_FADE_MS}ms ease`}
                                        sx={{
                                            animation:
                                                arrowOverlayOpacity > 0.5
                                                    ? 'cardArrowPulse 1s ease-in-out infinite'
                                                    : 'none',
                                            '@keyframes cardArrowPulse': {
                                                '0%, 100%': { transform: 'scale(1)' },
                                                '50%': { transform: 'scale(1.06)' },
                                            },
                                        }}
                                    >
                                        <VStack spacing={{ base: 1, sm: 2 }} align="center" lineHeight="1">
                                            <CardOutcomeArrowRow arrow={arrow} win={win} />
                                            <Text
                                                as="span"
                                                fontSize={{ base: '4xl', sm: '5xl', md: '6xl' }}
                                                fontWeight="800"
                                                letterSpacing="0.08em"
                                                lineHeight="1.1"
                                                fontFamily="heading"
                                                textTransform="uppercase"
                                                color={Number(win) > 0 ? 'green.300' : 'red.300'}
                                                sx={{
                                                    textShadow:
                                                        Number(win) > 0
                                                            ? '0 0 24px rgba(104, 211, 145, 0.7), 0 0 48px rgba(56, 161, 105, 0.3)'
                                                            : '0 0 24px rgba(252, 165, 165, 0.75), 0 0 48px rgba(229, 62, 62, 0.35)',
                                                }}
                                            >
                                                {Number(win) > 0 ? 'Win' : 'Bang'}
                                            </Text>
                                        </VStack>
                                    </Box>
                                </Box>
                            )}
                            <Flex
                                h="100%"
                                align="stretch"
                                position="relative"
                                zIndex={0}
                            >
                                <Flex
                                    flex="1"
                                    direction="column"
                                    px={{ base: 3, sm: 5 }}
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text
                                        textAlign="center"
                                        fontSize="xl"
                                        fontWeight="bold"
                                        color="rgba(255,255,255,0.75)"
                                        letterSpacing="0.06em"
                                    >
                                        A ~ K
                                    </Text>
                                    <Box
                                        alignSelf="center"
                                        w="100%"
                                        h="100%"
                                        sx={{ perspective: '1000px' }}
                                        position="relative"
                                    >
                                        <Box
                                            position="relative"
                                            w="100%"
                                            h="100%"
                                            sx={{
                                                transformStyle: 'preserve-3d',
                                                transition: flipTransitionEnabled
                                                    ? `transform ${flipDurationMs}ms ease`
                                                    : 'none',
                                                transform: `rotateY(${innerRotate}deg)`,
                                            }}
                                            onTransitionEnd={handleFlipTransitionEnd}
                                        >
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                sx={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    transform: 'translateZ(1px)',
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={leftColFront}
                                                    alt=""
                                                    width="220px"
                                                    display="block"
                                                />
                                            </Box>
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                sx={{
                                                    transform: 'rotateY(180deg) translateZ(1px)',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={leftColBack}
                                                    alt=""
                                                    width="220px"
                                                    display="block"
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Flex>
                                <Flex 
                                    flex="1" 
                                    direction="column" 
                                    px={{ base: 3, sm: 5 }} 
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Text
                                        textAlign="center"
                                        fontSize="xl"
                                        fontWeight="bold"
                                        color="rgba(255,255,255,0.75)"
                                        letterSpacing="0.06em"
                                    >
                                        A ~ 5
                                    </Text>
                                    <Box
                                        alignSelf="center"
                                        w="220px"
                                        h="100%"
                                        sx={{ perspective: '1000px' }}
                                        position="relative"
                                    >
                                        <Box
                                            position="relative"
                                            w="100%"
                                            h="100%"
                                            sx={{
                                                transformStyle: 'preserve-3d',
                                                transition: flipTransitionEnabled
                                                    ? `transform ${flipDurationMs}ms ease`
                                                    : 'none',
                                                transform: `rotateY(${innerRotate}deg)`,
                                            }}
                                            onTransitionEnd={handleFlipTransitionEnd}
                                        >
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                sx={{
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                    transform: 'translateZ(1px)',
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={rightColFront}
                                                    alt=""
                                                    width="220px"
                                                    display="block"
                                                />
                                            </Box>
                                            <Box
                                                position="absolute"
                                                inset={0}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                sx={{
                                                    transform: 'rotateY(180deg) translateZ(1px)',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={rightColBack}
                                                    alt=""
                                                    width="220px"
                                                    display="block"
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Flex>
                            </Flex>
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

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="md" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="white">Card game</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody pb="6">
                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                            Pick &lt;, =, or &gt;, choose Amount (with /2, ×2, or Min/Max in the dropdown), then tap
                            BET when you are ready.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
