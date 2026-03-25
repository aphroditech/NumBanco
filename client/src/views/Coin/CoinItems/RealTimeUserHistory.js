import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import Card from 'components/Card/Card.js';

export default function RealTimeUserHistory() {
    return (
        <Card
        p={{ base: '16px', md: '20px' }}
        minH={{ base: '420px', md: '560px' }}
        h="100%"
        display="flex"
        flexDirection="column"
        border="1px solid rgba(0, 212, 255, 0.2)"
    >
        <VStack align="stretch" spacing={3} h="100%">
            <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="800" color="#00D4FF">
                Real-Time Users
            </Text>
            <Box flex="1" minH="0">
                
            </Box>
        </VStack>
    </Card>
    );
}