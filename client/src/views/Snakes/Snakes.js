import React, { useEffect, useState } from 'react';
import {
    Box,
    Grid,
    GridItem,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import History from './SnakesItem/History';
import Result from './SnakesItem/Results';
import RealView from './SnakesItem/RealView';
import Loading from 'components/Loading/Loading';

export default function SnakesPage() {
    const [isLoading, setIsLoading] = useState(true);

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
            <Result />
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
                {/* Game Control Section */}
                <GridItem area="panel" minW={"350px"}>
                    <Card pt="30px" pb="22px" px="22px" overflow="visible" minH="650px">
                    </Card>
                </GridItem>
                {/* Main Game Section */}
                <GridItem area="game" minH={'650px'}>
                    <Card pt="30px" pb="22px" px="22px" minH="100%" alignItems="center" w="100%">
                    </Card>
                </GridItem>
                {/* Real Time User section */}
                <GridItem area="empty" minH="250px">
                    <RealView />
                </GridItem>
            </Grid>
            {/* User Bet History Section */}
            <History />
        </Box>
    );
}