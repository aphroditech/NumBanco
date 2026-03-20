import React from "react";
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
import rocket from "assets/img/Games/rocket.png"
import jackal from "assets/img/Games/jackal.png"
function Games() {
    const history = useHistory();
    const activeUsers = useSelector((state) => state.user.activeUsers);

    const games = [
        { img: tierA, name: "NumBanco Tier A", color: "#38A169", path: "/numbanco/tierA", activeUsers: activeUsers['tierAUsers'] },
        { img: tierB, name: "NumBanco Tier B", color: "#805AD5", path: "/numbanco/tierB", activeUsers: activeUsers['tierBUsers'] },
        { img: tierC, name: "NumBanco Tier C", color: "#D69E2E", path: "/numbanco/tierC", activeUsers: activeUsers['tierCUsers'] },
        { img: rubic, name: "Rubic", color: "#ed7ecc", path: "/game/rubic", activeUsers: activeUsers['rubicUsers']},
        { img: pumping, name: "Pumping", color: "#DD6B20", path: "/game/pumping", activeUsers: activeUsers['pumpingUsers']},
        { img: gravity, name: "Gravity", color: "#dd55f2", path: "/game/gravity", activeUsers: activeUsers['gravityUsers']},
        { img: dove, name: "Dove Cross", color: "#f26196", path: "/game/dove", activeUsers: activeUsers['doveUsers']},
        { img: rocket, name: "Rocket Shot", color: "#f26196", path: "/game/rocket-shot", activeUsers: activeUsers['rocketUsers']},
        { img: jackal, name: "Jackal", color: "#f26196", path: "/game/mining", activeUsers: activeUsers['jackalUsers']},
    ];

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
                                        {game.activeUsers || 0}
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