import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import {
    Flex,
    SimpleGrid,
    Grid,
    Box,
    Icon
} from "@chakra-ui/react";

import { FaPlay, FaUser } from "react-icons/fa";

import Card from "components/Card/Card.js";
import CardBody from "components/Card/CardBody.js";

import tierA from "assets/img/Games/tierA.png";
import tierB from "assets/img/Games/tierB.png";
import tierC from "assets/img/Games/tierC.png";
import rubic from "assets/img/Games/dice5.png";
import pumping from "assets/img/Games/pumping.png";
import gravity from "assets/img/Games/gravity.png";
import dove from "assets/img/Games/dove.png"
import coco from "assets/img/Games/coco.png"
import jackal from "assets/img/Games/jackal.png"
import rocket from "assets/img/Games/rocket.png"
import fishing from "assets/img/Games/fishing.png"

const DEFAULT_DISPLAY_TICK_MS = 3000;
const DISPLAY_RANGE_ABOVE_BASE = 10;

const DASHBOARD_GAMES = [
    { img: tierA, name: "NumBanco Tier A", path: "/numbanco/tierA", reduxKey: "tierAUsers", tickMs: 4200 },
    { img: tierB, name: "NumBanco Tier B", path: "/numbanco/tierB", reduxKey: "tierBUsers", tickMs: 4800 },
    { img: tierC, name: "NumBanco Tier C", path: "/numbanco/tierC", reduxKey: "tierCUsers", tickMs: 5500 },
    { img: rubic, name: "Rubic", path: "/game/rubic", reduxKey: "rubicUsers", tickMs: 6000 },
    { img: pumping, name: "Pumping", path: "/game/pumping", reduxKey: "pumpingUsers", tickMs: 3800 },
    { img: fishing, name: "Fishing", path: "/game/fishing", reduxKey: "fishingUsers", tickMs: 4200 },
    { img: gravity, name: "Gravity", path: "/game/gravity", reduxKey: "gravityUsers", tickMs: 6500 },
    { img: dove, name: "Dove Cross", path: "/game/dove", reduxKey: "doveUsers", tickMs: 5200 },
    { img: coco, name: "Coco", path: "/game/coco", reduxKey: "cocoUsers", tickMs: 4600 },
    { img: rocket, name: "Rocket Shot", path: "/game/rocket-shot", reduxKey: "rocketUsers", tickMs: 4600 },
    { img: jackal, name: "Jackal", path: "/game/jackal", reduxKey: "jackalUsers", tickMs: 4600 },
];

function stepOneGameDisplay(path, reduxKey, prev, au) {
    const base = Number(au[reduxKey]) || 0;
    const min = base;
    const max = base + DISPLAY_RANGE_ABOVE_BASE;
    let cur = prev[path] ?? base;
    cur = Math.min(max, Math.max(min, cur));
    let delta = Math.random() < 0.5 ? -1 : 1;
    if (cur <= min) delta = 1;
    else if (cur >= max) delta = -1;
    return { ...prev, [path]: cur + delta };
}

function Games() {
    const history = useHistory();
    const activeUsers = useSelector((state) => state.user.activeUsers);
    const activeUsersRef = useRef(activeUsers);
    activeUsersRef.current = activeUsers;
    const [displayCounts, setDisplayCounts] = useState(() => ({}));

    useEffect(() => {
        setDisplayCounts((prev) => {
            const next = { ...prev };
            for (const g of DASHBOARD_GAMES) {
                const base = Number(activeUsers[g.reduxKey]) || 0;
                const min = base;
                const max = base + DISPLAY_RANGE_ABOVE_BASE;
                const cur = prev[g.path] ?? base;
                next[g.path] = Math.min(max, Math.max(min, cur));
            }
            return next;
        });
    }, [activeUsers]);

    useEffect(() => {
        const ids = DASHBOARD_GAMES.map((g) => {
            const ms = g.tickMs ?? DEFAULT_DISPLAY_TICK_MS;
            return setInterval(() => {
                const au = activeUsersRef.current;
                setDisplayCounts((prev) => stepOneGameDisplay(g.path, g.reduxKey, prev, au));
            }, ms);
        });
        return () => ids.forEach(clearInterval);
    }, []);

    const games = useMemo(
        () =>
            DASHBOARD_GAMES.map((g) => ({
                ...g,
                displayUsers:
                    displayCounts[g.path] ?? (Number(activeUsers[g.reduxKey]) || 0),
            })),
        [activeUsers, displayCounts]
    );

    return (
        <Grid>
            <SimpleGrid
                columns={{ sm: 2, md: 3, lg: 3, xl: 3, "1625px": 6, "2xl": 6 }}
                spacing="24px"
                mb="20px"
            >
                {games.map((game, index) => (
                    <Card
                        key={index}
                        overflow="hidden"
                        transition="all 0.3s ease"
                        _hover={{ transform: "translateY(-6px)" }}
                        onClick={() => history.push(game.path)}
                        p="0px"
                    >

                        <CardBody p="5px">

                            <Box position="relative" role="group" cursor="pointer" w="100%" minHeight="300px">

                                {/* Game Image */}
                                <Box
                                    as="img"
                                    src={game.img}
                                    alt={game.name}
                                    w="100%"
                                    h="100%"
                                    borderRadius="14px"
                                    display="block"
                                    transition="transform 0.4s ease"
                                    _groupHover={{ transform: "scale(1.08)" }}
                                />

                                {/* Hover Overlay */}
                                <Flex
                                    position="absolute"
                                    top="0"
                                    left="0"
                                    w="100%"
                                    h="100%"
                                    borderRadius="14px"
                                    bg="rgba(0,0,0,0.45)"
                                    opacity="0"
                                    transition="0.3s"
                                    _groupHover={{ opacity: 1 }}
                                >

                                    {/* Play Circle - Always Center */}
                                    <Flex
                                        position="absolute"
                                        top="50%"
                                        left="50%"
                                        transform="translate(-50%, -50%) scale(0.8)"
                                        w="60px"
                                        h="60px"
                                        bg="rgba(255,255,255,0.3)"
                                        borderRadius="50%"
                                        align="center"
                                        justify="center"
                                        transition="0.3s"
                                        _groupHover={{ transform: "translate(-50%, -50%) scale(1)" }}
                                    >
                                        <Icon as={FaPlay} boxSize="30px" color="white" />
                                    </Flex>

                                    {/* Game Name */}
                                    <Box
                                        position="absolute"
                                        top="20%"
                                        left="50%"
                                        transform="translateX(-50%)"
                                        color="white"
                                        fontWeight="bold"
                                        fontSize="lg"
                                        textAlign="center"
                                        opacity="0"
                                        transition="0.3s"
                                        _groupHover={{ opacity: 1 }}
                                    >
                                        {game.name}
                                    </Box>

                                </Flex>

                                <Flex
                                    position="absolute"
                                    bottom="10px"
                                    right="10px"
                                    align="center"
                                    bg="rgba(0,0,0,0.6)"
                                    borderRadius="20px"
                                    px="8px"
                                    py="4px"
                                >
                                    <Icon as={FaUser} color="white" w={5} h={5} mr="6px" />
                                    <Box color="white" fontSize="sm" fontWeight="bold">
                                        {game.displayUsers || 0}
                                    </Box>
                                </Flex>
                            </Box>

                        </CardBody>

                    </Card>
                ))}
            </SimpleGrid>
        </Grid>
    );
}

export default Games;