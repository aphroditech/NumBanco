import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Grid,
    GridItem,
    FormControl,
    TableContainer,
    FormLabel,
    Input,
    Button,
    Text,
    Flex,
    VStack,
    HStack,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
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
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    Tooltip,
    useDisclosure,
} from '@chakra-ui/react';

// Components
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';

import { toast } from "react-toastify";

import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

import DiceCanvas3D from './RubicItem/DiceCanvas3D';

// Actions
import { handleRubicBet, removeUserBalance } from 'action/RubicActions';
import { useHistory } from 'react-router-dom';
import truncateToTwo from 'variables/truncateToTwo';

// Components
import Dialog from 'components/Dialog/Dialog';

// Rubic Items
import BetHistory from './RubicItem/BetHistory';
import Last10Result from './RubicItem/Last10Result';
import UserHistory from './RubicItem/UserHistory';
import RubicBalanceGraph from './RubicItem/RubicBalanceGraph';
import { onlineUser, offlineUser } from "action/BetActions";
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionText = motion(Text);

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20.00;

// Key cap style for keyboard shortcuts display
const KeyCap = ({ children, minW }) => (
    <Box
        as="kbd"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        minW={minW || "24px"}
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

export default function RubicPage() {

    useEffect(() => {
        onlineUser(3);
        return () => {
            offlineUser(3);
        };
    }, []);

    // Redux
    const user = useSelector((state) => state.user.userInfo) || {};

    const balance = Number(user?.balance ?? 0);
    // const membership = Number(user?.membership ?? 0);
    // membership 0: 0.1 to 1; membership 1: 0.1 to 1000; membership 2: 0.1 to balance
    // const maxAmountByTier = membership === 0 ? 1 : membership === 1 ? 1000 : balance;
    const maxAmount = balance > MAX_AMOUNT ? MAX_AMOUNT : balance;
    const dispatch = useDispatch();
    const history = useHistory();
    const [target, setTarget] = useState('3');
    const [amount, setAmount] = useState('0.50');
    const [operator, setOperator] = useState('=');
    const [isRolling, setIsRolling] = useState(false);
    const rollIntervalRef = useRef(null);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const { isOpen: isGraphOpen, onOpen: onGraphOpen, onClose: onGraphClose } = useDisclosure();
    const results = useSelector((state) => state.user.userInfo?.rubicHistory);
    const [winningProbability, setWinningProbability] = useState(0);
    const [isWin, setIsWin] = useState(false);
    /** Post-roll UI: win / lose highlight (clears before next bet and after a short delay). */
    const [rubicOutcomeFx, setRubicOutcomeFx] = useState(null);
    const [rubicOutcomeFxKey, setRubicOutcomeFxKey] = useState(0);
    const [rubicWinAmountDisplay, setRubicWinAmountDisplay] = useState(0);
    const diceRef = useRef(null);

    useEffect(() => {
        if (!rubicOutcomeFx) return;
        const t = window.setTimeout(() => setRubicOutcomeFx(null), 2600);
        return () => window.clearTimeout(t);
    }, [rubicOutcomeFxKey, rubicOutcomeFx]);

    const rubicSparkSpecs = useMemo(() => {
        let s = rubicOutcomeFxKey * 9973 + 1;
        const rnd = () => {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
        return Array.from({ length: 10 }, (_, i) => ({
            id: i,
            x: 12 + rnd() * 76,
            delay: rnd() * 0.08,
            dur: 0.55 + rnd() * 0.35,
            rot: rnd() * 360,
        }));
    }, [rubicOutcomeFxKey]);

    const handleBet = async () => {
        if (isRolling) return; // Prevent multiple clicks during roll
        setRubicOutcomeFx(null);
        setIsRolling(true);
        const data = {
            amount: parseFloat(amount),
            target: parseInt(target),
            operation: operator,
        }
        let tempWinningProbability = 0;
        try {
            tempWinningProbability = await removeUserBalance(data, dispatch, history);
            setWinningProbability(Number(tempWinningProbability));

            // console.log("M1uXj3sZ", tempWinningProbability);
        } catch (err) {
            console.error(err);
            return;
        }

        // Dice values that win for (targetNum, operator); others lose
        const targetNum = parseInt(target, 10);
        const DICE = [1, 2, 3, 4, 5, 6];
        const getWinningValues = () => {
            if (operator === '>') return DICE.filter((v) => v > targetNum);
            if (operator === '=') return [targetNum];
            if (operator === '<') return DICE.filter((v) => v < targetNum);
            return [];
        };
        const getLosingValues = () => {
            if (operator === '>') return DICE.filter((v) => v <= targetNum);
            if (operator === '=') return DICE.filter((v) => v !== targetNum);
            if (operator === '<') return DICE.filter((v) => v >= targetNum);
            return DICE;
        };
        const winningValues = getWinningValues();
        const losingValues = getLosingValues();
        const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        // Final dice result: with probability winningProbability → win, else → lose
        const shouldWin = Math.random() < winningProbability;
        const randomValue =
            shouldWin && winningValues.length > 0
                ? pickRandom(winningValues)
                : losingValues.length > 0
                    ? pickRandom(losingValues)
                    : Math.floor(Math.random() * 6) + 1;

        diceRef.current?.roll(randomValue);
    };

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (rollIntervalRef.current) {
                clearTimeout(rollIntervalRef.current);
            }
        };
    }, []);

    // Keyboard shortcuts for operators, BET button, and target control
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Only handle if not typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key.toLowerCase();
            if (key === 'z') {
                e.preventDefault();
                setOperator('<');
            } else if (key === 'x') {
                e.preventDefault();
                setOperator('=');
            } else if (key === 'c') {
                e.preventDefault();
                setOperator('>');
            } else if (key === ' ') {
                e.preventDefault();
                // Only trigger BET if not rolling, bet is valid, and combination is valid
                const payout = getPayoutInfo(parseInt(target, 10), operator);
                if (!isRolling && amount && parseFloat(amount) >= MIN_AMOUNT && balance >= parseFloat(amount) && !payout.error) {
                    handleBet();
                }
            } else if (e.key === 'w') {
                e.preventDefault();
                const currentTarget = parseInt(target, 10);
                if (currentTarget < 6) {
                    setTarget(String(currentTarget + 1));
                }
            } else if (e.key === 's') {
                e.preventDefault();
                const currentTarget = parseInt(target, 10);
                if (currentTarget > 1) {
                    setTarget(String(currentTarget - 1));
                }
            } else if (e.key === 'a') {
                e.preventDefault();
                // Same as /2 button: divide amount by 2
                const current = parseFloat(amount) || MIN_AMOUNT;
                const newValue = Math.min(maxAmount, current / 2);
                setAmount(Math.max(MIN_AMOUNT, newValue).toFixed(2));
            } else if (e.key === 'd') {
                e.preventDefault();
                // Same as ×2 button: double the amount
                const current = parseFloat(amount) || MIN_AMOUNT;
                const newValue = Math.min(maxAmount, current * 2);
                setAmount(newValue.toFixed(2));
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [isRolling, amount, balance, target, maxAmount]);

    const handleAmountChange = (e) => {
        const value = e.target.value;
        // Allow numbers with up to 2 decimal places (e.g., 0.54 but not 0.541)
        if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
            const num = parseFloat(value);
            if (value !== '' && !isNaN(num) && num > maxAmount) {
                toast.warning(`Max amount for your tier is ${maxAmount}`);
                setAmount(maxAmount);
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
            setAmount(truncateToTwo(maxAmount));
        } else {
            setAmount(num.toFixed(2));
        }
    };
    const getPayoutInfo = (targetNum, operator) => {
        const payouts = {
            1: {
                '<': { winRate: 0, multiplier: 0, error: true },
                '>': { winRate: 83.3, multiplier: 0.9 },
                '=': { winRate: 16.7, multiplier: 10 }
            },
            2: {
                '<': { winRate: 16.7, multiplier: 5 },
                '>': { winRate: 66.7, multiplier: 1.25 },
                '=': { winRate: 16.7, multiplier: 10 }
            },
            3: {
                '<': { winRate: 33.3, multiplier: 2.5 },
                '>': { winRate: 50, multiplier: 1.95 },
                '=': { winRate: 16.7, multiplier: 10 }
            },
            4: {
                '<': { winRate: 50, multiplier: 1.95 },
                '>': { winRate: 33.3, multiplier: 2.5 },
                '=': { winRate: 16.7, multiplier: 10 }
            },
            5: {
                '<': { winRate: 66.7, multiplier: 1.25 },
                '>': { winRate: 16.7, multiplier: 5 },
                '=': { winRate: 16.7, multiplier: 10 }
            },
            6: {
                '<': { winRate: 83.3, multiplier: 0.9 },
                '>': { winRate: 0, multiplier: 0, error: true },
                '=': { winRate: 16.7, multiplier: 10 }
            }
        };
        return payouts[targetNum]?.[operator] || { winRate: 0, multiplier: 0, error: true };
    };
    
    const onRollComplete = useCallback(async (pair) => {
        const data = {
            betAmount: parseFloat(amount),
            target: parseInt(target),
            operation: operator,
            result: parseInt(pair)
        }
        setIsRolling(false);

        const winData = await handleRubicBet(data, history, dispatch);
        if (winData != null) {
            setIsWin(Boolean(winData.isWin));
            setRubicOutcomeFx(winData.isWin ? 'win' : 'lose');
            setRubicWinAmountDisplay(Number(winData.winAmount) || 0);
            setRubicOutcomeFxKey((k) => k + 1);
        }
    }, [amount, target, operator, history, dispatch]);


    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Last10Result results={results.slice(-25)} />

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
                {/* Betting Side - Controls */}
                <GridItem area="panel" minW={"350px"}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%" position="relative">
                            {/* Top right - Question mark */}
                            <Box position="absolute" top="-30px" right="-20px" zIndex={2}>
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
                            <VStack spacing="24px" align="center" w="100%">

                                {/* Target - value on left, up/down on right */}
                                <FormControl w="100%" maxW="300px">
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
                                            px="16px"
                                        >
                                            <Text color="white" fontSize="xl" fontWeight="bold">
                                                {target}
                                            </Text>
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
                                                        isDisabled={target === '6'}
                                                        onClick={() => setTarget(String(Math.min(6, parseInt(target, 10) + 1)))}
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
                                                        isDisabled={target === '1'}
                                                        onClick={() => setTarget(String(Math.max(1, parseInt(target, 10) - 1)))}
                                                    />
                                                </VStack>
                                            </Box>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                {/* Amount Input */}
                                <FormControl w="100%" maxW={{ base: "100%", sm: "300px" }}>
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Amount
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
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.50"
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
                                                        // if (parseFloat(amount) >= maxAmount) {
                                                        //     toast.warning(`Max amount for your tier is ${maxAmount.toFixed(2)}, Please upgrade your membership.`);
                                                        // }
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
                                                                    onClick={() => setAmount(truncateToTwo(maxAmount))}
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

                                {/* Operator Buttons */}
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
                                                bg={operator === op ? "#00D4FF" : "#323738"}
                                                color={operator === op ? "#fff" : "#fff"}
                                                border={operator === op ? "2px solid #00D4FF" : "1px solid rgba(0, 212, 255, 0.3)"}
                                                _hover={{
                                                    bg: operator === op ? "#00D4FF" : "rgba(0, 212, 255, 0.2)",
                                                    borderColor: "#00D4FF",
                                                    transform: "translateY(-2px)",
                                                    boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)"
                                                }}
                                                _active={{
                                                    transform: "translateY(0)"
                                                }}
                                                onClick={() => setOperator(op)}
                                                disabled={isRolling}
                                            >
                                                {op}
                                            </Button>
                                        ))}
                                    </HStack>
                                </FormControl>

                                {/* BET Button */}
                                <Button
                                    h="46px"
                                    w="100%"
                                    maxW="300px"
                                    fontSize={{ base: 'md', sm: 'md' }}
                                    fontWeight="bold"
                                    borderRadius="20px"
                                    bg="#00D4FF"
                                    color="#fff"
                                    border="2px solid #00D4FF"
                                    _hover={{
                                        bg: "#00D4FF",
                                        borderColor: "#00D4FF",
                                        transform: "translateY(-2px)",
                                        boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)"
                                    }}
                                    _active={{
                                        transform: "translateY(0)"
                                    }}
                                    onClick={handleBet}
                                    disabled={(!amount || parseFloat(amount) < MIN_AMOUNT || (balance < parseFloat(amount))) || isRolling || getPayoutInfo(parseInt(target, 10), operator).error}
                                >
                                    BET
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem area="game" minH={'450px'}>
                    <Card
                        pt="22px"
                        pb="22px"
                        px="22px"
                        minH="100%"
                        alignItems="center"
                        w="100%"
                        position="relative"
                        overflow="hidden"
                    >
                        <AnimatePresence>
                            {rubicOutcomeFx === 'win' && (
                                <MotionBox
                                    key={`rubic-win-${rubicOutcomeFxKey}`}
                                    position="absolute"
                                    inset={0}
                                    pointerEvents="none"
                                    zIndex={1}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.35 }}
                                    bg="radial-gradient(ellipse 85% 70% at 50% 38%, rgba(45,212,191,0.22) 0%, rgba(0,212,255,0.08) 45%, transparent 72%)"
                                    boxShadow="inset 0 0 100px rgba(45,212,191,0.12)"
                                />
                            )}
                            {rubicOutcomeFx === 'lose' && (
                                <MotionBox
                                    key={`rubic-lose-${rubicOutcomeFxKey}`}
                                    position="absolute"
                                    inset={0}
                                    pointerEvents="none"
                                    zIndex={1}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    bg="radial-gradient(ellipse 80% 65% at 50% 42%, rgba(248,113,113,0.14) 0%, rgba(127,29,29,0.08) 48%, transparent 70%)"
                                />
                            )}
                        </AnimatePresence>

                        {rubicOutcomeFx === 'win' && (
                            <Box
                                position="absolute"
                                inset={0}
                                pointerEvents="none"
                                zIndex={2}
                                overflow="hidden"
                                borderRadius="inherit"
                            >
                                {rubicSparkSpecs.map((p) => (
                                    <MotionBox
                                        key={`sp-${rubicOutcomeFxKey}-${p.id}`}
                                        position="absolute"
                                        left={`${p.x}%`}
                                        top="36%"
                                        w="5px"
                                        h="5px"
                                        borderRadius="full"
                                        bg="rgba(190, 242, 100, 0.95)"
                                        boxShadow="0 0 10px rgba(45,212,191,0.9)"
                                        initial={{ opacity: 0, y: 0, scale: 0 }}
                                        animate={{ opacity: [0, 1, 0], y: [-6, -52 - p.id * 3], scale: [0, 1, 0.4] }}
                                        transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
                                    />
                                ))}
                            </Box>
                        )}

                        <MotionBox
                            w="100%"
                            justify="center"
                            flexDirection="column"
                            align="center"
                            gap="12px"
                            display="flex"
                            position="relative"
                            zIndex={2}
                            animate={
                                rubicOutcomeFx === 'lose'
                                    ? { x: [0, -7, 7, -5, 5, -3, 3, 0] }
                                    : rubicOutcomeFx === 'win'
                                      ? { scale: [1, 1.02, 1] }
                                      : { x: 0, scale: 1 }
                            }
                            transition={
                                rubicOutcomeFx === 'lose'
                                    ? { duration: 0.42, ease: 'easeInOut' }
                                    : { duration: 0.5, ease: 'easeOut' }
                            }
                        >
                            <DiceCanvas3D ref={diceRef} height={400} onRollComplete={onRollComplete} />
                        </MotionBox>

                        <AnimatePresence>
                            {rubicOutcomeFx === 'win' && (
                                <MotionText
                                    key={`rubic-win-txt-${rubicOutcomeFxKey}`}
                                    position="absolute"
                                    top="14px"
                                    left={0}
                                    right={0}
                                    textAlign="center"
                                    fontSize={{ base: 'md', md: 'lg' }}
                                    fontWeight="900"
                                    letterSpacing="0.2em"
                                    color="#5eead4"
                                    textShadow="0 0 24px rgba(45,212,191,0.85), 0 2px 12px rgba(0,0,0,0.75)"
                                    zIndex={3}
                                    pointerEvents="none"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                                >
                                    WIN
                                    {rubicWinAmountDisplay > 0 ? ` +$${truncateToTwo(rubicWinAmountDisplay)}` : ''}
                                </MotionText>
                            )}
                            {rubicOutcomeFx === 'lose' && (
                                <MotionText
                                    key={`rubic-lose-txt-${rubicOutcomeFxKey}`}
                                    position="absolute"
                                    top="14px"
                                    left={0}
                                    right={0}
                                    textAlign="center"
                                    fontSize={{ base: 'sm', md: 'md' }}
                                    fontWeight="800"
                                    letterSpacing="0.18em"
                                    color="rgba(252,165,165,0.98)"
                                    textShadow="0 0 18px rgba(248,113,113,0.55), 0 2px 10px rgba(0,0,0,0.8)"
                                    zIndex={3}
                                    pointerEvents="none"
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    NO MATCH — TRY AGAIN
                                </MotionText>
                            )}
                        </AnimatePresence>

                        <VStack position={'absolute'} zIndex={300} bottom="42px" spacing="24px" align="center">
                                    {/* Payout section (bc.game style) */}
                            {(() => {
                                const payout = getPayoutInfo(parseInt(target, 10), operator);
                                // if (payout.error) return null;
                                const winChance = payout.winRate;

                                return (
                                    <Flex
                                        align="center"
                                        justify="center"
                                        gap="16px"
                                        // mt="8px"
                                        px="20px"
                                        py="10px"
                                        bg="transparent"
                                        borderRadius="10px"
                                        border="1px solid rgba(0, 212, 255, 0.4)"
                                    >
                                        <HStack spacing="6px" align="baseline">
                                            <Text fontSize="xs" color="rgba(255,255,255,0.7)" fontWeight="500">
                                                Bet Amount:
                                            </Text>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF">
                                                {amount}
                                            </Text>
                                        </HStack>
                                        <Box w="1px" h="14px" bg="rgba(255,255,255,0.15)" />
                                        <HStack spacing="6px" align="baseline">
                                            <Text fontSize="xs" color="rgba(255,255,255,0.7)" fontWeight="500">
                                                Payout:
                                            </Text>
                                            <Text fontSize="md" fontWeight="bold" color="#fff">
                                                {payout.multiplier}×
                                            </Text>
                                        </HStack>
                                        <Box w="1px" h="14px" bg="rgba(255,255,255,0.15)" />
                                        <HStack spacing="6px" align="baseline">
                                            <Text fontSize="xs" color="rgba(255,255,255,0.7)" fontWeight="500">
                                                Win Chance:
                                            </Text>
                                            <Text fontSize="md" fontWeight="bold" color="#fff">
                                                {winChance}%
                                            </Text>
                                        </HStack>
                                    </Flex>
                                );
                            })()}
                        </VStack>
                    </Card>
                </GridItem>

                {/* Right - User History (Latest bet & Race) */}
                <UserHistory />

            </Grid>

            {/* Help Modal */}
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="white" >
                        How to Play Dice Game
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody py="0">
                        <Tabs colorScheme="cyan" variant="enclosed">
                            <TabList borderColor="rgba(0, 212, 255, 0.2)">
                                <Tab
                                    color="rgba(255,255,255,0.7)"
                                    _selected={{ color: '#00D4FF', borderColor: '#00D4FF' }}
                                    _hover={{ color: '#00D4FF' }}
                                >
                                    Payouts
                                </Tab>
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
                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">
                                            The payout multiplier is determined by your chosen target number and operator. The closer your target is to the actual dice roll, the higher the payout multiplier.
                                        </Text>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="12px">
                                                Current Selection
                                            </Text>
                                            <Box bg="rgba(0, 212, 255, 0.1)" borderRadius="8px" p="12px">
                                                <Text fontSize="sm" color="rgba(255,255,255,0.9)" mb="8px" fontWeight="bold">
                                                    Target {target}, Operator {operator === '>' ? 'Large' : operator === '<' ? 'Small' : 'Same'}
                                                </Text>
                                                {(() => {
                                                    const payout = getPayoutInfo(parseInt(target, 10), operator);
                                                    // if (payout.error) {
                                                    //     return (
                                                    //         <Text fontSize="sm" color="#ff6b6b">
                                                    //             Error
                                                    //         </Text>
                                                    //     );
                                                    // }
                                                    const betAmount = parseFloat(amount) || 0;
                                                    const potentialWin = betAmount * payout.multiplier;
                                                    const profit = potentialWin - betAmount;
                                                    return (
                                                        <VStack spacing="6px" align="stretch">
                                                            <HStack justify="space-between">
                                                                <Text fontSize="sm" color="rgba(255,255,255,0.7)">Multiplier:</Text>
                                                                <Text fontSize="sm" fontWeight="bold" color="#fff">×{payout.multiplier}</Text>
                                                            </HStack>
                                                            {betAmount > 0 && (
                                                                <>
                                                                    <HStack justify="space-between" pt="4px" borderTop="1px solid rgba(255,255,255,0.1)">
                                                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Bet Amount:</Text>
                                                                        <Text fontSize="sm" fontWeight="bold" color="#fff">${truncateToTwo(betAmount)}</Text>
                                                                    </HStack>
                                                                    <HStack justify="space-between">
                                                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Potential Win:</Text>
                                                                        <Text fontSize="sm" fontWeight="bold" color="#00D4FF">${truncateToTwo(potentialWin)}</Text>
                                                                    </HStack>
                                                                    {/* <HStack justify="space-between">
                                                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Potential Profit:</Text>
                                                                        <Text fontSize="sm" fontWeight="bold" color={profit >= 0 ? "#4ade80" : "#ff6b6b"}>
                                                                            {profit >= 0 ? '+' : '-'}${truncateToTwo(Math.abs(profit))}
                                                                        </Text>
                                                                    </HStack> */}
                                                                </>
                                                            )}
                                                        </VStack>
                                                    );
                                                })()}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">All Payouts:</Text>
                                            <TableContainer>
                                                <Table variant="simple" size="sm">
                                                    <Thead>
                                                        <Tr>
                                                            <Th color="#00D4FF" borderColor="rgba(0, 212, 255, 0.3)" textAlign="center" fontSize="xs" py="8px">Target</Th>
                                                            <Th color="#00D4FF" borderColor="rgba(0, 212, 255, 0.3)" textAlign="center" fontSize="xs" py="8px">Small (&lt;)</Th>
                                                            <Th color="#00D4FF" borderColor="rgba(0, 212, 255, 0.3)" textAlign="center" fontSize="xs" py="8px">Large (&gt;)</Th>
                                                            <Th color="#00D4FF" borderColor="rgba(0, 212, 255, 0.3)" textAlign="center" fontSize="xs" py="8px">Same (=)</Th>
                                                        </Tr>
                                                    </Thead>
                                                    <Tbody>
                                                        {[1, 2, 3, 4, 5, 6].map((targetNum) => {
                                                            const smallPayout = getPayoutInfo(targetNum, '<');
                                                            const largePayout = getPayoutInfo(targetNum, '>');
                                                            const samePayout = getPayoutInfo(targetNum, '=');
                                                            return (
                                                                <Tr key={targetNum}>
                                                                    <Td color="#fff" borderColor="rgba(0, 212, 255, 0.2)" textAlign="center" fontSize="xs" py="6px" fontWeight="bold">
                                                                        {targetNum}
                                                                    </Td>
                                                                    <Td color={smallPayout.error ? "#ff6b6b" : "#fff"} borderColor="rgba(0, 212, 255, 0.2)" textAlign="center" fontSize="xs" py="6px">
                                                                        {smallPayout.error ? 'Error' : (
                                                                            <Text color="#68d391">×{smallPayout.multiplier}</Text>
                                                                        )}
                                                                    </Td>
                                                                    <Td color={largePayout.error ? "#ff6b6b" : "#fff"} borderColor="rgba(0, 212, 255, 0.2)" textAlign="center" fontSize="xs" py="6px">
                                                                        {largePayout.error ? 'Error' : (
                                                                            <Text color="#68d391">×{largePayout.multiplier}</Text>
                                                                        )}
                                                                    </Td>
                                                                    <Td color="#fff" borderColor="rgba(0, 212, 255, 0.2)" textAlign="center" fontSize="xs" py="6px">
                                                                        <Text color="#68d391">×{samePayout.multiplier}</Text>
                                                                    </Td>
                                                                </Tr>
                                                            );
                                                        })}
                                                    </Tbody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </VStack>
                                </TabPanel>
                                <TabPanel py="24px">
                                    <VStack spacing="16px" align="stretch">
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                1. Set Your Target
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Choose a target number (1-6) using the up/down arrows. This is the number you're betting on.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                2. Choose Operator
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Select an operator:
                                                <Text as="span" fontWeight="bold" color="#fff"> &gt; </Text>
                                                (greater than),
                                                <Text as="span" fontWeight="bold" color="#fff"> = </Text>
                                                (equal to), or
                                                <Text as="span" fontWeight="bold" color="#fff"> &lt; </Text>
                                                (less than) your target.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                3. Set Your Bet Amount
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Enter your bet amount (min: {MIN_AMOUNT}, max: {MAX_AMOUNT}). Use the slider or Min/Max buttons to adjust quickly.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                4. Roll the Dice
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                Click the BET button to roll the dice. The dice will roll for about 1 second, then show the result (the top number of the dice).
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                5. Win Conditions
                                            </Text>
                                            <Text fontSize="sm" color="rgba(255,255,255,0.8)">
                                                When your prediction matches the final result (the top number of the dice), your stake is multiplied by the winning multiplier.
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text fontSize="md" fontWeight="bold" color="#00D4FF" mb="8px">
                                                6. Keyboard Shortcuts
                                            </Text>
                                            <VStack spacing="8px" align="stretch" fontSize="sm" color="rgba(255,255,255,0.8)">
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>Z</KeyCap>
                                                    <Text as="span">Select <Text as="span" fontWeight="bold" color="#00D4FF">&lt;</Text> (Less than) operator</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>X</KeyCap>
                                                    <Text as="span">Select <Text as="span" fontWeight="bold" color="#00D4FF">=</Text> (Equal to) operator</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>C</KeyCap>
                                                    <Text as="span">Select <Text as="span" fontWeight="bold" color="#00D4FF">&gt;</Text> (Greater than) operator</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>W</KeyCap>
                                                    <Text as="span">/</Text>
                                                    <KeyCap>S</KeyCap>
                                                    <Text as="span">Increase/Decrease target (1-6)</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap>D</KeyCap>
                                                    <Text as="span">/</Text>
                                                    <KeyCap>A</KeyCap>
                                                    <Text as="span">×2 / ÷2 amount</Text>
                                                </HStack>
                                                <HStack spacing="2" wrap="wrap">
                                                    <KeyCap minW="48px">Space</KeyCap>
                                                    <Text as="span">Place bet (click BET button)</Text>
                                                </HStack>
                                            </VStack>
                                        </Box>
                                        <Box pt="8px" borderTop="1px solid rgba(0, 212, 255, 0.2)">
                                            <Text fontSize="sm" color="rgba(255,255,255,0.6)" fontStyle="italic">
                                                Your last results are displayed at the top. Check your bet history below for all previous games.
                                            </Text>
                                        </Box>
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <Dialog
                isOpen={isGraphOpen}
                onClose={onGraphClose}
                top="15%"
                width={{ sm: '90%', '2lg': '1280px', '2xl': '1600px' }}
                isFooter
                content={<RubicBalanceGraph />}
            />

            <BetHistory results={results} />
        </Box>
    );
}
