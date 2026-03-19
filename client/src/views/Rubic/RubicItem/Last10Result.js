import React, { useRef, useEffect } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';

function Last10Result(props) {
    const { results } = props;
    const scrollContainerRef = useRef(null);
    
    // Scroll to the end (right) when component loads or results update
    useEffect(() => {
        if (scrollContainerRef.current && results && results.length > 0) {
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
                }
            }, 100);
        }
    }, [results?.length]);

    return (
        <Box mb="24px" w="100%">
            {results && results.length > 0 ? (
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
                    >
                        <Flex wrap="nowrap" gap="12px" w="100%" align="center" justifyContent="flex-end">
                            {results.map((result, index) => (
                                <Text 
                                    margin="0 10px"
                                    key={index} 
                                    fontSize="md" 
                                    fontWeight="bold" 
                                    color={result.isWin ? "#68d391" : "#f56565"}
                                    whiteSpace="nowrap"
                                >
                                    x{result.multiplier}
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
                        No history result
                    </Text>
                </Box>
            )}
        </Box>
    );
}

export default Last10Result;