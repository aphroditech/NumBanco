import React, { useEffect, useState } from 'react';
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
import { getActiveUsers } from 'action';
import { useDispatch } from 'react-redux';
export default function Dashboard() {

    const dispatch = useDispatch();
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
    // useEffect(() => {
    //     const fetchActiveUsers = async () => {
    //         await getActiveUsers(dispatch);
    //     };
    //     fetchActiveUsers();
    // }, [dispatch]);
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        // Set initial width
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    // Determine if width is >= 1819px
    const isWideEnough = windowWidth >= 1893;
    return (
        <Flex flexDirection='column' pt={{ base: '120px', '992px': '75px' }}>
            <Overview />
            <Games />
            <VerticalSlider />
            <Grid 
                templateColumns={isWideEnough 
                    ? { base: '1fr', '992px': '1fr 1fr', lg: '1fr 1fr', '2lg': '1fr 1fr', xl: '1.2fr 1fr 1fr', '2xl': '3fr 3fr 3fr' }
                    : { base: '1fr', '992px': '1fr 1fr', lg: '1fr 1fr', '2lg': '1fr 1fr', xl: '1fr 1fr' }
                }
                gap='18px'
                my='18px'
                alignItems="stretch"
            >
                <Box
                    gridColumn={isWideEnough
                        ? { base: '1', '992px': '1', lg: '1', '2lg': '1', xl: 'auto', '2xl': '500px' }
                        : { base: '1', '992px': '1', lg: '1', '2lg': '1', xl: '1', '2xl': '500px' }
                    }
                    h="100%"
                    display="flex"
                    flexDirection="column"
                >
                    <LinkButtons />
                </Box>
                <Box
                    gridColumn={isWideEnough
                        ? { base: '1', '992px': '2', lg: '2', '2lg': '2', xl: 'auto', '2xl': '100px' }
                        : { base: '1', '992px': '2', lg: '2', '2lg': '2', xl: '2' }
                    }
                    h="100%"
                    display="flex"
                    flexDirection="column"
                >
                    <SalesChart />
                </Box>
                <Box
                    gridColumn={isWideEnough
                        ? { base: '1', '992px': '1 / -1', lg: '1 / -1', '2lg': '1 / -1', xl: 'auto', '2xl': 'auto' }
                        : { base: '1', '992px': '1 / -1', lg: '1 / -1', '2lg': '1 / -1', xl: '1 / -1' }
                    }
                    h="100%"
                    display="flex"
                    flexDirection="column"
                >
                    <RealTimeWinner />
                </Box>
            </Grid> 
            <Grid templateColumns={{ sm: '1fr', md: '1fr', '2lg': '2fr 4fr' }} gap='18px' my='6px' >
                <Transaction />
                <TopBestWinner />
            </Grid>
        </Flex>
    );
}