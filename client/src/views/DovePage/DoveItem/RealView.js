import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Text,
    useBreakpointValue,
} from '@chakra-ui/react';
import React, { useEffect, useState, useRef } from 'react';
import DoveRealViewRow from 'components/Tables/DoveRealViewRow';
import { getDoveView } from 'action/DoveActions';
import { useAblyDoveUpdates } from 'hooks/useAblyDoveUpdates';
import { useHistory } from 'react-router-dom';

function RealView({ sceneHeight }) {
    const { doveView, setDoveView } = useAblyDoveUpdates();
    const [newRowIds, setNewRowIds] = useState(new Set());
    const [maxRows, setMaxRows] = useState(22);
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const tableWrapRef = useRef(null);
    const maxRowsRef = useRef(22);
    const history = useHistory();
    const isDesktop = useBreakpointValue({ base: false, md: true });

    useEffect(() => {
        maxRowsRef.current = maxRows;
    }, [maxRows]);

    const getRowId = (row) => {
        if (!row) return "";
        return row._id || row.id || `${row.altas || "user"}-${row.bet || 0}-${row.win || 0}-${row.multiplier || 0}`;
    };

    useEffect(() => {
        getDoveView(history).then((data) => {
            if (Array.isArray(data)) {
                setDoveView(data);
            }
        });
    }, []);

    useEffect(() => {
        if (!doveView || doveView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(doveView.map(getRowId));

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
    }, [doveView]);

    const baseRows = Array.isArray(doveView) ? doveView : [];
    const rowsToRender = baseRows.slice(0, maxRows);

    useEffect(() => {
        if (!isDesktop) {
            setMaxRows(10);
            return;
        }

        const node = tableWrapRef.current;
        if (!node) return;

        const updateRowsFromHeight = () => {
            const height = node.clientHeight || 0;
            const headerHeight =
                node.querySelector("thead")?.getBoundingClientRect().height || 32;
            const rowHeight =
                node.querySelector("tbody tr")?.getBoundingClientRect().height || 30;
            const availableBodyHeight = Math.max(0, height - headerHeight - 2);
            const visibleRows = Math.floor(availableBodyHeight / rowHeight);
            const clampedRows = Math.max(1, Math.min(22, visibleRows || 1));
            if (clampedRows !== maxRowsRef.current) {
                setMaxRows(clampedRows);
            }
        };

        let rafId = null;
        const runMeasure = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                updateRowsFromHeight();
                rafId = null;
            });
        };
        runMeasure();
        window.addEventListener("resize", runMeasure);
        return () => {
            window.removeEventListener("resize", runMeasure);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isDesktop, sceneHeight, doveView.length]);

    return (
        <Box
            w="100%"
            maxW="100%"
            h={{ base: "420px", md: sceneHeight ? `${sceneHeight + 40}px` : "100%" }}
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
                ref={tableWrapRef}
                overflowX="hidden"
                width="100%"
                overflowY="auto"
                h="100%"
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
                                Result
                            </Th>
                            <Th color="rgba(255,255,255,0.9)" fontSize="10px" fontWeight="800" px="0" py="4px" h="32px" borderBottom="none" textAlign="right" whiteSpace="nowrap" w="30%" textTransform="uppercase" letterSpacing="0.06em">
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {rowsToRender.map((row, index) => {
                            const rowId = getRowId(row);
                            return (
                                <DoveRealViewRow
                                    key={rowId || index}
                                    altas={row.altas}
                                    avatar={row.avatar}
                                    result={row.multiplier}
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
