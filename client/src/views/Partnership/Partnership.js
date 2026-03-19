import React, { useEffect, useState } from 'react';

import {
    Flex,
    Grid,
} from '@chakra-ui/react';

import PartnerEarningHistory from './PartnerItem/EarningHistory';
import RequestWithdraw from './PartnerItem/RequestWithdraw';
import Overview from './PartnerItem/Overview';
import SharePartnerLink from './PartnerItem/SharePartnerLink';
import Loading from 'components/Loading/Loading';

export default function Partnership() {
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
            <Overview />
            <Grid templateColumns={{ sm: '1fr', md: '3fr 3fr' }} gap='18px' my='6px' >
                <RequestWithdraw />
                <PartnerEarningHistory />
            </Grid>
            <SharePartnerLink />
        </Flex>
    );
}
