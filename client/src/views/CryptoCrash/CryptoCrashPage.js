import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
    Box,
    Grid,
    GridItem,
    VStack,
    HStack,
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
    IconButton,
    Button,
    Text,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import ClickButton from 'components/Input/ClickButton';
import History from './CryptoCrashItem/History';
import Result from './CryptoCrashItem/Results';
import RealView from './CryptoCrashItem/RealView';
import Loading from 'components/Loading/Loading';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { cryptoCrashBet, flipCoin, cryptoCrashCashOut } from '../../action/CryptoCrashActions';

const MIN_AMOUNT = 0.1;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;
const ethereum = '/CryptoCrash/ethereum.png';
const bitcoin = '/CryptoCrash/bitcoin.png';
const COIN_SPIN_DURATION_SEC = 2;
const MotionBox = motion(Box);
const MotionImage = motion.img;

function buildSpinProfile() {
    const flips = 10 + Math.floor(Math.random() * 5);
    const totalRotate = flips * 360;
    const peakLift = -36 - Math.random() * 16;
    const tilt = (Math.random() - 0.5) * 16;
    const duration = COIN_SPIN_DURATION_SEC + (Math.random() - 0.5) * 0.22;
    return {
        rotateY: [0, totalRotate * 0.42, totalRotate * 0.74, totalRotate],
        scaleX: [1, 0.08, 1, 0.1, 1],
        y: [0, peakLift, -8, 0],
        rotateZ: [0, tilt, -tilt * 0.65, 0],
        scale: [1, 0.95, 1.02, 1],
        opacity: [1, 1, 0.92, 0.12],
        duration: Math.max(1.75, duration),
        times: [0, 0.34, 0.74, 1],
        ease: [0.2, 0.75, 0.18, 1],
    };
}

const KeyCap = ({ children, minW }) => (
    <Box
        as="kbd"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        minW={minW || '24px'}
        h="22px"
        px="6px"
        fontSize="xs"
        fontWeight="bold"
        color="#fff"
        bg="linear-gradient(180deg, #4a4d50 0%, #2d2f31 100%)"
        border="1px solid #1a1b1c"
        borderRadius="4px"
        boxShadow="0 2px 0 #1a1b1c, inset 0 1px 0 rgba(255,255,255,0.1)"
        fontFamily="monospace"
    >
        {children}
    </Box>
);

export default function CryptoCrashPage() {
    const [isLoading, setIsLoading] = useState(true);
    const dispatch = useDispatch();
    const history = useHistory();
    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));

    const [amount, setAmount] = useState('0.1');
    const [bet, setBet] = useState(false);
    const [isAutoBetActive, setIsAutoBetActive] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [selectedCoin, setSelectedCoin] = useState(0);
    const [coinFace, setCoinFace] = useState(0);
    const [info, setInfo] = useState([]);
    const [step, setStep] = useState(0);
    const [multi, setMulti] = useState(1);
    const [imulti, setImulti] = useState(1);
    const [isTossing, setIsTossing] = useState(false);
    const [revealKey, setRevealKey] = useState(0);
    const [spinProfile, setSpinProfile] = useState(() => buildSpinProfile());
    const [win, setWin] = useState(0);
    const [bang, setBang] = useState(false);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);
    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFx, setBangFx] = useState({ visible: false, anchorRect: null });
    const isTossingRef = useRef(false);
    const handleBetRef = useRef(() => {});
    const handleCashOutRef = useRef(() => {});
    const handleFlipRef = useRef(() => {});

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

    useEffect(() => () => clearWinBangTimers(), [clearWinBangTimers]);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || /^\\d+(\\.(\\d{0,2})?)?$/.test(value)) {
            const num = parseFloat(value);
            if (value !== '' && !isNaN(num) && num > maxAmount) {
                toast.warning(`Max amount is ${Number(maxAmount).toFixed(2)}`);
                setAmount(Number(maxAmount).toFixed(2).toString());
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

    const startFlip = useCallback(
        (coin) => {
            if (isTossing) return;
            setSelectedCoin(coin);
            setSpinProfile(buildSpinProfile());
            setIsTossing(true);
        },
        [isTossing]
    );

    const handleBet = () => {
        setBet(true);

        const data = {
            amount: amount,
        };
        cryptoCrashBet(data, dispatch, history);
    };

    const handleFlip = async (coin) => {
        const res = await flipCoin(coin, dispatch, history);
        if(!res) return;
        console.log(res.data);
        startFlip(res.data.result);
        setTimeout(() => {
            if(res.data.status === 1) setBet(true);
            else {
                setBang(true);
                clearWinBangTimers();
                setBangFx({ visible: true, anchorRect: null });
                bangFxTimeoutRef.current = setTimeout(() => {
                    bangFxTimeoutRef.current = null;
                    setBangFx({ visible: false, anchorRect: null });
                }, BANG_EFFECT_MS);
                setBet(false);
                setInfo([]);
                setStep(0);
                setMulti(0);
                setImulti(0);
            };

            // setInfo(res.data.info ?? []);
        }, 2000);
    };

    const handleCashOut = async () => {   
        const res = await cryptoCrashCashOut(dispatch, history);
        if(!res) return;
        console.log(res.data);
        const winAmount = Number(res.data.win);
        setWin(Number.isFinite(winAmount) ? winAmount.toFixed(2) : '0.00');
        clearWinBangTimers();
        if (Number.isFinite(winAmount) && winAmount > 0) {
            setWinFx({
                visible: true,
                totalEarn: winAmount.toFixed(2),
                anchorRect: null,
            });
            winFxTimeoutRef.current = setTimeout(() => {
                winFxTimeoutRef.current = null;
                setWinFx({ visible: false, totalEarn: '0', anchorRect: null });
            }, WIN_FIREWORKS_MS);
        }
        setBet(false);
        setInfo([]);
        setStep(0);
        setMulti(0);
        setImulti(0);
    };

    useEffect(() => {
        isTossingRef.current = isTossing;
    }, [isTossing]);

    handleBetRef.current = handleBet;
    handleCashOutRef.current = handleCashOut;
    handleFlipRef.current = handleFlip;

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

            if ((e.key === ' ' || e.code === 'Space') && !e.shiftKey) {
                if (isTossingRef.current) return;
                e.preventDefault();
                if (bet) {
                    void handleCashOutRef.current();
                } else {
                    const amt = parseFloat(amount || '0');
                    if (!amount || amt < MIN_AMOUNT || balance < amt) return;
                    void handleBetRef.current();
                }
                return;
            }

            if (!bet || isTossingRef.current) return;

            if (
                (key === 'a' || e.key === 'ArrowLeft') &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                e.preventDefault();
                void handleFlipRef.current(1);
                return;
            }

            if (
                (key === 'd' || e.key === 'ArrowRight') &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
            ) {
                e.preventDefault();
                void handleFlipRef.current(0);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isLoading, isHelpModalOpen, bet, amount, balance]);

    useEffect(() => {
        const pending = user.cryptoCrashHistory?.filter((item) => item.active === false)[0];
        if (pending) {
            console.log(pending);
            setBet(true);
            setAmount(String(pending.bet ?? MIN_AMOUNT));
            setTimeout(() => {
                setInfo(pending.info ?? []);
                const last = pending.info?.length
                    ? pending.info[pending.info.length - 1]
                    : null;
                setSelectedCoin(last.result);
                setCoinFace(last.result);
                setStep(pending.step);
                setMulti(pending.multi);
                setImulti(last.imulti);
            }, 1000);
        }
    }, [user]);

    // Always show a fixed top strip of max 5 items.
    const MAX_THUMBS = 5;
    const recentInfo = Array.isArray(info) ? info.slice(-MAX_THUMBS) : [];
    const cryptoPanelItems = [
        ...Array.from({ length: Math.max(0, MAX_THUMBS - recentInfo.length) }, () => null),
        ...recentInfo,
    ];
    const showCryptoThumbnails = true;
    const mainCoinW = '220px';
    const mainCoinH = '220px';
    const thumbCoinW = '74px';
    const thumbCoinH = '74px';
    const thumbCount = cryptoPanelItems.length;
    const thumbFanStepPx = 68;
    const thumbGroupCenterOffsetPx = ((thumbCount - 1) * thumbFanStepPx) / 2;
    const thumbHalfPx = parseFloat(thumbCoinW) / 2;

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Result />
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

                                <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }}>
                                    <HStack spacing="12px" justify="center">
                                        {[{label: 'Ethereum', value: 1}, {label: 'Bitcoin', value: 0}].map((coin) => (
                                            <Button
                                                key={coin.label}
                                                h="46px"
                                                minW={{ base: '120px', sm: '138px' }}
                                                px="16px"
                                                fontSize={{ base: 'sm', sm: 'md' }}
                                                fontWeight="bold"
                                                borderRadius="20px"
                                                bg='#323738'
                                                color="#fff"
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
                                                isDisabled={isTossing || !bet}
                                                onClick={() => {
                                                    // Flip by explicit parameter when user clicks a coin.label.
                                                    handleFlip(coin.value);
                                                }}
                                            >
                                                {coin.label}
                                            </Button>
                                        ))}
                                    </HStack>
                                </FormControl>

                                <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }} mt="5">
                                    <Grid templateColumns="1fr" gap="8px">
                                        <ClickButton
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
                                            disabled={
                                                isAutoBetActive ||
                                                isTossing ||
                                                !amount ||
                                                parseFloat(amount) < MIN_AMOUNT ||
                                                balance < parseFloat(amount || '0')
                                            }
                                            onClick={bet ? handleCashOut : handleBet}
                                            label={bet ? 'CASH OUT' : 'BET'}
                                        />
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        <Flex w="100%" minH="398px" align="center" justify="center" position="relative" overflow="hidden">
                            <Box
                                position="absolute"
                                left={{ base: '10px', md: '26px' }}
                                top="50%"
                                transform="translateY(-50%)"
                                zIndex={2}
                            >
                                <Box
                                    w={{ base: '94px', md: '104px' }}
                                    h={{ base: '170px', md: '186px' }}
                                    borderRadius="14px"
                                    bg="linear-gradient(180deg, rgba(65,72,79,0.88) 0%, rgba(40,46,52,0.94) 100%)"
                                    border="1px solid rgba(255,255,255,0.10)"
                                    boxShadow="0 10px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{ backdropFilter: 'blur(1.5px)' }}
                                >
                                    <VStack spacing="2px" lineHeight="1">
                                        <Text
                                            color="#fff"
                                            fontSize={{ base: '24px', md: '22px' }}
                                            fontWeight="900"
                                            letterSpacing="0.01em"
                                            sx={{ textShadow: '0 2px 12px rgba(0,0,0,0.38)' }}
                                        >
                                            {Number(step || 0)}
                                        </Text>
                                        <Text
                                            color="rgba(255,255,255,0.88)"
                                            fontSize={{ base: '24px', md: '22px' }}
                                            fontWeight="800"
                                            letterSpacing="-0.01em"
                                        >
                                            Series
                                        </Text>
                                    </VStack>
                                </Box>
                            </Box>

                            <Box
                                position="absolute"
                                right={{ base: '10px', md: '26px' }}
                                top="50%"
                                transform="translateY(-50%)"
                                zIndex={2}
                            >
                                <Box
                                    w={{ base: '94px', md: '104px' }}
                                    h={{ base: '170px', md: '186px' }}
                                    borderRadius="14px"
                                    bg="linear-gradient(180deg, rgba(65,72,79,0.88) 0%, rgba(40,46,52,0.94) 100%)"
                                    border="1px solid rgba(255,255,255,0.10)"
                                    boxShadow="0 10px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{ backdropFilter: 'blur(1.5px)' }}
                                >
                                    <VStack spacing="2px" lineHeight="1">
                                        <Text
                                            color="#fff"
                                            fontSize={{ base: '24px', md: '22px' }}
                                            fontWeight="900"
                                            letterSpacing="-0.01em"
                                            sx={{ textShadow: '0 2px 12px rgba(0,0,0,0.38)' }}
                                        >
                                            x{Number(multi ?? 0).toFixed(2)}
                                        </Text>
                                        <Text
                                            color="rgba(255,255,255,0.88)"
                                            fontSize={{ base: '24px', md: '22px' }}
                                            fontWeight="800"
                                            letterSpacing="-0.01em"
                                        >
                                            Multiply
                                        </Text>
                                    </VStack>
                                </Box>
                            </Box>

                            <Flex direction="column" align="center" justify="center" w="100%" maxW="420px">
                                {showCryptoThumbnails && (
                                    <Box
                                        position="relative"
                                        w={`${parseFloat(mainCoinW) * 3}px`}
                                        h={thumbCoinH}
                                        mb="12px"
                                        overflow="visible"
                                    >
                                        {cryptoPanelItems.map((item, idx) => {
                                            const translateXPx =
                                                idx * thumbFanStepPx - thumbGroupCenterOffsetPx - thumbHalfPx;
                                            const hasData = item != null;
                                            const isWin = Number(item?.status ?? item?.M1uXj3sZpU ?? 0) === 1;
                                            const side = Number(item?.coin ?? item?.result ?? item?.flip ?? 0);
                                            const src = side === 1 ? ethereum : bitcoin;
                                            return (
                                                <Box
                                                    key={item?._id ?? `${item?.step ?? 0}-${idx}`}
                                                    position="absolute"
                                                    top="0"
                                                    left="50%"
                                                    w={thumbCoinW}
                                                    h={thumbCoinH}
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    zIndex={idx + 1}
                                                    sx={{ transform: `translateX(${translateXPx}px)` }}
                                                >
                                                    <Box
                                                        position="relative"
                                                        w={thumbCoinW}
                                                        h={thumbCoinH}
                                                        borderRadius="full"
                                                        overflow="hidden"
                                                        bg={hasData ? 'transparent' : 'rgba(255,255,255,0.06)'}
                                                        // boxShadow={
                                                        //     !hasData
                                                        //         ? '0 0 0 1px rgba(255,255,255,0.15), inset 0 0 8px rgba(255,255,255,0.06)'
                                                        //         : isWin
                                                        //         ? '0 0 0 1px rgba(104, 211, 145, 0.55), 0 6px 14px rgba(0,0,0,0.35), 0 0 14px rgba(104, 211, 145, 0.25)'
                                                        //         : '0 0 0 1px rgba(252, 165, 165, 0.55), 0 6px 14px rgba(0,0,0,0.35), 0 0 14px rgba(252, 165, 165, 0.25)'
                                                        // }
                                                    >
                                                        {hasData ? (
                                                            <>
                                                                <Box as="img" src={src} alt="" w="100%" h="100%" display="block" />
                                                                <Box
                                                                    position="absolute"
                                                                    inset="0"
                                                                    // bg={
                                                                    //     isWin
                                                                    //         ? 'rgba(104, 211, 145, 0.25)'
                                                                    //         : 'rgba(252, 165, 165, 0.25)'
                                                                    // }
                                                                    pointerEvents="none"
                                                                />
                                                            </>
                                                        ) : (
                                                            <Box
                                                                position="absolute"
                                                                inset="0"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                color="rgba(255,255,255,0.35)"
                                                                fontSize="xl"
                                                                fontWeight="700"
                                                            >
                                                                -
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}

                                <Box
                                    w={{ base: mainCoinW, md: mainCoinW }}
                                    h={{ base: mainCoinH, md: mainCoinH }}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    position="relative"
                                >
                                    {!isTossing && (
                                        <MotionBox
                                            key={`coin-wrap-${revealKey}`}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            initial={{ opacity: 0, scale: 0.78, rotateY: 90 }}
                                            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                            transition={{ duration: 0.22, ease: 'easeOut' }}
                                        >
                                            <MotionImage
                                                src={coinFace === 1 ? ethereum : bitcoin}
                                                alt={coinFace}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    filter:
                                                        coinFace === 1
                                                            ? 'drop-shadow(0 0 10px #13d8ff)'
                                                            : 'drop-shadow(0 0 10px #ffb347)',
                                                }}
                                            />
                                        </MotionBox>
                                    )}

                                    <AnimatePresence>
                                        {isTossing && (
                                            <MotionBox
                                                w={{ base: '135px', md: '155px' }}
                                                h={{ base: '135px', md: '155px' }}
                                                borderRadius="full"
                                                bg="radial-gradient(circle at 50% 50%, rgba(170,220,255,0.95) 0%, rgba(70,130,180,0.9) 44%, rgba(28,45,69,0.86) 72%, rgba(15,26,44,0.6) 100%)"
                                                border="2px solid rgba(180,230,255,0.6)"
                                                boxShadow="0 0 26px rgba(19,216,255,0.35), inset 0 0 24px rgba(255,255,255,0.22)"
                                                style={{ transformStyle: 'preserve-3d' }}
                                                initial={{ opacity: 1, rotateY: 0, scaleX: 1, scale: 1 }}
                                                animate={{
                                                    rotateY: spinProfile.rotateY,
                                                    scaleX: spinProfile.scaleX,
                                                    y: spinProfile.y,
                                                    rotateZ: spinProfile.rotateZ,
                                                    scale: spinProfile.scale,
                                                    opacity: spinProfile.opacity,
                                                }}
                                                transition={{
                                                    duration: spinProfile.duration,
                                                    ease: spinProfile.ease,
                                                    times: spinProfile.times,
                                                }}
                                                onAnimationComplete={() => {
                                                    const landed = selectedCoin;
                                                    setCoinFace(landed);
                                                    setSelectedCoin(landed);
                                                    setIsTossing(false);
                                                    setRevealKey((v) => v + 1);
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </Box>
                            </Flex>
                        </Flex>
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
                zIndex={10050}
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
                            CryptoCrash — rules and payouts will appear here when the game is live.
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
                                    Crypto Crash is a coin-pick game. Start with a bet, then choose a side each step:
                                    <b> Ethereum</b> or <b>Bitcoin</b>. Every correct pick grows your multiplier. Cash
                                    out any time to lock your win.
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
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        1) Enter your amount (or use <b>/2</b>, <b>x2</b>, <b>Min</b>, <b>Max</b>).
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        2) Press <b>BET</b> to start.
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        3) Choose <b>Ethereum</b> or <b>Bitcoin</b> each step.
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        4) Press <b>CASH OUT</b> any time to secure winnings.
                                    </Text>
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
                                <VStack align="stretch" spacing="2">
                                    <HStack spacing="2" flexWrap="wrap">
                                        <KeyCap minW="46px">Space</KeyCap>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)">
                                            Bet before round / Cash out during round
                                        </Text>
                                    </HStack>
                                    <HStack spacing="2" flexWrap="wrap">
                                        <KeyCap>A</KeyCap>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.55)">or</Text>
                                        <KeyCap minW="66px">Left</KeyCap>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)">
                                            Choose Ethereum
                                        </Text>
                                    </HStack>
                                    <HStack spacing="2" flexWrap="wrap">
                                        <KeyCap>D</KeyCap>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.55)">or</Text>
                                        <KeyCap minW="66px">Right</KeyCap>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.82)">
                                            Choose Bitcoin
                                        </Text>
                                    </HStack>
                                    <Text fontSize="xs" color="rgba(255,255,255,0.62)">
                                        Shortcuts are disabled while typing in an input field.
                                    </Text>
                                </VStack>
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
                                                Correct picks increase your multiplier and potential payout.
                                            </Text>
                                        </Box>
                                        <Box
                                            p="2.5"
                                            borderRadius="12px"
                                            bg="rgba(245,101,101,0.10)"
                                            border="1px solid rgba(245,101,101,0.22)"
                                        >
                                            <Text fontSize="sm" color="rgba(255,255,255,0.86)">
                                                A wrong pick triggers <b>BANG</b> and ends the round.
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
                                            Win amount = Bet x Multiplier (only when you cash out).
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