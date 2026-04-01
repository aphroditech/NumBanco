import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
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
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import History from './JokerCrashItem/History';
import Result from './JokerCrashItem/Results';
import RealView from './JokerCrashItem/RealView';
import Loading from 'components/Loading/Loading';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { toast } from 'react-toastify';
import { onlineUser, offlineUser } from 'action/BetActions';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';

const leftCard = '/CardGame/left.svg';
const rightCard = '/CardGame/right.svg';

import { jokerCrashBet, jokerCrashCashOut, jokerCrashOperator } from 'action/JokerCrashActions';

const MIN_AMOUNT = 0.1;
const FLIP_MS = 800;
const ARROW_OVERLAY_HOLD_MS = 2600;
const ARROW_OVERLAY_FADE_MS = 700;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;

/** Same helpers as CardGamePage (arrow row for &lt;, =, &gt;). */
function cardOutcomeArrowParts(arrow) {
    const raw = String(arrow ?? '').trim().toLowerCase();
    if (raw === '<' || raw === 'lt' || raw === 'less') return { main: '<', left: '◀', right: '' };
    if (raw === '>' || raw === 'gt' || raw === 'greater') return { main: '>', left: '', right: '▶' };
    if (raw === '=' || raw === 'eq' || raw === 'equal') return { main: '=', left: '◀', right: '▶' };
    return { main: String(arrow ?? '').trim() || '?', left: '', right: '' };
}

function CardOutcomeArrowRow({ arrow, imulti }) {
    console.log("arrow", arrow, imulti);
    const { main } = cardOutcomeArrowParts(arrow);
    const isWin = Number(imulti) > 0;
    const glow = isWin
        ? '0 0 32px rgba(72, 187, 120, 0.75), 0 0 60px rgba(56, 161, 105, 0.35)'
        : '0 0 32px rgba(245, 101, 101, 0.8), 0 0 60px rgba(229, 62, 62, 0.4)';
    const color = isWin ? 'green.400' : 'red.400';
    return (
        <HStack spacing={{ base: 2, sm: 3 }} align="center" justify="center" lineHeight="1">
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
        </HStack>
    );
}

export default function JokerCrashPage() {
    const history = useHistory();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('0.1');
    const [operator, setOperator] = useState('=');
    const [bet, setBet] = useState(false);
    const [joker, setJoker] = useState(50);
    /** Outcome overlay + fireworks (same semantics as CardGamePage `win`). */
    const [win, setWin] = useState(0);
    const [arrow, setArrow] = useState(null);
    const [arrowOverlayOpacity, setArrowOverlayOpacity] = useState(0);
    const [arrowTick, setArrowTick] = useState(0);
    const [imulti, setImulti] = useState('1.00');
    const [step, setStep] = useState(0);
    const [multi, setMulti] = useState(1);
    const [info, setInfo] = useState([]);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    const pendingOutcomeRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);
    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFx, setBangFx] = useState({ visible: false, anchorRect: null });

    const isFlippingRef = useRef(false);
    const handleBetRef = useRef(async () => {});
    const handleCashOutRef = useRef(async () => {});
    const handleOperatorRef = useRef(async () => {});

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
            // Cash-out: only full-screen win fireworks — no "=" / arrow + "WIN" on the card.
            if (p.showArrowOverlay === false) {
                setArrow(null);
                setWin(0);
            } else {
                setArrow(p.arrow);
                setArrowTick((t) => t + 1);
                setWin(p.win);
            }

            clearWinBangTimers();
            const winAmount = Number(p.win);
            // Full-screen FX: win fireworks **only** on cash-out (`playWinFireworks`). Bang burst on bust.
            // Arrow / operator steps: card overlay only (no WinFireworksEffect).
            if (
                p.playWinFireworks &&
                Number.isFinite(winAmount) &&
                winAmount > 0
            ) {
                setWinFx({
                    visible: true,
                    totalEarn: winAmount.toFixed(2),
                    anchorRect: null,
                });
                winFxTimeoutRef.current = setTimeout(() => {
                    winFxTimeoutRef.current = null;
                    setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
                }, WIN_FIREWORKS_MS);
            } else if (p.playBangFx) {
                setBangFx({ visible: true, anchorRect: null });
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

    // Show joker thumbnails only when there are enough info cards to look meaningful.
    // If there are multiple operator steps, render a small "fan" row above the main card.
    const jokerPanelCards = info.length > 1 ? info : [];
    const showJokerThumbnails = jokerPanelCards.length > 0;

    // Make main card slightly smaller when thumbnails are visible.
    const mainCardW = showJokerThumbnails ? '160px' : '220px';
    const mainCardMinH = showJokerThumbnails ? '250px' : '280px';
    const faceImgW = showJokerThumbnails ? '190px' : '220px';

    // Top thumbnail size.
    const thumbCardW = showJokerThumbnails ? '92px' : '64px';
    const thumbCardH = showJokerThumbnails ? '136px' : '92px';
    const thumbImgW = showJokerThumbnails ? '88px' : '60px';

    const thumbCount = jokerPanelCards.length;
    // Fan spacing derived from a "virtual" width so the top cards span wider.
    // User request: make it about 3x the current width.
    const mainPanelWidthPx = parseFloat(mainCardW);
    const thumbWidthPx = parseFloat(thumbCardW);
    const thumbContainerWidthPx = mainPanelWidthPx * 3;
    const thumbFanStepPx =
        thumbCount <= 1 ? 0 : (thumbContainerWidthPx - thumbWidthPx) / (thumbCount - 1);
    // Offset to keep the whole fan centered.
    const thumbGroupCenterOffsetPx =
        thumbCount > 0 ? ((thumbCount - 1) * Math.max(0, thumbFanStepPx)) / 2 : 0;
    // When anchoring each thumbnail at `left: 50%`, subtract half width so each card is centered.
    const thumbHalfPx = Math.round(parseFloat(thumbCardW) / 2);
    const [innerRotate, setInnerRotate] = useState(0);
    const [flipTransitionEnabled, setFlipTransitionEnabled] = useState(true);
    const [isFlipping, setIsFlipping] = useState(false);
    const flipEndHandledRef = useRef(false);
    /** Expected `innerRotate` when the active transition ends (180 = half turn, 360 = full). */
    const flipTargetDegRef = useRef(180);
    /**
     * Operator (arrow) path: two chained 180° turns on one card — first shows deck back, second reveals face.
     * null = legacy single 180° flip (bet / bang / cash-out).
     */
    const flipPhaseRef = useRef(null);
    const pendingNewFaceRef = useRef(null);

    const [cardFront, setCardFront] = useState(leftCard);
    const [cardBack, setCardBack] = useState(rightCard);

    const innerRotateRef = useRef(0);
    const cardFacesRef = useRef({
        front: leftCard,
        back: rightCard,
    });
    /** Avoid syncing visible card from Redux on every user tick (breaks flip); hydrate once when history is available. */
    const pendingCardHydratedRef = useRef(false);

    useEffect(() => {
        onlineUser(16);
        return () => {
            offlineUser(16);
        };
    }, []);

    useEffect(() => {
        innerRotateRef.current = innerRotate;
    }, [innerRotate]);

    useEffect(() => {
        isFlippingRef.current = isFlipping;
    }, [isFlipping]);

    useEffect(() => {
        cardFacesRef.current = {
            front: cardFront,
            back: cardBack,
        };
    }, [cardFront, cardBack]);

    const handleBet = async () => {
        if (isFlipping) return;
        const res = await jokerCrashBet({ amount, operator }, dispatch, history);

        if (res) {
            console.log("res", res);
            clearWinBangTimers();
            setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            setBangFx({ visible: false, anchorRect: null });
            setArrow(null);
            setWin(0);
            pendingOutcomeRef.current = null;
            setBet(true);
            setIsFlipping(true);
            setFlipTransitionEnabled(true);
            setCardBack('/CardGame/spades/(1).svg')
            setTimeout(() => {
                flipPhaseRef.current = null;
                flipTargetDegRef.current = 180;
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
            }, 1000);
        } else {
            setBet(false);
        }
    };

    const handleOperator = async (operator) => {
        if (isFlipping) return;
        const res = await jokerCrashOperator({ operator: operator }, dispatch, history);
        if (!res) return;

        const nextImulti =
            res.imulti != null && Number.isFinite(Number(res.imulti))
                ? Number(res.imulti).toFixed(2)
                : imulti;
        setImulti(nextImulti);

        if (res.bang === -1) {
            setBet(false);
            clearWinBangTimers();
            setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            setBangFx({ visible: false, anchorRect: null });
            setArrow(null);
            setWin(0);
            pendingOutcomeRef.current = {
                arrow: operator,
                win: 0,
                playWinFireworks: false,
                playBangFx: true,
            };
            flipPhaseRef.current = null;
            flipTargetDegRef.current = 180;
            setCardBack('/CardGame/spades/(' + res.card + ').svg');
            requestAnimationFrame(() => {
                setInnerRotate(180);
            });

            setTimeout(() => {
                setBet(false);
                // Flip back to the "default backside" face.
                // At innerRotate=0 the user sees `cardFront`; at innerRotate=180 they see `cardBack`.
                // After the transition ends we swap faces, so `leftCard` becomes the new `cardFront`.
                setFlipTransitionEnabled(true);
                setIsFlipping(true);
                flipPhaseRef.current = null;
                flipTargetDegRef.current = 180;
                setInfo([]);
                setCardBack(leftCard);
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
                setStep(0);
                setMulti(1);
            }, 2100);
            return;
        }

        if (res) {
            clearWinBangTimers();
            setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            setBangFx({ visible: false, anchorRect: null });
            setArrow(null);
            setWin(0);
            const stake = parseFloat(amount || '0');
            pendingOutcomeRef.current = {
                arrow: operator,
                win: (Number.isFinite(stake) ? stake : 0) * Number(res.multi),
                playWinFireworks: false,
                playBangFx: false,
            };
            setBet(true);
            setIsFlipping(true);
            setFlipTransitionEnabled(true);
            // Two half-rotations: 0→180 shows deck back; 180→360 reveals the new face (single physical card).
            pendingNewFaceRef.current = '/CardGame/spades/(' + res.card + ').svg';

            flipPhaseRef.current = 'to180';
            flipTargetDegRef.current = 180;
            setCardBack(leftCard);
            requestAnimationFrame(() => {
                setInnerRotate(180);
            });

            if (res.multi == 0) setBet(false);
        }
    };

    const handleCashOut = async () => {
        if (isFlipping) return;
        const res = await jokerCrashCashOut(dispatch, history);
        if (res !== undefined) {
            const betNum = parseFloat(amount || '0');
            const cashoutWin = (Number.isFinite(betNum) ? betNum : 0) * Number(multi || 0);

            pendingOutcomeRef.current = {
                arrow: '=',
                win: cashoutWin,
                playWinFireworks: true,
                playBangFx: false,
                showArrowOverlay: false,
            };
            flushPendingOutcomeAfterReveal();

            setTimeout(() => {
                setBet(false);
                setFlipTransitionEnabled(true);
                setIsFlipping(true);
                flipPhaseRef.current = null;
                flipTargetDegRef.current = 180;
                setInfo([]);
                setCardBack(leftCard);
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
                setStep(0);
                setMulti(1);
            }, 1500);
        }
    };

    const handleFlipTransitionEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        const targetDeg = flipTargetDegRef.current;
        if (innerRotateRef.current !== targetDeg) return;
        if (flipEndHandledRef.current) return;
        flipEndHandledRef.current = true;

        const phase = flipPhaseRef.current;

        if (phase === 'to180' && targetDeg === 180) {
            const nextFace = pendingNewFaceRef.current;
            if (nextFace) {
                setCardFront(nextFace);
            }
            setCardBack(leftCard);
            flipPhaseRef.current = 'to360';
            flipTargetDegRef.current = 360;
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

        if (phase === 'to360' && targetDeg === 360) {
            flipPhaseRef.current = null;
            pendingNewFaceRef.current = null;
            flipTargetDegRef.current = 180;
            setFlipTransitionEnabled(false);
            setInnerRotate(0);
            setCardBack(rightCard);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setFlipTransitionEnabled(true);
                    setIsFlipping(false);
                    flipEndHandledRef.current = false;
                    flushPendingOutcomeAfterReveal();
                });
            });
            return;
        }

        // Legacy: one 180° flip, then swap faces and reset to 0° (bet / bang / cash-out).
        const { front, back } = cardFacesRef.current;
        setFlipTransitionEnabled(false);
        setCardFront(back);
        setCardBack(front);
        flipTargetDegRef.current = 180;
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

    handleBetRef.current = handleBet;
    handleCashOutRef.current = handleCashOut;
    handleOperatorRef.current = handleOperator;

    useEffect(() => {
        const typingTarget = (target) => {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName;
            return (
                tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
            );
        };

        const onKeyDown = (e) => {
            if (isLoading || isHelpModalOpen) return;
            if (typingTarget(e.target)) return;
            if (e.repeat) return;

            const key = e.key.toLowerCase();

            if (key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!bet || isFlippingRef.current) return;
                e.preventDefault();
                setOperator('<');
                void handleOperatorRef.current('<');
                return;
            }
            if (key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!bet || isFlippingRef.current) return;
                e.preventDefault();
                setOperator('=');
                void handleOperatorRef.current('=');
                return;
            }
            if (key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!bet || isFlippingRef.current) return;
                e.preventDefault();
                setOperator('>');
                void handleOperatorRef.current('>');
                return;
            }
            if ((e.key === ' ' || e.code === 'Space') && !e.shiftKey) {
                if (isFlippingRef.current) return;
                e.preventDefault();
                if (bet) {
                    void handleCashOutRef.current();
                } else {
                    const amt = parseFloat(amount || '0');
                    if (!amount || amt < MIN_AMOUNT || balance < amt) return;
                    void handleBetRef.current();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isLoading, isHelpModalOpen, bet, amount, balance]);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const pending = user.jokerCrashHistory?.filter((item) => item.active === false)[0];
        if (pending) {
            setAmount(String(pending.bet ?? MIN_AMOUNT));
            setBet(true);
            setTimeout(() => {
                setInfo(pending.info ?? []);
            }, 1500);
            const last = pending.info?.length
                ? pending.info[pending.info.length - 1]
                : null;
            setJoker(last?.joker ?? 50);
            setStep(pending.step);
            setMulti(pending.multi);
        }
    }, [user]);

    useLayoutEffect(() => {
        if (isLoading || pendingCardHydratedRef.current) return;
        if (!Array.isArray(user.jokerCrashHistory)) return;

        pendingCardHydratedRef.current = true;
        const pending = user.jokerCrashHistory.filter((item) => item.active === false)[0];
        if (!pending?.info?.length) return;

        const last = pending.info[pending.info.length - 1];
        const faceSrc = '/CardGame/spades/(' + last?.card + ').svg';
        setCardFront(faceSrc);
        setCardBack(rightCard);
        setInnerRotate(0);
        setIsFlipping(false);
    }, [isLoading, user]);

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
                                <Text
                                    fontSize="lg"
                                    color="#fff"
                                    fontWeight="bold"
                                    mb="6px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <WhatshotIcon style={{ fontSize: '30px', color: '#00D4FF', marginRight: '8px' }} />
                                    Panel
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
                                                bg={'#323738'}
                                                color="#fff"
                                                disabled={!bet}
                                                border={'1px solid rgba(0, 212, 255, 0.3)'}
                                                _hover={{
                                                    bg: 'rgba(0, 212, 255, 0.2)',
                                                    borderColor: '#00D4FF',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                                                }}
                                                _active={{
                                                    transform: 'translateY(0)',
                                                }}
                                                onClick={() => {
                                                    setOperator(op);
                                                    handleOperator(op);
                                                }}
                                            >
                                                {op}
                                            </Button>
                                        ))}
                                    </HStack>
                                </FormControl>

                                <Button
                                    h="46px"
                                    w="100%"
                                    maxW="300px"
                                    fontSize={{ base: 'md', sm: 'md' }}
                                    fontWeight="bold"
                                    borderRadius="20px"
                                    color="#fff"
                                    border="2px solid"
                                    bg={bet ? 'red.500' : '#00D4FF'}
                                    borderColor={bet ? 'red.500' : '#00D4FF'}
                                    _hover={{
                                        bg: bet ? 'red.600' : '#00D4FF',
                                        borderColor: bet ? 'red.600' : '#00D4FF',
                                        transform: 'translateY(-2px)',
                                        boxShadow: bet
                                            ? '0 4px 12px rgba(229, 62, 62, 0.45)'
                                            : '0 4px 12px rgba(0, 212, 255, 0.3)',
                                    }}
                                    _active={{
                                        transform: 'translateY(0)',
                                    }}
                                    onClick={bet ? handleCashOut : handleBet}
                                    isDisabled={
                                        bet
                                            ? false
                                            : isFlipping ||
                                            !amount ||
                                            parseFloat(amount) < MIN_AMOUNT ||
                                            balance < parseFloat(amount || '0')
                                    }
                                >
                                    {bet ? 'CASH OUT' : 'BET'}
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="22px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%" position="relative">
                        <Box
                            w="100%"
                            h={{ base: 'auto', sm: '406px' }}
                            minH={{ base: '360px', sm: '406px' }}
                            borderRadius="14px"
                            overflow="visible"
                            position="relative"
                        >
                            <Flex
                                h="100%"
                                // minH={{ base: '360px', sm: '406px' }}
                                align="center"
                                justify="center"
                                position="relative"
                                zIndex={0}
                                px={{ base: 3, sm: 5 }}
                            >
                                <Flex
                                    direction="column"
                                    alignItems="center"
                                    justifyContent="center"
                                    maxW="260px"
                                    w="100%"
                                >
                                    {showJokerThumbnails && (
                                        <Box
                                            position="relative"
                                            // Give enough width so left:50% centering works.
                                            w={`${parseFloat(mainCardW) * 3}px`}
                                            h={thumbCardH}
                                            mb="10px"
                                            overflow="visible"
                                            transition="all 250ms ease"
                                        >
                                            {jokerPanelCards.map((item, idx) => {
                                                const translateXPx =
                                                    idx * thumbFanStepPx -
                                                    thumbGroupCenterOffsetPx -
                                                    thumbHalfPx;
                                                return (
                                                    <Box
                                                        key={item?._id ?? `${item?.step ?? 0}-${idx}`}
                                                        position="absolute"
                                                        top="0"
                                                        left="50%"
                                                        w={thumbCardW}
                                                        h={thumbCardH}
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        zIndex={idx + 1}
                                                        transition="all 250ms ease"
                                                        sx={{
                                                            transform: `translateX(${translateXPx}px)`,
                                                        }}
                                                    >
                                                        <Box
                                                            position="relative"
                                                            w={thumbImgW}
                                                            h={thumbCardH}
                                                            borderRadius="8px"
                                                            overflow="hidden"
                                                            boxShadow={
                                                                item?.status === 1
                                                                    ? '0 0 0 1px rgba(104, 211, 145, 0.55), 0 6px 14px rgba(0,0,0,0.35), 0 0 14px rgba(104, 211, 145, 0.25)'
                                                                    : '0 0 0 1px rgba(252, 165, 165, 0.55), 0 6px 14px rgba(0,0,0,0.35), 0 0 14px rgba(252, 165, 165, 0.25)'
                                                            }
                                                            transition="all 220ms ease"
                                                        >
                                                            <Box
                                                                as="img"
                                                                src={'/CardGame/spades/(' + item?.card + ').svg'}
                                                                alt=""
                                                                w="100%"
                                                                h="100%"
                                                                display="block"
                                                            />
                                                            <Box
                                                                position="absolute"
                                                                inset="0"
                                                                bg={
                                                                    item?.status === 1
                                                                        ? 'rgba(104, 211, 145, 0.28)'
                                                                        : 'rgba(252, 165, 165, 0.28)'
                                                                }
                                                                pointerEvents="none"
                                                            />
                                                        </Box>
                                                    </Box>
                                                );
                                            })}

                                            {/* Operator indicators between each pair of top fan cards */}
                                            {/* {jokerPanelCards.length > 1 &&
                                                jokerPanelCards.map((current, i) => {
                                                    const prev = jokerPanelCards[i];
                                                    const currentIdx = i;

                                                    const relation = current?.operator;

                                                    const color = current?.status === 1 ? 'green.300' : 'red.300';
                                                    const textShadow =
                                                        current?.status === 1
                                                            ? '0 0 24px rgba(104, 211, 145, 0.7), 0 0 48px rgba(56, 161, 105, 0.3)'
                                                            : '0 0 24px rgba(252, 165, 165, 0.75), 0 0 48px rgba(229, 62, 62, 0.35)';

                                                    // Midpoint between card (currentIdx-1) and card currentIdx.
                                                    const midXpx =
                                                        (currentIdx - 0.5) * thumbFanStepPx - thumbGroupCenterOffsetPx;

                                                    return (
                                                        <Text
                                                            key={`${current?._id ?? current?.step ?? currentIdx}-${relation}`}
                                                            fontSize="60px"
                                                            fontWeight="600"
                                                            zIndex={20}
                                                            position="absolute"
                                                            top="15px"
                                                            left="50%"
                                                            pointerEvents="none"
                                                            color={color}
                                                            sx={{
                                                                textShadow,
                                                                transform: `translateX(${midXpx - 38}px) translateX(-50%)`,
                                                            }}
                                                        >
                                                            {relation}
                                                        </Text>
                                                    );
                                            })} */}
                                        </Box>
                                    )}

                                    <Box
                                        w={mainCardW}
                                        minH={mainCardMinH}
                                        sx={{ perspective: '1000px' }}
                                        position="relative"
                                        transition="all 250ms ease"
                                    >
                                        {arrow != null && (
                                            <Box
                                                position="absolute"
                                                top="50%"
                                                left="50%"
                                                zIndex={60}
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
                                                        <CardOutcomeArrowRow arrow={arrow} imulti={imulti} />
                                                        <Text
                                                            as="span"
                                                            fontSize={{ base: '4xl', sm: '5xl', md: '6xl' }}
                                                            fontWeight="800"
                                                            letterSpacing="0.08em"
                                                            lineHeight="1.1"
                                                            fontFamily="heading"
                                                            textTransform="uppercase"
                                                            color={Number(imulti) > 0 ? 'green.300' : 'red.300'}
                                                            sx={{
                                                                textShadow:
                                                                    Number(imulti) > 0
                                                                        ? '0 0 24px rgba(104, 211, 145, 0.7), 0 0 48px rgba(56, 161, 105, 0.3)'
                                                                        : '0 0 24px rgba(252, 165, 165, 0.75), 0 0 48px rgba(229, 62, 62, 0.35)',
                                                            }}
                                                        >
                                                            {Number(imulti) > 0 ? 'Win' : 'Bang'}
                                                        </Text>
                                                    </VStack>
                                                </Box>
                                            </Box>
                                        )}
                                        <Box
                                            position="relative"
                                            w="100%"
                                            minH={mainCardMinH}
                                            sx={{
                                                transformStyle: 'preserve-3d',
                                                transition: flipTransitionEnabled
                                                    ? `transform ${FLIP_MS}ms ease`
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
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={cardFront}
                                                    alt=""
                                                    width={faceImgW}
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
                                                    transform: 'rotateY(180deg)',
                                                    backfaceVisibility: 'hidden',
                                                    WebkitBackfaceVisibility: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    as="img"
                                                    src={cardBack}
                                                    alt=""
                                                    width={faceImgW}
                                                    display="block"
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Flex>
                            </Flex>
                        </Box>
                        <Box
                            position="absolute"
                            left="10px"
                            bottom="10px"
                            zIndex={4}
                            maxW="calc(100% - 20px)"
                        >
                            <Box
                                px="12px"
                                py="10px"
                                borderRadius="12px"
                                bg="linear-gradient(165deg, rgba(18,22,28,0.92) 0%, rgba(10,12,16,0.96) 100%)"
                                border="1px solid rgba(255,255,255,0.12)"
                                boxShadow="0 10px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                                backdropFilter="blur(10px)"
                            >
                                <Text
                                    fontSize="9px"
                                    fontWeight="700"
                                    letterSpacing="0.12em"
                                    color="rgba(255,255,255,0.45)"
                                    textTransform="uppercase"
                                    mb="4px"
                                >
                                    Joker Crash
                                </Text>
                                <HStack spacing="10px" align="baseline" flexWrap="wrap">
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                        Step : {' '}
                                        <Text as="span" color="#fff" fontWeight="800">
                                            {step}
                                        </Text>
                                    </Text>
                                </HStack>
                                <HStack spacing="10px" align="baseline" flexWrap="wrap">
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                        Multipler : {' '}
                                        <Text as="span" color="#fff" fontWeight="800">
                                            {multi.toFixed(2)}
                                        </Text>
                                    </Text>
                                </HStack>
                                <HStack spacing="10px" align="baseline" flexWrap="wrap">
                                    <Text fontSize="xs" color="rgba(255,255,255,0.55)" fontWeight="600">
                                        Win : {' '}
                                        <Text as="span" color="#fff" fontWeight="800">
                                            {(amount * multi).toFixed(2)} $
                                        </Text>
                                    </Text>
                                </HStack>
                            </Box>
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
                >
                    <Box
                        px="6"
                        pt="5"
                        pb="4"
                        bg="linear-gradient(90deg, rgba(0,212,255,0.10) 0%, rgba(0,212,255,0.00) 60%)"
                        borderBottom="1px solid rgba(255,255,255,0.06)"
                    >
                        <ModalHeader p="0" color="white" fontSize="lg" fontWeight="800" letterSpacing="0.2px">
                            How to play
                        </ModalHeader>
                        <Text mt="2" fontSize="sm" color="rgba(255,255,255,0.75)">
                            Take steps, build multiplier, and cash out before the crash.
                        </Text>
                    </Box>

                    <ModalCloseButton
                        color="rgba(255,255,255,0.85)"
                        _hover={{ color: '#00D4FF' }}
                        mt="2"
                        mr="2"
                        borderRadius="10px"
                    />

                    <ModalBody px="6" pt="5" pb="6">
                        <VStack align="stretch" spacing="4">
                            <Box
                                p="4"
                                borderRadius="14px"
                                bg="rgba(255,255,255,0.04)"
                                border="1px solid rgba(255,255,255,0.06)"
                            >
                                <Text fontSize="sm" color="rgba(255,255,255,0.88)" lineHeight="1.55">
                                    Joker Crash is a fast prediction + cash-out game. After you bet, you can press the operator
                                    buttons (<b>&lt;</b>, <b>=</b>, <b>&gt;</b>) to take steps and increase your potential
                                    payout. Cash out anytime to lock in your win.
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
                                            Enter your bet amount (you can use <b>/2</b>, <b>×2</b>, <b>Min</b>/<b>Max</b>).
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
                                            Press <b>BET</b> to start the round.
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
                                            Use the operator buttons (<b>&lt;</b>, <b>=</b>, <b>&gt;</b>) to take steps and
                                            build your multiplier.
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
                                            Press <b>CASH OUT</b> anytime to lock your winnings.
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
                                    <b>Space</b> — <b>BET</b> before a round, or <b>CASH OUT</b> while playing &nbsp;·&nbsp;{' '}
                                    <b>A</b> — <b>&lt;</b> &nbsp;·&nbsp; <b>S</b> — <b>=</b> &nbsp;·&nbsp; <b>D</b> —{' '}
                                    <b>&gt;</b> (operators only after you have bet). Shortcuts are off while typing in a field.
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
                                        Win / Lose
                                    </Text>
                                    <VStack align="stretch" spacing="2">
                                        <Box
                                            p="2.5"
                                            borderRadius="12px"
                                            bg="rgba(72,187,120,0.10)"
                                            border="1px solid rgba(72,187,120,0.22)"
                                        >
                                            <Text fontSize="sm" color="rgba(255,255,255,0.86)">
                                                Cash out before the crash to <b>WIN</b>.
                                            </Text>
                                        </Box>
                                        <Box
                                            p="2.5"
                                            borderRadius="12px"
                                            bg="rgba(245,101,101,0.10)"
                                            border="1px solid rgba(245,101,101,0.22)"
                                        >
                                            <Text fontSize="sm" color="rgba(255,255,255,0.86)">
                                                If the round busts before you cash out, it’s a <b>BANG</b>.
                                            </Text>
                                        </Box>
                                    </VStack>
                                </Box>

                                <Box
                                    p="4"
                                    borderRadius="14px"
                                    bg="rgba(255,255,255,0.03)"
                                    border="1px solid rgba(255,255,255,0.06)"
                                >
                                    <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                        Payout
                                    </Text>
                                    <VStack align="stretch" spacing="2">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)">
                                            Your cash out uses the current multiplier shown in the round.
                                        </Text>
                                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">
                                            Win amount = Bet × Multiplier (only when you cash out).
                                        </Text>
                                    </VStack>
                                </Box>
                            </Grid>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
