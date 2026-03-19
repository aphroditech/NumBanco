import React, { useEffect, useState } from 'react';
import {
    Flex,
    Grid,
} from '@chakra-ui/react';
import History from './DepositItem/History';
import Main from './DepositItem/Main';
import Loading from 'components/Loading/Loading';

export default function Deposit() {
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
        <Flex flexDirection='column' pt={{ base: '120px', md: '75px' }}>
            <Grid templateColumns={{ sm: '1fr', md: '1fr', '1115px': '3fr 4fr' }} gap='18px' my='18px' >
                <Main />
                <History />
            </Grid>
        </Flex>
    );
}
