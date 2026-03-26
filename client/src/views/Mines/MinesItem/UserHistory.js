import React from "react";
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Tooltip, HStack } from "@chakra-ui/react";
import truncateToTwo from "variables/truncateToTwo";
import { useAblyMinesResult } from "hooks/useAblyMinesResult";

export default function UserHistory() {
    const { minesResults } = useAblyMinesResult();

    return (
        <GridItem area="empty" minH="250px" display="flex" alignSelf="start" w="100%">
            <Box
                w="100%"
                maxW="100%"
                minH="250px"
                bg="#2b2b2b"
                borderRadius="14px"
                border="1px solid rgba(255,255,255,0.1)"
                boxShadow="none"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                p="16px"
                pt="12px"
            >
                <Text
                    px="12px"
                    pb="4px"
                    fontSize="sm"
                    fontWeight="800"
                    color="rgba(255,255,255,0.92)"
                    letterSpacing="0.02em"
                    flexShrink={0}
                >
                    Live Results
                </Text>
                <Box overflowX="hidden" width="100%" overflowY="visible">
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
                        <Thead>
                            <Tr borderBottom="1px solid rgba(255,255,255,0.12)">
                                <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="42%" textTransform="uppercase" letterSpacing="0.06em">
                                    User
                                </Th>
                                <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="28%" textTransform="uppercase" letterSpacing="0.06em">
                                    Bet($)
                                </Th>
                                <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="right" whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em">
                                    Win($)
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {minesResults.length > 0 ? (
                                minesResults.map((row, index) => {
                                    const win = Number(row.winAmount ?? row.win ?? 0);
                                    const bet = Number(row.sessionStake ?? row.betAmount ?? row.totalBet ?? 0);
                                    const isWin = win > 0;
                                    const rowColor = isWin ? "#68d391" : "#f56565";
                                    const name = row.userName || "";
                                    return (
                                        <Tr key={row._id || row.id || index} borderBottom="1px solid rgba(255,255,255,0.06)" _last={{ borderBottom: "none" }}>
                                            <Td px="0" py="6px" h="auto" border="none" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
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
                                                                {name || "—"}
                                                            </Text>
                                                        </Tooltip>
                                                    </HStack>
                                                </Flex>
                                            </Td>
                                            <Td py="6px" h="auto" border="none">
                                                <Text fontSize="13px" fontWeight="700" color={rowColor} textAlign="center" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {Number.isFinite(bet) ? bet.toFixed(2) : "—"}
                                                </Text>
                                            </Td>
                                            <Td py="6px" h="auto" border="none">
                                                <Text fontSize="13px" fontWeight="700" color={rowColor} textAlign="right" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                                    {Number.isFinite(win) ? win.toFixed(2) : "—"}
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
            </Box>
        </GridItem>
    );
}
