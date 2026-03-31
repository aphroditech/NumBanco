import React, { useRef, useEffect } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import truncateToTwo from 'variables/truncateToTwo';

const NEON_WIN = '#5efcb4';
const LOSS_RED = '#f87171';
const LOSS_BG = 'rgba(248,113,113,0.1)';
const LOSS_BORDER = 'rgba(248,113,113,0.35)';

/** Top strip of recent round multipliers — street / Hashdice style. */
export default function HashDiceMultiplierStrip({ results }) {
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (scrollContainerRef.current && results && results.length > 0) {
            const t = window.setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
                }
            }, 80);
            return () => window.clearTimeout(t);
        }
    }, [results?.length]);

    const list = Array.isArray(results) ? results : [];

    return (
        <Box mb={{ base: '16px', md: '24px' }} w="100%">
            <Box
                bg="linear-gradient(90deg, #1e1f24 0%, #25262c 50%, #1e1f24 100%)"
                borderRadius="14px"
                px="14px"
                py="10px"
                w="100%"
                border="1px solid rgba(57,255,20,0.15)"
                boxShadow="0 0 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)"
            >
                {list.length > 0 ? (
                    <Box
                        ref={scrollContainerRef}
                        w="100%"
                        overflowX="auto"
                        overflowY="hidden"
                        sx={{
                            '&::-webkit-scrollbar': { height: '3px' },
                            '&::-webkit-scrollbar-thumb': {
                                background: 'rgba(57,255,20,0.35)',
                                borderRadius: '2px',
                            },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                        }}
                    >
                        <Flex wrap="nowrap" gap="10px" align="center" justifyContent="flex-end">
                            {list.map((item, index) => {
                                const m = Number(item.multiplier ?? item);
                                const isLoss = !Number.isFinite(m) || m < 1;
                                return (
                                    <Box
                                        key={item.id ?? index}
                                        px="12px"
                                        py="4px"
                                        borderRadius="8px"
                                        bg={isLoss ? LOSS_BG : 'rgba(57,255,20,0.08)'}
                                        border="1px solid"
                                        borderColor={isLoss ? LOSS_BORDER : 'rgba(57,255,20,0.35)'}
                                        flexShrink={0}
                                    >
                                        <Text
                                            fontSize="sm"
                                            fontWeight="800"
                                            color={isLoss ? LOSS_RED : NEON_WIN}
                                            whiteSpace="nowrap"
                                            sx={{
                                                textShadow: isLoss
                                                    ? '0 0 10px rgba(248,113,113,0.4)'
                                                    : '0 0 10px rgba(57,255,20,0.45)',
                                            }}
                                        >
                                            {isLoss ? '0.00x' : `x${truncateToTwo(m)}`}
                                        </Text>
                                    </Box>
                                );
                            })}
                        </Flex>
                    </Box>
                ) : (
                    <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py="6px">
                        Roll history appears here
                    </Text>
                )}
            </Box>
        </Box>
    );
}
