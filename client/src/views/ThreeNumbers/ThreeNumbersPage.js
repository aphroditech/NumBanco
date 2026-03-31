import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    Select,
} from '@chakra-ui/react';
import ClickButton from 'components/Input/ClickButton';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import History from './ThreeNumbersItem/History';
import RealView from './ThreeNumbersItem/RealView';
import SlotMachineReels, { REEL_SYMBOLS_BY_COLUMN, normalizeReelSymbol } from './ThreeNumbersItem/SlotMachineReels';
import Loading from 'components/Loading/Loading';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StyleIcon from '@mui/icons-material/Style';
import { toast } from 'react-toastify';
import { threeNumbersBet } from 'action/ThreeNumbersActions';
import WinFireworksEffect from 'components/Effects/WinFireworksEffect';
import BangBurstEffect from 'components/Effects/BangBurstEffect';

const background = `${process.env.PUBLIC_URL || ''}/ThreeNumbers/background.png`;
const main = `${process.env.PUBLIC_URL || ''}/ThreeNumbers/main.png`;

const MIN_AMOUNT = 0.1;
const WIN_FIREWORKS_MS = 2200;
const BANG_EFFECT_MS = 1000;
const KBD_FLASH_MS = 160;

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

export default function ThreeNumbersPage() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.max(MIN_AMOUNT, Math.min(20, balance));
    const dispatch = useDispatch();
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('0.1');
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isAutoBetActive, setIsAutoBetActive] = useState(false);
    const [spinRequestId, setSpinRequestId] = useState(0);
    const [reelsSpinning, setReelsSpinning] = useState(false);
    const [pickSymbols, setPickSymbols] = useState(['1', '.', '1']);
    const [result, setResult] = useState('');
    const [multi, setMulti] = useState(0);
    const [win, setWin] = useState(0);
    /** Brief highlight on BET / Auto when triggered from keyboard */
    const [kbdFlash, setKbdFlash] = useState(null);
    const kbdFlashClearRef = useRef(null);

    const isAutoBetActiveRef = useRef(false);
    const handleBetRef = useRef(async () => {});
    /** After a successful bet, set to numeric win; cleared when reel animation ends and effect runs. */
    const pendingWinForEffectRef = useRef(null);
    const slotFxAnchorRef = useRef(null);
    const winFxTimeoutRef = useRef(null);
    const bangFxTimeoutRef = useRef(null);

    const [winFx, setWinFx] = useState({
        visible: false,
        totalEarn: '0',
        anchorRect: null,
    });
    const [bangFx, setBangFx] = useState({ visible: false, anchorRect: null });

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

    useEffect(() => {
        isAutoBetActiveRef.current = isAutoBetActive;
    }, [isAutoBetActive]);

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

    const handleBet = async () => {
        setReelsSpinning(true);
        const res = await threeNumbersBet(dispatch, history, { amount });
        if (
            res &&
            res.first != null &&
            res.second != null &&
            res.third != null
        ) {
            setResult(String(res.result ?? ''));
            setMulti(Number(res.multi) || 0);
            const w = Number(res.win);
            setWin(Number.isFinite(w) ? w.toFixed(2) : '0.00');
            const winNum = Number.isFinite(w) ? w : 0;
            pendingWinForEffectRef.current = winNum;
            setPickSymbols([
                normalizeReelSymbol(String(res.first), 0),
                normalizeReelSymbol(String(res.second), 1),
                normalizeReelSymbol(String(res.third), 2),
            ]);
            setSpinRequestId((n) => n + 1);
        } else {
            setReelsSpinning(false);
            pendingWinForEffectRef.current = null;
            if (isAutoBetActiveRef.current) {
                isAutoBetActiveRef.current = false;
                setIsAutoBetActive(false);
                toast.error('Bet failed. Auto bet stopped.');
            }
        }
    };

    handleBetRef.current = handleBet;

    const flashKbdTarget = useCallback((target) => {
        if (kbdFlashClearRef.current != null) {
            clearTimeout(kbdFlashClearRef.current);
            kbdFlashClearRef.current = null;
        }
        setKbdFlash(target);
        kbdFlashClearRef.current = setTimeout(() => {
            kbdFlashClearRef.current = null;
            setKbdFlash(null);
        }, KBD_FLASH_MS);
    }, []);

    const stopAutoBet = useCallback(() => {
        isAutoBetActiveRef.current = false;
        setIsAutoBetActive(false);
    }, []);

    const startAutoBet = useCallback(() => {
        const amt = parseFloat(amount || '0');
        if (!Number.isFinite(amt) || amt < MIN_AMOUNT || balance < amt) {
            toast.warning('Cannot start auto bet — check amount and balance.');
            return;
        }
        isAutoBetActiveRef.current = true;
        setIsAutoBetActive(true);
        void handleBetRef.current?.();
    }, [amount, balance]);

    const handleReelSpinComplete = useCallback(() => {
        setReelsSpinning(false);

        const pending = pendingWinForEffectRef.current;
        pendingWinForEffectRef.current = null;
        if (pending !== null && pending !== undefined) {
            const winAmount = Number(pending);
            const el = slotFxAnchorRef.current;
            const anchorRect = el?.getBoundingClientRect?.() ?? null;
            clearWinBangTimers();
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
                setBangFx({ visible: true, anchorRect: null });
                bangFxTimeoutRef.current = setTimeout(() => {
                    bangFxTimeoutRef.current = null;
                    setBangFx({ visible: false, anchorRect: null });
                }, BANG_EFFECT_MS);
            }
        }

        if (!isAutoBetActiveRef.current) return;

        const amt = parseFloat(amount || '0');
        const bal = Number(balance);
        if (!Number.isFinite(amt) || amt < MIN_AMOUNT || bal < amt) {
            isAutoBetActiveRef.current = false;
            setIsAutoBetActive(false);
            toast.warning('Auto bet stopped — insufficient balance or invalid amount.');
            return;
        }

        window.setTimeout(() => {
            if (!isAutoBetActiveRef.current) return;
            void handleBetRef.current?.();
        }, 180);
    }, [amount, balance, clearWinBangTimers]);

    useEffect(() => {
        return () => {
            if (kbdFlashClearRef.current != null) clearTimeout(kbdFlashClearRef.current);
        };
    }, []);

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
            if (isLoading || isHelpModalOpen) return;
            if (typingTarget(e.target)) return;
            if (e.repeat) return;
            if (e.code !== 'Space' && e.key !== ' ') return;

            e.preventDefault();

            const amt = parseFloat(amount || '0');
            const canStartAuto =
                isAutoBetActive ||
                (Number.isFinite(amt) &&
                    amt >= MIN_AMOUNT &&
                    balance >= amt &&
                    !reelsSpinning);
            const canBet =
                !reelsSpinning &&
                !isAutoBetActive &&
                amount &&
                Number.isFinite(amt) &&
                amt >= MIN_AMOUNT &&
                balance >= amt;

            if (e.shiftKey) {
                if (isAutoBetActive) {
                    flashKbdTarget('auto');
                    stopAutoBet();
                } else if (canStartAuto) {
                    flashKbdTarget('auto');
                    startAutoBet();
                }
            } else if (canBet) {
                flashKbdTarget('bet');
                void handleBetRef.current?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        isLoading,
        isHelpModalOpen,
        reelsSpinning,
        isAutoBetActive,
        amount,
        balance,
        flashKbdTarget,
        startAutoBet,
        stopAutoBet,
    ]);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setPickSymbols((p) => p.map((s, i) => normalizeReelSymbol(s, i)));
    }, []);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            {/* <Result /> */}
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
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
                                    <StyleIcon style={{ fontSize: '30px', color: '#00D4FF', marginRight: '8px' }} />
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
                                
                                <FormControl w="100%" maxW={{ base: '100%', sm: '300px' }} mt="5">
                                    <Grid templateColumns="1fr 1fr" gap="8px">
                                        <Box
                                            borderRadius="20px"
                                            transition="box-shadow 0.12s ease"
                                            boxShadow={
                                                kbdFlash === 'bet'
                                                    ? '0 0 0 2px rgba(255,255,255,0.95), 0 0 16px rgba(0, 212, 255, 0.75)'
                                                    : 'none'
                                            }
                                        >
                                            <ClickButton
                                                w="100%"
                                                h="46px"
                                                mt={0}
                                                mb={0}
                                                fontSize={{ base: 'md', sm: 'md' }}
                                                fontWeight="bold"
                                                borderRadius="20px"
                                                bg={'#00D4FF'}
                                                color="#fff"
                                                border={'1px solid rgba(0, 212, 255, 0.3)'}
                                                _active={{
                                                    transform: 'translateY(0)',
                                                }}
                                                disabled={
                                                    reelsSpinning ||
                                                    isAutoBetActive ||
                                                    !amount ||
                                                    parseFloat(amount) < MIN_AMOUNT ||
                                                    balance < parseFloat(amount || '0')
                                                }
                                                onClick={() => {
                                                    void handleBet();
                                                }}
                                                label="BET"
                                            />
                                        </Box>
                                        <Box
                                            borderRadius="20px"
                                            transition="box-shadow 0.12s ease"
                                            boxShadow={
                                                kbdFlash === 'auto'
                                                    ? '0 0 0 2px rgba(255,255,255,0.95), 0 0 16px rgba(0, 212, 255, 0.75)'
                                                    : 'none'
                                            }
                                        >
                                            <ClickButton
                                                w="100%"
                                                h="46px"
                                                mt={0}
                                                mb={0}
                                                fontSize={{ base: 'md', sm: 'md' }}
                                                fontWeight="bold"
                                                borderRadius="20px"
                                                bg={isAutoBetActive ? '#E74C3C' : '#00D4FF'}
                                                color="#fff"
                                                border={isAutoBetActive ? '2px solid #E74C3C' : '2px solid #00D4FF'}
                                                _hover={{
                                                    borderColor: isAutoBetActive ? '#C0392B' : '#00D4FF',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: isAutoBetActive
                                                        ? '0 4px 12px rgba(231, 76, 60, 0.4)'
                                                        : '0 4px 12px rgba(0, 212, 255, 0.3)',
                                                }}
                                                _active={{
                                                    transform: 'translateY(0)',
                                                }}
                                                disabled={
                                                    !isAutoBetActive &&
                                                    (!amount ||
                                                        parseFloat(amount) < MIN_AMOUNT ||
                                                        balance < parseFloat(amount || '0'))
                                                }
                                                onClick={() => {
                                                    if (isAutoBetActive) {
                                                        stopAutoBet();
                                                    } else {
                                                        startAutoBet();
                                                    }
                                                }}
                                                label={isAutoBetActive ? 'STOP' : 'Auto BET'}
                                            />
                                        </Box>
                                    </Grid>
                                </FormControl>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        
                        <Flex
                            w="100%"
                            minH="398px"
                            bgImage={background}
                            bgSize="cover"
                            bgPosition="center"
                            bgRepeat="no-repeat"
                            position="relative"
                            overflow="hidden"
                            align="center"
                            justify="center"
                            py={{ base: 4, md: 6 }}
                        >
                            <Box ref={slotFxAnchorRef} position="relative" w="400px" h="250px" flexShrink={0}>
                                <Box
                                    position="absolute"
                                    inset={0}
                                    bgImage={main}
                                    bgSize="contain"
                                    bgPosition="center"
                                    bgRepeat="no-repeat"
                                />
                                <SlotMachineReels
                                    spinRequestId={spinRequestId}
                                    targetSymbols={pickSymbols}
                                    onSpinComplete={handleReelSpinComplete}
                                    compact
                                    inset={{ top: '22%', left: '11%', right: '10%', bottom: '20%' }}
                                />
                            </Box>
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
                            Three Numbers — rules and payouts will appear here when the game is live.
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
                            <Text fontSize="sm" color="rgba(255,255,255,0.7)" lineHeight="1.55">
                                Set your bet with the field, /2, ×2, or the slider. Use BET or Auto BET to play. Shortcuts
                                are disabled while typing in a field.
                            </Text>
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
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        <b>Space</b> — place a bet (same as BET).
                                    </Text>
                                    <Text fontSize="sm" color="rgba(255,255,255,0.82)" lineHeight="1.45">
                                        <b>Shift + Space</b> — start Auto BET, or Stop while auto is running.
                                    </Text>
                                </VStack>
                            </Box>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
