import React from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  List,
  ListItem,
  VStack,
  Divider,
  Container,
} from "@chakra-ui/react";
import Card from "components/Card/Card.js";

export default function UserAgreement() {
    const ACCENT = "#00D4FF";
    const textColor = "whiteAlpha.900";
    const subTextColor = "gray.400";
    const sectionBg = "rgba(255, 255, 255, 0.04)";
    const sectionBorder = "1px solid rgba(0, 212, 255, 0.16)";

    return (
        <Flex flexDirection="column" minH="100vh" bg="#323738" pt={{ base: "120px", md: "75px" }} px={{ base: 4, md: 6 }} pb={10}>
            <Container maxW="960px" p={0}>
                <Card p={{ base: 6, md: 10 }} border="1px solid rgba(0, 212, 255, 0.18)">
                    <Heading mb={2} fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="white">
                        User Agreement
                    </Heading>
                    <Text mb={6} color={subTextColor} fontSize="sm">
                        Last updated: January {new Date().getFullYear()}
                    </Text>

                    <Text mb={8} fontSize={{ base: "md", md: "lg" }} color={textColor} lineHeight="1.8">
                        This User Agreement (“Agreement”) governs your access to and use of the <strong>NumBanco</strong>{" "}
                        website and related services (the “Services”). By creating an account or using our Services, you
                        confirm that you have read, understood, and agreed to be bound by this Agreement.
                    </Text>

                    <Divider borderColor="rgba(0, 212, 255, 0.16)" mb={8} />

                    <VStack spacing={6} align="stretch" color={textColor}>
                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>1. Eligibility</Heading>
                            <Text lineHeight="1.8">
                                You must be at least <strong>18 years old</strong> (or the legal age in your jurisdiction)
                                to use the Services. By registering, you confirm that you meet this requirement and have
                                the legal capacity to enter into this Agreement.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>2. Account Registration</Heading>
                            <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                <ListItem>You must provide accurate and complete information.</ListItem>
                                <ListItem>You are responsible for maintaining account security.</ListItem>
                                <ListItem>Only one account per user is permitted.</ListItem>
                                <ListItem>Account sharing or resale is strictly prohibited.</ListItem>
                            </List>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>3. User Responsibilities</Heading>
                            <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                <ListItem>Comply with all applicable laws and regulations.</ListItem>
                                <ListItem>Do not engage in fraudulent or abusive activities.</ListItem>
                                <ListItem>Do not attempt to exploit platform vulnerabilities.</ListItem>
                                <ListItem>Do not use automated tools or bots without permission.</ListItem>
                            </List>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>4. Transactions & Payments</Heading>
                            <Text lineHeight="1.8">
                                All deposits, withdrawals, and transactions are subject to verification procedures,
                                security checks, and applicable fees. NumBanco reserves the right to delay or reject
                                transactions to comply with legal obligations.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>5. Bonuses & Promotions</Heading>
                            <Text lineHeight="1.8">
                                Bonuses, rewards, and promotions are subject to additional terms. Abuse of promotional
                                systems may result in account suspension or forfeiture of rewards.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>6. Suspension & Termination</Heading>
                            <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                <ListItem>Violation of this Agreement</ListItem>
                                <ListItem>Suspicious or fraudulent activity</ListItem>
                                <ListItem>Legal or regulatory requirements</ListItem>
                            </List>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>7. Limitation of Liability</Heading>
                            <Text lineHeight="1.8">
                                To the fullest extent permitted by law, NumBanco shall not be liable for indirect,
                                incidental, or consequential damages arising from your use of the Services.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>8. Intellectual Property</Heading>
                            <Text lineHeight="1.8">
                                All content, trademarks, logos, and software are the exclusive property of NumBanco.
                                Unauthorized use is strictly prohibited.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>9. Changes to the Agreement</Heading>
                            <Text lineHeight="1.8">
                                We may update this Agreement from time to time. Continued use of the Services after
                                changes take effect constitutes acceptance of the updated Agreement.
                            </Text>
                        </Box>

                        <Box bg={sectionBg} border={sectionBorder} borderRadius="16px" p={{ base: 4, md: 5 }}>
                            <Heading size="md" mb={3} color={ACCENT}>10. Governing Law</Heading>
                            <Text lineHeight="1.8">
                                This Agreement shall be governed by and construed in accordance with applicable laws in
                                the jurisdiction where NumBanco operates.
                            </Text>
                        </Box>
                    </VStack>
                </Card>
            </Container>
        </Flex>
    );
}
