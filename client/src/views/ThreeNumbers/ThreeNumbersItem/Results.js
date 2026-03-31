import {
    Box,
    Text,
    Flex,
} from '@chakra-ui/react';
import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

function Result() {
    const user = useSelector((state) => state.user.userInfo) || {};
    const scrollContainerRef = useRef(null);
    
    const sortedHistory = user.pumpingHistory.filter((item) => item.active) && user.pumpingHistory.filter((item) => item.active).length > 0
        ? user.pumpingHistory.filter((item) => item.active) : [];
    
    // Scroll to the end (right) when component loads or history updates
    useEffect(() => {
        if (scrollContainerRef.current && sortedHistory.length > 0) {
            // Use setTimeout to ensure DOM is fully rendered
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    // Scroll to the maximum scroll position (right end)
                    scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
                }
            }, 100);
        }
    }, [sortedHistory.length]);
    
    return (
        <Box mb="24px" w="100%">
            {sortedHistory.length > 0 ? (
                <Box
                    bg="#2a2d2e"
                    borderRadius="20px"
                    px="16px"
                    py="12px"
                    w="100%"
                    position="relative"
                >
                    <Box
                        ref={scrollContainerRef}
                        w="100%"
                        overflowX="hidden"
                        overflowY="hidden"
                        sx={{
                            "&::-webkit-scrollbar": {
                                height: "4px",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                background: "#555b5e",
                                borderRadius: "2px",
                            },
                            "&::-webkit-scrollbar-track": {
                                background: "transparent",
                            },
                        }}
                        justifyItems="right"
                    >
                        <Flex wrap="nowrap" gap="12px" w="100%" align="center" justifyContent="flex-end">
                            {sortedHistory.map((result, index) => (
                                <Text 
                                    margin="0 10px"
                                    key={index} 
                                    fontSize="md" 
                                    fontWeight="bold" 
                                    color={result.win ? "#6DC64B" : "#E74C3C"}
                                    whiteSpace="nowrap"
                                >
                                    {typeof result.result === 'number' 
                                        ? result.result.toFixed(2) 
                                        : parseFloat(result.result || 0).toFixed(2)}
                                </Text>
                            ))}
                        </Flex>
                    </Box>
                </Box>
            ) : (
                <Box
                    bg="#2a2d2e"
                    borderRadius="20px"
                    px="16px"
                    py="20px"
                    w="100%"
                >
                    <Text fontSize="md" color="rgba(255, 255, 255, 0.5)" textAlign="center">
                        No result
                    </Text>
                </Box>
            )}
        </Box>
    );
}

export default Result;