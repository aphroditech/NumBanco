import React from "react";
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Tooltip, HStack } from "@chakra-ui/react";
import Card from "components/Card/Card";
import truncateToTwo from "variables/truncateToTwo";
import { useAblyMinesResult } from "hooks/useAblyMinesResult";

export default function UserHistory() {
    const { minesResults } = useAblyMinesResult();

    return (
        <GridItem area="empty" minH="250px" display="flex" h="100%">
            <Card
                p="24px"
                pt="30px"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                h="100%"
                minH="0"
                w="100%"
                bg="#2a2a2a"
                border="1px solid rgba(255,255,255,0.06)"
                borderRadius="16px"
            >
                <Box
                    flex="1"
                    minH="0"
                    overflowX="hidden"
                    width="100%"
                    overflowY="auto"
                    sx={{
                        "&::-webkit-scrollbar": { width: "6px" },
                        "&::-webkit-scrollbar-track": { background: "transparent" },
                        "&::-webkit-scrollbar-thumb": { background: "#555b5e", borderRadius: "8px" },
                    }}
                >
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
                        <Thead>
                            <Tr>
                                <Th color="rgba(255,255,255,0.9)" fontSize="xs" fontWeight="bold" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="30%">
                                    User
                                </Th>
                                <Th color="rgba(255,255,255,0.9)" fontSize="xs" fontWeight="bold" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="30%">
                                    Result
                                </Th>
                                <Th color="rgba(255,255,255,0.9)" fontSize="xs" fontWeight="bold" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="40%">
                                    Win($)
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {minesResults.length > 0 ? (
                                minesResults.map((row, index) => {
                                    const winColor = row.isWin ? "#6DC64B" : "#E74C3C";
                                    const name = row.userName || "";
                                    return (
                                        <Tr key={row._id || row.id || index}>
                                            <Td px="0" py="4px" h="16px" border="none" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
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
                                                            <Text color={winColor} fontSize="xs">
                                                                {name.length > 7 ? name.slice(0, 5) + "..." : name || "—"}
                                                            </Text>
                                                        </Tooltip>
                                                    </HStack>
                                                </Flex>
                                            </Td>
                                            <Td py="4px" h="16px" border="none">
                                                <Text fontSize="xs" color="rgba(255,255,255,0.85)" textAlign="center" whiteSpace="nowrap">
                                                    {row.multiplier != null
                                                        ? `${row.multiplier.toFixed ? row.multiplier.toFixed(2) : truncateToTwo(row.multiplier)}x`
                                                        : "—"}
                                                </Text>
                                            </Td>
                                            <Td py="4px" h="16px" border="none">
                                                <Text fontSize="xs" color={winColor} textAlign="center" whiteSpace="nowrap">
                                                    {row.winAmount != null ? truncateToTwo(row.winAmount) : "—"}
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
