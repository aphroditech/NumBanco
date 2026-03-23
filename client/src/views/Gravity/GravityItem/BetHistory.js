import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Flex, HStack, Select, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SpeakerNotesOffRoundedIcon from "@mui/icons-material/SpeakerNotesOffRounded";
import wolfnoavilable from "assets/img/wolfnoavilable.png";
import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";
import CardFooter from "components/Card/CardFooter";
import CardHeader from "components/Card/CardHeader.js";
import GradientBorder from "components/GradientBorder/GradientBorder";

export default function GravityBetHistory({ results = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const reversedResults = useMemo(() => [...results].reverse(), [results]);
  const totalPages = useMemo(
    () => Math.ceil(reversedResults.length / itemsPerPage),
    [reversedResults.length, itemsPerPage]
  );

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return reversedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [reversedResults, currentPage, itemsPerPage]);

  // When results/itemsPerPage change (ex: refresh), ensure currentPage is valid.
  useEffect(() => {
    setCurrentPage((p) => {
      if (p > totalPages) return totalPages || 1;
      return p;
    });
  }, [totalPages]);

  useEffect(() => {
    // Jump back to the first page whenever we receive a new results list.
    setCurrentPage(1);
  }, [results]);

  return (
    <Box mt="24px" w="100%">
      <Card pt="20px" pb="20px" minH="400px" px="22px">
        <CardHeader>
          <Text fontSize="lg" fontWeight="bold" color="#00D4FF" mb="16px" textAlign="center" whiteSpace="nowrap">
            Bet History
          </Text>
        </CardHeader>
        <CardBody>
          <Box
            overflowY="auto"
            overflowX="hidden"
            width="100%"
            pr="6px"
            sx={{
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { background: "#555b5e", borderRadius: "8px" },
            }}
          >
            {results.length > 0 ? (
              <Table variant="unstyled" color="#fff" width="100%" sx={{
                borderCollapse: "separate",
                borderSpacing: "0 6px"
              }}>
                <Thead>
                  <Tr>
                    <Th  bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }}color="white" textAlign="left" width="8%">ID</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                    borderRadius="10px"
                    _hover={{
                      bg: "rgba(0,255,150,0.08)",
                      transform: "scale(1.01)"
                    }} color="white" textAlign="left" width="12%">Round</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }} color="white" textAlign="left" width="12%">Direction</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }} color="white" textAlign="left" width="14%">Amount</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }} color="white" textAlign="left" width="14%">Win</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }} color="white" textAlign="left" width="14%">Profit</Th>
                    <Th bg="rgba(255,255,255,0.03)"
                      borderRadius="10px"
                      _hover={{
                        bg: "rgba(0,255,150,0.08)",
                        transform: "scale(1.01)"
                      }} color="white" textAlign="left" width="26%">Time</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedResults.map((result, index, arr) => {
                    const lastItem = index === arr.length - 1;
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const profit = Number(result.winAmount || 0) - Number(result.betAmount || 0);
                    return (
                      <Tr key={result._id || globalIndex} _hover={{
                          bg: "rgba(255,255,255,0.05)",
                          transform: "scale(1.01)"
                        }}
                        transition="0.2s"
                      >
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A">{globalIndex + 1}</Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A">{result.roundId}</Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A" color={result.direction === "up" ? "#68d391" : "#f56565"}>
                          {(result.direction || "-").toUpperCase()}
                        </Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A">$ {Number(result.betAmount || 0).toFixed(2)}</Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A" color={Number(result.winAmount || 0) > 0 ? "#68d391" : "#f56565"}>
                          $ {Number(result.winAmount || 0).toFixed(2)}
                        </Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A" color={profit > 0 ? "#68d391" : "#f56565"}>
                          $ {profit.toFixed(2)}
                        </Td>
                        <Td border={lastItem ? "none" : null} borderBottomColor="#56577A" color="rgba(255,255,255,0.7)">
                          {new Date(result.createdAt).toLocaleDateString()}, {new Date(result.createdAt).toLocaleTimeString()}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            ) : (
              <Flex direction="column" align="center" justify="center" minH="320px" color="white">
                <Box
                  backgroundImage={`url(${wolfnoavilable})`}
                  backgroundSize="contain"
                  backgroundRepeat="no-repeat"
                  backgroundPosition="center"
                  w="220px"
                  h="220px"
                  opacity={0.85}
                  mb="20px"
                />
                <Flex align="center" justify="center" mb="20px">
                  <SpeakerNotesOffRoundedIcon style={{ fontSize: "20px", color: "white", marginRight: "8px" }} />
                  No gravity result found
                </Flex>
              </Flex>
            )}
          </Box>
        </CardBody>
        <CardFooter>
          {results.length > 0 && (
            <Box px="22px" pb="20px" pt="0px">
              <Flex justify="space-between" align="center" flexWrap="wrap" gap="16px">
                <Flex align="center" gap="12px">
                  <Text fontSize="sm" color="rgba(255,255,255,0.7)">Items per page:</Text>
                  <GradientBorder w="100px" borderRadius="20px">
                    <Select
                      color="white"
                      bg="#323738"
                      border="transparent"
                      borderRadius="20px"
                      fontSize="sm"
                      size="sm"
                      w="100px"
                      h="36px"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value, 10));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Select>
                  </GradientBorder>
                </Flex>
                {totalPages > 1 && (
                  <HStack spacing="8px">
                    <Button size="sm" bg="#323738" color="white" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} isDisabled={currentPage === 1} leftIcon={<ChevronLeftIcon />}>
                      Previous
                    </Button>
                    <Button size="sm" bg="#323738" color="white" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} isDisabled={currentPage === totalPages} rightIcon={<ChevronRightIcon />}>
                      Next
                    </Button>
                  </HStack>
                )}
              </Flex>
            </Box>
          )}
        </CardFooter>
      </Card>
    </Box>
  );
}
