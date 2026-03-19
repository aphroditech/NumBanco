import React, { useEffect } from 'react';

import {
    Flex,
    Box,
    Stack,
    Text,
    Grid
} from '@chakra-ui/react';

import Card from 'components/Card/Card.js';
import DoveGame from "components/DoveGame";
import { onlineUser,  offlineUser } from 'action/BetActions';

function Dove() {

    useEffect(() => {
        onlineUser(6);
        return () => {
            offlineUser(6);
        };
    }, []);

    return (

        <Flex flexDirection='column' pt={{ base: '120px', md: '75px' }}>

            <Grid
                templateColumns={{ sm: '1fr', md: '4fr'}}
                gap='18px'
                my='18px'
            >

                <Card overflow="hidden">

                    <Stack spacing={4}>

                        <Box
                            w="100%"
                            maxW="1280px"
                            mx="auto"
                            minW={0}
                            overflow="hidden"
                            borderRadius="md"
                        >

                            <DoveGame/>

                        </Box>

                    </Stack>

                </Card>

            </Grid>

        </Flex>

    );

}

export default Dove;