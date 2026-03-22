import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Flex,
  Tooltip,
  HStack,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import React from "react";
import truncateToTwo from "variables/truncateToTwo";

/**
 * Live bets panel — same layout & styling as Mines `MinesItem/UserHistory.js`.
 * Data from API `state.liveUsers` (current round).
 */
export default function CloudSpreadRealView({ rows = [], sceneHeight }) {
  const baseRows = Array.isArray(rows) ? rows : [];

  return (
    <Box minH={{ base: "250px", md: "auto" }} display="flex" h="100%" w="100%">
      <Card
        p="24px"
        pt="30px"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        h={{ base: "420px", md: sceneHeight ? `${sceneHeight + 40}px` : "100%" }}
        minH="0"
        w="100%"
        bg="#2a2a2a"
        border="1px solid rgba(255,255,255,0.06)"
        borderRadius="16px"
        boxShadow="none"
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
                <Th
                  color="rgba(255,255,255,0.9)"
                  fontSize="xs"
                  fontWeight="bold"
                  px="0"
                  py="4px"
                  h="32px"
                  borderBottom="none"
                  whiteSpace="nowrap"
                  w="20%"
                >
                  User
                </Th>
                <Th
                  color="rgba(255,255,255,0.9)"
                  fontSize="xs"
                  fontWeight="bold"
                  px="0"
                  py="2px"
                  h="32px"
                  borderBottom="none"
                  textAlign="center"
                  whiteSpace="nowrap"
                  w="20%"
                >
                  Bet($)
                </Th>
                <Th
                  color="rgba(255,255,255,0.9)"
                  fontSize="xs"
                  fontWeight="bold"
                  px="0"
                  py="4px"
                  h="32px"
                  borderBottom="none"
                  textAlign="center"
                  whiteSpace="nowrap"
                  w="34%"
                >
                  Multiplier
                </Th>
                <Th
                  color="rgba(255,255,255,0.9)"
                  fontSize="xs"
                  fontWeight="bold"
                  px="0"
                  py="4px"
                  h="32px"
                  borderBottom="none"
                  textAlign="center"
                  whiteSpace="nowrap"
                  w="26%"
                >
                  Win($)
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {baseRows.length > 0 ? (
                baseRows.map((row, index) => {
                  const winColor = "#6DC64B";
                  const name = row.userName || row.altas || "";
                  const bet = row.betAmount ?? row.amount;
                  const mult = row.selectedCloudMultiplier;
                  const multStr =
                    mult != null && Number.isFinite(Number(mult))
                      ? `${Number(mult).toFixed(2)}x`
                      : "—";
                  const winDisplay =
                    row.winAmount != null && Number.isFinite(Number(row.winAmount))
                      ? truncateToTwo(row.winAmount)
                      : "—";

                  return (
                    <Tr key={row.betId || row.id || index}>
                      <Td
                        px="0"
                        py="4px"
                        h="16px"
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
                              <Box
                                w="22px"
                                h="22px"
                                borderRadius="50%"
                                bg="rgba(0, 212, 255, 0.2)"
                                flexShrink={0}
                              />
                            )}
                            <Tooltip label={name} placement="top" hasArrow>
                              <Text color={winColor} fontSize="xs">
                                {name.length > 7 ? `${name.slice(0, 5)}...` : name || "—"}
                              </Text>
                            </Tooltip>
                          </HStack>
                        </Flex>
                      </Td>
                      <Td py="4px" h="16px" border="none">
                        <Text fontSize="xs" color={winColor} textAlign="center" whiteSpace="nowrap">
                          {bet != null ? truncateToTwo(bet) : "—"}
                        </Text>
                      </Td>
                      <Td py="4px" h="16px" border="none">
                        <Text fontSize="xs" color="rgba(255,255,255,0.85)" textAlign="center" whiteSpace="nowrap">
                          {multStr}
                        </Text>
                      </Td>
                      <Td py="4px" h="16px" border="none">
                        <Text fontSize="xs" color={winColor} textAlign="center" whiteSpace="nowrap">
                          {winDisplay}
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
    </Box>
  );
}
