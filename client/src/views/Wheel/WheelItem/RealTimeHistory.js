import React, { useEffect, useState } from 'react';
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Tooltip, HStack } from '@chakra-ui/react';
import Card from 'components/Card/Card';
import { useAblyWheelResults } from 'hooks/useAblyWheelResults';
import { getWheelResult } from 'action/wheelActions';
import truncateToTwo from 'variables/truncateToTwo';
import Loading from 'components/Loading/Loading';
import { useHistory } from 'react-router-dom';

const miningUserHistoryStyles = `
    @keyframes mining-row-slide-in {
        0% {
            transform: translateX(36px);
            opacity: 0;
        }
        100% {
            transform: translateX(0);
            opacity: 1;
        }
    }
    tr.mining-user-new td {
        animation: mining-row-slide-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
`;

if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('mining-user-history-styles');
    if (existingStyle) {
        existingStyle.textContent = miningUserHistoryStyles;
    } else {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'mining-user-history-styles';
        styleSheet.textContent = miningUserHistoryStyles;
        document.head.appendChild(styleSheet);
    }
}

export default function RealTimeHistory() {
    const { wheelResults, setWheelResults } = useAblyWheelResults();
    const [isLoading, setIsLoading] = useState(true);
    const history = useHistory();

    useEffect( async () => {
        let isMounted = true;
        const results = await getWheelResult(history);
        if (isMounted) {
            setWheelResults(results || []);
            setIsLoading(false);
        }
        return () => { isMounted = false; };
    }, [history]);

    
    const maxRows = 15;
    const rowsToRender = (Array.isArray(wheelResults) ? wheelResults : []).slice(0, maxRows);
    
    if (isLoading) {
        return <Loading />;
    }

    return (
        <GridItem area="empty" display="flex" flexDirection="column" h="100%" minH="0">
            {isLoading && <Loading />}
            <Box
                w="100%"
                maxW="100%"
                h="100%"
                minH="450px"
                flex={1}
                bg="#2a2d2e"
                borderRadius="14px"
                border="1px solid rgba(255,255,255,0.1)"
                boxShadow="none"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                p="16px"
                pt="20px"
            >
                <Text
                    px="12px"
                    pb="8px"
                    fontSize="sm"
                    fontWeight="800"
                    color="rgba(255,255,255,0.92)"
                    letterSpacing="0.02em"
                    flexShrink={0}
                >
                    Live Results
                </Text>
                <Box
                    overflowX="hidden"
                    width="100%"
                    overflowY="auto"
                    flex="1"
                    minH="0"
                    sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        'msOverflowStyle': 'none',
                        'scrollbarWidth': 'none',
                    }}
                >
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: 'fixed' }}>
                        <Thead>
                            <Tr borderBottom="1px solid rgba(255,255,255,0.12)">
                                <Th textAlign="center" color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="42%" textTransform="uppercase" letterSpacing="0.06em">
                                    User
                                </Th>
                                <Th textAlign="center" color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none"  whiteSpace="nowrap" w="28%" textTransform="uppercase" letterSpacing="0.06em">
                                    Result
                                </Th>
                                <Th textAlign="center" color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none"  whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em">
                                    Win
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {rowsToRender.length > 0 ? (
                                rowsToRender.map((row, index) => {
                                    const isWin = row.isWin;
                                    const rowColor = isWin ? '#68d391' : '#f56565';
                                    const name = row.userName || '';
                                    const displayName = name || '—';
                                    return (
                                        <Tr key={index} borderBottom="1px solid rgba(255,255,255,0.06)" _last={{ borderBottom: 'none' }}>
                                            <Td
                                                textAlign="left"
                                                px="0px"
                                                py="6px"
                                                h="auto"
                                                border="none"
                                                overflow="hidden"
                                                textOverflow="ellipsis"
                                                whiteSpace="nowrap"
                                            >
                                                <Flex align="center">
                                                    <HStack spacing="8px">
                                                        {row.avatar ? (
                                                            <Box
                                                                w="22px"
                                                                h="22px"
                                                                borderRadius="50%"
                                                                backgroundImage={`url(${row.avatar})`}
                                                                backgroundSize="cover"
                                                                backgroundPosition="center"
                                                                flexShrink={0}
                                                            />
                                                        ) : (
                                                            <Box w="22px" h="22px" borderRadius="50%" bg="rgba(0, 212, 255, 0.2)" flexShrink={0} />
                                                        )}
                                                        <Tooltip label={name} placement="top" hasArrow>
                                                            <Text color={rowColor} fontSize="13px" fontWeight="700">
                                                                {displayName.length >= 10 ? displayName.slice(0, 8) + '...' : displayName}
                                                            </Text>
                                                        </Tooltip>
                                                    </HStack>
                                                </Flex>
                                            </Td>
                                            <Td
                                                textAlign="center"
                                                py="6px"
                                                h="auto"
                                                border="none"
                                                overflow="visible"
                                            >
                                                <Text fontSize="13px" color={rowColor} fontWeight="700" textAlign="center" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {row.multiplier != null ? row.multiplier + 'x' : '—'}
                                                </Text>
                                            </Td>
                                            <Td
                                                textAlign="right"
                                                py="6px"
                                                h="auto"
                                                border="none"
                                                overflow="visible"
                                            >
                                                <Text fontSize="13px" color={rowColor} fontWeight="700" textAlign="right" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    ${row.isWin ? truncateToTwo(row.winAmount) : '0'}
                                                </Text>
                                            </Td>
                                        </Tr>
                                    );
                                })
                            ) : (
                                <Tr>
                                    <Td colSpan={4} border="none" py="8" textAlign="center">
                                        <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)">
                                            No real-time results yet
                                        </Text>
                                    </Td>
                                </Tr>
                            )}
                        </Tbody>
                    </Table>
                </Box>
            </Box>
        </GridItem>
    );
}
