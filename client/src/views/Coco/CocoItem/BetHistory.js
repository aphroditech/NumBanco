import React, { useMemo, useState } from 'react';
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
} from '@chakra-ui/react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import wolfnoavilable from 'assets/img/wolfnoavilable.png';
import Card from 'components/Card/Card.js';
import CardBody from 'components/Card/CardBody.js';
import CardHeader from 'components/Card/CardHeader.js';
import GradientBorder from 'components/GradientBorder/GradientBorder';

const thStyle = {
    bg: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    _hover: {
        bg: 'rgba(255, 215, 0, 0.12)',
        transform: 'scale(1.01)',
    },
};

/**
 * Renders Coco smash history from `user.cocoHistory` (betAmount, profit/win, multiplier, successCount, totalSum, createAt).
 */
export default function CocoBetHistory({ results = [] }) {
    /** Newest first: sort by createAt desc, then by array index (later = newer if dates tie / missing). */
    const sortedHistory = useMemo(() => {
        if (!Array.isArray(results) || results.length === 0) return [];
        return [...results]
            .map((item, idx) => ({ item, idx }))
            .sort((a, b) => {
                const ta = new Date(a.item?.createAt || a.item?.createdAt || 0).getTime();
                const tb = new Date(b.item?.createAt || b.item?.createdAt || 0).getTime();
                const aOk = Number.isFinite(ta) && ta > 0;
                const bOk = Number.isFinite(tb) && tb > 0;
                if (aOk && bOk && tb !== ta) return tb - ta;
                if (bOk && !aOk) return 1;
                if (!bOk && aOk) return -1;
                return b.idx - a.idx;
            })
            .map(({ item }) => item);
    }, [results]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const totalPages = useMemo(() => {
        return Math.ceil(sortedHistory.length / itemsPerPage) || 1;
    }, [sortedHistory.length, itemsPerPage]);

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedHistory.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedHistory, currentPage, itemsPerPage]);

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

    const handlePageClick = (page) => {
        setCurrentPage(page);
    };

    const formatMoney = (val) => {
        const n = Number(val || 0);
        const abs = Math.abs(n).toFixed(2);
        return n < 0 ? `-$${abs}` : `$${abs}`;
    };

    const rowTime = (row) => row?.createAt || row?.createdAt;

    return (
        <Box mt="24px" w="100%">
            <Card pt="20px" pb="20px" minH="400px" px="22px" w="100%">
                <CardHeader>
                    <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color="#00D4FF"
                        mb="16px"
                        textAlign="center"
                        whiteSpace="nowrap"
                    >
                        Bet History
                    </Text>
                </CardHeader>
                <CardBody>
                    <Box
                        overflowY="auto"
                        overflowX="auto"
                        width="100%"
                        pr="6px"
                        sx={{
                            '&::-webkit-scrollbar': { width: '6px', height: '6px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#555b5e',
                                borderRadius: '8px',
                            },
                        }}
                    >
                        {sortedHistory.length > 0 ? (
                            <Table
                                variant="unstyled"
                                color="#fff"
                                width="100%"
                                minW={{ base: '720px', md: '100%' }}
                                sx={{
                                    borderCollapse: 'separate',
                                    borderSpacing: '0 6px',
                                }}
                            >
                                <Thead>
                                    <Tr>
                                        <Th {...thStyle} color="white" textAlign="left" width="7%">
                                            #
                                        </Th>
                                        <Th {...thStyle} color="white" textAlign="left" width="12%">
                                            Bet
                                        </Th>
                                        <Th {...thStyle} color="white" textAlign="left" width="11%">
                                            Result
                                        </Th>
                                        <Th {...thStyle} color="white" textAlign="left" width="10%">
                                            Combo
                                        </Th>
                                        <Th {...thStyle} color="white" textAlign="left" width="12%">
                                            Win
                                        </Th>
                                        <Th {...thStyle} color="white" textAlign="left" width="37%">
                                            Time
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {paginatedResults.map((result, index, arr) => {
                                        const lastItem = index === arr.length - 1;
                                        const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                        const win = Number(result.profit || 0);
                                        const t = rowTime(result);
                                        return (
                                            <Tr
                                                key={result._id || `${globalIndex}-${t}`}
                                                transition="0.2s"
                                            >
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                >
                                                    {globalIndex + 1}
                                                </Td>
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                >
                                                    {formatMoney(result.betAmount || 0)}
                                                </Td>
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                    color="#FFD700"
                                                >
                                                    {Number(result.multiplier || 0).toFixed(2)}
                                                </Td>
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                >
                                                    {result.successCount ?? 0}
                                                </Td>
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                    color={win > 0 ? '#68d391' : 'rgba(255,255,255,0.85)'}
                                                >
                                                    {formatMoney(win)}
                                                </Td>
                                                <Td
                                                    border={lastItem ? 'none' : null}
                                                    borderBottomColor="#56577A"
                                                    color="rgba(255,255,255,0.7)"
                                                >
                                                    {t
                                                        ? `${new Date(t).toLocaleDateString()}, ${new Date(
                                                              t
                                                          ).toLocaleTimeString()}`
                                                        : '—'}
                                                </Td>
                                            </Tr>
                                        );
                                    })}
                                </Tbody>
                            </Table>
                        ) : (
                            <Flex
                                direction="column"
                                align="center"
                                justify="center"
                                minH="320px"
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
                                        style={{ fontSize: '20px', color: 'white', marginRight: '8px' }}
                                    />
                                    No bet history yet
                                </Flex>
                            </Flex>
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
                                    <Text
                                        fontSize="sm"
                                        color="rgba(255, 255, 255, 0.7)"
                                        whiteSpace="nowrap"
                                    >
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
                                                    backgroundColor: '#323738',
                                                    color: 'white',
                                                    padding: '8px 10px',
                                                    fontSize: '14px',
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
                                            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                                            {Math.min(currentPage * itemsPerPage, sortedHistory.length)} of{' '}
                                            {sortedHistory.length} results
                                        </Text>

                                        <HStack spacing="8px">
                                            <Button
                                                size="sm"
                                                bg="#323738"
                                                color="white"
                                                _hover={{ bg: '#3d4243' }}
                                                _active={{ bg: '#2a2d2e' }}
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
                                                        if (currentPage >= totalPages - 2)
                                                            startPage = Math.max(2, totalPages - 4);
                                                        if (startPage > 2) pages.push('ellipsis-start');
                                                        for (let i = startPage; i <= endPage; i++) pages.push(i);
                                                        if (endPage < totalPages - 1) pages.push('ellipsis-end');
                                                        pages.push(totalPages);
                                                    }

                                                    return pages.map((page, idx) => {
                                                        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                                                            return (
                                                                <Text
                                                                    key={`ellipsis-${idx}`}
                                                                    color="rgba(255, 255, 255, 0.5)"
                                                                    px="4px"
                                                                >
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
                                                                bg={currentPage === page ? '#00D4FF' : '#323738'}
                                                                color="white"
                                                                _hover={{
                                                                    bg:
                                                                        currentPage === page
                                                                            ? '#00b8e6'
                                                                            : '#3d4243',
                                                                }}
                                                                _active={{
                                                                    bg:
                                                                        currentPage === page
                                                                            ? '#00a3cc'
                                                                            : '#2a2d2e',
                                                                }}
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
                                                _hover={{ bg: '#3d4243' }}
                                                _active={{ bg: '#2a2d2e' }}
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
                </CardBody>
            </Card>
        </Box>
    );
}
