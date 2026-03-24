import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
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

import leftCard from 'assets/img/CardGame/left.svg';
import rightCard from 'assets/img/CardGame/right.svg';
import spades1 from 'assets/img/CardGame/spades/(1).svg';
import spades2 from 'assets/img/CardGame/spades/(2).svg';
import spades3 from 'assets/img/CardGame/spades/(3).svg';
import spades4 from 'assets/img/CardGame/spades/(4).svg';
import spades5 from 'assets/img/CardGame/spades/(5).svg';
import spades6 from 'assets/img/CardGame/spades/(6).svg';
import spades7 from 'assets/img/CardGame/spades/(7).svg';
import spades8 from 'assets/img/CardGame/spades/(8).svg';
import spades9 from 'assets/img/CardGame/spades/(9).svg';
import spades10 from 'assets/img/CardGame/spades/(10).svg';
import spades11 from 'assets/img/CardGame/spades/(11).svg';
import spades12 from 'assets/img/CardGame/spades/(12).svg';
import spades13 from 'assets/img/CardGame/spades/(13).svg';
import hearts1 from 'assets/img/CardGame/hearts/(1).svg';
import hearts2 from 'assets/img/CardGame/hearts/(2).svg';
import hearts3 from 'assets/img/CardGame/hearts/(3).svg';
import hearts4 from 'assets/img/CardGame/hearts/(4).svg';
import hearts5 from 'assets/img/CardGame/hearts/(5).svg';
import hearts6 from 'assets/img/CardGame/hearts/(6).svg';
import hearts7 from 'assets/img/CardGame/hearts/(7).svg';
import hearts8 from 'assets/img/CardGame/hearts/(8).svg';
import hearts9 from 'assets/img/CardGame/hearts/(9).svg';
import hearts10 from 'assets/img/CardGame/hearts/(10).svg';
import hearts11 from 'assets/img/CardGame/hearts/(11).svg';
import hearts12 from 'assets/img/CardGame/hearts/(12).svg';
import hearts13 from 'assets/img/CardGame/hearts/(13).svg';
import clubs1 from 'assets/img/CardGame/clubs/(1).svg';
import clubs2 from 'assets/img/CardGame/clubs/(2).svg';
import clubs3 from 'assets/img/CardGame/clubs/(3).svg';
import clubs4 from 'assets/img/CardGame/clubs/(4).svg';
import clubs5 from 'assets/img/CardGame/clubs/(5).svg';
import clubs6 from 'assets/img/CardGame/clubs/(6).svg';
import clubs7 from 'assets/img/CardGame/clubs/(7).svg';
import clubs8 from 'assets/img/CardGame/clubs/(8).svg';
import clubs9 from 'assets/img/CardGame/clubs/(9).svg';
import clubs10 from 'assets/img/CardGame/clubs/(10).svg';
import clubs11 from 'assets/img/CardGame/clubs/(11).svg';
import clubs12 from 'assets/img/CardGame/clubs/(12).svg';
import clubs13 from 'assets/img/CardGame/clubs/(13).svg';
import diamonds1 from 'assets/img/CardGame/diamonds/(1).svg';
import diamonds2 from 'assets/img/CardGame/diamonds/(2).svg';
import diamonds3 from 'assets/img/CardGame/diamonds/(3).svg';
import diamonds4 from 'assets/img/CardGame/diamonds/(4).svg';
import diamonds5 from 'assets/img/CardGame/diamonds/(5).svg';
import diamonds6 from 'assets/img/CardGame/diamonds/(6).svg';
import diamonds7 from 'assets/img/CardGame/diamonds/(7).svg';
import diamonds8 from 'assets/img/CardGame/diamonds/(8).svg';
import diamonds9 from 'assets/img/CardGame/diamonds/(9).svg';
import diamonds10 from 'assets/img/CardGame/diamonds/(10).svg';
import diamonds11 from 'assets/img/CardGame/diamonds/(11).svg';
import diamonds12 from 'assets/img/CardGame/diamonds/(12).svg';
import diamonds13 from 'assets/img/CardGame/diamonds/(13).svg';
import { jokerCrashBet, jokerCrashCashOut, jokerCrashOperator } from 'action/JokerCrashActions';

const MIN_AMOUNT = 0.1;
const FLIP_MS = 800;

const SUIT_KEYS = ['spades'];

const CARDS_BY_SUIT = {
    spades: [spades1, spades2, spades3, spades4, spades5, spades6, spades7, spades8, spades9, spades10, spades11, spades12, spades13],
    hearts: [hearts1, hearts2, hearts3, hearts4, hearts5, hearts6, hearts7, hearts8, hearts9, hearts10, hearts11, hearts12, hearts13],
    clubs: [clubs1, clubs2, clubs3, clubs4, clubs5, clubs6, clubs7, clubs8, clubs9, clubs10, clubs11, clubs12, clubs13],
    diamonds: [diamonds1, diamonds2, diamonds3, diamonds4, diamonds5, diamonds6, diamonds7, diamonds8, diamonds9, diamonds10, diamonds11, diamonds12, diamonds13],
};

/** Server `card` values are ranks 1–13 (Ace–King). */
function normalizeCardRank(rank, fallback = 1) {
    const n = Number(rank);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(13, Math.max(1, Math.round(n)));
}

function cardAssetFor(suitKey, rank) {
    const r = normalizeCardRank(rank, 1);
    const row = CARDS_BY_SUIT[suitKey];
    if (!row) return leftCard;
    return row[r - 1];
}

function randomSuitKey() {
    return SUIT_KEYS[Math.floor(Math.random() * SUIT_KEYS.length)];
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
    const [win, setWin] = useState(null);
    const [bang, setBang] = useState(false);
    const [imulti, setImulti] = useState('1.00');
    const [step, setStep] = useState(0);
    const [multi, setMulti] = useState(1);
    const [info, setInfo] = useState([]);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    // Animated "Win (amount)" overlay after cash out.
    const [isPumpingWin, setIsPumpingWin] = useState(false);
    const pumpingTimeoutRef = useRef(null);

    // Animated "×multi" overlay after each operator response (same pulse as Win/Bang).
    const [isPumpingMulti, setIsPumpingMulti] = useState(false);
    const pumpingMultiTimeoutRef = useRef(null);

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
        innerRotateRef.current = innerRotate;
    }, [innerRotate]);

    useEffect(() => {
        cardFacesRef.current = {
            front: cardFront,
            back: cardBack,
        };
    }, [cardFront, cardBack]);

    const handleBet = async () => {
        if (isFlipping) return;
        setIsPumpingWin(false);
        setIsPumpingMulti(false);
        if (pumpingMultiTimeoutRef.current) clearTimeout(pumpingMultiTimeoutRef.current);
        setWin(null);
        const res = await jokerCrashBet({ amount, operator }, dispatch, history);
        if (res) {
            setBet(true);
            setIsFlipping(true);
            setFlipTransitionEnabled(true);
            setCardBack(spades1);
            requestAnimationFrame(() => {
                setInnerRotate(180);
            });
        } else {
            setBet(false);
        }
    };

    const handleOperator = async (operator) => {
        if (isFlipping) return;
        setIsPumpingWin(false);
        const res = await jokerCrashOperator({ operator: operator }, dispatch, history);
        if (!res) return;

        const nextImulti =
            res.imulti != null && Number.isFinite(Number(res.imulti))
                ? Number(res.imulti).toFixed(2)
                : imulti;
        setImulti(nextImulti);

        if (res.bang === -1) {
            setIsPumpingMulti(false);
            if (pumpingMultiTimeoutRef.current) clearTimeout(pumpingMultiTimeoutRef.current);
            setBet(false);
            setBang(true);
            // Trigger the same pumping overlay used for Win.
            setWin(0);
            setIsPumpingWin(true);
            setCardBack(cardAssetFor(randomSuitKey(), res.card));
            requestAnimationFrame(() => {
                setInnerRotate(180);
            });
            if (pumpingTimeoutRef.current) clearTimeout(pumpingTimeoutRef.current);
            pumpingTimeoutRef.current = setTimeout(() => setIsPumpingWin(false), 1100);

            setTimeout(() => {       
                setBet(false);
                // Flip back to the "default backside" face.
                // At innerRotate=0 the user sees `cardFront`; at innerRotate=180 they see `cardBack`.
                // After the transition ends we swap faces, so `leftCard` becomes the new `cardFront`.
                setFlipTransitionEnabled(true);
                setIsFlipping(true);
                setInfo([]);
                setCardBack(leftCard);
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
                setStep(0);
                setMulti(1);
                setWin(amount);
            }, 2100);
            return;
        }

        setIsPumpingMulti(true);
        if (pumpingMultiTimeoutRef.current) clearTimeout(pumpingMultiTimeoutRef.current);
        pumpingMultiTimeoutRef.current = setTimeout(() => setIsPumpingMulti(false), 1100);

        if (res) {
            setBet(true);
            setIsFlipping(true);
            setFlipTransitionEnabled(true);
            // Only the hidden back updates before the flip; front stays visible until 180° (same as CardGame).
            setCardBack(cardAssetFor(randomSuitKey(), res.card));
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

            setIsPumpingMulti(false);
            if (pumpingMultiTimeoutRef.current) clearTimeout(pumpingMultiTimeoutRef.current);

            setWin(cashoutWin);
            setIsPumpingWin(true);
            if (pumpingTimeoutRef.current) clearTimeout(pumpingTimeoutRef.current);
            pumpingTimeoutRef.current = setTimeout(() => setIsPumpingWin(false), 1100);


            setTimeout(() => {
                setBet(false);
                setFlipTransitionEnabled(true);
                setIsFlipping(true);
                setInfo([]);
                setCardBack(leftCard);
                requestAnimationFrame(() => {
                    setInnerRotate(180);
                });
                setStep(0);
                setMulti(1);
                setWin(amount);
            }, 1500);
        }
    };

    const handleFlipTransitionEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        if (innerRotateRef.current !== 180) return;
        if (flipEndHandledRef.current) return;
        flipEndHandledRef.current = true;

        const { front, back } = cardFacesRef.current;

        setFlipTransitionEnabled(false);
        setCardFront(back);
        setCardBack(front);

        requestAnimationFrame(() => {
            setInnerRotate(0);
            requestAnimationFrame(() => {
                setFlipTransitionEnabled(true);
                setIsFlipping(false);
                flipEndHandledRef.current = false;
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

    useEffect(() => {
        const pending = user.jokerCrashHistory?.filter((item) => item.active === false)[0];
        if (pending) {
            setAmount(String(pending.bet ?? MIN_AMOUNT));
            setBet(true);
            setInfo(pending.info ?? []);
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
        const faceSrc = cardAssetFor(randomSuitKey(), last?.card);
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
                                                const suitKey = SUIT_KEYS[idx % SUIT_KEYS.length];
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
                                                                src={cardAssetFor(suitKey, item?.card)}
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
                                        {((isPumpingWin && win != null) || isPumpingMulti) && (
                                            <Box
                                                position="absolute"
                                                top="50%"
                                                left="50%"
                                                transform="translate(-50%, -50%)"
                                                zIndex={60}
                                                pointerEvents="none"
                                                sx={{
                                                    '@keyframes cardArrowPulse': {
                                                        '0%, 100%': { transform: 'scale(1)' },
                                                        '50%': { transform: 'scale(1.06)' },
                                                    },
                                                }}
                                            >
                                                <VStack spacing={1} align="center" lineHeight="1">
                                                    {isPumpingMulti && (
                                                        <Text
                                                            as="span"
                                                            fontSize="5xl"
                                                            fontWeight="800"
                                                            color={Number(imulti) > 0 ? 'green.400' : 'red.400'}
                                                            sx={{
                                                                textShadow:
                                                                    Number(imulti) > 0
                                                                        ? '0 0 32px rgba(72, 187, 120, 0.75), 0 0 60px rgba(56, 161, 105, 0.35)'
                                                                        : '0 0 32px rgba(245, 101, 101, 0.8), 0 0 60px rgba(229, 62, 62, 0.4)',
                                                            animation: isPumpingMulti
                                                                    ? 'cardArrowPulse 1s ease-in-out infinite'
                                                                    : 'none',
                                                            }}
                                                        >
                                                            {imulti}
                                                        </Text>
                                                    )}
                                                    {isPumpingWin && win != null && (
                                                        <VStack spacing={0} align="center" lineHeight="1">
                                                            <Text
                                                                as="span"
                                                                fontSize="7xl"
                                                                fontWeight="800"
                                                                color={Number(win) > 0 ? 'green.400' : 'red.400'}
                                                                sx={{
                                                                    textShadow:
                                                                        Number(win) > 0
                                                                            ? '0 0 32px rgba(72, 187, 120, 0.75), 0 0 60px rgba(56, 161, 105, 0.35)'
                                                                            : '0 0 32px rgba(245, 101, 101, 0.8), 0 0 60px rgba(229, 62, 62, 0.4)',
                                                                    animation: isPumpingWin
                                                                        ? 'cardArrowPulse 1s ease-in-out infinite'
                                                                        : 'none',
                                                                }}
                                                            >
                                                                {Number(win) > 0 ? 'Win' : 'Bang'}
                                                            </Text>
                                                            {!bang && (
                                                                <Text
                                                                    as="span"
                                                                    fontSize="4xl"
                                                                    fontWeight="800"
                                                                    color={Number(win) > 0 ? 'green.300' : 'red.300'}
                                                                    sx={{
                                                                        textShadow:
                                                                            Number(win) > 0
                                                                                ? '0 0 24px rgba(104, 211, 145, 0.7), 0 0 48px rgba(56, 161, 105, 0.3)'
                                                                                : '0 0 24px rgba(252, 165, 165, 0.75), 0 0 48px rgba(229, 62, 62, 0.35)',
                                                                    }}
                                                                >
                                                                    {Math.abs(Number(win)).toFixed(2)} $
                                                                </Text>
                                                            )}
                                                        </VStack>
                                                    )}
                                                </VStack>
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
                                            {(amount*multi).toFixed(2)} $
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
            <History />

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="md" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="white">Joker Crash</ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody pb="6">
                        <Text fontSize="sm" color="rgba(255,255,255,0.85)">
                            Pick &lt;, =, or &gt;, set your bet (with /2, ×2, or Min/Max in the dropdown), then tap BET
                            when you are ready.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
