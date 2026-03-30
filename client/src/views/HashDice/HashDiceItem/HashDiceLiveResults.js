import React, { useEffect, useState, useRef } from 'react';
import { GridItem, Box, Table, Thead, Tbody, Tr, Th, Td, Text } from '@chakra-ui/react';
import DiceRealViewRow from 'components/Tables/DiceRealViewRow';

const NEON = '#5efcb4';
const PURPLE = '#c084fc';

/**
 * Live table fed by the parent. Rows can be restored from `/hash-dice/history/me` on refresh.
 */
export default function HashDiceLiveResults({ rows = [], desktopMinH = '520px' }) {
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);

    const getRowId = (row) => {
        if (!row) return '';
        return row.id || `${row.altas || 'user'}-${row.bet || 0}-${row.win || 0}`;
    };

    useEffect(() => {
        if (!rows || rows.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(rows.map(getRowId));

        if (!hasInitializedRef.current) {
            prevRowIdsRef.current = currentIds;
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const incomingIds = new Set();
        currentIds.forEach((id) => {
            if (!prevRowIdsRef.current.has(id)) incomingIds.add(id);
        });

        setNewRowIds(incomingIds);
        prevRowIdsRef.current = currentIds;

        if (incomingIds.size > 0) {
            const timeoutId = setTimeout(() => {
                setNewRowIds(new Set());
            }, 1700);
            return () => clearTimeout(timeoutId);
        }
    }, [rows]);

    const list = Array.isArray(rows) ? rows : [];

    return (
        <GridItem
            area="live"
            minW={0}
            maxW="100%"
            display="flex"
            flexDirection="column"
            minH={{ base: '250px', '1550px': desktopMinH }}
            h="100%"
            alignSelf="stretch"
        >
            <Box
                w="100%"
                maxW="100%"
                flex="1"
                minH={{ base: '250px', '1550px': '100%' }}
                h="100%"
                bg="linear-gradient(165deg, #1a1b20 0%, #22232a 100%)"
                borderRadius="14px"
                border="1px solid rgba(192,132,252,0.22)"
                boxShadow="0 0 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)"
                overflow="hidden"
                display="flex"
                flexDirection="column"
                p="16px"
                pt="18px"
            >
                <Text
                    px="8px"
                    pb="10px"
                    fontSize="sm"
                    fontWeight="800"
                    color="rgba(255,255,255,0.94)"
                    letterSpacing="0.06em"
                    textTransform="uppercase"
                    flexShrink={0}
                    sx={{
                        textShadow: `0 0 12px ${PURPLE}`,
                    }}
                >
                    Live Results
                </Text>
                <Box
                    overflowX="hidden"
                    width="100%"
                    overflowY="auto"
                    flex="1"
                    minH="0"
                    sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                    }}
                >
                    <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: 'fixed' }}>
                        <Thead>
                            <Tr borderBottom="1px solid rgba(57,255,20,0.2)">
                                <Th
                                    color="rgba(255,255,255,0.75)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    whiteSpace="nowrap"
                                    w="42%"
                                    textTransform="uppercase"
                                    letterSpacing="0.08em"
                                >
                                    User
                                </Th>
                                <Th
                                    color={NEON}
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    textAlign="center"
                                    whiteSpace="nowrap"
                                    w="28%"
                                    textTransform="uppercase"
                                    letterSpacing="0.08em"
                                >
                                    Bet
                                </Th>
                                <Th
                                    color="rgba(255,255,255,0.75)"
                                    fontSize="10px"
                                    fontWeight="800"
                                    px="0"
                                    py="4px"
                                    h="32px"
                                    borderBottom="none"
                                    textAlign="right"
                                    whiteSpace="nowrap"
                                    w="30%"
                                    textTransform="uppercase"
                                    letterSpacing="0.08em"
                                >
                                    Win
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {list.length === 0 ? (
                                <Tr>
                                    <Td
                                        colSpan={3}
                                        py="24px"
                                        textAlign="center"
                                        color="rgba(255,255,255,0.45)"
                                        fontSize="sm"
                                    >
                                        Live rounds appear here (all players & bots)
                                    </Td>
                                </Tr>
                            ) : (
                                list.map((row, index) => {
                                    const rowId = getRowId(row);
                                    return (
                                        <DiceRealViewRow
                                            key={rowId || index}
                                            altas={row.altas}
                                            avatar={row.avatar}
                                            bet={row.bet}
                                            win={row.win}
                                            isNew={newRowIds.has(rowId)}
                                        />
                                    );
                                })
                            )}
                        </Tbody>
                    </Table>
                </Box>
            </Box>
        </GridItem>
    );
}
