import React, { useEffect, useState } from 'react';
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Tooltip, HStack } from '@chakra-ui/react';
import Card from 'components/Card/Card';
import { useAblyMiningResult } from 'hooks/useAblyMiningResult';
import { getMiningResult } from 'action/MiningActions';
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

export default function OtherUserHistory() {
    const { miningResults, setMiningResults } = useAblyMiningResult();
    const [isLoading, setIsLoading] = useState(true);
    const history = useHistory();

    useEffect(async() => {
        let isMounted = true;
        await getMiningResult(history)()
            .then((data) => {
                if (isMounted && Array.isArray(data)) {
                    setMiningResults(data);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setMiningResults([]);
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => { isMounted = false; };
    }, []);

    return (
        <GridItem area="empty" minH="250px">
            {isLoading && <Loading />}
            <Card p="24px" pt="30px" overflowX="hidden" height="450px" w="100%">
                <Box overflowX="hidden" width="100%" overflowY="auto" sx={{
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: '#555b5e', borderRadius: '8px' },
                }}>
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: 'fixed' }}>
                        <Thead>
                            <Tr style={{ textAlignLast: 'center' }}>
                                <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                    User
                                </Th>
                                <Th color="white" textAlign="left" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                    Bet($)
                                </Th>
                                <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                    Win($)
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {miningResults.length > 0 ? (
                                miningResults.map((row, index) => {
                                    const winColor = row.isWin ? '#6DC64B' : '#E74C3C';

                                    return (
                                        <Tr key={row._id || index}>
                                            <Td
                                                textAlign="center"
                                                px="0px"
                                                py="4px"
                                                h="16px"
                                                border="none"
                                                overflow="hidden"
                                                textOverflow="ellipsis"
                                                whiteSpace="nowrap"
                                            >
                                                <Flex justify="space-between" align="center">
                                                    <HStack spacing="8px">
                                                        {row.avatar ? (
                                                            <Box
                                                                w="22px"
                                                                h="22px"
                                                                borderRadius="50%"
                                                                backgroundImage={`url(${row.avatar})`}
                                                                backgroundSize="cover"
                                                                backgroundPosition="center"
                                                            />
                                                        ) : (
                                                            <Box
                                                                w="24px"
                                                                h="24px"
                                                                borderRadius="50%"
                                                                bg="rgba(231, 76, 60, 0.3)"
                                                            />
                                                        )}
                                                        <Tooltip label={row.userName || ''} placement="top" hasArrow>
                                                            <Text color={winColor} fontSize="xs">
                                                                {row.userName?.length > 7 ? row.userName.slice(0, 6) + '...' : row.userName || '—'}
                                                            </Text>
                                                        </Tooltip>
                                                    </HStack>
                                                </Flex>
                                            </Td>
                                            <Td
                                                textAlign="left"
                                                py="2px"
                                                h="16px"
                                                border="none"
                                                overflow="visible"
                                            >
                                                <Text fontSize="xs" color={winColor} fontWeight="normal" textAlign="center" whiteSpace="nowrap">
                                                    {row.bet != null ? row.bet : '—'}
                                                </Text>
                                            </Td>
                                            <Td
                                                textAlign="left"
                                                py="4px"
                                                h="16px"
                                                border="none"
                                                overflow="visible"
                                            >
                                                <Text fontSize="xs" color={winColor} fontWeight="normal" textAlign="center" whiteSpace="nowrap">
                                                    {row.win != null ? truncateToTwo(row.win) : '—'}
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
            </Card>
        </GridItem>
    );
}
