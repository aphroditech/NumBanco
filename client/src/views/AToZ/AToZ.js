import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Text,
    VStack,
    HStack,
    Flex,
    Button,
    Input,
    IconButton,
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import AToZGame from './AToZGame';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

/** Match Rocket Shot bet range and step */
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 20;
const AMOUNT_STEP = 0.5;

export default function AToZPage() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const walletBalance = user.balance;
    const balanceNum = Number(walletBalance);
    const maxAmount = Number.isFinite(balanceNum)
        ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, balanceNum))
        : MAX_AMOUNT;

    const [amount, setAmount] = useState(MIN_AMOUNT);
    const [isSpinning, setIsSpinning] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [historyRows, setHistoryRows] = useState([]);

    const handleAmountChange = (e) => {
        const raw = e.target.value;
        const v = parseFloat(raw);
        if (v >= MIN_AMOUNT && v <= maxAmount) {
            setAmount(v);
        }
    };

    const canSpin = useMemo(() => {
        const n = Number(amount);
        if (!Number.isFinite(n) || isSpinning) return false;
        if (n < MIN_AMOUNT || n > maxAmount) return false;
        if (Number.isFinite(balanceNum) && n > balanceNum) return false;
        return true;
    }, [amount, isSpinning, maxAmount, balanceNum]);

    useEffect(() => {
        window.onAToZSpinComplete = (result) => {
            setIsSpinning(false);
            setLastResult(result);
            setHistoryRows((prev) => [result, ...prev].slice(0, 20));
        };

        return () => {
            if (window.onAToZSpinComplete) window.onAToZSpinComplete = undefined;
        };
    }, []);

    // Keep amount in range when balance / max changes (same idea as Rocket Shot cap)
    useEffect(() => {
        setAmount((prev) => {
            let next = prev;
            if (next > maxAmount) next = maxAmount;
            if (next < MIN_AMOUNT) next = MIN_AMOUNT;
            return next;
        });
    }, [maxAmount]);

    const handleSpin = () => {
        if (!canSpin) return;
        const bet = parseFloat(amount);
        window.__atozBetAmount = bet;

        if (typeof window.spinAToZ === 'function') {
            const started = window.spinAToZ();
            if (started) setIsSpinning(true);
        }
    };

    return (
        <Box
            px={{ base: '12px', md: '22px' }}
            minH="100vh"
            marginTop="100px"
            w="100%"
            maxW="100%"
            bg="transparent"
        >
            <Grid
                templateAreas={{
                    base: '"game" "side"',
                    xl: '"game side"',
                }}
                templateColumns={{
                    base: '1fr',
                    lg: '1fr',
                    xl: '5fr 3fr',
                }}
                gap={{ base: '14px', md: '18px' }}
                w="100%"
            >
                {/* Main Game Area */}
                <GridItem area="game">
                    <Card minH={{ base: '420px', md: '640px' }} w="100%" overflow="hidden">
                        <CardBody p="0" flexDirection="column" h="100%">
                            <Box
                                w="100%"
                                h="100%"
                                minH={{ base: '360px', md: '560px' }}
                                bg="#000"
                                position="relative"
                            >
                                <AToZGame />
                            </Box>
                            <Box
                                w="100%"
                                pt="12px"
                                pb="14px"
                                bg="linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 100%)"
                                borderTop="1px solid rgba(0, 212, 255, 0.3)"
                            >
                                <VStack spacing="14px" align="center" w="100%" maxW="560px" mx="auto" px="16px">
                                    {/* Bet amount — same pattern as Rocket Shot */}
                                    <Flex align="center" justify="center" gap="6px" flexWrap="wrap" w="100%">
                                        <Button
                                            size="sm"
                                            h="32px"
                                            minW="44px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => setAmount(MIN_AMOUNT)}
                                        >
                                            Min
                                        </Button>
                                        <HStack
                                            spacing="4px"
                                            bg="#323738"
                                            borderRadius="8px"
                                            px="6px"
                                            h="36px"
                                            border="1px solid rgba(255, 255, 255, 0.1)"
                                        >
                                            <IconButton
                                                aria-label="Decrease bet"
                                                icon={<RemoveIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={() => setAmount(amount - AMOUNT_STEP)}
                                                isDisabled={amount - AMOUNT_STEP < MIN_AMOUNT}
                                            />
                                            <Input
                                                type="number"
                                                value={amount}
                                                onChange={handleAmountChange}
                                                min={MIN_AMOUNT}
                                                max={maxAmount}
                                                step={AMOUNT_STEP}
                                                w={{ base: '72px', sm: '80px' }}
                                                textAlign="center"
                                                fontSize="md"
                                                fontWeight="bold"
                                                color="#fff"
                                                bg="transparent"
                                                border="none"
                                                p="0"
                                                _focus={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                                                _hover={{ border: 'none' }}
                                                sx={{
                                                    MozAppearance: 'textfield',
                                                    '&::-webkit-outer-spin-button': {
                                                        WebkitAppearance: 'none',
                                                        margin: 0,
                                                    },
                                                    '&::-webkit-inner-spin-button': {
                                                        WebkitAppearance: 'none',
                                                        margin: 0,
                                                    },
                                                }}
                                            />
                                            <IconButton
                                                aria-label="Increase bet"
                                                icon={<AddIcon style={{ fontSize: 16 }} />}
                                                size="xs"
                                                h="28px"
                                                w="28px"
                                                minW="28px"
                                                bg="transparent"
                                                color="#fff"
                                                borderRadius="6px"
                                                _hover={{ bg: 'rgba(255,255,255,0.1)' }}
                                                onClick={() => setAmount(amount + AMOUNT_STEP)}
                                                isDisabled={amount + AMOUNT_STEP > maxAmount}
                                            />
                                        </HStack>
                                        <Button
                                            size="sm"
                                            h="32px"
                                            minW="44px"
                                            px="10px"
                                            fontSize="xs"
                                            fontWeight="bold"
                                            bg="rgba(0, 212, 255, 0.2)"
                                            color="#00D4FF"
                                            border="1px solid rgba(0, 212, 255, 0.5)"
                                            borderRadius="8px"
                                            _hover={{ bg: 'rgba(0, 212, 255, 0.3)' }}
                                            onClick={() => setAmount(maxAmount)}
                                        >
                                            Max
                                        </Button>
                                    </Flex>

                                    <HStack spacing="10px" align="center" flexWrap="wrap" justify="center" w="100%">
                                        <Button
                                            h="36px"
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
                                            isDisabled={!canSpin}
                                            title={
                                                amount < MIN_AMOUNT
                                                    ? `Enter at least $${MIN_AMOUNT}`
                                                    : amount > maxAmount
                                                      ? `Max bet is $${maxAmount}`
                                                      : ''
                                            }
                                            onClick={handleSpin}
                                        >
                                            {isSpinning ? 'Spinning...' : 'Bet / Spin'}
                                        </Button>
                                    </HStack>
                                </VStack>
                            </Box>
                        </CardBody>
                    </Card>
                </GridItem>

                {/* History Area */}
                <GridItem area="side">
                    <Card minH={{ base: '320px', md: '640px' }} h="100%">
                        <CardHeader pb="8px">
                            <Text color="#fff" fontWeight="700" fontSize="md">History</Text>
                        </CardHeader>
                        <CardBody pt="0" maxH={{ base: '320px', md: '580px' }} overflowY="auto">
                            <VStack align="stretch" spacing="8px">
                                {historyRows.length === 0 && (
                                    <Text color="whiteAlpha.600" fontSize="sm">
                                        No rounds yet.
                                    </Text>
                                )}
                                {historyRows.map((row, i) => (
                                    <Box
                                        key={`${row.word}-${i}`}
                                        p="8px"
                                        borderRadius="8px"
                                        bg="rgba(255,255,255,0.05)"
                                        border="1px solid rgba(255,255,255,0.08)"
                                    >
                                        <HStack justify="space-between">
                                            <Text color="#fff" fontWeight="700" fontSize="sm">{row.word}</Text>
                                            <Text
                                                fontSize="xs"
                                                fontWeight="700"
                                                color={row.isWin ? '#23F6A7' : '#FF6A7E'}
                                            >
                                                {row.isWin ? `WIN x${row.multiplier}` : 'LOSE'}
                                            </Text>
                                        </HStack>
                                        <Text color="whiteAlpha.700" fontSize="xs" mt="2px">
                                            Bet: ${Number(row.betAmount || 0).toFixed(2)} | Win: ${Number(row.winAmount || 0).toFixed(2)}
                                        </Text>
                                    </Box>
                                ))}
                            </VStack>
                        </CardBody>
                    </Card>
                </GridItem>
            </Grid>
        </Box>
    );
}