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
import CocoRealViewRow from 'components/Tables/CocoRealViewRow';
import { getCocoView } from 'action/CocoActions';
import { useAblyCocoUpdates } from 'hooks/useAblyCocoUpdates';
import { useHistory } from 'react-router-dom';

function CocoRealView() {
    const { cocoView, setCocoView } = useAblyCocoUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();

    const getRowId = (row, index) => {
        if (!row) return `cv-empty-${index}`;
        if (row._id != null) return String(row._id);
        if (row.id != null) return String(row.id);
        const t = row.time ?? row.createdAt ?? "";
        const uid = row.userId ?? "u";
        return `cv-${uid}-${t}-${row.step ?? ""}-${row.multi ?? ""}-${index}`;
    };

    const normalizeViewPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.data)) return payload.data;
        return [];
    };

    useEffect(() => {
        getCocoView(history).then((res) => {
            const raw = res?.data?.data ?? res?.data;
            setCocoView(normalizeViewPayload(raw));
        });
    }, []);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!cocoView || cocoView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(cocoView.map((row, i) => getRowId(row, i)));

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
    }, [cocoView]);

    const maxRows = 19;
    const baseRows = Array.isArray(cocoView) ? cocoView : [];
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
            p="12px"
            pt="16px"
        >
            <Text
                px="10px"
                pb="6px"
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
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" whiteSpace="nowrap" w="42%" textTransform="uppercase" letterSpacing="0.06em" pl="20px">
                                User
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="center" whiteSpace="nowrap" w="28%" textTransform="uppercase" letterSpacing="0.06em">
                                Result
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="right" whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em" pr="20px">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                    {rowsToRender.map((row, index) => {
                        const rowId = getRowId(row, index);
                        return (
                            <CocoRealViewRow
                                key={rowId}
                                altas={row.altas}
                                avatar={row.avatar}
                                result={row.result}
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

export default CocoRealView;