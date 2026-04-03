import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Select,
  Button,
  HStack,
} from "@chakra-ui/react";
import truncateToTwo, { formatUsdDisplay } from "variables/truncateToTwo.js";
import wolfnoavilable from "assets/img/wolfnoavilable.png";
import SpeakerNotesOffRoundedIcon from "@mui/icons-material/SpeakerNotesOffRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import GradientBorder from "components/GradientBorder/GradientBorder";
import CardFooter from "components/Card/CardFooter";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";


/** Same header / profit colors as `HashDiceItem/HashDiceBetHistory.js`. */
const HEADER_CYAN = "#00D4FF";
const WIN_GREEN = "#68d391";
const LOSE_RED = "#f56565";
const GREEN = "#4caf50";
const RED = "#f44336";
const VIOLET = "#9c27b0";
const WHITE = "#ffffff";

function sideLabel(side) {
  const s = String(side || "").toLowerCase();
  if (s === "crash") return "Crash";
  if (s === "red") return "Red";
  if (s === "green") return "Green";
  if (s === "moon") return "Moon";
  return "—";
}

function circleBgForDigit(d) {
  const n = Math.floor(Number(d));
  /** Reference: vertical split — 5 = green | violet, 0 = red | violet */
  if (n === 5) return `linear-gradient(90deg, ${GREEN} 50%, ${VIOLET} 50%)`;
  if (n === 0) return `linear-gradient(90deg, ${RED} 50%, ${VIOLET} 50%)`;
  if (n % 2 === 1) return GREEN;
  return RED;
}

function TrendCircle({ digit, size = "26px" }) {
  const d = Math.floor(Number(digit));
  return (
    <Box
      w={size}
      h={size}
      minW={size}
      minH={size}
      borderRadius="full"
      bg={circleBgForDigit(d)}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="800"
      fontSize="12px"
      color={WHITE}
      boxShadow="0 1px 4px rgba(0,0,0,0.45)"
      flexShrink={0}
    >
      {d}
    </Box>
  );
}

function outcomeTextColor(outcome, settled) {
  if (!settled) return "rgba(255,255,255,0.5)";
  const o = String(outcome || "").toLowerCase();
  if (o === "crash") return LOSE_RED;
  if (o === "moon") return "#d9ef47";
  if (o === "green") return WIN_GREEN;
  if (o === "red") return "#f6ad55";
  return "#fff";
}

/** Renders rows from Redux `user.userInfo.trenballHistory` (Mongo embedded array). */
export default function FastCrashBetHistory() {
  const fastcrashHistory = useSelector((st) => st.user?.userInfo?.fastcrashHistory);
  const list = Array.isArray(fastcrashHistory) ? fastcrashHistory : [];
  const reversedResults = useMemo(() => [...list].reverse(), [list]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const totalPages = useMemo(
    () => Math.ceil(reversedResults.length / itemsPerPage) || 1,
    [reversedResults.length, itemsPerPage]
  );

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return reversedResults.slice(startIndex, startIndex + itemsPerPage);
  }, [reversedResults, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageClick = (page) => setCurrentPage(page);

  return (
    <Box mt={{ base: "16px", md: "24px" }} w="100%" maxW="100%" minW={0}>
      <Card pt={{ base: "14px", md: "20px" }} pb={{ base: "14px", md: "20px" }} minH={{ base: "320px", md: "400px" }} px={{ base: "10px", sm: "16px", md: "22px" }}>
        <CardHeader px={0}>
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color={HEADER_CYAN} mb={{ base: "12px", md: "16px" }} textAlign="center" whiteSpace="nowrap">
            Bet History
          </Text>
        </CardHeader>

        <CardBody px={0}>
          <Box
            flex="1"
            overflowY="auto"
            overflowX="auto"
            width="100%"
            maxW="100%"
            minW={0}
            pr={{ base: "2px", md: "6px" }}
          >
            {list.length > 0 ? (
              <Table variant="simple" color="#fff" height="100%" minW="560px" w="100%" sx={{ tableLayout: "fixed" }}>
                <Thead top="0" zIndex="5">
                  <Tr>
                    <Th color="white" textAlign="left" className="real_th_font" width="7%">
                      ID
                    </Th>
                    <Th color="white" textAlign="left" className="real_th_font" width="10%">
                      Side
                    </Th>
                    <Th color="white" textAlign="left" className="real_th_font" width="12%">
                      Result
                    </Th>
                    <Th color="white" textAlign="left" className="real_th_font" width="15%">
                      Amount
                    </Th>
                    <Th color="white" textAlign="left" className="real_th_font" width="15%">
                      Profit
                    </Th>
                    <Th color="white" textAlign="left" className="real_th_font" width="27%">
                      Time
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedResults.map((result, index, arr) => {
                    const lastItem = index === arr.length - 1;
                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                    const profit = Number(result.winAmount || 0) - Number(result.betAmount || 0);
                    const isWin = profit > 0;
                    const settled = result.roundId != null && result.resultColor != null;
                    const mult = Number(result.crashMultiplier);
                    const rowKey = result._id || `${result.roundId}-${result.side}-${globalIndex}`;
                    const d = result.createdAt || result.createAt;
                    const created = d ? new Date(d) : null;

                    return (
                      <Tr key={rowKey}>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color="#fff"
                          fontWeight="normal"
                        >
                          {settled ? result.roundId : "—"}
                        </Td>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color="#fff"
                          fontWeight="normal"
                        >
                          {result.side === "number" ? result.digit : result.side === "red" ? <RocketLaunchIcon style={{ color: "#f44336" }} /> : (result.side === "green" ? <RocketLaunchIcon style={{ color: "#4caf50" }} /> : <RocketLaunchIcon style={{ color: "#9c27b0" }} />)}
                        
                          
                        </Td>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color={outcomeTextColor(result.outcome, settled)}
                          fontWeight="normal"
                        >
                          {/* {result.resultColor ? <TrendCircle digit={result.winningDigit} size="60px" /> : "—"} */}
                          {result.winningDigit ? <TrendCircle digit={result.winningDigit} size="30px" /> : "—"}
                        </Td>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color="#fff"
                          fontWeight="normal"
                        >
                          {formatUsdDisplay(result.betAmount)}
                        </Td>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color={isWin ? WIN_GREEN : LOSE_RED}
                          fontWeight="normal"
                        >
                          {formatUsdDisplay(profit)}
                        </Td>
                        <Td
                          textAlign="left"
                          border={lastItem ? "none" : undefined}
                          borderBottomColor="#56577A"
                          overflow="hidden"
                          fontSize="sm"
                          color="rgba(255, 255, 255, 0.7)"
                          fontWeight="normal"
                        >
                          {created && Number.isFinite(created.getTime())
                            ? `${created.toLocaleDateString()}, ${created.toLocaleTimeString()}`
                            : "—"}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            ) : (
              <Flex flex="1" direction="column" align="center" justify="center" minH="400px" color="white">
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
                  <SpeakerNotesOffRoundedIcon
                    style={{
                      fontSize: "20px",
                      color: "white",
                      marginRight: "8px",
                      filter: "drop-shadow(0 0 10px white)",
                    }}
                  />
                  No trenball bets yet
                </Flex>
              </Flex>
            )}
          </Box>
        </CardBody>

        <CardFooter px={0}>
          {list.length > 0 && (
            <Box px={{ base: "10px", sm: "16px", md: "22px" }} pb={{ base: "14px", md: "20px" }} pt="0px">
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={{ base: "12px", md: "16px" }}>
                <Flex align="center" gap="12px" flexWrap="wrap">
                  <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)" whiteSpace="nowrap">
                    Items per page:
                  </Text>
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
                      onChange={handleItemsPerPageChange}
                      sx={{
                        option: {
                          backgroundColor: "#323738",
                          color: "white",
                          padding: "8px 10px",
                          fontSize: "14px",
                        },
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </Select>
                  </GradientBorder>
                </Flex>

                {totalPages > 1 && (
                  <>
                    <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, list.length)} of {list.length} results
                    </Text>

                    <HStack spacing="8px">
                      <Button
                        size="sm"
                        bg="#323738"
                        color="white"
                        _hover={{ bg: "#3d4243" }}
                        _active={{ bg: "#2a2d2e" }}
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        isDisabled={currentPage === 1}
                        leftIcon={<ChevronLeftIcon />}
                      >
                        Previous
                      </Button>

                      <HStack spacing="4px">
                        {(() => {
                          const pages = [];
                          const maxVisible = 7;
                          if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i += 1) pages.push(i);
                          } else {
                            pages.push(1);
                            let startPage = Math.max(2, currentPage - 1);
                            let endPage = Math.min(totalPages - 1, currentPage + 1);
                            if (currentPage <= 3) endPage = Math.min(5, totalPages - 1);
                            if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 4);
                            if (startPage > 2) pages.push("ellipsis-start");
                            for (let i = startPage; i <= endPage; i += 1) pages.push(i);
                            if (endPage < totalPages - 1) pages.push("ellipsis-end");
                            pages.push(totalPages);
                          }
                          return pages.map((page, idx) => {
                            if (page === "ellipsis-start" || page === "ellipsis-end") {
                              return (
                                <Text key={`ellipsis-${idx}`} color="rgba(255, 255, 255, 0.5)" px="4px">
                                  ...
                                </Text>
                              );
                            }
                            return (
                              <Button
                                key={page}
                                size="sm"
                                minW="36px"
                                h="36px"
                                bg={currentPage === page ? HEADER_CYAN : "#323738"}
                                color="white"
                                _hover={{
                                  bg: currentPage === page ? "#00b8e6" : "#3d4243",
                                }}
                                _active={{ bg: currentPage === page ? "#00a3cc" : "#2a2d2e" }}
                                onClick={() => handlePageClick(page)}
                              >
                                {page}
                              </Button>
                            );
                          });
                        })()}
                      </HStack>

                      <Button
                        size="sm"
                        bg="#323738"
                        color="white"
                        _hover={{ bg: "#3d4243" }}
                        _active={{ bg: "#2a2d2e" }}
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        isDisabled={currentPage === totalPages}
                        rightIcon={<ChevronRightIcon />}
                      >
                        Next
                      </Button>
                    </HStack>
                  </>
                )}
              </Flex>
            </Box>
          )}
        </CardFooter>
      </Card>
    </Box>
  );
}
