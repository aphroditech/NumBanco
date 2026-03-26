import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Image,
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
import MiningTreasureGrid from './MiningTreasureGrid';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import OtherUserHistory from './OtherUserHistory';
import HelpIcon from '@mui/icons-material/Help';
import { useHistory } from 'react-router-dom';

import { toast } from 'react-toastify';

const jackalImage = "/img/Jackal/jackal.png"


const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const TOTAL_TILES = 16;
const MIN_TURNS = 1;
const MAX_TURNS = 8;
/** Each safe flip reduces payout: mult = maxMult * DECAY_BASE^(turn - 1) */
const MULTIPLIER_DECAY = 0.8;
const OUTCOME_FX_MS = 1500;
const INITIAL_RESULT_MESSAGE = 'Good luck! Play your best!';

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
    const [lastWinSummary, setLastWinSummary] = useState(null);
    const [lossEffectKey, setLossEffectKey] = useState(0);
    /** Full-screen win/loss FX; auto-hidden after OUTCOME_FX_MS. */
    const [showOutcomeFx, setShowOutcomeFx] = useState(false);
    const outcomeFxTimerRef = useRef(null);

    const [canWin, setCanWin] = useState(false);

    const clearOutcomeFxTimer = useCallback(() => {
        if (outcomeFxTimerRef.current != null) {
            window.clearTimeout(outcomeFxTimerRef.current);
            outcomeFxTimerRef.current = null;
        }
    }, []);

    const armOutcomeFxAutoDismiss = useCallback(() => {
        clearOutcomeFxTimer();
        setShowOutcomeFx(true);
        outcomeFxTimerRef.current = window.setTimeout(() => {
            outcomeFxTimerRef.current = null;
            setShowOutcomeFx(false);
            setGameState('idle');
            setResultMessage(INITIAL_RESULT_MESSAGE);
        }, OUTCOME_FX_MS);
    }, [clearOutcomeFxTimer]);

    useEffect(() => () => clearOutcomeFxTimer(), [clearOutcomeFxTimer]);

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
    const showWinFxOverlay = showJackalCelebration && showOutcomeFx;
    const showLossFxOverlay = gameState === 'lost' && showOutcomeFx;

    const jackalCelebrationConfetti = useMemo(() => {
        if (!showWinFxOverlay) return [];
        return Array.from({ length: 32 }).map((_, i) => {
            const leftPct = 6 + Math.random() * 88;
            const delay = Math.random() * 0.35;
            const rot = Math.random() * 360;
            const gold = Math.random() < 0.45;
            const hue = gold ? 38 + Math.random() * 28 : 168 + Math.random() * 55;
            const drift = (Math.random() - 0.5) * 70;
            const size = 5 + Math.random() * 7;
            const duration = 1.35 + Math.random() * 0.55;
            return { i, leftPct, delay, rot, hue, drift, size, duration };
        });
    }, [showWinFxOverlay, jackalCelebrationKey]);

    const lossAmbientParticles = useMemo(() => {
        if (!showLossFxOverlay) return [];
        return Array.from({ length: 22 }).map((_, i) => ({
            i,
            leftPct: Math.random() * 100,
            delay: Math.random() * 0.8,
            duration: 2.8 + Math.random() * 1.8,
            y0: 10 + Math.random() * 40,
            opacity: 0.12 + Math.random() * 0.2,
            w: 2 + Math.random() * 3,
        }));
    }, [showLossFxOverlay, lossEffectKey]);

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
        setGameState('playing');
        const bet = parseFloat(amount) || 0;
        if (bet < MIN_AMOUNT || bet > MAX_AMOUNT || bet > balance) return;

        clearOutcomeFxTimer();
        setShowOutcomeFx(false);

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
        setLastWinSummary(null);

        setResultMessage(INITIAL_RESULT_MESSAGE);
    };

    const flipTile = (index) => {
        if (gameState !== 'playing') {
            toast.warning('You are not playing the game. Please start the game first.');
            return;  
        } 
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
                setLastWinSummary({
                    winAmount,
                    mult: effectiveMult,
                    turn: currentTurn,
                });
                setGameState('won');
                setResultMessage(
                    `Jackal found! You win ${winAmount.toFixed(2)}  (× ${effectiveMult.toFixed(2)} on flip ${currentTurn})`
                );
                armOutcomeFxAutoDismiss();
                resultGameMining(
                    { betAmt: parseFloat(amount), turn: maxTurns, multiplier: parseFloat(effectiveMult.toFixed(2)), isWin: true, currentTurn },
                    dispatch,
                    history
                );
            } else if (flippedCount + 1 >= maxTurns) {
                setLossEffectKey((k) => k + 1);
                setGameState('lost');
                setResultMessage('No jackal in your turns. Try again next time!');
                armOutcomeFxAutoDismiss();
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
                setLossEffectKey((k) => k + 1);
                setGameState('lost');
                setResultMessage('No jackal in your turns. Try again next time!');
                armOutcomeFxAutoDismiss();
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
                    /** Single row: all columns share the same track height (tallest cell). */
                    '1550px': 'minmax(450px, auto)',
                }}
                gap={{ base: '16px', md: '24px' }}
                w="100%"
                alignItems="stretch"
            >
                {/* Left – Bet & Turns */}
                <GridItem area="panel" minW="350px" display="flex" flexDirection="column" minH="0">
                    <Card
                        pt="30px"
                        pb="22px"
                        px="22px"
                        overflow="visible"
                        position="relative"
                        flex="1"
                        w="100%"
                        minH="450px"
                        h="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <CardBody
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="flex-start"
                            flex="1"
                            minH="0"
                            position="relative"
                        >
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
                            <VStack spacing="24px" align="center" w="100%" flex="1">
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
                <GridItem area="game" display="flex" flexDirection="column" minH="0">
                    <Card
                        pt="30px"
                        pb="22px"
                        px="22px"
                        overflow="visible"
                        position="relative"
                        flex="1"
                        w="100%"
                        minH="450px"
                        h="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        <CardBody
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            flex="1"
                            minH="0"
                            position="relative"
                        >
                            {/* <Image src={backgroundImage} alt="Background" position="absolute" top="0" left="0" right="0" bottom="0" zIndex={1} /> */}
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

                            <MiningTreasureGrid
                                tiles={tiles}
                                gameState={gameState}
                                flippedCount={flippedCount}
                                maxTurns={maxTurns}
                                jackalIndex={jackalIndex}
                                jackalCelebrationKey={jackalCelebrationKey}
                                flipTile={flipTile}
                            />

                            {/* Win / loss overlays — full-stage, modern glass + motion */}
                            <AnimatePresence>
                                {showWinFxOverlay && (
                                    <motion.div
                                        key={`win-${jackalCelebrationKey}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.28 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            zIndex: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '72px 12px 100px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            inset={0}
                                            bg="linear-gradient(165deg, rgba(0,40,48,0.55) 0%, rgba(0,0,0,0.72) 45%, rgba(20,10,8,0.65) 100%)"
                                            backdropFilter="blur(10px)"
                                            sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                        />
                                        {/* Soft vignette rings */}
                                        <motion.div
                                            aria-hidden
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 0.5, scale: 1 }}
                                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                            style={{
                                                position: 'absolute',
                                                width: 'min(420px, 90vw)',
                                                height: 'min(420px, 90vw)',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(0, 212, 255, 0.18)',
                                                boxShadow:
                                                    '0 0 80px rgba(0, 212, 255, 0.12), inset 0 0 60px rgba(0, 212, 255, 0.06)',
                                            }}
                                        />
                                        <motion.div
                                            aria-hidden
                                            animate={{ scale: [1, 1.04, 1], opacity: [0.25, 0.4, 0.25] }}
                                            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                                            style={{
                                                position: 'absolute',
                                                width: 'min(360px, 85vw)',
                                                height: 'min(360px, 85vw)',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(255, 200, 120, 0.12)',
                                            }}
                                        />

                                        {jackalCelebrationConfetti.map((c) => (
                                            <motion.div
                                                key={`${jackalCelebrationKey}-c-${c.i}`}
                                                initial={{ opacity: 0, y: -20, x: 0, rotate: c.rot, scale: 0.6 }}
                                                animate={{
                                                    opacity: [0, 1, 0.9, 0],
                                                    y: 220,
                                                    x: c.drift,
                                                    rotate: c.rot + 180,
                                                    scale: 1,
                                                }}
                                                transition={{ duration: c.duration, delay: c.delay, ease: [0.22, 1, 0.36, 1] }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '18%',
                                                    left: `${c.leftPct}%`,
                                                    width: `${c.size}px`,
                                                    height: `${c.size * 1.6}px`,
                                                    borderRadius: '3px',
                                                    background: `hsl(${c.hue} 78% 58%)`,
                                                    boxShadow: '0 0 14px rgba(255,255,255,0.15)',
                                                }}
                                            />
                                        ))}

                                        <motion.div
                                            initial={{ opacity: 0, y: 16, scale: 0.94 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.06 }}
                                            style={{
                                                position: 'relative',
                                                maxWidth: 'min(340px, 92vw)',
                                                width: '100%',
                                            }}
                                        >
                                            <Box
                                                borderRadius="20px"
                                                overflow="hidden"
                                                border="1px solid rgba(255,255,255,0.14)"
                                                bg="rgba(12, 18, 24, 0.55)"
                                                backdropFilter="blur(16px)"
                                                sx={{ WebkitBackdropFilter: 'blur(16px)' }}
                                                boxShadow="0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,212,255,0.08) inset"
                                                px={{ base: 5, md: 7 }}
                                                py={{ base: 5, md: 6 }}
                                                textAlign="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    letterSpacing="0.35em"
                                                    color="rgba(180, 240, 255, 0.85)"
                                                    mb={3}
                                                >
                                                    JACKAL FOUND
                                                </Text>
                                                <motion.div
                                                    initial={{ scale: 0.88, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.12 }}
                                                    style={{ marginBottom: 12 }}
                                                >
                                                    <Image
                                                        src={jackalImage}
                                                        alt="Jackal"
                                                        mx="auto"
                                                        maxH="100px"
                                                        objectFit="contain"
                                                        filter="drop-shadow(0 12px 28px rgba(0,0,0,0.65))"
                                                        draggable={false}
                                                    />
                                                </motion.div>
                                                {lastWinSummary && (
                                                    <>
                                                        <Text
                                                            fontSize={{ base: '36px', md: '42px' }}
                                                            fontWeight="900"
                                                            lineHeight="1"
                                                            letterSpacing="-0.03em"
                                                            fontFamily="system-ui, -apple-system, sans-serif"
                                                            bgGradient="linear(to-br, #ffffff, #7aebff, #c8f7ff)"
                                                            bgClip="text"
                                                            sx={{
                                                                WebkitBackgroundClip: 'text',
                                                                WebkitTextFillColor: 'transparent',
                                                            }}
                                                            mb={1}
                                                        >
                                                            ×{Number(lastWinSummary.mult).toFixed(2)}
                                                        </Text>
                                                        <Text fontSize="sm" color="rgba(255,255,255,0.55)" mb={1}>
                                                            Flip {lastWinSummary.turn} · payout
                                                        </Text>
                                                        <Text fontSize="xl" fontWeight="800" color="rgba(255,255,255,0.95)">
                                                            +${Number(lastWinSummary.winAmount).toFixed(2)}
                                                        </Text>
                                                    </>
                                                )}
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {showLossFxOverlay && (
                                    <motion.div
                                        key={`loss-${lossEffectKey}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.32 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            zIndex: 27,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '72px 12px 100px',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            position="absolute"
                                            inset={0}
                                            bg="linear-gradient(195deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 15, 25, 0.78) 50%, rgba(30, 20, 35, 0.7) 100%)"
                                            backdropFilter="blur(10px)"
                                            sx={{ WebkitBackdropFilter: 'blur(10px)' }}
                                        />
                                        {lossAmbientParticles.map((p) => (
                                            <motion.div
                                                key={`${lossEffectKey}-p-${p.i}`}
                                                initial={{ opacity: 0, y: `${p.y0}%` }}
                                                animate={{ opacity: [0, p.opacity, 0], y: ['10%', '110%'] }}
                                                transition={{
                                                    duration: p.duration,
                                                    delay: p.delay,
                                                    repeat: Infinity,
                                                    ease: 'linear',
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${p.leftPct}%`,
                                                    top: 0,
                                                    width: `${p.w}px`,
                                                    height: `${p.w * 4}px`,
                                                    borderRadius: '999px',
                                                    background:
                                                        'linear-gradient(180deg, rgba(148, 163, 184, 0.35) 0%, transparent 100%)',
                                                }}
                                            />
                                        ))}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 280, damping: 30, delay: 0.08 }}
                                            style={{ position: 'relative', maxWidth: 'min(320px, 90vw)', width: '100%' }}
                                        >
                                            <Box
                                                borderRadius="20px"
                                                border="1px solid rgba(148, 163, 184, 0.22)"
                                                bg="rgba(15, 18, 28, 0.5)"
                                                backdropFilter="blur(18px)"
                                                sx={{ WebkitBackdropFilter: 'blur(18px)' }}
                                                boxShadow="0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
                                                px={{ base: 5, md: 7 }}
                                                py={{ base: 6, md: 7 }}
                                                textAlign="center"
                                            >
                                                <Text
                                                    fontSize="10px"
                                                    fontWeight="800"
                                                    letterSpacing="0.32em"
                                                    color="rgba(148, 163, 184, 0.9)"
                                                    mb={3}
                                                >
                                                    ROUND COMPLETE
                                                </Text>
                                                <Text
                                                    fontSize={{ base: '22px', md: '24px' }}
                                                    fontWeight="800"
                                                    color="rgba(248, 250, 252, 0.96)"
                                                    lineHeight="1.35"
                                                    mb={2}
                                                >
                                                    The jackal stayed hidden
                                                </Text>
                                                <Text fontSize="sm" color="rgba(148, 163, 184, 0.88)" lineHeight="1.5">
                                                    Your picks are revealed — bet again when you are ready for another hunt.
                                                </Text>
                                                <Box
                                                    mt={4}
                                                    h="2px"
                                                    w="40px"
                                                    mx="auto"
                                                    borderRadius="full"
                                                    bg="linear-gradient(90deg, transparent, rgba(148,163,184,0.5), transparent)"
                                                />
                                            </Box>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            
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
