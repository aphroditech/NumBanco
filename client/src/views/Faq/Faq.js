import React, { useEffect, useState } from 'react';

import {
    Flex,
    Box,
    Stack,
    Text,
    Grid
} from '@chakra-ui/react';

import Card from 'components/Card/Card.js';
import { Accordion, AccordionIcon, AccordionItem, AccordionButton, AccordionPanel } from '@chakra-ui/react';

import { faqs } from 'variables/Faq';
import Loading from 'components/Loading/Loading';

function Faq() {

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
            <Grid templateColumns={{ sm: '1fr', md: '4fr'}} gap='18px' my='18px'>
                <Card>
                   <Accordion  borderRadius="15px" allowToggle>
                        {faqs.map((item, i) => (
                        <AccordionItem
                            key={i}
                            mb={4}
                            border="1px solid #6b7280"
                            // bg="#13072e"
                            borderRadius="xl"
                            color="white"
                            overflow="hidden"
                        >
                            <h2>
                                <AccordionButton
                                    px={6}
                                    py={5}
                                    _hover={{ bg: "whiteAlpha.100" }}
                                >
                                    <Box flex="1" textAlign="left" fontWeight="semibold">
                                        {item.q}
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                            </h2>
        
                            <AccordionPanel px={6} pb={6} fontSize="sm" opacity={0.85}>
                                <Stack spacing={3}>
                                    {Array.isArray(item.a) ? (
                                    item.a.map((step, index) => (
                                        <Flex key={index} align="flex-start" gap={3}>
                                        
                                            <Text>{step}</Text>
                                        </Flex>
                                    ))
                                    ) : (
                                    <Text>{item.a}</Text>
                                    )}
                                </Stack>
                            </AccordionPanel>
                        </AccordionItem>
                        ))}
                    </Accordion>
                </Card>
                
            </Grid>
        </Flex>
    );
}


export default Faq;


