import React, { useRef, useEffect } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import truncateToTwo from 'variables/truncateToTwo';

/** Top strip of recent multipliers — matches Rubic `Last10Result` styling. */
export default function PlinkoLast({ results }) {
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (scrollContainerRef.current && results && results.length > 0) {
            const t = window.setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
                }
            }, 100);
            return () => window.clearTimeout(t);
        }
    }, [results?.length]);

    const list = Array.isArray(results) ? results : [];

    return (
        <Box mb="24px" w="100%">
            {list.length > 0 ? (
                <Box bg="#2a2d2e" borderRadius="20px" px="16px" py="12px" w="100%" position="relative">
                    <Box
                        ref={scrollContainerRef}
                        w="100%"
                        overflowX="auto"
                        overflowY="hidden"
                        sx={{
                            '&::-webkit-scrollbar': { height: '4px' },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#555b5e',
                                borderRadius: '2px',
                            },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                        }}
                    >
                        <Flex wrap="nowrap" gap="12px" w="100%" align="center" justifyContent="flex-end">
                            {list.map((item, index) => {
                                const m = Number(item.multiplier ?? item);
                                const isLow = m < 1;
                                return (
                                    <Text
                                        margin="0 10px"
                                        key={item.roundId ?? item.id ?? index}
                                        fontSize="md"
                                        fontWeight="bold"
                                        color={isLow ? '#f56565' : '#68d391'}
                                        whiteSpace="nowrap"
                                    >
                                        x{truncateToTwo(m)}
                                    </Text>
                                );
                            })}
                        </Flex>
                    </Box>
                </Box>
            ) : (
                <Box bg="#2a2d2e" borderRadius="20px" px="16px" py="20px" w="100%">
                    <Text fontSize="md" color="rgba(255, 255, 255, 0.5)" textAlign="center">
                        No history yet — place a bet to see multipliers here
                    </Text>
                </Box>
            )}
        </Box>
    );
}
