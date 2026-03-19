    import React, { useEffect, useState, useRef } from 'react';
    import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Tooltip, HStack } from '@chakra-ui/react';
    import Card from 'components/Card/Card';
    import { useAblyRubicResult } from 'hooks/useAblyRubicResult';
    import { getUserRubicHistory } from 'action/RubicActions';
    import truncateToTwo from 'variables/truncateToTwo';
    import Loading from 'components/Loading/Loading';
    import { useHistory } from "react-router-dom";

    // CSS animation styles for slide-in effect
    const rubicUserHistoryStyles = `
        @keyframes rubic-row-slide-in {
            0% {
            transform: translateX(36px);
            opacity: 0;
            }
            100% {
            transform: translateX(0);
            opacity: 1;
            }
        }
        tr.rubic-user-new td {
            animation: rubic-row-slide-in 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
        }
    `;

    // Inject styles into the document
    if (typeof document !== 'undefined') {
        const existingStyle = document.getElementById('rubic-user-history-styles');
        if (existingStyle) {
            existingStyle.textContent = rubicUserHistoryStyles;
        } else {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'rubic-user-history-styles';
            styleSheet.textContent = rubicUserHistoryStyles;
            document.head.appendChild(styleSheet);
        }
    }

    export default function UserHistory() {
        const { rubicResults, setRubicResults } = useAblyRubicResult();
        const [isLoading, setIsLoading] = useState(true);
        const history = useHistory();

        const getRowId = (row) => {
            if (!row) return "";
            return row._id || row.id || `${row.userName || "user"}-${row.betAmount || 0}-${row.winAmount || 0}`;
        };

        useEffect(() => {
            let isMounted = true;
            getUserRubicHistory(history)
                .then((data) => {
                    if (isMounted && Array.isArray(data)) {
                        setRubicResults(data);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setRubicResults([]);
                    }
                    setIsLoading(false);
                });
            return () => { isMounted = false; };
        }, []);

        
        return (
            <GridItem area="empty" minH="250px">
                {isLoading && <Loading />}
                <Card p="24px" pt="30px" overflowX="hidden" height="450px" w="100%">
                    <Box overflowX="hidden" width="100%" overflowY="auto" sx={{
                        "&::-webkit-scrollbar": { width: "6px" },
                        "&::-webkit-scrollbar-track": { background: "transparent" },
                        "&::-webkit-scrollbar-thumb": { background: "#555b5e", borderRadius: "8px" },
                    }}>
                        <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
                            <Thead>
                                <Tr style={{ textAlignLast: "center" }}>
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
                                {rubicResults.length > 0 ? (
                                    rubicResults.map((row, index) => {
                                        const winColor = row.isWin ? "#6DC64B" : "#E74C3C";

                                        return (
                                            <Tr
                                                key={index}
                                            >
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
                                                            <Tooltip label={row.userName || ""} placement="top" hasArrow>
                                                                <Text color={row.isWin ? "#6DC64B" : "#E74C3C"} fontSize="xs"  >
                                                                    {row.userName.length > 7 ? row.userName.slice(0, 5) + "..." : row.userName}
                                                                </Text>
                                                            </Tooltip>
                                                        </HStack>

                                                    </Flex>
                                                </Td>
                                                <Td
                                                    textAlign="left"
                                                    py="4px"
                                                    h="16px"
                                                    border="none"
                                                    overflow="visible"
                                                >
                                                    <Text fontSize="xs" color={winColor} fontWeight="normal" textAlign="center" whiteSpace="nowrap">
                                                        {row.betAmount}
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
                                                        {truncateToTwo(row.winAmount)}
                                                    </Text>
                                                </Td>
                                            </Tr>
                                        );
                                    })
                                ) : (
                                    <Tr>
                                        <Td colSpan={3} border="none" py="8" textAlign="center">
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