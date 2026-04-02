import React, { useEffect, useState, useRef } from 'react';
import {
    Box,
    Grid,
    GridItem,
    VStack,
    Text,
    HStack,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import History from './TwoDiceItem/History';
import RealView from './TwoDiceItem/RealView';
import Loading from 'components/Loading/Loading';
import TwoDiceCanvas3D from './TwoDiceItem/TwoDiceCanvas3D';
import BettingPanel from './TwoDiceItem/BettingPanel';

export default function TwoDicePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [balance, setBalance] = useState(1000);
    const [isRolling, setIsRolling] = useState(false);
    const [lastWin, setLastWin] = useState(null);
    const [multiplier, setMultiplier] = useState(0);
    const [diceValues, setDiceValues] = useState([1, 1]);
    const [gameHistory, setGameHistory] = useState([]);
    const [currentBet, setCurrentBet] = useState(0);
    const diceRef = useRef(null);

    const calculateMultiplier = (dice1, dice2) => {
        const sum = dice1 + dice2;
        const product = dice1 * dice2;
        return product / sum;
    };

    const handleRoll = (betAmount) => {
        if (isRolling) return;
        
        setIsRolling(true);
        setLastWin(null);
        setMultiplier(0);
        setCurrentBet(betAmount);
        
        // Deduct bet from balance
        setBalance(prev => prev - betAmount);
        
        // Roll the dice
        const result = diceRef.current?.roll();
        if (result) {
            // The roll function returns the dice values, but we'll wait for the animation
            // to complete before calculating winnings
        }
    };

    const handleRollComplete = (values) => {
        const [dice1, dice2] = values;
        setDiceValues(values);
        
        const mult = calculateMultiplier(dice1, dice2);
        setMultiplier(mult);
        
        // Calculate winnings
        const winnings = currentBet * mult;
        
        setBalance(prev => prev + winnings);
        setLastWin(winnings - currentBet);
        
        // Add to history
        const historyEntry = {
            id: Date.now(),
            dice1,
            dice2,
            multiplier: mult,
            bet: currentBet,
            win: winnings - currentBet,
            timestamp: new Date().toISOString(),
        };
        setGameHistory(prev => [historyEntry, ...prev].slice(0, 10)); // Keep last 10 entries
        
        setIsRolling(false);
    };

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    sm: '"panel" "game" "empty"',
                    md: '"panel empty" "game game"',
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
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="450px">
                        <BettingPanel
                            onRoll={handleRoll}
                            isRolling={isRolling}
                            balance={balance}
                            lastWin={lastWin}
                            multiplier={multiplier}
                        />
                    </Card>
                </GridItem>
                <GridItem area="game" minH={'450px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                        <VStack spacing={4} w="100%" h="100%">
                            <TwoDiceCanvas3D
                                ref={diceRef}
                                onRollComplete={handleRollComplete}
                                height={350}
                            />
                            {diceValues && (
                                <HStack spacing={4}>
                                    <Box
                                        bg="gray.800"
                                        px={4}
                                        py={2}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="gray.600"
                                    >
                                        <Text color="white" fontSize="lg" fontWeight="bold">
                                            Dice 1: {diceValues[0]}
                                        </Text>
                                    </Box>
                                    <Box
                                        bg="gray.800"
                                        px={4}
                                        py={2}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="gray.600"
                                    >
                                        <Text color="white" fontSize="lg" fontWeight="bold">
                                            Dice 2: {diceValues[1]}
                                        </Text>
                                    </Box>
                                    <Box
                                        bg="blue.900"
                                        px={4}
                                        py={2}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="blue.400"
                                    >
                                        <Text color="blue.400" fontSize="lg" fontWeight="bold">
                                            Sum: {diceValues[0] + diceValues[1]}
                                        </Text>
                                    </Box>
                                    <Box
                                        bg="purple.900"
                                        px={4}
                                        py={2}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="purple.400"
                                    >
                                        <Text color="purple.400" fontSize="lg" fontWeight="bold">
                                            Product: {diceValues[0] * diceValues[1]}
                                        </Text>
                                    </Box>
                                </HStack>
                            )}
                        </VStack>
                    </Card>
                </GridItem>
                <GridItem area="empty" minH="250px">
                    <RealView />
                </GridItem>
            </Grid>
            <History history={gameHistory} />
        </Box>
    );
}