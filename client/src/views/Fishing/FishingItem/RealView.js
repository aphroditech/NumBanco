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
import FishingRealViewRow from 'components/Tables/FishingRealViewRow';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getFishingView } from 'action/FishingActions';
import { useAblyFishingUpdates } from 'hooks/useAblyFishingUpdates';
import { useHistory } from 'react-router-dom';

function RealView() {
    const { fishingView, setFishingView } = useAblyFishingUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${row.bet || 0}-${row.win || 0}`;
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

        const currentIds = new Set(fishingView.map(getRowId));

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
        <Card p="24px" pt="30px" overflowX="hidden" height="450px">
            <Box overflowX="hidden" width="100%" overflowY="auto">
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
                        const rowId = getRowId(row);
                        return (
                            <FishingRealViewRow
                                key={rowId || index}
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