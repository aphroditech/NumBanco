import { Box, Table, Thead, Tbody, Tr, Th, Text } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
import TwistRealViewRow from "components/Tables/TwistRealViewRow";
import { getDiamondLiveView } from "action/DiamondActions";
import { useAblyDiamondUpdates } from "hooks/useAblyDiamondUpdates";
import { useHistory } from "react-router-dom";

/** Same layout and row UI as `ClimbRealView`; data from `diamondviews` + Ably `diamondGame`. */
function DiamondRealView({ suppressFeedUntil = 0 }) {
    const history = useHistory();
    const { diamondView, setDiamondView } = useAblyDiamondUpdates({ suppressFeedUntil, history });
    const [newRowIds, setNewRowIds] = useState(new Set());
    const prevRowIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);

    const getRowId = (row, index) => {
        if (!row) return `dv-empty-${index}`;
        if (row._id != null) return String(row._id);
        if (row.id != null) return String(row.id);
        const t = row.time ?? row.createdAt ?? "";
        const uid = row.userId ?? "u";
        return `dv-${uid}-${t}-${row.result ?? ""}-${row.win ?? ""}-${index}`;
    };

    const normalizeViewPayload = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.data)) return payload.data;
        return [];
    };

    useEffect(() => {
        getDiamondLiveView(history).then((res) => {
            const raw = res?.data?.data ?? res?.data;
            setDiamondView(normalizeViewPayload(raw));
        });
    }, [history]);

    useEffect(() => {
        if (!diamondView || diamondView.length === 0) {
            prevRowIdsRef.current = new Set();
            setNewRowIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(diamondView.map((row, i) => getRowId(row, i)));

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
    }, [diamondView]);

    const maxRows = 14;
    const baseRows = Array.isArray(diamondView) ? diamondView : [];
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
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                }}
            >
                <Table variant="unstyled" color="#fff" width="100%" sx={{ tableLayout: "fixed" }}>
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
                                pl="20px"
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
                                Result
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
                                pr="20px"
                            >
                                Win
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {rowsToRender.map((row, index) => {
                            const rowId = getRowId(row, index);
                            return (
                                <TwistRealViewRow
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

export default DiamondRealView;
