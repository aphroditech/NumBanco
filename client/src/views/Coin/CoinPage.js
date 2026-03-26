import React from 'react';
import {
    Box,
    Grid,
    GridItem,
    Text,
    VStack,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';

import CoinHistory from './CoinItems/CoinHistory';
import MainGameSection from './CoinItems/MainGameSection';
import RealTimeUserHistory from './CoinItems/RealTimeUserHistory';

export default function CoinPage() {
    return (
        <Box px={{ base: '16px', md: '24px' }} minH="100vh" bg="transparent" marginTop="100px" w="100%" maxW="100%">
            <Grid
                templateAreas={{
                    base: '"game" "users"',
                    xl: '"game users"',
                }}
                templateColumns={{
                    base: '1fr',
                    xl: '3fr 2fr',
                }}
                gap={{ base: '14px', md: '18px' }}
                w="100%"
                alignItems="stretch"
            >
                <GridItem area="game">
                    <MainGameSection />
                </GridItem>

                <GridItem area="users">
                    <RealTimeUserHistory />
                </GridItem>
            </Grid>
            <CoinHistory />
        </Box>
    );
}