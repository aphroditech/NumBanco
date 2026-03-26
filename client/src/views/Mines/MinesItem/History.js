import React, { useState, useMemo } from "react";
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
import truncateToTwo from "variables/truncateToTwo";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SpeakerNotesOffRoundedIcon from "@mui/icons-material/SpeakerNotesOffRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";
import CardFooter from "components/Card/CardFooter";
import GradientBorder from "components/GradientBorder/GradientBorder";
import wolfnoavilable from "assets/img/wolfnoavilable.png";

export default function History(props) {
    const { results = [] } = props;
    const list = Array.isArray(results) ? [...results].reverse() : [];

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(list.length / itemsPerPage)),
        [list.length, itemsPerPage]
    );

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return list.slice(startIndex, startIndex + itemsPerPage);
    }, [list, currentPage, itemsPerPage]);

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
        <Box mt="24px" w="100%">
            <Card pt="20px" pb="20px" minH="400px" px="22px" boxShadow="none" border="1px solid rgba(255,255,255,0.1)">
                <CardHeader mb={list.length > 0 ? "20px" : "0"}>
                    <Flex direction="column" alignSelf="flex-start">
                        <Text fontSize="lg" color="#fff" fontWeight="bold" mb="6px" display="flex" alignItems="center" justifyContent="center">
                            <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />
                            History
                        </Text>
                    </Flex>
                </CardHeader>
                <CardBody>
                    <Box
                        flex="1"
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
                        {list.length > 0 ? (
                            <Table variant="simple" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
                                <Thead>
                                    <Tr>
                                        <Th color="white" textAlign="left" className="real_th_font" width="8%">ID</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="12%">Amount</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="10%">Mines</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="10%">Grid</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="12%">Result</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="14%">Profit</Th>
                                        <Th color="white" textAlign="left" className="real_th_font" width="24%">Time</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {paginatedResults.map((result, index, arr) => {
                                        const lastItem = index === arr.length - 1;
                                        const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                        const isWin = result.isWin === true;
                                        const winColor = "#6DC64B";
                                        const loseColor = "#E74C3C";
                                        const profitNum = result.profit != null ? result.profit : (result.winAmount != null && result.betAmount != null ? result.winAmount - result.betAmount : null);
                                        const profitDisplay = typeof profitNum === "number"
                                            ? (profitNum < 0 ? `-$${truncateToTwo(Math.abs(profitNum))}` : `$${truncateToTwo(profitNum)}`)
                                            : "—";
                                        const profitColor = typeof profitNum === "number" ? (profitNum > 0 ? winColor : loseColor) : "#fff";
                                        return (
                                            <Tr key={result.id || result._id || globalIndex}>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color="#fff" fontWeight="normal" py="10px">
                                                    {globalIndex + 1}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color="#fff" fontWeight="normal" py="10px">
                                                    $ {result.betAmount != null ? truncateToTwo(result.betAmount) : "—"}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color="#fff" fontWeight="normal" py="10px">
                                                    {result.minesCount != null ? result.minesCount : "—"}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color="#fff" fontWeight="normal" py="10px">
                                                    {result.gridSize != null ? result.gridSize : "25"}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color={isWin ? winColor : loseColor} fontWeight="normal" py="10px">
                                                    {isWin ? "Win" : "Lose"}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color={profitColor} fontWeight="normal" py="10px">
                                                    {profitDisplay}
                                                </Td>
                                                <Td textAlign="left" border={lastItem ? "none" : null} borderBottomColor="#56577A" overflow="hidden" fontSize="sm" color="rgba(255, 255, 255, 0.7)" fontWeight="normal" py="10px">
                                                    {result.createAt ? `${new Date(result.createAt).toLocaleDateString()}, ${new Date(result.createAt).toLocaleTimeString()}` : "—"}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        ) : (
                            <Flex
                                flex="1"
                                direction="column"
                                align="center"
                                justify="center"
                                minH="400px"
                                color="white"
                            >
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
                                <Flex align="center" justify="center">
                                    <SpeakerNotesOffRoundedIcon
                                        sx={{
                                            fontSize: 20,
                                            color: "white",
                                            mr: "8px",
                                            filter: "drop-shadow(0 0 10px white)",
                                        }}
                                    />
                                    <Text fontSize="sm" color="rgba(255,255,255,0.9)">
                                        No transaction found
                                    </Text>
                                </Flex>
                            </Flex>
                        )}
                    </Box>
                </CardBody>

                {list.length > 0 && (
                    <CardFooter>
                        <Box px="22px" pb="20px" pt="0px">
                            <Flex justify="space-between" align="center" flexWrap="wrap" gap="16px">
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
                                                option: { backgroundColor: "#323738", color: "white", padding: "8px 10px", fontSize: "14px" },
                                            }}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </Select>
                                    </GradientBorder>
                                </Flex>

                                <Text fontSize="sm" color="rgba(255, 255, 255, 0.7)">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, list.length)} of {list.length} results
                                </Text>

                                {totalPages > 1 && (
                                    <HStack spacing="8px">
                                        <Button
                                            size="sm"
                                            bg="#323738"
                                            color="white"
                                            _hover={{ bg: "#3d4243" }}
                                            _active={{ bg: "#2a2d2e" }}
                                            leftIcon={<ChevronLeftIcon />}
                                            onClick={handlePreviousPage}
                                            isDisabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <HStack spacing="4px" flexWrap="wrap">
                                            {(() => {
                                                const pages = [];
                                                const maxVisible = 7;
                                                if (totalPages <= maxVisible) {
                                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                                } else {
                                                    pages.push(1);
                                                    let start = Math.max(2, currentPage - 1);
                                                    let end = Math.min(totalPages - 1, currentPage + 1);
                                                    if (currentPage <= 3) end = Math.min(5, totalPages - 1);
                                                    if (currentPage >= totalPages - 2) start = Math.max(2, totalPages - 4);
                                                    if (start > 2) pages.push("…");
                                                    for (let i = start; i <= end; i++) pages.push(i);
                                                    if (end < totalPages - 1) pages.push("…");
                                                    if (totalPages > 1) pages.push(totalPages);
                                                }
                                                return pages.map((p, i) =>
                                                    p === "…" ? (
                                                        <Text key={`ellipsis-${i}`} color="rgba(255, 255, 255, 0.5)" px="4px">…</Text>
                                                    ) : (
                                                        <Button
                                                            key={p}
                                                            size="sm"
                                                            minW="36px"
                                                            h="36px"
                                                            bg={currentPage === p ? "#00D4FF" : "#323738"}
                                                            color="white"
                                                            _hover={{ bg: currentPage === p ? "#00b8e6" : "#3d4243" }}
                                                            _active={{ bg: currentPage === p ? "#00a3cc" : "#2a2d2e" }}
                                                            onClick={() => handlePageClick(p)}
                                                        >
                                                            {p}
                                                        </Button>
                                                    )
                                                );
                                            })()}
                                        </HStack>
                                        <Button
                                            size="sm"
                                            bg="#323738"
                                            color="white"
                                            _hover={{ bg: "#3d4243" }}
                                            _active={{ bg: "#2a2d2e" }}
                                            rightIcon={<ChevronRightIcon />}
                                            onClick={handleNextPage}
                                            isDisabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </HStack>
                                )}
                            </Flex>
                        </Box>
                    </CardFooter>
                )}
            </Card>
        </Box>
    );
}
