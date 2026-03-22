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
import AlphaTreeRealViewRow from 'components/Tables/AlphaTreeRealViewRow';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getAlphaTreeView } from 'action/AlphaTreeActions';
import { useAblyAlphaTreeUpdates } from 'hooks/useAblyAlphaTreeUpdates';
import { useHistory } from 'react-router-dom';

function AlphaTreeRealView() {
    const { alphaTreeView, setAlphaTreeView } = useAblyAlphaTreeUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${Number(row.result).toFixed(2)}-${row.win || 0}`;
    };

    useEffect(() => {
        getAlphaTreeView(history).then((res) => {
            if (res?.data && Array.isArray(res.data)) {
                setAlphaTreeView(res.data);
            }
        });
    }, [history]);

    // Detect new rows and apply animation
    useEffect(() => {
        if (!alphaTreeView || alphaTreeView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(alphaTreeView.map(getRowId));

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
    }, [alphaTreeView]);

    const maxRows = 20;
    const baseRows = Array.isArray(alphaTreeView) ? alphaTreeView : [];
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
                        return (
                            <AlphaTreeRealViewRow
                                key={rowId || index}
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

export default AlphaTreeRealView;