import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    Box,
    Grid,
    GridItem,
    Text,
    Button,
    HStack,
    VStack,
    FormControl,
    FormLabel,
    Flex,
    Input,
    IconButton,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Wrap,
    keyframes,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CasinoIcon from '@mui/icons-material/Casino';
import History from './KenoItem/History';
import RealView from './KenoItem/RealView';
import Loading from 'components/Loading/Loading';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import { kenoBet, getKenoControls } from 'action/KenoActions';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';
import AppsIcon from '@mui/icons-material/Apps';

const MIN_AMOUNT = 0.1;
/** Delay between each drawn number appearing on the grid */
const KENO_REVEAL_MS = 100;
/** Auto BET interval — matches Pumping `PumpingPage` */
const KENO_AUTO_BET_MS = 3000;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;

const KENO_RISK_OPTIONS = [
    { id: 0, label: 'Low' },
    { id: 1, label: 'Classic' },
    { id: 2, label: 'Medium' },
    { id: 3, label: 'High' },
];

/** UI uses 0–3; KenoControl / Mongo use string tier keys */
const KENO_RISK_ID_TO_KEY = {
    0: 'low',
    1: 'classic',
    2: 'medium',
    3: 'high',
};

const tierKeyFromRiskId = (id) => KENO_RISK_ID_TO_KEY[Number(id)] ?? 'classic';

/**
 * Turn `GET /keno/getKenoControls` rows into the shape the grid expects:
 * `{ [pickCount]: [ mult for 0 hits, …, mult for pickCount hits ] }`.
 */
const buildPayoutMapFromControls = (controls, riskId) => {
    const map = {};
    if (!Array.isArray(controls) || !riskId) return map;

    const sorted = [...controls].sort(
        (a, b) => Number(a.numbersLength) - Number(b.numbersLength)
    );

    for (const doc of sorted) {
        const pickCount = Number(doc.numbersLength);
        if (!Number.isFinite(pickCount) || pickCount < 1 || pickCount > 10) continue;

        const entries = doc[riskId];
        const row = Array(pickCount + 1).fill(0);
        if (Array.isArray(entries)) {
            for (const e of entries) {
                const wl = Number(e.winLength);
                const mult = Number(e.multiplier);
                if (wl >= 0 && wl <= pickCount && Number.isFinite(mult)) {
                    row[wl] = mult;
                }
            }
        }
        map[pickCount] = row;
    }

    return map;
};

/** Matched-number tile — soft rim + bloom (pairs with animated win GIF) */
const winGlow = keyframes`
    0%, 100% {
        box-shadow:
            0 0 0 1px rgba(233, 213, 255, 0.35),
            0 0 18px 5px rgba(139, 92, 246, 0.5),
            0 0 36px 12px rgba(99, 102, 241, 0.22),
            0 8px 16px rgba(0, 0, 0, 0.35),
            inset 0 0 22px rgba(168, 85, 247, 0.12);
    }
    50% {
        box-shadow:
            0 0 0 2px rgba(250, 245, 255, 0.45),
            0 0 26px 8px rgba(167, 139, 250, 0.55),
            0 0 48px 16px rgba(124, 58, 237, 0.28),
            0 10px 20px rgba(0, 0, 0, 0.38),
            inset 0 0 28px rgba(192, 132, 252, 0.18);
    }
`;

/** Place file at `public/keno/diamond.gif` */
const KENO_WIN_GIF = `${process.env.PUBLIC_URL || ''}/twist/diamond.gif`;

const purpleTile = 'linear-gradient(180deg, #a855f7 0%, #7c3aed 45%, #6d28d9 100%)';
const purpleTileHover = 'linear-gradient(180deg, #c084fc 0%, #9333ea 45%, #7c3aed 100%)';
const defaultTile = 'linear-gradient(180deg, #3d4450 0%, #2e333c 100%)';
const defaultTileHover = 'linear-gradient(180deg, #4a5360 0%, #3a424c 100%)';
const drawnMissTile = 'linear-gradient(180deg, #25252c 0%, #121216 100%)';
const drawnMissTileHover = 'linear-gradient(180deg, #2f2f38 0%, #18181c 100%)';

export default function KenoPage() {
    const dispatch = useDispatch();
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('0.1');
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [keno, setKeno] = useState([]);
    const [isAutoPicking, setIsAutoPicking] = useState(false);
    const [isBetting, setIsBetting] = useState(false);
    const [isMultiBetActive, setIsMultiBetActive] = useState(false);
    const [riskLevel, setRiskLevel] = useState(1);
    const [kenoControls, setKenoControls] = useState([]);
    const autoPickTimerRef = useRef(null);
    const kenoRevealIntervalRef = useRef(null);
    const multiBetIntervalRef = useRef(null);
    const isBettingRef = useRef(false);
    const isMultiBetActiveRef = useRef(false);
    const kenoFxAnchorRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);

    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFxVisible, setBangFxVisible] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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

    const runKenoRoundFx = useCallback(
        (hitCount, winAmount) => {
            clearWinBangTimers();
            if (winAmount === 0) {
                setBangFxVisible(true);
                bangFxTimeoutRef.current = setTimeout(() => {
                    bangFxTimeoutRef.current = null;
                    setBangFxVisible(false);
                }, BANG_EFFECT_MS);
            } else {
                const el = kenoFxAnchorRef.current;
                const anchorRect = el?.getBoundingClientRect?.() ?? null;
                const label = Number.isFinite(Number(winAmount)) ? Number(winAmount).toFixed(2) : '0.00';
                setWinFx({ visible: true, totalEarn: label, anchorRect });
                winFxTimeoutRef.current = setTimeout(() => {
                    winFxTimeoutRef.current = null;
                    setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
                }, WIN_FIREWORKS_MS);
            }
        },
        [clearWinBangTimers]
    );

    useEffect(() => {
        isBettingRef.current = isBetting;
    }, [isBetting]);

    useEffect(() => {
        isMultiBetActiveRef.current = isMultiBetActive;
    }, [isMultiBetActive]);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        return () => {
            if (autoPickTimerRef.current) {
                clearInterval(autoPickTimerRef.current);
                autoPickTimerRef.current = null;
            }
            if (kenoRevealIntervalRef.current) {
                clearInterval(kenoRevealIntervalRef.current);
                kenoRevealIntervalRef.current = null;
            }
            if (multiBetIntervalRef.current) {
                clearInterval(multiBetIntervalRef.current);
                multiBetIntervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const fetchKenoControls = async () => {
            const res = await getKenoControls(history);
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setKenoControls(list);
        };
        fetchKenoControls();
    }, [history]);

    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const drawnSet = useMemo(() => {
        const nums = (keno || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
        return new Set(nums);
    }, [keno]);

    const resultHitCount = useMemo(() => {
        if (drawnSet.size === 0) return null;
        return selectedNumbers.reduce((acc, n) => acc + (drawnSet.has(n) ? 1 : 0), 0);
    }, [drawnSet, selectedNumbers]);

    const kenoPayoutByPickCount = useMemo(
        () => buildPayoutMapFromControls(kenoControls, tierKeyFromRiskId(riskLevel)),
        [kenoControls, riskLevel]
    );

    const handleBetRef = useRef(() => {});
    const handleAutoPickRef = useRef(() => {});
    const handleClearTableRef = useRef(() => {});
    const startMultiBetRef = useRef(() => {});
    const stopMultiBetRef = useRef(() => {});

    const stopMultiBet = () => {
        if (multiBetIntervalRef.current) {
            clearInterval(multiBetIntervalRef.current);
            multiBetIntervalRef.current = null;
        }
        clearWinBangTimers();
        setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
        setBangFxVisible(false);
        setIsMultiBetActive(false);
    };

    const handleBet = async () => {
        if (isBettingRef.current) return;

        setIsBetting(true);
        try {
            const data = {
                type:riskLevel,
                amount,
                numbers: selectedNumbers,
            };

            const res = await kenoBet(data, dispatch, history);
            if (!res || res.error) {
                setIsBetting(false);
                if (isMultiBetActiveRef.current) stopMultiBet();
                return;
            }
            const drawn = res?.data?.keno;
            if (!Array.isArray(drawn)) {
                setIsBetting(false);
                if (isMultiBetActiveRef.current) stopMultiBet();
                return;
            }
            const full = drawn.map((n) => Number(n)).filter((n) => Number.isFinite(n));
            const roundWin = Number(res?.data?.win ?? 0);
            const winForFx = Number.isFinite(roundWin) ? roundWin : 0;
            const drawnSetForHits = new Set(full);
            const hitCount = selectedNumbers.filter((n) => drawnSetForHits.has(n)).length;

            if (kenoRevealIntervalRef.current) {
                clearInterval(kenoRevealIntervalRef.current);
                kenoRevealIntervalRef.current = null;
            }
            setKeno([]);
            let i = 0;
            kenoRevealIntervalRef.current = setInterval(() => {
                if (i >= full.length) {
                    setIsBetting(false);
                    if (kenoRevealIntervalRef.current) {
                        clearInterval(kenoRevealIntervalRef.current);
                        kenoRevealIntervalRef.current = null;
                    }
                    runKenoRoundFx(hitCount, winForFx);
                    return;
                }
                const next = full[i];
                i += 1;
                setKeno((prev) => [...prev, next]);
            }, KENO_REVEAL_MS);
        } catch {
            setIsBetting(false);
            if (isMultiBetActiveRef.current) stopMultiBet();
        }
    };

    const startMultiBet = () => {
        if (isMultiBetActive) return;
        if (selectedNumbers.length === 0) return;

        setIsMultiBetActive(true);
        void handleBet();
        multiBetIntervalRef.current = setInterval(() => {
            void handleBet();
        }, KENO_AUTO_BET_MS);
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

    const kenoNumbers = Array.from({ length: 40 }, (_, index) => index + 1);

    const toggleNumber = (number) => {
        setSelectedNumbers((prev) => {
            if (prev.includes(number)) {
                return prev.filter((n) => n !== number);
            }
            if (prev.length >= 10) return prev;
            return [...prev, number];
        });
    };

    const handleAutoPick = () => {
        if (autoPickTimerRef.current) {
            clearInterval(autoPickTimerRef.current);
            autoPickTimerRef.current = null;
        }

        const shuffled = [...kenoNumbers].sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, 10).sort((a, b) => a - b);

        setKeno([]);
        setSelectedNumbers([]);
        setIsAutoPicking(true);

        let index = 0;
        autoPickTimerRef.current = setInterval(() => {
            const nextNumber = picks[index];
            if (nextNumber == null) return;

            setSelectedNumbers((prev) => [...prev, nextNumber]);
            index += 1;

            if (index >= picks.length) {
                clearInterval(autoPickTimerRef.current);
                autoPickTimerRef.current = null;
                setIsAutoPicking(false);
            }
        }, 100);
    };

    const handleClearTable = () => {
        stopMultiBet();
        if (autoPickTimerRef.current) {
            clearInterval(autoPickTimerRef.current);
            autoPickTimerRef.current = null;
        }
        if (kenoRevealIntervalRef.current) {
            clearInterval(kenoRevealIntervalRef.current);
            kenoRevealIntervalRef.current = null;
        }
        setIsAutoPicking(false);
        setIsBetting(false);
        setSelectedNumbers([]);
        setKeno([]);
    };

    handleBetRef.current = handleBet;
    handleAutoPickRef.current = handleAutoPick;
    handleClearTableRef.current = handleClearTable;
    startMultiBetRef.current = startMultiBet;
    stopMultiBetRef.current = stopMultiBet;

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
            if (e.repeat) return;
            if (typingTarget(e.target)) return;

            const key = e.key.toLowerCase();
            if (key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!isAutoPicking && !isBetting) handleAutoPickRef.current();
                return;
            }
            if (key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                handleClearTableRef.current();
                return;
            }
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (isMultiBetActive) {
                        stopMultiBetRef.current();
                    } else if (selectedNumbers.length > 0 && !isBetting && !isAutoPicking) {
                        startMultiBetRef.current();
                    }
                } else if (
                    selectedNumbers.length > 0 &&
                    !isBetting &&
                    !isMultiBetActive &&
                    !isAutoPicking
                ) {
                    handleBetRef.current();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        isLoading,
        isHelpModalOpen,
        isBetting,
        isAutoPicking,
        isMultiBetActive,
        selectedNumbers.length,
    ]);

    const currentPayouts =
        kenoPayoutByPickCount[selectedNumbers.length] ||
        (selectedNumbers.length > 0 ? Array(selectedNumbers.length + 1).fill(0) : []);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
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
                                    <AppsIcon style={{ fontSize: '30px', color: '#00D4FF', marginRight: '8px' }} />
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
                        <VStack spacing="24px" w="100%">
                            <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }}>
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
                                                if (e.key === 'Enter') e.target.blur();
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
                                                                        _focus={{ boxShadow: 'none' }}
                                                                    />
                                                                </Slider>
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


                            <Box width={{ base: "100%", sm: "300px" }} mt="5" alignSelf="center">
                                <Text
                                    color="#fff"
                                    fontSize="sm"
                                    fontWeight="500"
                                    mb="8px"
                                    textAlign="left"
                                >
                                    Risk
                                </Text>
                                <Flex
                                    role="tablist"
                                    aria-label="Risk level"
                                    p="4px"
                                    // bg="#141517"
                                    borderRadius="10px"
                                    border="1px solid rgba(255, 255, 255, 0.06)"
                                    w="100%"
                                    gap={0}
                                >
                                    {KENO_RISK_OPTIONS.map(({ id, label }) => {
                                        const active = riskLevel === id;
                                        return (
                                            <Button
                                                key={id}
                                                role="tab"
                                                aria-selected={active}
                                                variant="unstyled"
                                                flex="1"
                                                minW={0}
                                                h="34px"
                                                px="6px"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                fontSize="xs"
                                                lineHeight="1.1"
                                                fontWeight={active ? '700' : '500'}
                                                letterSpacing={active ? '0.01em' : '0'}
                                                color={
                                                    active
                                                        ? '#ffffff'
                                                        : 'rgba(130, 138, 152, 0.95)'
                                                }
                                                bg={active ? 'rgba(255, 255, 255, 0.12)' : 'transparent'}
                                                borderRadius="8px"
                                                boxShadow={
                                                    active
                                                        ? 'inset 0 1px 0 rgba(255, 255, 255, 0.07)'
                                                        : 'none'
                                                }
                                                transition="background 0.15s ease, color 0.15s ease"
                                                _hover={{
                                                    bg: active
                                                        ? 'rgba(255, 255, 255, 0.14)'
                                                        : 'rgba(255, 255, 255, 0.04)',
                                                }}
                                                _active={{
                                                    bg: active
                                                        ? 'rgba(255, 255, 255, 0.12)'
                                                        : 'rgba(255, 255, 255, 0.06)',
                                                }}
                                                onClick={() => setRiskLevel(id)}
                                            >
                                                {label}
                                            </Button>
                                        );
                                    })}
                                </Flex>
                            </Box>

                            <Box width={{ base: "100%", sm: "300px" }} mt="5" alignSelf="center">
                                <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                    Bet Type
                                </FormLabel>
                                <Wrap spacing="8px">
                                    <Button
                                        size="sm"
                                        flex="1"
                                        h="38px"
                                        px="12px"
                                        fontSize="xs"
                                        fontWeight="bold"
                                        borderRadius="10px"
                                        bg={'rgba(255,255,255,0.06)'}
                                        borderWidth="1px"
                                        borderColor={'rgba(255,255,255,0.14)'}
                                        color="#fff"
                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                        onClick={handleAutoPick}
                                        isDisabled={isAutoPicking}
                                        isLoading={isAutoPicking}
                                        loadingText="Picking..."
                                    >
                                        <AutoAwesomeIcon style={{ fontSize: 18 }} />
                                        Auto Pick
                                    </Button>
                                    <Button
                                        size="sm"
                                        flex="1"
                                        h="38px"
                                        px="12px"
                                        fontSize="xs"
                                        fontWeight="bold"
                                        borderRadius="10px"
                                        bg={'rgba(255,255,255,0.06)'}
                                        borderWidth="1px"
                                        borderColor={'rgba(255,255,255,0.14)'}
                                        color="#fff"
                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                        onClick={handleClearTable}
                                    >
                                        <RefreshIcon style={{ fontSize: 18 }} />
                                        Clear Table
                                    </Button>
                                </Wrap>
                            </Box>

                            <HStack spacing="8px" w="100%" maxW={{ base: '100%', sm: '300px' }}>
                                <Button
                                    h="46px"
                                    flex="1"
                                    borderRadius="20px"
                                    fontSize={{ base: 'md', sm: 'md' }}
                                    fontWeight="bold"
                                    bg="#55CFF5"
                                    color="#fff"
                                    _hover={{ bg: '#47c2e8' }}
                                    onClick={handleBet}
                                    isLoading={isBetting}
                                    disabled={
                                        selectedNumbers.length === 0 || isBetting || isMultiBetActive || isAutoPicking
                                    }
                                >
                                    BET
                                </Button>
                                <Button
                                    h="46px"
                                    flex="1"
                                    borderRadius="20px"
                                    fontSize={{ base: 'md', sm: 'md' }}
                                    fontWeight="bold"
                                    bg={isMultiBetActive ? '#E74C3C' : '#55CFF5'}
                                    color="#fff"
                                    borderWidth={isMultiBetActive ? '2px' : '0'}
                                    borderColor={isMultiBetActive ? '#E74C3C' : undefined}
                                    _hover={{
                                        bg: isMultiBetActive ? '#C0392B' : '#47c2e8',
                                    }}
                                    disabled={
                                        !isMultiBetActive && (selectedNumbers.length === 0 || isBetting || isAutoPicking)
                                    }
                                    onClick={() => {
                                        if (isMultiBetActive) {
                                            stopMultiBet();
                                        } else {
                                            startMultiBet();
                                        }
                                    }}
                                >
                                    {isMultiBetActive ? 'STOP' : 'Auto BET'}
                                </Button>
                            </HStack>
                        </VStack>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card
                        p="22px"
                        minH="100%"
                        alignItems="center"
                        w="100%"
                        justifyContent="center"
                    >
                        <Box ref={kenoFxAnchorRef} w="100%" maxW={{ base: '100%', md: '900px' }} mx="auto" position="relative">
                            <Grid
                                templateColumns="repeat(10, minmax(56px, 1fr))"
                                gap={{ base: "8px", md: "10px" }}
                                mb="14px"
                                w="100%"
                            >
                                {kenoNumbers.map((number) => {
                                    const isSelected = selectedNumbers.includes(number);
                                    const hasResults = drawnSet.size > 0;
                                    const isDrawn = hasResults && drawnSet.has(number);
                                    const isHit = isDrawn && isSelected;
                                    const isDrawnMiss = isDrawn && !isSelected;

                                    const bg = isDrawnMiss
                                        ? drawnMissTile
                                        : isSelected || isHit
                                          ? purpleTile
                                          : defaultTile;

                                    const borderColor = isHit
                                        ? 'rgba(216, 180, 254, 0.95)'
                                        : isDrawnMiss
                                          ? 'rgba(45, 45, 52, 0.95)'
                                          : isSelected
                                            ? 'rgba(196, 181, 253, 0.88)'
                                            : 'rgba(255,255,255,0.06)';

                                    const boxShadow = isHit
                                        ? undefined
                                        : isDrawnMiss
                                          ? 'inset 0 2px 8px rgba(0,0,0,0.55)'
                                          : isSelected
                                            ? '0 6px 16px rgba(124, 58, 237, 0.42), inset 0 -3px 0 rgba(0,0,0,0.2)'
                                            : '0 2px 6px rgba(0,0,0,0.15), inset 0 -3px 0 rgba(0,0,0,0.18)';

                                    const animation = isHit ? `${winGlow} 1.8s ease-in-out infinite` : undefined;
                                    const scale = isHit ? 'scale(1.05)' : isSelected ? 'scale(1.03)' : 'scale(1)';
                                    const labelColor = isDrawnMiss ? '#ff4757' : '#ffffff';

                                    return (
                                        <Button
                                            key={number}
                                            position="relative"
                                            overflow="hidden"
                                            h={{ base: '56px', md: '64px' }}
                                            borderRadius="10px"
                                            bg={bg}
                                            color={labelColor}
                                            fontSize={{ base: 'lg', md: 'lg' }}
                                            fontWeight="400"
                                            border="1px solid"
                                            borderColor={borderColor}
                                            boxShadow={boxShadow}
                                            transform={scale}
                                            transition="background 0.2s ease, border-color 0.2s ease, transform 0.16s ease, color 0.2s ease"
                                            animation={animation}
                                            _hover={{
                                                bg: isHit
                                                    ? purpleTileHover
                                                    : isDrawnMiss
                                                      ? drawnMissTileHover
                                                      : isSelected
                                                        ? purpleTileHover
                                                        : defaultTileHover,
                                                transform: 'translateY(-1px) scale(1.02)',
                                            }}
                                            _active={{
                                                transform: 'translateY(1px)',
                                            }}
                                            onClick={() => toggleNumber(number)}
                                        >
                                            {isHit ? (
                                                <>
                                                    <Box
                                                        position="absolute"
                                                        left="50%"
                                                        top="50%"
                                                        transform="translate(-50%, -50%)"
                                                        w={{ base: '40px', md: '44px' }}
                                                        h={{ base: '40px', md: '44px' }}
                                                        borderRadius="12px"
                                                        overflow="hidden"
                                                        pointerEvents="none"
                                                        zIndex={0}
                                                        filter="drop-shadow(0 0 12px rgba(167, 139, 250, 0.55))"
                                                    >
                                                        <Box
                                                            as="img"
                                                            src={KENO_WIN_GIF}
                                                            alt=""
                                                            w="100%"
                                                            h="100%"
                                                            objectFit="contain"
                                                            objectPosition="center"
                                                            draggable={false}
                                                            decoding="async"
                                                        />
                                                    </Box>
                                                    <Text
                                                        as="span"
                                                        position="relative"
                                                        zIndex={1}
                                                        color="#fff"
                                                        fontWeight="700"
                                                        textShadow="0 0 8px rgba(88, 28, 135, 0.9), 0 2px 4px rgba(0,0,0,0.75)"
                                                    >
                                                        {number}
                                                    </Text>
                                                </>
                                            ) : (
                                                number
                                            )}
                                        </Button>
                                    );
                                })}
                            </Grid>

                            {selectedNumbers.length > 0 ? (
                                <VStack spacing="6px" w="100%" align="stretch">
                                    <Grid
                                        templateColumns={`repeat(${currentPayouts.length}, minmax(0, 1fr))`}
                                        gap="6px"
                                        w="100%"
                                        mb="10px"
                                    >
                                        {currentPayouts.map((payout, hits) => {
                                            const isActive =
                                                resultHitCount != null && hits === resultHitCount;
                                            return (
                                                <Box
                                                    key={`m-${selectedNumbers.length}-${hits}`}
                                                    minH="40px"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    borderRadius="8px"
                                                    bg={
                                                        isActive
                                                            ? 'linear-gradient(180deg, #6d28d9 0%, #5b21b6 100%)'
                                                            : 'rgba(255,255,255,0.04)'
                                                    }
                                                    border="1px solid"
                                                    borderColor={
                                                        isActive ? 'rgba(196,181,253,0.5)' : 'rgba(255,255,255,0.06)'
                                                    }
                                                    boxShadow={
                                                        isActive ? '0 0 12px rgba(124,58,237,0.35)' : undefined
                                                    }
                                                >
                                                    <Text
                                                        color={isActive ? '#fff' : 'rgba(210,218,235,0.88)'}
                                                        fontSize="sm"
                                                        fontWeight="600"
                                                        lineHeight="1.2"
                                                    >
                                                        {payout}x
                                                    </Text>
                                                </Box>
                                            );
                                        })}
                                    </Grid>

                                    <Grid
                                        templateColumns={`repeat(${currentPayouts.length}, minmax(0, 1fr))`}
                                        gap="6px"
                                        w="100%"
                                    >
                                        {currentPayouts.map((_, hits) => {
                                            const isActive =
                                                resultHitCount != null && hits === resultHitCount;
                                            return (
                                                <Box
                                                    key={`h-${selectedNumbers.length}-${hits}`}
                                                    minH="52px"
                                                    display="flex"
                                                    flexDirection="column"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    borderRadius="8px"
                                                    bg={
                                                        isActive
                                                            ? 'linear-gradient(180deg, #5b21b6 0%, #4c1d95 100%)'
                                                            : 'rgba(255,255,255,0.03)'
                                                    }
                                                    borderWidth="1px"
                                                    borderStyle="solid"
                                                    borderColor={
                                                        isActive ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.05)'
                                                    }
                                                    borderBottomWidth={isActive ? '3px' : '1px'}
                                                    borderBottomStyle="solid"
                                                    borderBottomColor={
                                                        isActive ? '#6EF39D' : 'rgba(255,255,255,0.05)'
                                                    }
                                                    boxShadow={isActive ? '0 4px 14px rgba(91,33,182,0.35)' : undefined}
                                                >
                                                    {isActive ? (
                                                        <Box
                                                            w="26px"
                                                            h="26px"
                                                            borderRadius="6px"
                                                            overflow="hidden"
                                                            mb="2px"
                                                            flexShrink={0}
                                                            // boxShadow="0 0 10px rgba(139, 92, 246, 0.45)"
                                                        >
                                                            <Box
                                                                as="img"
                                                                src={KENO_WIN_GIF}
                                                                alt=""
                                                                w="100%"
                                                                h="100%"
                                                                objectFit="contain"
                                                                objectPosition="center"
                                                                draggable={false}
                                                                decoding="async"
                                                            />
                                                        </Box>
                                                    ) : (
                                                        <Box
                                                            w="18px"
                                                            h="18px"
                                                            borderRadius="4px"
                                                            bg="rgba(255,255,255,0.08)"
                                                            mb="4px"
                                                        />
                                                    )}
                                                    <Text
                                                        color={
                                                            isActive
                                                                ? 'rgba(255,255,255,0.98)'
                                                                : 'rgba(160,170,190,0.82)'
                                                        }
                                                        fontSize="10px"
                                                        fontWeight="500"
                                                        lineHeight="1.2"
                                                    >
                                                        {hits} Hits
                                                    </Text>
                                                </Box>
                                            );
                                        })}
                                    </Grid>
                                </VStack>
                            ) : (
                                <Box
                                    h="62px"
                                    borderRadius="8px"
                                    bg="linear-gradient(180deg, #3d454a 0%, #353d42 100%)"
                                    border="1px solid rgba(255,255,255,0.07)"
                                    borderBottom="2px solid #6EF39D"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    px="12px"
                                    boxShadow="inset 0 1px 0 rgba(255,255,255,0.03)"
                                    w="100%"
                                >
                                    <Text color="rgba(220,231,244,0.95)" fontSize={{ base: '14px' }} fontWeight="300">
                                        Select 1-10 numbers to play
                                    </Text>
                                </Box>
                            )}
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
                isVisible={bangFxVisible}
                duration={BANG_EFFECT_MS}
                zIndex={10050}
            />

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
                            How to play Keno
                        </ModalHeader>
                        <Text mt="2" fontSize="sm" color="rgba(255,255,255,0.75)">
                            Pick numbers, choose risk, then match the draw for a multiplier payout.
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
                                    Ten numbers are drawn from 1–40. You choose up to ten spots. The more picks that match the
                                    draw, the higher the multiplier for your stake — exact values depend on{' '}
                                    <b>how many numbers you played</b> and your <b>risk</b> (Low / Classic / Medium / High).
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
                                            Tap <b>1–10 numbers</b> on the grid. Use <b>Auto Pick</b> to fill ten at random, or{' '}
                                            <b>Clear Table</b> to reset.
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
                                            Choose <b>Risk</b> (payout curve) and set your <b>stake</b> — use <b>/2</b>,{' '}
                                            <b>×2</b>, or the <b>arrow</b> for Min / Max and the slider.
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
                                            Press <b>BET</b> to play one round. Numbers reveal on the board; the payout row
                                            under the grid shows multipliers for each hit count.
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
                                    <b>A</b> — Auto Pick &nbsp;·&nbsp; <b>C</b> — Clear table &nbsp;·&nbsp; <b>Space</b> — Bet
                                    &nbsp;·&nbsp; <b>Shift + Space</b> — start Auto BET (or Stop while it runs). Shortcuts are
                                    disabled while typing in a field.
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
                                        Payout
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.5">
                                        Win amount uses the multiplier for your <b>hit count</b> and <b>risk tier</b> from the
                                        server table. The bars under the grid preview multipliers for your current pick
                                        count.
                                    </Text>
                                </Box>
                                <Box
                                    p="4"
                                    borderRadius="14px"
                                    bg="rgba(255,255,255,0.03)"
                                    border="1px solid rgba(255,255,255,0.06)"
                                >
                                    <Text fontSize="sm" fontWeight="800" color="white" mb="3">
                                        Effects
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.5">
                                        Wins can show fireworks; rounds with no matching hits may show a bang effect — same
                                        idea as other games on the site.
                                    </Text>
                                </Box>
                            </Grid>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <History />
        </Box>
    );
}