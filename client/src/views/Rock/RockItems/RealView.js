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
import RockRealViewRow from 'components/Tables/RockRealViewRow';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useAblyRockResults } from 'hooks/useAblyRockResults';
import { useHistory } from 'react-router-dom';
import { getRockResults } from 'action/rockActions';
import Loading from 'components/Loading/Loading';

function RealView() {
    const { rockResults, setRockResults } = useAblyRockResults();
    const [isLoading, setIsLoading] = useState(true);
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.userName || "user"}-${row.betAmount || 0}-${row.winAmount || 0}-${row.date || ""}`;
    };


    useEffect(() => {
        getRockResults(history).then((res) => {
            setRockResults(res);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!rockResults || rockResults.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(rockResults.map(getRowId));

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
    }, [rockResults]);

    const maxRows = 13;
    const baseRows = Array.isArray(rockResults) ? rockResults : [];
    const rowsToRender = baseRows.slice(0, maxRows);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <Card p="24px" pt="30px" overflowX="hidden" minH="auto">
            <Box width="100%" overflowX="hidden">
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
                                <RockRealViewRow
                                    key={rowId || index}
                                    altas={row.userName}
                                    avatar={row.avatar}
                                    result={Number(row.multiplier || 0).toFixed(2)}
                                    win={row.winAmount}
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