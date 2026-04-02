import React, { useState } from 'react';
import {
    Box,
    Text,
    Input,
    Button,
    VStack,
    HStack,
    Divider,
    useToast,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
} from '@chakra-ui/react';

const BettingPanel = ({ onRoll, isRolling, balance, lastWin, multiplier }) => {
    const [betAmount, setBetAmount] = useState('10');
    const toast = useToast();

    const handleRoll = () => {
        const bet = parseFloat(betAmount);
        if (isNaN(bet) || bet <= 0) {
            toast({
                title: 'Invalid bet amount',
                description: 'Please enter a valid positive number',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (bet > balance) {
            toast({
                title: 'Insufficient balance',
                description: 'You do not have enough balance for this bet',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        onRoll(bet);
    };

    const quickBetAmounts = [10, 25, 50, 100, 250, 500];

    return (
        <VStack spacing={4} align="stretch" w="100%">
            <Box>
                <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>
                    Two Dice Game
                </Text>
                <Text fontSize="sm" color="gray.400">
                    Roll two dice and win based on sum + product multiplier!
                </Text>
            </Box>

            <Divider borderColor="gray.600" />

            <Box>
                <Stat>
                    <StatLabel color="gray.400">Balance</StatLabel>
                    <StatNumber color="white">${balance.toFixed(2)}</StatNumber>
                </Stat>
            </Box>

            <Box>
                <Text color="gray.300" mb={2}>Bet Amount</Text>
                <Input
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter bet amount"
                    color="white"
                    borderColor="gray.600"
                    _focus={{ borderColor: 'blue.400' }}
                    isDisabled={isRolling}
                />
                <HStack mt={2} spacing={2} wrap="wrap">
                    {quickBetAmounts.map((amount) => (
                        <Button
                            key={amount}
                            size="sm"
                            variant="outline"
                            borderColor="gray.600"
                            color="gray.300"
                            _hover={{ bg: 'gray.700', borderColor: 'blue.400' }}
                            onClick={() => setBetAmount(amount.toString())}
                            isDisabled={isRolling}
                        >
                            ${amount}
                        </Button>
                    ))}
                </HStack>
            </Box>

            <Button
                colorScheme="blue"
                size="lg"
                onClick={handleRoll}
                isLoading={isRolling}
                loadingText="Rolling..."
                isDisabled={isRolling}
                w="100%"
            >
                Roll Dice
            </Button>

            {lastWin !== null && (
                <Box
                    p={4}
                    bg={lastWin > 0 ? 'green.900' : 'red.900'}
                    border="1px solid"
                    borderColor={lastWin > 0 ? 'green.400' : 'red.400'}
                    borderRadius="md"
                >
                    <VStack spacing={2} align="center">
                        <Text color="gray.300" fontSize="sm">Last Result</Text>
                        {multiplier > 0 && (
                            <Text color="yellow.400" fontSize="md">
                                Multiplier: {multiplier}x
                            </Text>
                        )}
                        <Text
                            color={lastWin > 0 ? 'green.400' : 'red.400'}
                            fontSize="lg"
                            fontWeight="bold"
                        >
                            {lastWin > 0 ? `Won $${lastWin.toFixed(2)}` : `Lost $${Math.abs(lastWin).toFixed(2)}`}
                        </Text>
                    </VStack>
                </Box>
            )}

            <Box bg="gray.800" p={3} borderRadius="md">
                <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={2}>
                    How to Play:
                </Text>
                <VStack align="start" spacing={1}>
                    <Text color="gray.400" fontSize="xs">
                        • Place your bet amount
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                        • Roll two dice
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                        • Multiplier = (Dice 1 × Dice 2) ÷ (Dice 1 + Dice 2)
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                        • Win = Bet Amount × Multiplier
                    </Text>
                </VStack>
            </Box>
        </VStack>
    );
};

export default BettingPanel;
