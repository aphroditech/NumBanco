import React, { useEffect, useRef, useState } from "react";

import {
    Box,
    Text,
    Table,
    Thead,
    Tr,
    Flex,
    Th,
    Tbody,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import CardBody from "components/Card/CardBody";
import RealtimeWinnerRow from "components/Tables/RealtimeWinnerRow";
import { getRealTimeWinners } from "action/AuthActions";
import { useAblyInfoUpdates } from "hooks/useAblyInfoUpdates";
import SectionLoading from "components/Loading/SectionLoading";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Loading from "components/Loading/Loading";

function RealtimeWinner() {
    const { winners, setWinners, time, setTime } = useAblyInfoUpdates(true, true);
    const [isLoading, setIsLoading] = useState(false);
    const [newWinnerIds, setNewWinnerIds] = useState(new Set());
    const prevWinnerIdsRef = useRef(new Set());
    const hasInitializedRef = useRef(false);
    const history = useHistory();

    const getWinnerId = (winner) => {
        if (!winner) return "";
        return winner._id || winner.betId || `${winner.username || "user"}-${winner.time || 0}-${winner.earn || 0}`;
    };

    useEffect(() => {
        if (!winners || winners.length === 0) {
            prevWinnerIdsRef.current = new Set();
            setNewWinnerIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const currentIds = new Set(winners.map(getWinnerId));

        if (!hasInitializedRef.current) {
            prevWinnerIdsRef.current = currentIds;
            setNewWinnerIds(new Set());
            hasInitializedRef.current = true;
            return;
        }

        const incomingIds = new Set();
        currentIds.forEach((id) => {
            if (!prevWinnerIdsRef.current.has(id)) incomingIds.add(id);
        });

        setNewWinnerIds(incomingIds);
        prevWinnerIdsRef.current = currentIds;

        if (incomingIds.size > 0) {
            const timeoutId = setTimeout(() => {
                setNewWinnerIds(new Set());
            }, 1700);
            return () => clearTimeout(timeoutId);
        }
    }, [winners]);

    useEffect(() => {
        let isMounted = true;

        setIsLoading(true);

        const fetchWinners = async () => {
            try {
                const data = await getRealTimeWinners(history);

                if (!isMounted) return;

                setWinners(data?.realTimeWinners);
                setTime(data?.time);
            } catch (err) {
                if (isMounted) console.error(err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchWinners();

        return () => {
            isMounted = false;
        };
    }, [history, setWinners, setTime]);

    if (isLoading) {
        return (
            <Loading />
        )
    }


    return (
        <Card
            p="16px"
            id="realCard"
            position="relative"
            w="100%"
            h={{ base: "430px", md: "470px", xl: "500px", "2xl": "100%" }}
            maxH={{ base: "430px", md: "470px", xl: "500px", "2xl": "100%" }}
            minH={{ base: "430px", md: "470px", xl: "500px", "2xl": "520px" }}
            display="flex"
            flexDirection="column"
            minW="0"
        >
            {/* 🔒 FIXED / STICKY HEADER */}
            <CardHeader
                // p="0px 0px 22px 0px"
                position="sticky"
                top="0"
                zIndex="10"
            >
                <Flex align="center" gap="10px">
                    <Text color="#00D4FF"
                        fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
                        <StarRoundedIcon
                            style={{
                                fontSize: "30px",
                                color: "#00D4FF",
                                marginRight: "8px",

                            }} />
                        RealTime Winners
                    </Text>
                </Flex>
            </CardHeader>

            <CardBody p="0" flex="1" display="flex" flexDirection="column" minH="0">
                <Box
                    flex="1"
                    minH="0"
                    maxH="100%"
                    overflowY="auto"
                    overflowX="hidden"
                    width="100%"
                    pr="6px"
                    sx={{
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-track": {
                            background: "transparent",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555b5e",
                            borderRadius: "8px",
                        },
                    }}
                >
                    <Table variant="simple" color="#fff" height="100%" width="100%" sx={{ tableLayout: "fixed" }}>
                        <Thead top="0" zIndex="5">
                            <Tr>
                                <Th color="white" textAlign="left" className="real_th_font" width="35%">
                                    User
                                </Th>
                                <Th color="white" textAlign="left" className="real_th_font" width="22%">
                                    Tier
                                </Th>
                                <Th color="white" textAlign="left" className="real_th_font" width="23%">
                                    BETWIN
                                </Th>
                                <Th color="white" textAlign="left" className="real_th_font" width="20%">
                                    AGE(s)
                                </Th>
                            </Tr>
                        </Thead>

                        <Tbody>
                            {winners &&
                                winners?.map((row, index, arr) => {
                                    const rowId = getWinnerId(row);
                                    return (
                                        <RealtimeWinnerRow
                                            key={rowId || index}
                                            altas={row.username}
                                            avatar={row.avatar}
                                            level={row.level}
                                            earn={row.earn}
                                            now={time}
                                            time={row.time}
                                            membership={row.membership}
                                            lastItem={index === arr.length - 1}
                                            isNew={newWinnerIds.has(rowId)}
                                        />
                                    )
                                })}
                        </Tbody>
                    </Table>
                </Box>
            </CardBody>
        </Card>
    );
}

export default RealtimeWinner;
