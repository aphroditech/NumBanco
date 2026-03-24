import React from "react";
import { useDispatch } from "react-redux";
import { Link } from "@chakra-ui/react";
import { NavLink as RouterLink } from "react-router-dom";

import {
    Box,
    Container,
    SimpleGrid,
    Stack,
    Text,
    Image,
    Heading,
    Flex,
} from "@chakra-ui/react";

import tronIcon from "assets/img/tron.png"
import bscIcon from "assets/img/bsc.png"
import ethereumIcon from "assets/img/ethereum.png"
import Logo from "assets/img/logo_Landing.png"

export default function Footer() {
    const topCurveH = 140;
    const dispatch = useDispatch();
    return (
        <Box
            as="footer"
            id="Footer"
            bg="linear-gradient(180deg, #0b0f14 0%, #05070a 100%)"
            color="white"
            // pt={20} 
            pb={10}
            position="relative"
            overflow="hidden"
            pt={{ base: topCurveH + 32, md: topCurveH + 44 }}
            // pb={{ base: -12, md: -20 }}
            _before={{
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: `${topCurveH}px`,
                // White curve "cut-in" over black background
                background: "#ffffff",
                // Invert curve direction: curve sits on TOP edge
                clipPath: "ellipse(60% 75% at 50% 0%)",
                pointerEvents: "none",
                zIndex: 0,
            }}
        >
            <Container maxW="7xl">
                <SimpleGrid columns={{ base: 1 }} spacing={10}>
                    {/* RIGHT SIDE — responsive sections */}
                    <SimpleGrid
                        columns={{ base: 1, sm: 1, md: 4 }}
                        spacing={10}
                    >
                        {/* BET CONCEPT */}
                        <Stack spacing={3}>
                            <Heading size="md" color="cyan.300" fontWeight="bold">
                                Bet Concept
                            </Heading>
                            {["Fairness", "Bet Method", "Reward", "Affiliation"].map((item, index) => (
                                <Text
                                    key={item}
                                    fontSize="sm"
                                    color="whiteAlpha.700"
                                    cursor="pointer"
                                    _hover={{ color: "cyan.200" }}
                                    onClick={() => {
                                        document.getElementById("bet-concept")?.scrollIntoView({ behavior: "smooth" });
                                        dispatch({ type: "SET_SLIDE_INDEX", payload: index });
                                    }}
                                >
                                    {item}
                                </Text>
                            ))}
                        </Stack>

                        {/* HELP */}
                        <Stack spacing={3}>
                            <Heading size="md" color="cyan.300" fontWeight="bold">
                                Help
                            </Heading>
                            <Text
                                fontSize="sm"
                                color="whiteAlpha.700"
                                cursor="pointer"
                                _hover={{ color: "cyan.200" }}
                                onClick={() =>
                                    document.getElementById("FAQs")?.scrollIntoView({ behavior: "smooth" })
                                }
                            >
                                FAQs
                            </Text>
                            <Link
                                as={RouterLink}
                                to="/auth/privacy-policy"
                                target="_blank"
                                fontSize="sm"
                                color="whiteAlpha.700"
                                _hover={{ color: "cyan.200" }}
                            >
                                Terms & Policy
                            </Link>
                            <Text fontSize="sm" color="whiteAlpha.700" _hover={{ color: "cyan.200" }}>
                                Contact Us
                            </Text>
                        </Stack>

                        {/* CONTACT US */}
                        <Stack spacing={3}>
                            <Heading size="md" color="cyan.300" fontWeight="bold">
                                Contact Us
                            </Heading>
                            {[
                                "Email: support@numexa.store",
                                "Phone Number: +1 505 309 0771",
                                "Telegram: @numexa_support",
                                "WhatsApp: +1 458 343 2384",
                                // "WhatsApp: +1 820 201 2952",
                            ].map((item) => (
                                <Text
                                    key={item}
                                    cursor="pointer"
                                    fontSize="sm"
                                    color="whiteAlpha.700"
                                    _hover={{ color: "cyan.200" }}
                                >
                                    {item}
                                </Text>
                            ))}
                        </Stack>

                        {/* OUR PROMISE */}
                        <Stack spacing={3}>
                            <Heading size="md" color="cyan.300" fontWeight="bold">
                                Our Promise
                            </Heading>
                            {[
                                "Fast rounds and smooth play.",
                                "Provably fair, transparent results.",
                                "Secure, responsible experience.",
                            ].map((item) => (
                                <Text
                                    key={item}
                                    fontSize="sm"
                                    color="whiteAlpha.700"
                                    _hover={{ color: "cyan.200" }}
                                >
                                    {item}
                                </Text>
                            ))}
                        </Stack>

                    </SimpleGrid>
                </SimpleGrid>

                {/* LEGAL / DESCRIPTION */}
                <Box
                    mt={12}
                    pt={8}
                    borderTop="1px solid"
                    borderColor="whiteAlpha.200"
                >
                    <Flex
                        gap={8}
                        align="flex-start"
                        direction={{ base: "column", md: "row" }}
                    >
                        <Image src={Logo} alt="NumBanco Logo" loading="eager" h="44px" />
                        <Stack spacing={4} maxW="4xl">
                            <Text fontSize="sm" color="whiteAlpha.800" lineHeight={1.8}>
                                NumBanco is a modern number-based gaming platform built for speed, transparency, and smart play.
                                We deliver fast-paced rounds, provably fair systems, and a seamless crypto experience designed for players who value simplicity and control.
                                Choose your numbers from 1–100, play your strategy, and enjoy a platform focused on fairness and responsible entertainment.
                            </Text>
                            <Text fontSize="sm" color="whiteAlpha.800" lineHeight={1.8}>
                                By accessing and using NumBanco.io, you confirm that you have read, understood, and agreed to be legally bound by our Terms of Service and Responsible Play Policy.
                                Players are encouraged to participate responsibly and in accordance with applicable local laws.
                            </Text>
                            <Text fontSize="sm" color="whiteAlpha.800" lineHeight={1.8}>
                                NumBanco operates as a digital number game platform utilizing cryptographic verification mechanisms.
                                Gameplay does not constitute financial trading, investment activity, or financial advice.
                            </Text>
                        </Stack>
                    </Flex>
                </Box>

                {/* BOTTOM BAR */}
                <Flex
                    mt={10}
                    pt={6}
                    borderTop="1px solid"
                    borderColor="whiteAlpha.200"
                    justify="space-between"
                    flexWrap="wrap"
                    align="center"
                >
                    {/* LEFT SIDE */}
                    <Flex align="center" gap={3} flexWrap="wrap">
                        <Text fontSize="xs" opacity={0.6}>
                            © {new Date().getFullYear()} NumBanco. ALL RIGHTS RESERVED. NumBanco is operated by numbanco.io
                        </Text>

                        {/* NETWORK ICONS */}
                        <Flex align="center" ml={2}>
                            <Image src={tronIcon} alt="Tron" loading="eager" h="26px" zIndex={3} />
                            <Image src={ethereumIcon} alt="Ethereum" loading="eager" h="30px" ml="-10px" zIndex={4} />
                            <Image src={bscIcon} alt="BSC" loading="eager" h="26px" ml="-10px" zIndex={5} />
                        </Flex>
                    </Flex>

                    {/* RIGHT SIDE */}
                    <Flex gap={6}>
                        <Link
                            as={RouterLink}
                            target="_blank"
                            to="/auth/privacy-policy"
                            fontSize="xs"
                            opacity={0.6}
                            _hover={{ opacity: 1, color: "cyan.300" }}
                            cursor="pointer"
                        >
                            Terms & Policy
                        </Link>
                        <Text
                            fontSize="xs"
                            opacity={0.6}
                            _hover={{ opacity: 1, color: "cyan.300" }}
                            cursor="pointer"
                        >
                            Responsible Gaming
                        </Text>
                    </Flex>
                </Flex>
            </Container>
        </Box>
    );
}
