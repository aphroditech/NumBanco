import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Flex,
    HStack,
    Select,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import CardBody from "components/Card/CardBody";
import CardFooter from "components/Card/CardFooter";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GradientBorder from "components/GradientBorder/GradientBorder";
import { getMyDoveHistory } from "action/DoveActions";
import { useAblyDoveUpdates } from "hooks/useAblyDoveUpdates";
import { useHistory } from "react-router-dom";
import truncateToTwo from "variables/truncateToTwo";

function DoveHistory() {
    const history = useHistory();
    const { doveView } = useAblyDoveUpdates();
    const [rows, setRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        getMyDoveHistory(history).then((data) => {
            if (Array.isArray(data)) setRows(data);
        });
    }, []);

    useEffect(() => {
        if (!doveView || doveView.length === 0) return;
        const timeoutId = setTimeout(() => {
            getMyDoveHistory(history).then((data) => {
                if (Array.isArray(data)) setRows(data);
            });
        }, 120);
        return () => clearTimeout(timeoutId);
    }, [doveView]);

    const totalPages = useMemo(() => Math.ceil(rows.length / itemsPerPage), [rows.length, itemsPerPage]);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return rows.slice(start, start + itemsPerPage);
    }, [rows, currentPage, itemsPerPage]);

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value, 10));
        setCurrentPage(1);
    };

    return (
        <Box mt="24px" w="100%">
            <Card pt="20px" pb="20px" minH="400px" px="22px" boxShadow="none" border="1px solid rgba(255,255,255,0.1)">
                <CardHeader>
                    <Text fontSize="lg" color="#fff" fontWeight="bold" mb="16px" display="flex" alignItems="center" justifyContent="center" whiteSpace="nowrap">
                        <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />
                        My Bet History
                    </Text>
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
                    <Table variant="simple" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
                        <Thead>
                            <Tr style={{ textAlignLast: "center" }}>
                                <Th color="white" className="real_th_font">ID</Th>
                                <Th color="white" className="real_th_font">Bet</Th>
                                <Th color="white" className="real_th_font">Multiplier</Th>
                                <Th color="white" className="real_th_font">Win</Th>
                                <Th color="white" className="real_th_font">Expected Value</Th>
                                <Th color="white" className="real_th_font">Time</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {paginatedRows.map((row, idx) => {
                                const winColor = row.win > 0 ? "#6DC64B" : "#E74C3C";
                                const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                                const lastItem = idx === paginatedRows.length - 1;
                                return (
                                    <Tr key={row._id || globalIndex}>
                                        <Td textAlign="center" color="#fff" border={lastItem ? "none" : null} borderBottomColor="#56577A">{globalIndex + 1}</Td>
                                        <Td textAlign="center" color={winColor} border={lastItem ? "none" : null} borderBottomColor="#56577A">{truncateToTwo(row.bet)}</Td>
                                        <Td textAlign="center" color={winColor} border={lastItem ? "none" : null} borderBottomColor="#56577A">{truncateToTwo(row.multiplier)}</Td>
                                        <Td textAlign="center" color={winColor} border={lastItem ? "none" : null} borderBottomColor="#56577A">{truncateToTwo(row.win)}</Td>
                                        <Td textAlign="center" color={winColor} border={lastItem ? "none" : null} borderBottomColor="#56577A">{truncateToTwo(row.expectedValue || 0)}</Td>
                                        <Td textAlign="center" color="#fff" border={lastItem ? "none" : null} borderBottomColor="#56577A">
                                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                                        </Td>
                                    </Tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <Tr>
                                    <Td colSpan={6} textAlign="center" color="rgba(255,255,255,0.8)">
                                        No bet history yet.
                                    </Td>
                                </Tr>
                            )}
                        </Tbody>
                    </Table>
                    </Box>
                </CardBody>
                {rows.length > 0 && (
                    <CardFooter>
                        <Box px="22px" pb="20px" pt="0px" w="100%">
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
                                            sx={{ option: { backgroundColor: "#323738", color: "white", padding: "8px 10px", fontSize: "14px" } }}
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
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, rows.length)} of {rows.length} results
                                        </Text>
                                        <HStack spacing="8px">
                                            <Button
                                                size="sm"
                                                bg="#323738"
                                                color="white"
                                                _hover={{ bg: "#3d4243" }}
                                                _active={{ bg: "#2a2d2e" }}
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                                    } else {
                                                        pages.push(1);
                                                        let startPage = Math.max(2, currentPage - 1);
                                                        let endPage = Math.min(totalPages - 1, currentPage + 1);
                                                        if (currentPage <= 3) endPage = Math.min(5, totalPages - 1);
                                                        if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 4);
                                                        if (startPage > 2) pages.push("ellipsis-start");
                                                        for (let i = startPage; i <= endPage; i++) pages.push(i);
                                                        if (endPage < totalPages - 1) pages.push("ellipsis-end");
                                                        pages.push(totalPages);
                                                    }
                                                    return pages.map((page, idx) => {
                                                        if (page === "ellipsis-start" || page === "ellipsis-end") {
                                                            return <Text key={`ellipsis-${idx}`} color="rgba(255, 255, 255, 0.5)" px="4px">...</Text>;
                                                        }
                                                        return (
                                                            <Button
                                                                key={page}
                                                                size="sm"
                                                                minW="36px"
                                                                h="36px"
                                                                bg={currentPage === page ? "#00D4FF" : "#323738"}
                                                                color="white"
                                                                _hover={{ bg: currentPage === page ? "#00b8e6" : "#3d4243" }}
                                                                _active={{ bg: currentPage === page ? "#00a3cc" : "#2a2d2e" }}
                                                                onClick={() => setCurrentPage(page)}
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
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
                    </CardFooter>
                )}
            </Card>
        </Box>
    );
}

export default DoveHistory;
