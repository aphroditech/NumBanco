import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Text,
} from '@chakra-ui/react';
import React, { useEffect, useState, useRef } from 'react';
import DiceRealViewRow from 'components/Tables/DiceRealViewRow';
import { getDiceView } from 'action/DiceActions';
import { useAblyDiceUpdates } from 'hooks/useAblyDiceUpdates';
import { useHistory } from 'react-router-dom';

function RealView() {
    const { diceView, setDiceView } = useAblyDiceUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${row.bet || 0}-${row.win || 0}`;
    };

    useEffect(() => {
        getDiceView(history).then((res) => {
            setDiceView(res.data);
        });
    }, []);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!diceView || diceView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(diceView.map(getRowId));

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
    }, [diceView]);

    const maxRows = 12;
    const baseRows = Array.isArray(diceView) ? diceView : [];
    const rowsToRender = baseRows.slice(0, maxRows);

    return (
        <Box
            w="100%"
            maxW="100%"
            h="450px"
            minH={0}
            flex={1}
            bg="#2b2b2b"
            borderRadius="14px"
            border="1px solid rgba(255,255,255,0.1)"
            boxShadow="none"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            p="16px"
            pt="20px"
        >
            <Text
                px="12px"
                pb="8px"
                fontSize="sm"
                fontWeight="800"
                color="rgba(255,255,255,0.92)"
                letterSpacing="0.02em"
                flexShrink={0}
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
                    "&::-webkit-scrollbar": { display: "none" },
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                }}
            >
                <Table
                    variant="unstyled"
                    color="#fff"
                    width="100%"
                    sx={{ tableLayout: "fixed" }}
                >
                    <Thead>
                        <Tr borderBottom="1px solid rgba(255,255,255,0.12)">
                            <Th
                                color="rgba(255,255,255,0.9)"
                                fontSize="10px"
                                fontWeight="800"
                                px="0"
                                py="4px"
                                h="32px"
                                borderBottom="none"
                                whiteSpace="nowrap"
                                w="42%"
                                textTransform="uppercase"
                                letterSpacing="0.06em"
                            >
                                User
                            </Th>
                            <Th
                                color="rgba(255,255,255,0.9)"
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
                                letterSpacing="0.06em"
                            >
                                Bet
                            </Th>
                            <Th
                                color="rgba(255,255,255,0.9)"
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
                                letterSpacing="0.06em"
                            >
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {rowsToRender.map((row, index) => {
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
                        })}
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
}

export default RealView;
