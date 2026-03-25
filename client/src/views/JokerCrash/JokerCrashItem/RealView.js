import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import React, { useEffect, useState, useRef } from 'react';
import JokerCrashRealViewRow from 'components/Tables/JokerCrashRealViewRow';
import { getJokerCrashView } from 'action/JokerCrashActions';
import { useAblyJokerCrashUpdates } from 'hooks/useAblyJokerCrashUpdates';
import { useHistory } from 'react-router-dom';

function RealView() {
    const { jokerCrashView, setJokerCrashView } = useAblyJokerCrashUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();

    /** Stable unique id per row — never use altas/bet/win alone (many collisions → duplicate React keys → overlapping rows). */
    const getRowId = (row, index) => {
        if (!row) return `jcv-empty-${index}`;
        if (row._id != null) return String(row._id);
        if (row.id != null) return String(row.id);
        const t = row.time ?? row.createdAt ?? "";
        const uid = row.userId ?? "u";
        return `jcv-${uid}-${t}-${row.step ?? ""}-${row.multi ?? ""}-${index}`;
    };

    const normalizeViewPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.data)) return payload.data;
        return [];
    };

    useEffect(() => {
        getJokerCrashView(history).then((res) => {
            const raw = res?.data?.data ?? res?.data;
            setJokerCrashView(normalizeViewPayload(raw));
        });
    }, []);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!jokerCrashView || jokerCrashView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(jokerCrashView.map((row, i) => getRowId(row, i)));

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
    }, [jokerCrashView]);

    const maxRows = 12;
    const baseRows = Array.isArray(jokerCrashView) ? jokerCrashView : [];
    const rowsToRender = baseRows.slice(0, maxRows);
    
    return (
        <Card p="24px" pt="30px" overflowX="hidden" height="450px">
            <Box overflowX="hidden" width="100%" overflowY="auto" maxH="100%">
                <Table
                variant="unstyled"
                color="#fff"
                width="100%"
                sx={{ tableLayout: "fixed" }}
                >
                    <Thead>
                        <Tr style={{ textAlignLast: "center" }}>
                            <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                User
                            </Th>
                            <Th color="white" textAlign="left" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                Bet
                            </Th>
                            <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                    {rowsToRender.map((row, index) => {
                        const rowId = getRowId(row, index);
                        return (
                            <JokerCrashRealViewRow
                                key={rowId}
                                altas={row.altas}
                                avatar={row.avatar}
                                // membership={row.membership}
                                // target={row.target}
                                bet={row.bet}
                                win={row.win}
                                isNew={newRowIds.has(rowId)}
                            />
                        );
                    })}
                    </Tbody>
                </Table>
            </Box>
        </Card>
    );
}

export default RealView;