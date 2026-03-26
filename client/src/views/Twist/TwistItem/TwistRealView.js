import {
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Flex,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import React, { useEffect, useState, useRef } from 'react';
import TwistRealViewRow from 'components/Tables/TwistRealViewRow';
import { getTwistView } from 'action/TwistActions';
import { useAblyTwistUpdates } from 'hooks/useAblyTwistUpdates';
import { useHistory } from 'react-router-dom';

function TwistRealView() {
    const { twistView, setTwistView } = useAblyTwistUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${Number(row.result).toFixed(2)}-${row.win || 0}`;
    };

    useEffect(() => {
        getTwistView(history).then((res) => {
            setTwistView(res.data);
        });
    }, []);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!twistView || twistView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(twistView.map(getRowId));

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
    }, [twistView]);

    const maxRows = 22;
    const baseRows = Array.isArray(twistView) ? twistView : [];
    const rowsToRender = baseRows.slice(0, maxRows);
    
    return (
        <Card p="24px" pt="30px" overflowX="hidden" height="100%" display="flex" flexDirection="column">
            <Box overflowX="hidden" width="100%" overflowY="auto" flex="1" minH="0">
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
                                Result
                            </Th>
                            <Th color="white" className="real_th_font" px="0px" py="4px" h="32px" borderBottom="none">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                    {rowsToRender.map((row, index) => {
                        const rowId = getRowId(row);
                        const rowRenderKey = rowId ? `${rowId}-${index}` : `row-${index}`;
                        return (
                            <TwistRealViewRow
                                key={rowRenderKey}
                                altas={row.altas}
                                avatar={row.avatar}
                                result={Number(row.result).toFixed(2)}
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

export default TwistRealView;