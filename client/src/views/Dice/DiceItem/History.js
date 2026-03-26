import {
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Flex,
    Select,
    Button,
    HStack,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody.js';
import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import DiceHistoryRow from 'components/Tables/DiceHistoryRow';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GradientBorder from 'components/GradientBorder/GradientBorder';
import wolfnoavilable from '../../../assets/img/wolfnoavilable.png';

function History() {
    const user = useSelector((state) => state.user.userInfo) || {};

    const sortedHistory = user.diceHistory?.length > 0
        ? user.diceHistory.sort((a, b) => {
            const dateA = new Date(a.createAt || 0);
            const dateB = new Date(b.createAt || 0);
            return dateB - dateA;
        })
        : [];

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const totalPages = useMemo(() => {
        return Math.ceil(sortedHistory.length / itemsPerPage);
    }, [sortedHistory.length, itemsPerPage]);

    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedHistory.slice(startIndex, endIndex);
    }, [sortedHistory, currentPage, itemsPerPage]);

    const handleItemsPerPageChange = (e) => {
        const newItemsPerPage = parseInt(e.target.value, 10);
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePageClick = (page) => {
        setCurrentPage(page);
    };
    return (
        <Card p="24px" overflowX="hidden" mt="24px">
            <CardHeader mb="20px">
                <Flex direction="column" alignSelf="flex-start">
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                        <RestoreRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />History
                    </Text>
                </Flex>
            </CardHeader>
            <CardBody>
                <Box
                    overflowY="auto"
                    overflowX="hidden"
                    width="100%"
                    sx={{
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555b5e",
                            borderRadius: "8px",
                        },
                    }}
                >
                    {sortedHistory.length === 0 ? (
                        // ✅ NO HISTORY STATE
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
                            <Flex align="center" justify="center" mb="20px">
                                <SpeakerNotesOffRoundedIcon
                                    style={{
                                        fontSize: "20px",
                                        color: "white",
                                        marginRight: "8px",
                                        filter: "drop-shadow(0 0 10px white)",
                                    }} />
                                No transaction found
                            </Flex>
                        </Flex>
                    ) : (

                        <Table
                            variant="simple"
                            color="#fff"
                            width="100%"
                            sx={{ tableLayout: "fixed" }}
                        >
                            <Thead>
                                <Tr style={{ textAlignLast: "center" }}>
                                    <Th color="white" textAlign="left" className="real_th_font" w="15%">
                                        No
                                    </Th>
                                    <Th color="white" className="real_th_font" w="30%">
                                        Bet
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" w="20%">
                                        Dice
                                    </Th>
                                    <Th color="white" className="real_th_font" w="30%">
                                        Type
                                    </Th>
                                    <Th color="white" className="real_th_font" w="30%">
                                        Win
                                    </Th>
                                    <Th color="white" className="real_th_font" w="30%">
                                        Time
                                    </Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {paginatedHistory.map((row, index, arr) => {
                                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                    return (
                                        <DiceHistoryRow
                                            key={globalIndex}
                                            No={globalIndex + 1}
                                            bet={row.bet}
                                            dice={row.dice}
                                            type={row.type}
                                            win={row.win}
                                            time={row.createAt}
                                            lastItem={index === arr.length - 1}
                                        />
                                    );
                                })}
                            </Tbody>
                        </Table>
                    )}
                    {sortedHistory.length > 0 && (
                        <Box px="22px" pb="20px" pt="16px">
                            <Flex
                                justify="space-between"
                                align="center"
                                flexWrap="wrap"
                                gap="16px"
                            >
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
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedHistory.length)} of {sortedHistory.length} results
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
                                                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                                                    } else {
                                                        pages.push(1);
                                                        let startPage = Math.max(2, currentPage - 1);
                                                        let endPage = Math.min(totalPages - 1, currentPage + 1);
                                                        if (currentPage <= 3) endPage = Math.min(5, totalPages - 1);
                                                        if (currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 4);
                                                        if (startPage > 2) pages.push('ellipsis-start');
                                                        for (let i = startPage; i <= endPage; i++) pages.push(i);
                                                        if (endPage < totalPages - 1) pages.push('ellipsis-end');
                                                        pages.push(totalPages);
                                                    }

                                                    return pages.map((page, idx) => {
                                                        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
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
                </Box>

                {/* Pagination Controls */}
            </CardBody>
        </Card>
    );
}

export default History;