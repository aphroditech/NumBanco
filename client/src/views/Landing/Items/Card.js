import React from "react";
import { Box, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";

const cards = [
    { title: "Fair Odds", desc: "Transparent results every round.", icon: GavelRoundedIcon },
    { title: "Fast Payouts", desc: "Withdrawals processed quickly.", icon: BoltRoundedIcon },
    { title: "Secure Wallet", desc: "Your funds stay protected.", icon: SecurityRoundedIcon },
    { title: "Live Results", desc: "Real-time outcomes and stats.", icon: ShowChartRoundedIcon },
];

export default function Card() {

    const topCurveH = 180;

    return (
        <Box as="section" py={{ base: 8, md: 10 }}
            bg="white"
            color="white"
            position="relative"
            overflow="hidden"
            pt={{ base: topCurveH + 16, md: topCurveH + 32 }}
            px={{ base: 5, md: 8, lg: 12 }}
            aria-labelledby="highlights-heading"
            // pb={{ base: 72, md: 88 }}
            _before={{
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                top: "0px",
                height: `${topCurveH}px`,
                // White curve "cut-in" over black background
                background: "black",
                // Invert curve direction: curve sits on TOP edge
                clipPath: "ellipse(60% 75% at 50% 0%)",
                pointerEvents: "none",
                zIndex: 0,
            }}
        >
            <VStack spacing={3} mb={6}>
                <Text as="h2" id="highlights-heading" fontSize="xl" color="white" fontWeight="700">
                    Platform Highlights
                </Text>
                <Box w="64px" h="3px" bg="#00d4ff" borderRadius="full" />
            </VStack>

            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5}>
                {cards.map((item) => (
                    <Box
                        key={item.title}
                        as="article"
                        bg="#0b1116"
                        borderRadius="lg"
                        p={5}
                        textAlign="center"
                        border="1px solid #1b2a33"
                        boxShadow="0 12px 22px rgba(0,0,0,0.35)"
                        cursor="pointer"
                    >
                        <Text as="span" fontSize="xs" color="whiteAlpha.700" letterSpacing="widest" mb={2}>
                            numbanco.io
                        </Text>
                        <Box color="#00d4ff" mb={2} aria-hidden="true">
                            <item.icon style={{ fontSize: 28 }} />
                        </Box>
                        <Text as="h3" fontSize="sm" color="#00d4ff" fontWeight="700" mb={2}>
                            {item.title}
                        </Text>
                        <Text as="p" fontSize="xs" color="whiteAlpha.800">
                            {item.desc}
                        </Text>
                    </Box>
                ))}
            </SimpleGrid>
        </Box>
    );
}
