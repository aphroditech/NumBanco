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
import FishingRealViewRow from 'components/Tables/FishingRealViewRow';
import { getFishingView } from 'action/FishingActions';
import { useAblyFishingUpdates } from 'hooks/useAblyFishingUpdates';
import { useHistory } from 'react-router-dom';

function RealView() {
    const { fishingView, setFishingView } = useAblyFishingUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row, index) => {
        if (!row) return `fv-empty-${index}`;
        if (row._id != null) return String(row._id);
        if (row.id != null) return String(row.id);
        const t = row.time ?? row.createdAt ?? "";
        const uid = row.userId ?? "u";
        return `fv-${uid}-${t}-${row.step ?? ""}-${row.multi ?? ""}-${index}`;
    };

    useEffect(() => {
        getFishingView(history).then((res) => {
            setFishingView(res.data);
        });
    }, []);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!fishingView || fishingView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(fishingView.map((row, i) => getRowId(row, i)));

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
    }, [fishingView]);

    const maxRows = 12;
    const baseRows = Array.isArray(fishingView) ? fishingView : [];
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
                    "msOverflowStyle": "none",
                    "scrollbarWidth": "none",
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
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="42%" textTransform="uppercase" letterSpacing="0.06em">
                                User
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="28%" textTransform="uppercase" letterSpacing="0.06em">
                                Bet
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="right" whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                    {rowsToRender.map((row, index) => {
                        const rowId = getRowId(row, index);
                        return (
                            <FishingRealViewRow
                                key={rowId}
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