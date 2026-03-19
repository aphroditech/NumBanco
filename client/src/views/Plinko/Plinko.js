import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
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
    HStack,
} from '@chakra-ui/react';
import CasinoIcon from '@mui/icons-material/Casino';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import History from './PlinkoItem/History';
import RealView from './PlinkoItem/RealView';
import Loading from 'components/Loading/Loading';
import ballImage from 'assets/img/Plinko/ball.png';

const PLINKO_TOP_PEGS = 3;
const PLINKO_BOTTOM_PEGS = 12;
const PLINKO_ROWS = PLINKO_BOTTOM_PEGS - PLINKO_TOP_PEGS + 1;
const PEG_SIZE = 10;
const PEG_GAP = 24;
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;

const BUCKETS = [
    { value: 78, bg: '#e91e63' },
    { value: 9, bg: '#ff9800' },
    { value: 2.8, bg: '#ffb74d' },
    { value: 1, bg: '#ffeb3b' },
    { value: 0.3, bg: '#fff9c4' },
    { value: 0.2, bg: '#fff9c4' },
    { value: 0.3, bg: '#fff9c4' },
    { value: 1, bg: '#ffeb3b' },
    { value: 2.8, bg: '#ffb74d' },
    { value: 9, bg: '#ff9800' },
    { value: 78, bg: '#e91e63' },
];

const BOTTOM_ROW_WIDTH = PLINKO_BOTTOM_PEGS * PEG_SIZE + (PLINKO_BOTTOM_PEGS - 1) * PEG_GAP;
const BUTTON_ROW_OFFSET = PEG_SIZE / 2;
const BUTTON_WIDTH = PEG_SIZE + PEG_GAP;
const BALL_SIZE = 18;
const ROW_HEIGHT = PEG_SIZE + PEG_GAP;
const SEGMENT_DURATION_MS = 320;

/** (row 0..9, slot 0..10 or 0.5 for start) -> pixel { x, y } relative to pyramid wrapper (includes py 24) */
function getBallPixel(row, slot) {
    const rowWidth = (PLINKO_TOP_PEGS + row) * PEG_SIZE + (PLINKO_TOP_PEGS + row - 1) * PEG_GAP;
    const rowOffset = (BOTTOM_ROW_WIDTH - rowWidth) / 2;
    const x = rowOffset + (slot + 0.5) * (PEG_SIZE + PEG_GAP) + PEG_SIZE / 2;
    const y = 24 + row * ROW_HEIGHT + PEG_SIZE / 2;
    return { x, y };
}

/** Center of peg at (row, pegIndex); pegIndex 0..(PLINKO_TOP_PEGS+row-1) */
function getPegPixel(row, pegIndex) {
    const rowWidth = (PLINKO_TOP_PEGS + row) * PEG_SIZE + (PLINKO_TOP_PEGS + row - 1) * PEG_GAP;
    const rowOffset = (BOTTOM_ROW_WIDTH - rowWidth) / 2;
    const x = rowOffset + pegIndex * (PEG_SIZE + PEG_GAP) + PEG_SIZE / 2;
    const y = 24 + row * ROW_HEIGHT + PEG_SIZE / 2;
    return { x, y };
}

/** Pixel position for ball resting right above the button (centered on bucket, just above it) */
function getBallRestAboveButton(slotIndex) {
    const x = BUTTON_ROW_OFFSET + (slotIndex + 0.5) * BUTTON_WIDTH;
    const buttonTopY = 24 + PLINKO_ROWS * ROW_HEIGHT + (PEG_GAP + 6);
    const y = buttonTopY - BALL_SIZE / 2;
    return { x, y };
}

/** Generate path: at each peg the ball goes to one of the two slots below (left or right only). */
function generatePath() {
    const path = [{ row: 0, slot: 0.5 }];
    path.push({ row: 1, slot: Math.random() < 0.5 ? 0 : 1 });
    for (let i = 2; i < PLINKO_ROWS; i++) {
        const prev = path[i - 1].slot;
        const next = Math.max(0, Math.min(i + 1, prev + (Math.random() < 0.5 ? -1 : 1)));
        path.push({ row: i, slot: next });
    }
    return path;
}

export default function PlinkoPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('0.5');
    const [isDropping, setIsDropping] = useState(false);
    const [ballPath, setBallPath] = useState(null);
    const [ballPixel, setBallPixel] = useState(null);
    const [finalSlot, setFinalSlot] = useState(null);
    const [lastWin, setLastWin] = useState(null);
    const animRef = useRef(null);
    const user = useSelector((state) => state.user.userInfo) || {};
    const balance = Number(user?.balance ?? 0);
    const maxAmount = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balance));

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), (Math.floor(Math.random() * 10) + 1) * 100);
        return () => clearTimeout(timer);
    }, []);

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

    const handleDrop = () => {
        const bet = parseFloat(amount) || 0;
        if (bet < MIN_AMOUNT || bet > maxAmount || bet > balance || isDropping) return;
        const path = generatePath();
        const start = getBallPixel(0, 0.5);
        setBallPath(path);
        setBallPixel(start);
        setFinalSlot(null);
        setLastWin(null);
        setIsDropping(true);
    };

    // Animate ball: move between two points per step (slot -> peg bounce -> next slot)
    useEffect(() => {
        if (!ballPath || !isDropping || ballPath.length < 2) return;
        const expandedPixels = [getBallPixel(ballPath[0].row, ballPath[0].slot)];
        for (let i = 1; i < ballPath.length; i++) {
            expandedPixels.push(getPegPixel(ballPath[i].row, ballPath[i].slot));
            expandedPixels.push(getBallPixel(ballPath[i].row, ballPath[i].slot));
        }
        const subSegDuration = SEGMENT_DURATION_MS / 2;
        const totalSubSegments = expandedPixels.length - 1;
        const startTime = performance.now();

        const tick = (now) => {
            const elapsed = now - startTime;
            const subSeg = Math.min(totalSubSegments - 1, Math.floor(elapsed / subSegDuration));
            const from = expandedPixels[subSeg];
            const to = expandedPixels[subSeg + 1];
            const t = Math.min(1, (elapsed - subSeg * subSegDuration) / subSegDuration);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const x = from.x + (to.x - from.x) * ease;
            const y = from.y + (to.y - from.y) * ease;
            setBallPixel({ x, y });

            if (subSeg >= totalSubSegments - 1 && t >= 1) {
                const slot = ballPath[ballPath.length - 1].slot;
                setFinalSlot(slot);
                setBallPixel(getBallRestAboveButton(slot));
                const multiplier = BUCKETS[slot].value;
                setLastWin((parseFloat(amount) || 0) * multiplier);
                setTimeout(() => {
                    setIsDropping(false);
                    setBallPath(null);
                    setBallPixel(null);
                    setFinalSlot(null);
                    setLastWin(null);
                }, 1200);
                return;
            }
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [ballPath, isDropping]);

    if (isLoading) {
        return <Loading />;
    }

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
                {/* Left – Bet controls */}
                <GridItem area="panel" minW="350px">
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px">
                        <CardHeader mb="20px">
                            <Flex direction="column" alignSelf="flex-start">
                                <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                                    <CasinoIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Plinko
                                </Text>
                            </Flex>
                        </CardHeader>
                        <CardBody overflow="visible" display="flex" alignItems="center" justifyContent="center" minH="100%">
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
                                                placeholder="0.5"
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
                                                    onClick={() =>
                                                        setAmount(Math.max(MIN_AMOUNT, (parseFloat(amount || MIN_AMOUNT) / 2)).toFixed(2))
                                                    }
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
                                <Text color="#fff" fontSize="sm" fontWeight="bold" mb="8px" textAlign="left">
                                *You can bet between $0.5 and $20.
                                </Text>

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
                                    onClick={handleDrop}
                                    isDisabled={
                                        !amount ||
                                        parseFloat(amount) < MIN_AMOUNT ||
                                        balance < parseFloat(amount) ||
                                        isDropping
                                    }
                                >
                                    Drop
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* Center – Plinko board */}
                <GridItem area="game" minH="450px">
                    <Card minH="100%" w="100%" position="relative">
                        
                        <CardBody
                            overflow="visible"
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            minH="100%"
                            borderRadius="lg"
                        >

                            {/* Plinko pyramid: 10 rows of dots (3 → 12), evenly spaced */}
                            <Box display="flex" flexDirection="column" alignItems="center" py="24px">
                                <Box position="relative" w={`${BOTTOM_ROW_WIDTH}px`}>
                                    <Box
                                        display="flex"
                                        flexDirection="column"
                                        alignItems="center"
                                        gap={`${PEG_GAP}px`}
                                    >
                                        {Array.from({ length: PLINKO_ROWS }, (_, rowIndex) => {
                                            const pegCount = PLINKO_TOP_PEGS + rowIndex;
                                            return (
                                                <Flex key={rowIndex} gap={`${PEG_GAP}px`} justify="center" align="center">
                                                    {Array.from({ length: pegCount }, (_, pegIndex) => (
                                                        <Box
                                                            key={pegIndex}
                                                            w={`${PEG_SIZE}px`}
                                                            h={`${PEG_SIZE}px`}
                                                            borderRadius="50%"
                                                            bg="white"
                                                            boxShadow="0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9)"
                                                            flexShrink={0}
                                                        />
                                                    ))}
                                                </Flex>
                                            );
                                        })}
                                    </Box>

                                    {/* Outcome buttons: 11 rounded-rect buttons below, aligned with gaps between bottom dots */}
                                    <Flex
                                        w={`${BOTTOM_ROW_WIDTH}px`}
                                        pl={`${BUTTON_ROW_OFFSET}px`}
                                        // mt={`${PEG_GAP + 6}px`}
                                        gap="0"
                                        align="stretch"
                                    >
                                        {BUCKETS.map((bucket, i) => (
                                            <Flex
                                                key={i}
                                                w={`${BUTTON_WIDTH}px`}
                                                flexShrink={0}
                                                h="44px"
                                                align="center"
                                                justify="center"
                                                borderRadius="12px"
                                                bg={bucket.bg}
                                                border="2px solid rgba(255,255,255,0.9)"
                                                boxShadow="0 2px 6px rgba(0,0,0,0.25)"
                                            >
                                                <Text
                                                    fontSize="sm"
                                                    fontWeight="bold"
                                                    color="white"
                                                    textShadow="0 1px 2px #000, 0 0 1px #000"
                                                >
                                                    {bucket.value}
                                                </Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                        {/* Ball: only shown after user presses Drop, then while dropping or resting on bucket */}
                                        {ballPixel != null && (
                                            <Box
                                                position="absolute"
                                                left={`${ballPixel.x - BALL_SIZE / 2}px`}
                                                top={`${ballPixel.y - BALL_SIZE / 2}px`}
                                                w={`${BALL_SIZE}px`}
                                                h={`${BALL_SIZE}px`}
                                                borderRadius="50%"
                                                bgImage={ballImage}
                                                bgSize="cover"
                                                bgPosition="center"
                                                boxShadow="0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)"
                                                flexShrink={0}
                                                zIndex={10}
                                                pointerEvents="none"
                                            />
                                        )}
                                        {lastWin != null && (
                                            <Text
                                                position="absolute"
                                                left="50%"
                                                top="50%"
                                                transform="translate(-50%, -50%)"
                                                color="#00ff88"
                                                fontWeight="bold"
                                                fontSize="xl"
                                                textShadow="0 0 8px #000"
                                                zIndex={11}
                                                pointerEvents="none"
                                            >
                                                +{lastWin.toFixed(2)}
                                            </Text>
                                        )}
                                </Box>
                            </Box>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* Right – Real-time view */}
                <GridItem area="empty" minH="250px">
                    <RealView />
                </GridItem>
            </Grid>
            <History />
        </Box>
    );
}
