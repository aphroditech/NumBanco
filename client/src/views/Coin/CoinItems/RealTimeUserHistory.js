import React, { useEffect, useState } from 'react';
import { Box, Text, VStack, Flex, Avatar, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import { useAblyCoinFlipResult } from 'hooks/useAblyCoinFlipResult';
import wolfnoavilable from 'assets/img/wolfnoavilable.png';
import { getCoinFlipResults } from 'action/CoinActions';
import { useHistory } from 'react-router-dom';
import Loading from 'components/Loading/Loading';

function fmtMoney(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0.00';
    return v.toFixed(2);
}

export default function RealTimeUserHistory() {
    const { coinFlipResults, setCoinFlipResults } = useAblyCoinFlipResult();
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        (async () => {
            const results = await getCoinFlipResults(history);
            setCoinFlipResults(results || []);
            setIsLoading(false);
        })();
    }, [history]);


    if (isLoading) {
        return <Loading />;
    }

    return (
        <Card
            p={{ base: '14px', md: '18px' }}
            minH={{ base: '420px', md: '560px' }}
            h="100%"
            display="flex"
            flexDirection="column"
            bg="#2a2d2e"
            borderRadius="12px"
            boxShadow="none"
            border="1px solid rgba(0, 212, 255, 0.2)"

        >
            <VStack align="stretch" spacing={3} h="100%">
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="#ffffff" letterSpacing="-0.01em">
                    Real Time Users
                </Text>
                <Box flex="1" minH="0" overflow="auto">
                    <Table variant="unstyled" width="100%" sx={{ tableLayout: 'fixed' }}>
                        <Thead position="sticky" top={0} bg="#2a2d2e" zIndex={1}>
                            <Tr>
                                <Th
                                    px={0}
                                    py={2}
                                    pb={3}
                                    borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                    color="rgba(255, 255, 255, 0.45)"
                                    fontSize="10px"
                                    fontWeight="600"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                    textAlign="left"
                                    w="48%"
                                >
                                    User
                                </Th>
                                <Th
                                    px={2}
                                    py={2}
                                    pb={3}
                                    borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                    color="rgba(255, 255, 255, 0.45)"
                                    fontSize="10px"
                                    fontWeight="600"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                    textAlign="right"
                                    w="26%"
                                >
                                    Bet($)
                                </Th>
                                <Th
                                    px={2}
                                    py={2}
                                    pb={3}
                                    borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                    color="rgba(255, 255, 255, 0.45)"
                                    fontSize="10px"
                                    fontWeight="600"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                    textAlign="right"
                                    w="26%"
                                >
                                    Flip
                                </Th>
                                <Th
                                    px={2}
                                    py={2}
                                    pb={3}
                                    borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                    color="rgba(255, 255, 255, 0.45)"
                                    fontSize="10px"
                                    fontWeight="600"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                    textAlign="right"
                                    w="26%"
                                >
                                    Result
                                </Th>
                                <Th
                                    px={0}
                                    py={2}
                                    pb={3}
                                    borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                    color="rgba(255, 255, 255, 0.45)"
                                    fontSize="10px"
                                    fontWeight="600"
                                    textTransform="uppercase"
                                    letterSpacing="0.06em"
                                    textAlign="right"
                                    w="26%"
                                >
                                    Win
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {coinFlipResults.map((row, index) => {
                                const winVal = Number(row.winAmount);
                                const isPositiveWin = Number.isFinite(winVal) && winVal > 0;
                                const rowColor = isPositiveWin ? '#4caf50' : '#f44336';
                                return (
                                    <Tr key={`${row.userName}-${row.date}-${index}`}>
                                        <Td
                                            px={0}
                                            py={2.5}
                                            borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                            verticalAlign="middle"
                                        >
                                            <Flex align="center" gap="10px" minW={0}>
                                                <Avatar
                                                    src={row.avatar || wolfnoavilable}
                                                    boxSize="28px"
                                                    flexShrink={0}
                                                />
                                                <Text
                                                    fontSize="sm"
                                                    fontWeight="500"
                                                    color={rowColor}
                                                    noOfLines={1}
                                                    title={row.userName}
                                                    minW={0}
                                                >
                                                    {row.userName}
                                                </Text>
                                            </Flex>
                                        </Td>
                                        <Td
                                            px={2}
                                            py={2.5}
                                            borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                            textAlign="right"
                                            verticalAlign="middle"
                                        >
                                            <Text fontSize="sm" fontWeight="700" color={rowColor} /* fontVariantNumeric="tabular-nums" */>
                                                {fmtMoney(row.betAmount)}
                                            </Text>
                                        </Td>
                                        <Td
                                            px={2}
                                            py={2.5}
                                            borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                            textAlign="right"
                                            verticalAlign="middle"
                                        >
                                            <Text fontSize="sm" fontWeight="700" color={rowColor} /* fontVariantNumeric="tabular-nums" */>
                                                {row.flip ? 'Head' : 'Tail'}
                                            </Text>
                                        </Td>
                                        <Td
                                            px={2}
                                            py={2.5}
                                            borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                            textAlign="right"
                                            verticalAlign="middle"
                                        >
                                            <Text fontSize="sm" fontWeight="700" color={rowColor} /* fontVariantNumeric="tabular-nums" */>
                                                {row.result ? 'Head' : 'Tail'}
                                            </Text>
                                        </Td>
                                        <Td
                                            px={2}
                                            py={2.5}
                                            borderBottom="1px solid rgba(255, 255, 255, 0.06)"
                                            textAlign="right"
                                            verticalAlign="middle"
                                        >
                                            <Text fontSize="sm" fontWeight="700" color={rowColor} /* fontVariantNumeric="tabular-nums" */>
                                                {row.isWin ? 'Win' : 'Lose'}
                                            </Text>
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                </Box>
            </VStack>
        </Card>
    );
}
