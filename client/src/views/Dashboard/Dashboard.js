import React from 'react';
import {
    Flex,
    Grid,
} from '@chakra-ui/react';
import Games from './DashboardItem/Games';
import Overview from './DashboardItem/Overview';
import LinkButtons from './DashboardItem/LinkButtons';
import RealTimeWinner from './DashboardItem/RealTimeWinner';
import Transaction from './DashboardItem/Transaction';
import TopBestWinner from './DashboardItem/TopBestWinner';
import VerticalSlider from '../../components/Slider/VerticalSlider';
import SalesChart from './DashboardItem/GraphAndTable';
import { Box } from "@chakra-ui/react";
export default function Dashboard() {
    return (
        <Flex flexDirection='column' pt={{ base: '120px', '992px': '75px' }}>
            <Overview />
            <Games />
            <VerticalSlider />
            <Grid 
                templateColumns={{ base: '1fr', lg: '1fr', xl: '1fr', '2xl': 'repeat(3, 1fr)' }}
                gridAutoRows={{ base: 'auto', '2xl': '520px' }}
                gap='18px'
                my='18px'
                alignItems="stretch"
            >
                <Box
                    gridColumn={{ base: '1', '2xl': '1' }}
                    h="100%"
                    display="flex"
                    flexDirection="column"
                    minW={0}
                >
                    <LinkButtons />
                </Box>
                <Box
                    gridColumn={{ base: '1', '2xl': '2' }}
                    h="100%"
                    display="flex"
                    flexDirection="column"
                    minW={0}
                >
                    <SalesChart />
                </Box>
                <Box
                    gridColumn={{ base: '1', '2xl': '3' }}
                    h="100%"
                    display="flex"
                    flexDirection="column"
                    minW={0}
                >
                    <RealTimeWinner />
                </Box>
            </Grid> 
            <Grid templateColumns={{ base: '1fr', '2xl': '1fr 2fr' }} gap='18px' my='6px' >
                <Box gridColumn={{ base: '1', '2xl': '1' }} minW={0}>
                    <Transaction />
                </Box>
                <Box gridColumn={{ base: '1', '2xl': '2' }} minW={0}>
                    <TopBestWinner />
                </Box>
            </Grid>
        </Flex>
    );
}