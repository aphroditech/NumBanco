import React, { useState, useMemo } from 'react';
import { motion } from "framer-motion";
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    Grid,
    GridItem,
    FormControl,
    FormLabel,
    Input,
    Button,
    Text,
    Flex,
    VStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    UnorderedList,
    HStack,
    ListItem,
    IconButton,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { checkCanWin, resultGameMining } from 'action/MiningActions';
import UserMiningHistory from './UserMiningHistory'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import OtherUserHistory from './OtherUserHistory';
import HelpIcon from '@mui/icons-material/Help';
import { useHistory } from 'react-router-dom';

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const TOTAL_TILES = 16;
const MIN_TURNS = 1;
const MAX_TURNS = 8;
/** Each safe flip reduces payout: mult = maxMult * DECAY_BASE^(turn - 1) */
const MULTIPLIER_DECAY = 0.8;

function getMaxMultiplier(turns) {
    if (turns < MIN_TURNS || turns > MAX_TURNS) return 0;
    return 16 / turns;
}

/**
 * @param {number} maxTurns - max flips the player chose (1–8)
 * @param {number} currentTurn - 1-based flip on which the jackal was found
 */
function getEffectiveMultiplier(maxTurns, currentTurn) {
    const maxMult = getMaxMultiplier(maxTurns);
    if (maxMult <= 0 || currentTurn < 1 || currentTurn > maxTurns) return 0;
    return maxMult * MULTIPLIER_DECAY ** (currentTurn - 1);
}

export default function Mining() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance));

    const [amount, setAmount] = useState('0.5');
    const [maxTurns, setMaxTurns] = useState(4);
    const [gameState, setGameState] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
    const [tiles, setTiles] = useState(() => Array(TOTAL_TILES).fill(null)); // null = hidden, true = jackal, false = safe revealed
    const [jackalIndex, setJackalIndex] = useState(null);
    const [flippedCount, setFlippedCount] = useState(0);
    const [flippedIndices, setFlippedIndices] = useState(new Set());
    const [resultMessage, setResultMessage] = useState('');
    // Incremented every time the player finds the jackal so we can replay effects.
    const [jackalCelebrationKey, setJackalCelebrationKey] = useState(0);

    const [canWin, setCanWin] = useState(false);

    const betNum = parseFloat(amount) || 0;

    /**
     * Which flip (1-based) the displayed multiplier applies to if the jackal is found on the next click.
     * Idle / won / lost: flip 1 (preview for next round).
     * Playing: current upcoming flip. null = no flips left (transitional).
     */
    const offerTurn =
        gameState === 'playing' && flippedCount < maxTurns
            ? flippedCount + 1
            : gameState === 'playing' && flippedCount >= maxTurns
                ? null
                : 1;

    const currentDisplayMultiplier =
        offerTurn === null ? 0 : getEffectiveMultiplier(maxTurns, offerTurn);
    const currentWinAmount = betNum * currentDisplayMultiplier;

    const showJackalCelebration = gameState === "won" && jackalCelebrationKey > 0;

    const jackalCelebrationConfetti = useMemo(() => {
        if (!showJackalCelebration) return [];
        return Array.from({ length: 18 }).map((_, i) => {
            const leftPct = 10 + Math.random() * 80;
            const delay = Math.random() * 0.12;
            const rot = Math.random() * 180 - 90;
            const hue = 180 + Math.random() * 140;
            const drift = (Math.random() - 0.5) * 50;
            return { i, leftPct, delay, rot, hue, drift };
        });
    }, [showJackalCelebration, jackalCelebrationKey]);

    const handleAmountChange = (e) => {
        const v = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(v);
    };
    const handleAmountBlur = () => {
        const n = parseFloat(amount);
        if (isNaN(n) || n < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(2));
        else if (n > maxAmount) setAmount(maxAmount.toFixed(2));
        else setAmount(n.toFixed(2));
    };

    const startGame = async () => {
        const bet = parseFloat(amount) || 0;
        if (bet < MIN_AMOUNT || bet > MAX_AMOUNT || bet > balance) return;

        const allowedToWin = await checkCanWin({ betAmt: bet, turn: maxTurns }, dispatch, history);
        setCanWin(allowedToWin === true);

        if (allowedToWin === true) {
            const jackal = Math.floor(Math.random() * TOTAL_TILES);
            setJackalIndex(jackal);
        } else {
            setJackalIndex(null);
        }
        setTiles(Array(TOTAL_TILES).fill(null));
        setFlippedCount(0);
        setFlippedIndices(new Set());
        setJackalCelebrationKey(0);
        setGameState('playing');
        setResultMessage('Good luck! Play your best!');
    };

    const flipTile = (index) => {
        if (gameState !== 'playing') return;
        if (flippedIndices.has(index)) return;
        if (flippedCount >= maxTurns) return;

        const newFlipped = new Set(flippedIndices).add(index);
        setFlippedIndices(newFlipped);
        setFlippedCount((c) => c + 1);

        if (canWin) {
            const isJackal = index === jackalIndex;
            setTiles((prev) => {
                const next = [...prev];
                next[index] = isJackal;
                return next;
            });
            if (isJackal) {
                const currentTurn = flippedCount + 1;
                const effectiveMult = getEffectiveMultiplier(maxTurns, currentTurn);
                const winAmount = betNum * effectiveMult;
                setJackalCelebrationKey((k) => k + 1);
                setGameState('won');
                setResultMessage(
                    `Jackal found! You win ${winAmount.toFixed(2)}  (× ${effectiveMult.toFixed(2)} on flip ${currentTurn})`
                );
                resultGameMining(
                    { betAmt: parseFloat(amount), turn: maxTurns, multiplier: parseFloat(effectiveMult.toFixed(2)), isWin: true, currentTurn },
                    dispatch,
                    history
                );
            } else if (flippedCount + 1 >= maxTurns) {
                setGameState('lost');
                setResultMessage('No jackal in your turns. Try again next time!');
                setTiles((prev) => {
                    const next = [...prev];
                    next[jackalIndex] = true;
                    return next;
                });
                resultGameMining({ betAmt: parseFloat(amount), turn: maxTurns, multiplier: 0, isWin: false }, dispatch, history);
            }
        } else {
            setTiles((prev) => {
                const next = [...prev];
                next[index] = false;
                return next;
            });
            if (flippedCount + 1 >= maxTurns) {
                const remaining = [...Array(TOTAL_TILES).keys()].filter((i) => !newFlipped.has(i));
                const jackalAt = remaining[Math.floor(Math.random() * remaining.length)];
                setJackalIndex(jackalAt);
                setGameState('lost');
                setResultMessage('No jackal in your turns. Try again next time!');
                setTiles((prev) => {
                    const next = [...prev];
                    next[jackalAt] = true;
                    return next;
                });
                resultGameMining({ betAmt: parseFloat(amount), turn: maxTurns, isWin: false }, dispatch);
            }
        }
    };
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);


    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
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
                {/* Left – Bet & Turns */}
                <GridItem area="panel" minW="350px">
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%" position="relative">
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
                                <FormControl w="100%" maxW="300px">
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
                                                value={amount}
                                                onChange={handleAmountChange}
                                                onBlur={handleAmountBlur}
                                                placeholder="0.50"
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
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const current = parseFloat(amount || MIN_AMOUNT);
                                                        setAmount(Math.max(MIN_AMOUNT, current / 2).toFixed(2));
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
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => {
                                                        const next = Math.min(maxAmount, (parseFloat(amount || MIN_AMOUNT) * 2));
                                                        setAmount(next.toFixed(2));
                                                    }}
                                                >
                                                    ×2
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    h="100%"
                                                    minW="48px"
                                                    px="8px"
                                                    bg="transparent"
                                                    color="#00D4FF"
                                                    fontSize="xs"
                                                    borderRadius="0"
                                                    borderLeft="1px solid rgba(255, 255, 255, 0.1)"
                                                    _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                    onClick={() => setAmount(maxAmount.toFixed(2))}
                                                >
                                                    Max
                                                </Button>
                                            </HStack>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                <FormControl w="100%" maxW="300px">
                                    <FormLabel color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                        Max Turns (flips)
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
                                                {maxTurns}
                                            </Text>
                                            <Box borderRadius="12px" overflow="hidden">
                                                <VStack spacing="4px" align="center">
                                                    <IconButton
                                                        aria-label="Turns up"
                                                        icon={<KeyboardArrowUpIcon style={{ fontSize: 14 }} />}
                                                        size="xs"
                                                        h="18px"
                                                        w="24px"
                                                        minW="24px"
                                                        bg="transparent"
                                                        color="#fff"
                                                        borderRadius="0"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        isDisabled={maxTurns >= MAX_TURNS}
                                                        onClick={() => setMaxTurns((t) => Math.min(MAX_TURNS, t + 1))}
                                                    />
                                                    <IconButton
                                                        aria-label="Turns down"
                                                        icon={<KeyboardArrowDownIcon style={{ fontSize: 14 }} />}
                                                        size="xs"
                                                        h="18px"
                                                        w="24px"
                                                        minW="24px"
                                                        bg="transparent"
                                                        color="#fff"
                                                        borderRadius="0"
                                                        _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                        isDisabled={maxTurns <= MIN_TURNS}
                                                        onClick={() => setMaxTurns((t) => Math.max(MIN_TURNS, t - 1))}
                                                    />
                                                </VStack>
                                            </Box>
                                        </Flex>
                                    </GradientBorder>
                                </FormControl>

                                <Box w="100%" maxW="300px" p="12px" bg="#323738" borderRadius="12px" border="1px solid rgba(0, 212, 255, 0.2)">
                                    <HStack justify="space-between" mb="8px" align="flex-start">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Multiplier</Text>
                                        <VStack align="end" spacing={0}>
                                            <Text fontSize="lg" fontWeight="bold" color="#00D4FF">
                                                {offerTurn === null ? '—' : `${currentDisplayMultiplier.toFixed(2)}×`}
                                            </Text>
                                            {gameState === 'playing' && offerTurn !== null && (
                                                <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                                                    if found on flip {offerTurn}
                                                </Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                    <HStack justify="space-between" align="flex-start">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Win Amount</Text>
                                        <VStack align="end" spacing={0}>
                                            <Text fontSize="md" fontWeight="bold" color="#fff">
                                                {offerTurn === null ? '—' : currentWinAmount.toFixed(2)}
                                            </Text>
                                            {gameState === 'playing' && offerTurn !== null && (
                                                <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                                                    ×{MULTIPLIER_DECAY} less each safe flip
                                                </Text>
                                            )}
                                        </VStack>
                                    </HStack>
                                </Box>

                                <Button
                                    h="46px"
                                    w="100%"
                                    maxW="300px"
                                    fontSize="md"
                                    fontWeight="bold"
                                    borderRadius="20px"
                                    bg="#00D4FF"
                                    color="#fff"
                                    border="2px solid #00D4FF"
                                    _hover={{
                                        bg: '#00D4FF',
                                        borderColor: '#00D4FF',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                                    }}
                                    _active={{ transform: 'translateY(0)' }}
                                    onClick={startGame}
                                    isDisabled={
                                        !amount ||
                                        parseFloat(amount) < MIN_AMOUNT ||
                                        balance < parseFloat(amount) ||
                                        gameState === 'playing'
                                    }
                                >
                                    {gameState === 'playing' ? 'Playing...' : 'Bet'}
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* Center – 16 tiles (find the jackal) */}
                <GridItem area="game" minH="450px">
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px" position="relative">
                        <CardBody overflow="visible" display="flex" flexDirection="column" alignItems="center" justifyContent="center" minH="100%" position="relative">
                            <Box position="absolute" top="16px" left="22px" zIndex={2}>
                                <Text fontSize="sm" color="rgba(255,255,255,0.7)" mb="2px">Bet</Text>
                                <Text fontSize="lg" fontWeight="bold" color="#fff">{amount || '0.00'}</Text>
                            </Box>
                            <Box position="absolute" top="16px" right="22px" zIndex={2} textAlign="right">
                                <Text fontSize="sm" color="rgba(255,255,255,0.7)" mb="2px">Turns</Text>
                                <Text fontSize="lg" fontWeight="bold" color="#00D4FF">{maxTurns} / {flippedCount}</Text>
                            </Box>

                            <Text fontSize="sm" color="rgba(255,255,255,0.6)" mb="16px" textAlign="center" px="8px">
                            The sooner you find it, the higher your payout
                            </Text>

                            <Grid
                                templateColumns="repeat(4, 1fr)"
                                gap="10px"
                                w="100%"
                                maxW="320px"
                            >
                                {tiles.map((revealed, index) => {
                                    const canFlip = gameState === "playing" && revealed === null && flippedCount < maxTurns;
                                    const isJackal = revealed === true;

                                    return (
                                        <Button
                                            key={index}
                                            variant="unstyled"
                                            p="0"
                                            minW="0"
                                            w="100%"
                                            h="64px"
                                            borderRadius="16px"
                                            isDisabled={!canFlip}
                                            onClick={() => flipTile(index)}
                                            _focusVisible={
                                                canFlip
                                                    ? {
                                                        boxShadow: "0 0 0 3px rgba(0, 212, 255, 0.35), 0 0 22px rgba(0, 212, 255, 0.25)",
                                                    }
                                                    : undefined
                                            }
                                        >
                                            <Box
                                                w="100%"
                                                h="100%"
                                                position="relative"
                                                style={{ perspective: "900px" }}
                                            >
                                                <motion.div
                                                    initial={false}
                                                    animate={{
                                                        rotateY: revealed === null ? 0 : 180,
                                                        ...(gameState === "won" &&
                                                        jackalIndex === index &&
                                                        jackalCelebrationKey > 0
                                                            ? {
                                                                x: [0, -4, 4, -3, 0],
                                                                y: [0, 2, -2, 1, 0],
                                                                rotateZ: [0, -2, 2, -1, 0],
                                                                scale: [1, 1.06, 0.98, 1.03, 1],
                                                            }
                                                            : {}),
                                                    }}
                                                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                                    whileHover={canFlip ? { scale: 1.03 } : undefined}
                                                    whileTap={canFlip ? { scale: 0.98 } : undefined}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        position: "relative",
                                                        transformStyle: "preserve-3d",
                                                    }}
                                                >
                                                    {/* Front (hidden) */}
                                                    <Box
                                                        position="absolute"
                                                        inset="0"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        borderRadius="16px"
                                                        bg="rgba(50, 55, 56, 1)"
                                                        border="1px solid rgba(0, 212, 255, 0.28)"
                                                        color="rgba(255,255,255,0.9)"
                                                        style={{ backfaceVisibility: "hidden" }}
                                                        overflow="hidden"
                                                    >
                                                        <Box
                                                            position="absolute"
                                                            inset="-20%"
                                                            bg="radial-gradient(circle at 50% 20%, rgba(0,212,255,0.25) 0%, rgba(0,212,255,0) 60%)"
                                                            opacity={canFlip ? 1 : 0.4}
                                                        />
                                                        <motion.div
                                                            animate={canFlip ? { opacity: [0.9, 1, 0.9] } : undefined}
                                                            transition={{ duration: 1.2, repeat: canFlip ? Infinity : 0 }}
                                                            style={{ position: "relative" }}
                                                        >
                                                            <Box fontSize="22px" fontWeight="900" lineHeight="1" textShadow="0 0 18px rgba(0,212,255,0.2)">
                                                                ?
                                                            </Box>
                                                        </motion.div>
                                                    </Box>

                                                    {/* Back (revealed) */}
                                                    <Box
                                                        position="absolute"
                                                        inset="0"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        borderRadius="16px"
                                                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                                                        overflow="hidden"
                                                        bg={isJackal ? "rgba(239, 68, 68, 0.35)" : "rgba(0, 255, 160, 0.18)"}
                                                        border={
                                                            isJackal
                                                                ? "1px solid rgba(239, 68, 68, 0.65)"
                                                                : "1px solid rgba(0, 255, 160, 0.35)"
                                                        }
                                                        color="#fff"
                                                    >
                                                        <Box
                                                            position="absolute"
                                                            inset="-30%"
                                                            bg={
                                                                isJackal
                                                                    ? "radial-gradient(circle at 50% 35%, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0) 55%)"
                                                                    : "radial-gradient(circle at 50% 35%, rgba(0,255,160,0.25) 0%, rgba(0,255,160,0) 55%)"
                                                            }
                                                        />

                                                        {revealed !== null && (
                                                            <motion.div
                                                                key={isJackal ? `jackal-${jackalCelebrationKey}` : "safe"}
                                                                initial={{ scale: 0.92, opacity: 0.4 }}
                                                                animate={{
                                                                    scale:
                                                                        isJackal && gameState === "won" && jackalIndex === index && jackalCelebrationKey > 0
                                                                            ? [1, 1.16, 0.95, 1.10, 1]
                                                                            : isJackal
                                                                                ? [1, 1.08, 1]
                                                                                : [1, 1.04, 1],
                                                                    opacity: 1,
                                                                    filter: isJackal ? "drop-shadow(0 0 12px rgba(239,68,68,0.35))" : "drop-shadow(0 0 12px rgba(0,255,160,0.25))",
                                                                }}
                                                                transition={{ duration: isJackal && gameState === "won" ? 0.35 : 0.35 }}
                                                                style={{ position: "relative" }}
                                                            >
                                                                <Box fontSize="26px" fontWeight="900" lineHeight="1">
                                                                    {isJackal ? "🐺" : "🛡️"}
                                                                </Box>
                                                            </motion.div>
                                                        )}
                                                    </Box>
                                                </motion.div>
                                            </Box>
                                        </Button>
                                    );
                                })}
                            </Grid>

                            {/* Jackal celebration overlay (only on win) */}
                            {showJackalCelebration && (
                                <Box
                                    position="absolute"
                                    top="90px"
                                    left="0"
                                    right="0"
                                    margin="0 auto"
                                    width="320px"
                                    maxW="100%"
                                    pointerEvents="none"
                                >
                                    <motion.div
                                        key={jackalCelebrationKey}
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            position: "relative",
                                            width: "100%",
                                            height: "240px",
                                            margin: "0 auto",
                                            borderRadius: "16px",
                                            background:
                                                "radial-gradient(circle at 50% 35%, rgba(0,212,255,0.22) 0%, rgba(0,212,255,0) 60%), radial-gradient(circle at 50% 50%, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0) 62%)",
                                            border: "1px solid rgba(0,212,255,0.22)",
                                            boxShadow: "0 0 40px rgba(0,212,255,0.12)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* Big jackpot text */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25, delay: 0.05 }}
                                            style={{
                                                position: "absolute",
                                                top: "8px",
                                                left: 0,
                                                right: 0,
                                                display: "flex",
                                                justifyContent: "center",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            <Box
                                                fontWeight="900"
                                                fontSize="22px"
                                                color="rgba(255,255,255,0.95)"
                                                textShadow="0 0 18px rgba(0,212,255,0.35)"
                                            >
                                                JACKPOT
                                            </Box>
                                        </motion.div>

                                        {/* Minimal confetti */}
                                        {jackalCelebrationConfetti.map((c) => {
                                            return (
                                                <motion.div
                                                    key={`${jackalCelebrationKey}-c-${c.i}`}
                                                    initial={{ opacity: 0, y: 0, x: 0, rotate: c.rot, scale: 0.9 }}
                                                    animate={{ opacity: [0, 1, 0], y: 130, x: c.drift, rotate: c.rot + 120, scale: 1 }}
                                                    transition={{ duration: 1.1, delay: c.delay }}
                                                    style={{
                                                        position: "absolute",
                                                        top: "42px",
                                                        left: `${c.leftPct}%`,
                                                        width: "10px",
                                                        height: "18px",
                                                        borderRadius: "4px",
                                                        background: `hsl(${c.hue} 90% 60%)`,
                                                        boxShadow: "0 0 16px rgba(0,212,255,0.15)",
                                                    }}
                                                />
                                            );
                                        })}
                                    </motion.div>
                                </Box>
                            )}

                            {resultMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <Box
                                        mt="20px"
                                        px="16px"
                                        py="12px"
                                        borderRadius="14px"
                                        bg={
                                            gameState === "playing"
                                                ? "linear-gradient(180deg, rgba(59, 130, 246, 0.26) 0%, rgba(59, 130, 246, 0.10) 100%)"
                                                : gameState === "won"
                                                ? "linear-gradient(180deg, rgba(74, 222, 128, 0.22) 0%, rgba(74, 222, 128, 0.08) 100%)"
                                                : "linear-gradient(180deg, rgba(248, 113, 113, 0.22) 0%, rgba(248, 113, 113, 0.08) 100%)"
                                        }
                                        border="1px solid"
                                        borderColor={
                                            gameState === "playing"
                                                ? "rgba(59, 130, 246, 0.70)"
                                                : gameState === "won"
                                                    ? "rgba(74, 222, 128, 0.65)"
                                                    : "rgba(248, 113, 113, 0.65)"
                                        }
                                        boxShadow={
                                            gameState === "playing"
                                                ? "0 0 26px rgba(59, 130, 246, 0.22)"
                                                : gameState === "won"
                                                ? "0 0 26px rgba(74, 222, 128, 0.18)"
                                                : "0 0 26px rgba(248, 113, 113, 0.18)"
                                        }
                                    >
                                        <Text
                                            fontWeight="900"
                                            color={
                                                gameState === "playing"
                                                    ? "rgba(147, 197, 253, 1)"
                                                    : gameState === "won"
                                                        ? "rgba(74, 222, 128, 1)"
                                                        : "rgba(248, 113, 113, 1)"
                                            }
                                        >
                                            {resultMessage}
                                        </Text>
                                    </Box>
                                </motion.div>
                            )}
                        </CardBody>
                    </Card>
                </GridItem>

                {/* Right – Mining History placeholder */}
                <OtherUserHistory />
            </Grid>
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                        <HelpIcon
                            style={{
                                fontSize: "26px",
                                color: "#00D4FF",
                                marginRight: "8px"
                            }}
                        />
                        How to Play Jackal Game
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                 How to Play 
                                </Text>
                                <Text mb={1}>
                                    1. The player selects a bet amount and chooses the number of turns they want to play.
                                </Text>
                                <Text mb={1}>
                                    2. For each turn, the player flips one card.
                                </Text>
                                <Text mb={1}>
                                    3. The goal is to find a jackal card while flipping.
                                </Text>
                                <Text mb={1}>
                                    4. If a jackal appears within the selected turns, the player wins.
                                </Text>
                                <Text mb={1}>
                                    5. Max multiplier is 16 ÷ (your max flips). If you find the jackal on flip 1 you get
                                    the full multiplier; each safe flip before that multiplies your payout by {MULTIPLIER_DECAY}{' '}
                                    (effective multiplier = max × {MULTIPLIER_DECAY}
                                    <sup>(flip − 1)</sup>).
                                </Text>
                            </Box>

                            

                            {/* <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    🏆 Partner Levels
                                </Text>
                                <UnorderedList pl={5}>
                                    <ListItem>Level increases based on referral performance.</ListItem>
                                    <ListItem>Higher levels may unlock better earning benefits.</ListItem>
                                    <ListItem>Regional Officers have extended privileges.</ListItem>
                                </UnorderedList>
                            </Box> */}

                            {/* <Text fontSize="xs" color="gray.400">
                                ⚠️ Earnings must be greater than $0 to convert.
                            </Text> */}

                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
            <UserMiningHistory />
        </Box>
    );
}
