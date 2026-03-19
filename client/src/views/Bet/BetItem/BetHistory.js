import React, { useState, useMemo, useEffect } from "react";
import { Flex, Grid, Box, Text } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Badge } from "@chakra-ui/react";
import BetHistoryRow from "components/Tables/BetHistoryRow";
import { Tooltip } from "@chakra-ui/react";
import { getBetHistory, getMyBetIds } from "action/BetActions";
import wolfnoavilable from 'assets/img/wolfnoavilable.png';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import SpeakerNotesOffRoundedIcon from '@mui/icons-material/SpeakerNotesOffRounded';

const MotionBox = motion(Box);
const MAX_TABS = 10;

export default function BetHistory({ value: BET_ID }) {
    const location = useLocation();
    const dispatch = useDispatch();

    const tickets = useSelector((state) => state.betHistory?.history?.tickets);
    const currentBetId = useSelector((state) => state.betHistory.history?.BetResults?.betId)

    // LEVEL LOGIC
    const Level = useMemo(() => {
        if (location.pathname.includes("/tierA")) return 0;
        if (location.pathname.includes("/tierB")) return 1;
        if (location.pathname.includes("/tierC")) return 2;
        return null;
    }, [location.pathname]);

    // STATE
    const [historyType, setHistoryType] = useState("users");
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedBetId, setSelectedBetId] = useState(null);
    const myBets = useSelector((state) => state.myBetIds.betIds);

    // USERS BET IDS
    const usersBets = useMemo(() => {
        if (!BET_ID) return [];
        const betId = Number(BET_ID - 1);
        const start = Math.max(1, betId - MAX_TABS);
        return Array.from({ length: betId - start + 1 }, (_, i) => start + i);
    }, [BET_ID]);

    // MY BET IDS (MOCK)
    const betIds = historyType === "users" ? usersBets : myBets;

    // SORT BET IDS (LATEST FIRST)
    const sortedBetIds = useMemo(() => {
        return [...betIds]
            .map(Number)
            .sort((a, b) => b - a)
            .slice(0, MAX_TABS);
    }, [betIds]);

    // AUTO SELECT LATEST BET
    useEffect(() => {

        if (sortedBetIds.length > 0) {
            setSelectedBetId(sortedBetIds[0]);
            setActiveIndex(0);
        }
    }, [sortedBetIds]);

    // FETCH BET HISTORY
    useEffect(() => {
        if (!selectedBetId || Level === null) return;

        dispatch(
            getBetHistory({
                betId: Number(selectedBetId),
                level: Level,
                type: historyType,
            })
        );
    }, [selectedBetId, Level, historyType, dispatch]);

    // REDUX STATE
    const { loading, history, error } = useSelector((state) => state.betHistory || {});

    // TAB CLICK HANDLER
    const handleTabChange = (index) => {
        setActiveIndex(index);
        setSelectedBetId(sortedBetIds[index]);
    };

    // HANDLE MY BET HISTORY ACTION
    const handleMyBetHistory = () => {
        if (!BET_ID || Level === null) return;

        dispatch(
            getMyBetIds({
                betId: BET_ID,   // betId1 (current bet)
                level: Level,
            })
        );
    };

    // EFFECT TO CALL getMyBetIds WHEN "MY" TAB IS ACTIVE
    useEffect(() => {
        if (historyType === "my" && Level !== null) {
            handleMyBetHistory();
        }
    }, [historyType, Level, BET_ID]);

    return (
        <Grid>
            <Card
                border="1px solid rgba(255,255,255,0.05)"
                boxShadow="0 0 60px rgba(0,212,255,0.05)"
                borderRadius="24px"
            >
                <CardHeader mb="20px" ps="22px">
                    <Text color="#00D4FF"
                        fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
                        <ManageSearchRoundedIcon style={{ fontSize: "40px", color: "#00D4FF", marginRight: "8px" }} />
                        Bet History
                    </Text>
                </CardHeader>

                {/* TOP TABS */}
                <Tabs
                    variant="soft-rounded"
                    colorScheme="blue"
                    mb="20px"
                    onChange={(i) => {
                        // Switch history type
                        const type = i === 0 ? "users" : "my";
                        setHistoryType(type);
                        // setActiveIndex(0);
                    }}
                >
                    <TabList px="20px">
                        <Tab
                            color="white"
                            _selected={{
                                color: "white",
                                bg: "#00D4FFEA",
                                fontWeight: "bold",
                                boxShadow: "none",
                                outline: "none",
                            }}
                            _focus={{ boxShadow: "none" }}
                            _focusVisible={{ boxShadow: "none" }}
                        >
                            Users Bet History
                        </Tab>

                        <Tab
                            color="white"
                            _selected={{
                                color: "white",
                                bg: "#00D4FFEA",
                                fontWeight: "bold",
                                boxShadow: "none",
                                outline: "none",
                            }}
                            _focus={{ boxShadow: "none" }}
                            _focusVisible={{ boxShadow: "none" }}
                        >
                            My Bet History
                        </Tab>
                    </TabList>
                </Tabs>

                {/* MAIN CONTENT */}
                <Tabs
                    orientation="vertical"
                    variant="unstyled"
                    index={activeIndex}
                    onChange={handleTabChange}
                >
                    {sortedBetIds.length === 0 ? (
                        <Flex
                            flex="1"
                            direction="column"
                            align="center"
                            justify="center"
                            minH="400px"
                            color="white"
                        >
                            <Box
                                backgroundImage={`url(${wolfnoavilable})`}
                                backgroundSize="contain"
                                backgroundRepeat="no-repeat"
                                backgroundPosition="center"
                                w="220px"
                                h="220px"
                                opacity={0.85}
                            />
                            <Flex align="center" justify="center" mb="20px">
                                <SpeakerNotesOffRoundedIcon
                                    style={{
                                        fontSize: "20px",
                                        color: "white",
                                        marginRight: "8px",
                                        filter: "drop-shadow(0 0 10px white)",
                                    }} />
                                No history found
                            </Flex>
                        </Flex>
                    ) : (
                        <Flex>
                            {/* LEFT SIDEBAR */}
                            <TabList minW="100px" borderRight="1px dashed #56577a">
                                {sortedBetIds.map((id) => (
                                    <Tab
                                        key={id}
                                        color="white"
                                        px="3"
                                        _selected={{
                                            color: "#00D4FF",
                                            fontWeight: "bold",
                                            bg: "rgba(0,212,255,0.08)",
                                            borderRadius: "12px",
                                        }}
                                        _focus={{ boxShadow: "none" }}
                                        _hover={{
                                            bg: "rgba(255,255,255,0.05)",
                                            borderRadius: "12px",
                                        }}
                                    >
                                        <Flex align="center" justify="space-between" whiteSpace="nowrap">
                                            <Box minW="30px" textAlign="right">
                                                {id === currentBetId && (
                                                    <Tooltip label={`You purchased ${tickets} tickets.`}>
                                                        <Badge
                                                            variant="solid"
                                                            mr={1}
                                                            fontSize="9px"
                                                            px="1.5"
                                                            borderRadius="full"
                                                            colorScheme="blue"
                                                        >
                                                            {tickets}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Text>{id}</Text>
                                        </Flex>
                                    </Tab>
                                ))}
                            </TabList>

                            {/* RIGHT CONTENT */}
                            <TabPanels flex="1" px="20px">
                                {sortedBetIds.map((id) => (
                                    <TabPanel key={id} pt="10px">
                                        <MotionBox
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: "spring", stiffness: 90, damping: 18 }}
                                            key={id}

                                        >
                                            {loading && <Text color="white">Loading...</Text>}
                                            {error && <Text color="red.400">{error}</Text>}
                                            {!loading && !error && (
                                                <BetHistoryRow mt="20px" value={history} type={historyType} level={Level} />
                                            )}
                                        </MotionBox>
                                    </TabPanel>
                                ))}
                            </TabPanels>
                        </Flex>
                    )}
                </Tabs>
            </Card>
        </Grid>
    );
}