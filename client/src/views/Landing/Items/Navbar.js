// Navbar.js
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "@chakra-ui/react";
import { NavLink } from "react-router-dom/cjs/react-router-dom.min";
import { NavLink as RouterLink } from "react-router-dom";
import {
    Box,
    Flex,
    Button,
    Image
} from "@chakra-ui/react";

import logo from "assets/img/logo_Landing.png";
import Gtranslate from "components/Gtranslate";

export default function Navbar() {
    const dispatch = useDispatch();
    const [scrolled, setScrolled] = useState(false);

    function changeIndex(index) {
        if (index >= 0) {
            dispatch({ type: "SET_SLIDE_INDEX", payload: index });
        }
    }

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <Flex
            px={12}
            py={scrolled ? 8 : 6}
            align="center"
            justify="space-between"
            bg={scrolled ? "rgba(0, 0, 0, 0.85)" : "transparent"}
            backdropFilter={scrolled ? "blur(10px)" : "none"}
            position="fixed"
            top={0}
            left={0}
            w="100%"
            zIndex={1000}
            transition="all 0.3s ease"
        >
            <Image
                src={logo}
                width={scrolled ? "130px" : "120px"}
                transition="width 0.3s ease"
                cursor="pointer"
                alt="NumBanco Logo"
                loading="eager"
                // fetchPriority="high"
            />
            <Flex gap={6} align="center">
                <Box position="relative" role="group">
                    <Button
                        variant="ghost"
                        color="white"
                        fontSize="sm"
                        minW="auto"
                        px={3}
                        _hover={{ bg: "transparent" }}
                        _active={{ bg: "whiteAlpha.100" }}
                        _focusVisible={{ boxShadow: "0 0 0 2px rgba(0, 212, 255, 0.35)" }}
                    >
                        BET
                    </Button>
                    <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        w="150px"
                        bg="rgba(7, 15, 24, 0.98)"
                        border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="md"
                        boxShadow="xl"
                        py={2}
                        opacity={0}
                        cursor="pointer"
                        visibility="hidden"
                        transition="opacity 0.15s ease"
                        backdropFilter="blur(8px)"
                        _groupHover={{ opacity: 1, visibility: "visible" }}
                    >
                        {["Concept", "Fairness", "Bet Method", "Reward", "Affiliation"].map(
                            (item, index) => (
                                <Box
                                    key={item}
                                    px={4}
                                    py={2}
                                    fontSize="sm"
                                    color="whiteAlpha.900"
                                    _hover={{ bg: "whiteAlpha.100", color: "cyan.200" }}
                                    onClick={() => {
                                        document.getElementById("bet-concept")?.scrollIntoView({ behavior: "smooth" });
                                        changeIndex(index - 1);
                                    }}
                                >
                                    {item}
                                </Box>
                            )
                        )}
                    </Box>
                </Box>

                <Button
                    variant="ghost"
                    _hover={{ bg: "transparent" }}
                    _active={{ bg: "whiteAlpha.100" }}
                    _focusVisible={{ boxShadow: "0 0 0 2px rgba(0, 212, 255, 0.35)" }}
                    color="white"
                    minW="auto"
                    px={3}
                    onClick={() =>
                        document.getElementById("Price")?.scrollIntoView({ behavior: "smooth" })
                    }
                >
                    Pricing
                </Button>

                <Box position="relative" role="group">
                    <Button
                        variant="ghost"
                        color="white"
                        fontSize="sm"
                        minW="auto"
                        px={3}
                        _hover={{ bg: "transparent" }}
                        _active={{ bg: "whiteAlpha.100" }}
                        _focusVisible={{ boxShadow: "0 0 0 2px rgba(0, 212, 255, 0.35)" }}
                    >
                        Help
                    </Button>

                    <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        w="150px"
                        bg="rgba(7, 15, 24, 0.98)"
                        border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="md"
                        boxShadow="xl"
                        py={2}
                        cursor="pointer"
                        opacity={0}
                        visibility="hidden"
                        transition="opacity 0.15s ease"
                        backdropFilter="blur(8px)"
                        _groupHover={{ opacity: 1, visibility: "visible" }}
                    >
                        <Box
                            px={4}
                            py={2}
                            fontSize="sm"
                            color="whiteAlpha.900"
                            _hover={{ bg: "whiteAlpha.100", color: "cyan.200" }}
                            onClick={() =>
                                document.getElementById("FAQs")?.scrollIntoView({ behavior: "smooth" })
                            }
                        >
                            FAQs
                        </Box>
                        <Box
                            px={4}
                            py={2}
                            fontSize="sm"
                            color="whiteAlpha.900"
                            _hover={{ bg: "whiteAlpha.100", color: "cyan.200" }}
                        >
                            <Link
                                as={RouterLink}
                                target="_blank"
                                to="/auth/privacy-policy"
                                color="inherit"
                                _hover={{ textDecoration: "none" }}
                            >
                                Terms & Policy
                            </Link>
                        </Box>
                        <Box
                            px={4}
                            py={2}
                            fontSize="sm"
                            color="whiteAlpha.900"
                            _hover={{ bg: "whiteAlpha.100", color: "cyan.200" }}
                            onClick={() =>
                                document.getElementById("Footer")?.scrollIntoView({ behavior: "smooth" })
                            }
                        >
                            Contact Us
                        </Box>
                    </Box>
                </Box>
                <Gtranslate />
                <Button
                    as={NavLink}
                    to="/auth/signin"
                    variant="solid"
                    fontSize="15px"
                    type="button"
                    maxW="350px"
                    alignSelf="center"
                    h="45"
                    color="black"
                    w={"100%"}
                    bg="#00d4ff"
                    borderRadius="full"
                    boxShadow="0 0px 16px rgba(0, 212, 255, 0.28)"
                    _hover={{
                        bg: "#f7d260",
                        transform: "translateY(-2px)",
                        boxShadow: "0 0px 16px rgba(0, 212, 255, 0.38)"
                    }}
                    _active={{ transform: "translateY(0px)", boxShadow: "md" }}
                >
                    Sign In
                </Button>
            </Flex>
        </Flex>
    );
}
