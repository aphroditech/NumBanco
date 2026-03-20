import React, { useState, useEffect, useMemo } from 'react';
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
import { useHistory } from 'react-router-dom';

const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const TOTAL_TILES = 16;
const MIN_TURNS = 1;
const MAX_TURNS = 8;

function getMultiplier(turns) {
    if (turns < MIN_TURNS || turns > MAX_TURNS) return 0;
    return (16 / turns).toFixed(2);
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

    const [canWin, setCanWin] = useState(false);

    const multiplier = useMemo(() => getMultiplier(maxTurns), [maxTurns]);
    const potentialWin = (parseFloat(amount) || 0) * parseFloat(multiplier);

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
        setGameState('playing');
        setResultMessage('');
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
                setGameState('won');
                setResultMessage(`Jackal found! You win ${potentialWin.toFixed(2)}`);
                resultGameMining({ betAmt: parseFloat(amount), turn: maxTurns, isWin: true }, dispatch, history);
            } else if (flippedCount + 1 >= maxTurns) {
                setGameState('lost');
                setResultMessage('No jackal in your turns. Try again!');
                setTiles((prev) => {
                    const next = [...prev];
                    next[jackalIndex] = true;
                    return next;
                });
                resultGameMining({ betAmt: parseFloat(amount), turn: maxTurns, isWin: false }, dispatch, history);
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
                setResultMessage('No jackal in your turns. Try again!');
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
                                    <HStack justify="space-between" mb="8px">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Multiplier</Text>
                                        <Text fontSize="lg" fontWeight="bold" color="#00D4FF">{multiplier}×</Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text fontSize="sm" color="rgba(255,255,255,0.7)">Potential win</Text>
                                        <Text fontSize="md" fontWeight="bold" color="#fff">{potentialWin.toFixed(2)}</Text>
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

                            <Text fontSize="sm" color="rgba(255,255,255,0.6)" mb="16px">
                                Find the jackal in up to {maxTurns} flips. One of 16 tiles hides the jackal.
                            </Text>

                            <Grid
                                templateColumns="repeat(4, 1fr)"
                                gap="10px"
                                w="100%"
                                maxW="320px"
                            >
                                {tiles.map((revealed, index) => (
                                    <Button
                                        key={index}
                                        h="64px"
                                        w="100%"
                                        minW="0"
                                        fontSize="lg"
                                        fontWeight="bold"
                                        borderRadius="12px"
                                        bg={
                                            revealed === null
                                                ? '#323738'
                                                : revealed === true
                                                    ? 'red.500'
                                                    : 'rgba(255,255,255,0.12)'
                                        }
                                        color={revealed === true ? '#fff' : 'rgba(255,255,255,0.9)'}
                                        border="2px solid"
                                        borderColor={
                                            revealed === null
                                                ? 'rgba(0, 212, 255, 0.3)'
                                                : revealed === true
                                                    ? 'red.400'
                                                    : 'rgba(255,255,255,0.2)'
                                        }
                                        _hover={
                                            gameState === 'playing' && revealed === null && flippedCount < maxTurns
                                                ? {
                                                    bg: 'rgba(0, 212, 255, 0.2)',
                                                    borderColor: '#00D4FF',
                                                    transform: 'scale(1.02)',
                                                }
                                                : {}
                                        }
                                        isDisabled={gameState !== 'playing' || revealed !== null || flippedCount >= maxTurns}
                                        onClick={() => flipTile(index)}
                                    >
                                        {revealed === null ? '?' : revealed === true ? '🐺' : '—'}
                                    </Button>
                                ))}
                            </Grid>

                            {resultMessage && (
                                <Box
                                    mt="20px"
                                    px="16px"
                                    py="10px"
                                    borderRadius="10px"
                                    bg={gameState === 'won' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}
                                    border="1px solid"
                                    borderColor={gameState === 'won' ? 'green.400' : 'red.400'}
                                >
                                    <Text fontWeight="bold" color={gameState === 'won' ? 'green.300' : 'red.300'}>
                                        {resultMessage}
                                    </Text>
                                </Box>
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
                        <HandshakeRoundedIcon
                            style={{
                                fontSize: "26px",
                                color: "#00D4FF",
                                marginRight: "8px"
                            }}
                        />
                        How to Play Mining Game
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    💰 How to Play 
                                </Text>
                                <Text>
                                    1. The player selects a bet amount and chooses the number of turns they want to play.
                                </Text>
                                <Text>
                                    2. For each turn, the player flips one card.
                                </Text>
                                <Text>
                                    3. The goal is to find a jackal card while flipping.
                                </Text>
                                <Text>
                                    4. If a jackal appears within the selected turns, the player wins.
                                </Text>
                                <Text>
                                    5. The winning amount is calculated by multiplying the bet with the game’s multiplier.
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
