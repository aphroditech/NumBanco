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
import RocketRealViewRow from 'components/Tables/RocketRealViewRow';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { getRocketResults } from 'action/RocketActions';
import { useAblyRocketResult } from 'hooks/useAblyRocketResult';
import { useHistory } from 'react-router-dom';
import Loading from 'components/Loading/Loading';

function RealView() {
    const { rocketResults, setRocketResults } = useAblyRocketResult();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const history = useHistory();
    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${row.bet || 0}-${row.win || 0}`;
    };

    useEffect(() => {
        if (!rocketResults || rocketResults.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(rocketResults.map(getRowId));

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
    }, [rocketResults]);

    useEffect(async () => {
        try {
            const data = await getRocketResults(history)();
            setRocketResults(data);
            setIsLoading(false);
        } catch(err) {
            console.log(err);
            setIsLoading(false);
        }
    }, []);

    const maxRows = 23;
    const baseRows = Array.isArray(rocketResults) ? rocketResults : [];
    const rowsToRender = baseRows.slice(0, maxRows);

    if (isLoading) {
        return <Loading />;
    }
    
    return (
        <Card p="24px" pt="30px" overflowX="hidden" minH="800px">
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
                            <RocketRealViewRow
                                key={index}
                                altas={row.userName}
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
        </Card>
    );
}

export default RealView;