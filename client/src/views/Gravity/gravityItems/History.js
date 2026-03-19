import React, { useState, useMemo } from 'react';
import { Box, Text, Table, Thead, Tbody, Tr, Th, Td, Flex, Select, Button, HStack } from '@chakra-ui/react';
import truncateToTwo from 'variables/truncateToTwo.js';
import wolfnoavilable from 'assets/img/wolfnoavilable.png';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSelector } from 'react-redux';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import CardBody from 'components/Card/CardBody.js';
import GradientBorder from 'components/GradientBorder/GradientBorder';

function BetHistory(props) {

    const {results} = props;

    results.reverse();
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Calculate pagination
    const totalPages = useMemo(() => {
        return Math.ceil(results.length / itemsPerPage);
    }, [results.length, itemsPerPage]);
    
    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return results.slice(startIndex, endIndex);
    }, [results, currentPage, itemsPerPage]);
    
    // Reset to page 1 when items per page changes
    const handleItemsPerPageChange = (e) => {
        const newItemsPerPage = parseInt(e.target.value, 10);
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };
    
    // Pagination handlers
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };
    
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };
    
    const handlePageClick = (page) => {
        setCurrentPage(page);
    };

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
                        flex="1"
                        // maxH="400px"
                        overflowY="auto"
                        overflowX="hidden"
                        width="100%"
                        pr="6px"
                        sx={{
                            "&::-webkit-scrollbar": {
                                width: "6px",
                            },
                            "&::-webkit-scrollbar-track": {
                                background: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                background: "#555b5e",
                                borderRadius: "8px",
                            },
                        }}
                    >
                    {results.length > 0 ? (
                        <Table variant="simple" color="#fff" height="100%" width="100%" sx={{ tableLayout: "fixed" }}>
                            <Thead top="0" zIndex="5">
                                <Tr>
                                    <Th color="white" textAlign="left" className="real_th_font" width="10%">
                                        ID
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" width="12%">
                                        Amount
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" width="12%">
                                        Direction
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" width="12%">
                                        Result
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" width="15%">
                                        Profit
                                    </Th>
                                    <Th color="white" textAlign="left" className="real_th_font" width="15%">
                                        Time
                                    </Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {paginatedResults.map((result, index, arr) => {
                                    const lastItem = index === arr.length - 1;
                                    const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                    return (
                                        <Tr key={result.id || globalIndex}>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color='#fff'
                                                fontWeight='normal'
                                            >
                                                {result.roundId}
                                            </Td>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color='#fff'
                                                fontWeight='normal'
                                            >
                                                ${truncateToTwo(result.amount)}
                                            </Td>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color={result.result === 'win' ? '#68d391' : '#f56565'}
                                                fontWeight='normal'
                                            >
                                                {result.direction}
                                            </Td>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color='#fff'
                                                fontWeight='normal'
                                            >
                                                {result.result}
                                            </Td>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color='#fff'
                                                fontWeight='normal'
                                            >
                                               $ {truncateToTwo(result.profit)}
                                            </Td>
                                            <Td 
                                                textAlign="left" 
                                                border={lastItem ? "none" : null}
                                                borderBottomColor='#56577A'
                                                overflow="hidden"
                                                fontSize='sm'
                                                color={result.result === 'win' ? '#68d391' : '#f56565'}
                                                fontWeight='normal'
                                            >
                                                $ {truncateToTwo(result.profit)}
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
                                <img
                                    align="center"
                                    src={wolfnoavilable}
                                    alt="NumBanco - No gravity result available"
                                    loading="eager"
                                    width={260}
                                    height={260}
                                />
                                <Flex align="center" justify="center" mb="20px">
                                    <SpeakerNotesOffRoundedIcon 
                                        style={{ 
                                            fontSize: "20px",
                                            color: "white",
                                            marginRight: "8px",
                                            filter: "drop-shadow(0 0 10px white)",
                                        }} />
                                    No Game result found
                                </Flex>
                            </Flex>
                        )}
                    </Box>
                </CardBody>
                
                {/* Pagination Controls - Bottom of Card */}
                {results.length > 0 && (
                    <Box px="22px" pb="20px" pt="0px">
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
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, results.length)} of {results.length} results
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
                                
                                {/* Page Numbers */}
                                <HStack spacing="4px">
                                    {(() => {
                                        const pages = [];
                                        const maxVisible = 7;
                                        
                                        if (totalPages <= maxVisible) {
                                            // Show all pages if total is small
                                            for (let i = 1; i <= totalPages; i++) {
                                                pages.push(i);
                                            }
                                        } else {
                                            // Always show first page
                                            pages.push(1);
                                            
                                            let startPage = Math.max(2, currentPage - 1);
                                            let endPage = Math.min(totalPages - 1, currentPage + 1);
                                            
                                            // Adjust if we're near the start
                                            if (currentPage <= 3) {
                                                endPage = Math.min(5, totalPages - 1);
                                            }
                                            
                                            // Adjust if we're near the end
                                            if (currentPage >= totalPages - 2) {
                                                startPage = Math.max(2, totalPages - 4);
                                            }
                                            
                                            // Add ellipsis before middle pages if needed
                                            if (startPage > 2) {
                                                pages.push('ellipsis-start');
                                            }
                                            
                                            // Add middle pages
                                            for (let i = startPage; i <= endPage; i++) {
                                                pages.push(i);
                                            }
                                            
                                            // Add ellipsis after middle pages if needed
                                            if (endPage < totalPages - 1) {
                                                pages.push('ellipsis-end');
                                            }
                                            
                                            // Always show last page
                                            pages.push(totalPages);
                                        }
                                        
                                        return pages.map((page, idx) => {
                                            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
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
            </Card>
        </Box>
    );
}

export default BetHistory;