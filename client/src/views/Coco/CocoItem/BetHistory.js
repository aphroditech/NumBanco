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
import CardFooter from 'components/Card/CardFooter';
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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const formatMoney = (val) => {
        const n = Number(val || 0);
        const abs = Math.abs(n).toFixed(2);
        return n < 0 ? `-$${abs}` : `$${abs}`;
    };

    const reversedResults = useMemo(() => [...results].reverse(), [results]);
    const totalPages = useMemo(
        () => Math.ceil(reversedResults.length / itemsPerPage) || 1,
        [reversedResults.length, itemsPerPage]
    );

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return reversedResults.slice(startIndex, startIndex + itemsPerPage);
    }, [reversedResults, currentPage, itemsPerPage]);

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
                        {results.length > 0 ? (
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
                    </Box>
                </CardBody>
                <CardFooter>
                    {results.length > 0 && (
                        <Box px="22px" pb="20px" pt="0px">
                            <Flex justify="space-between" align="center" flexWrap="wrap" gap="16px">
                                <Flex align="center" gap="12px">
                                    <Text fontSize="sm" color="rgba(255,255,255,0.7)">
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
                                            onChange={(e) => {
                                                setItemsPerPage(parseInt(e.target.value, 10));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                        </Select>
                                    </GradientBorder>
                                </Flex>
                                {totalPages > 1 && (
                                    <HStack spacing="8px">
                                        <Button
                                            size="sm"
                                            bg="#323738"
                                            color="white"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            isDisabled={currentPage === 1}
                                            leftIcon={<ChevronLeftIcon />}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            size="sm"
                                            bg="#323738"
                                            color="white"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            isDisabled={currentPage === totalPages}
                                            rightIcon={<ChevronRightIcon />}
                                        >
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
