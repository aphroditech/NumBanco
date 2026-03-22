import React from 'react';
import { GridItem, Box, Text, Table, Thead, Tbody, Tr, Th, Td, Flex, Tooltip, HStack } from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';

export default function RealTimeHistory() {
    return (
        <GridItem area="side">
            <Card minH={{ base: '320px', md: '640px' }} h="100%">
                <CardHeader pb="8px">
                    <Text color="#fff" fontWeight="700" fontSize="md">Real Time A to Z History</Text>
                </CardHeader>
                <CardBody pt="0" maxH={{ base: '320px', md: '580px' }} overflowY="auto">
                    
                </CardBody>
            </Card>
        </GridItem>
    );
}