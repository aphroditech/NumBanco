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

export default function PrivacyPolicy() {
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
                        Privacy Policy
                    </Heading>
                    <Text mb={6} color={subTextColor} fontSize="sm">
                        Last updated: January {new Date().getFullYear()}
                    </Text>

                    <Text mb={8} fontSize={{ base: "md", md: "lg" }} color={textColor} lineHeight="1.8">
                        This Privacy Policy explains how <strong>NumBanco</strong> (“we”, “our”, “us”) collects, uses,
                        stores, and protects your information when you access our website and related services (the
                        “Services”).
                    </Text>

                    <Divider borderColor="rgba(0, 212, 255, 0.16)" mb={8} />

                    <VStack spacing={10} align="stretch" color={textColor}>
                        {/* AML POLICY */}
                        <Box>
                            <Heading mb={4} fontSize={{ base: "xl", md: "2xl" }} color={ACCENT}>
                                AML Policy (Anti-Money Laundering)
                            </Heading>

                            <VStack spacing={5} align="stretch">
                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Identity Verification & Compliance
                                    </Heading>
                                    <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                        <ListItem>Verification of identity to prevent fraud and illegal activity</ListItem>
                                        <ListItem>Monitoring of transactions for suspicious behavior</ListItem>
                                    </List>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Transaction Monitoring
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        We monitor deposits, withdrawals, and betting activity to comply with applicable AML
                                        laws and may report suspicious activity to regulatory authorities when legally required.
                                    </Text>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Data Retention for AML
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        AML-related data is retained only as long as necessary to comply with legal and
                                        regulatory obligations.
                                    </Text>
                                </Box>
                            </VStack>
                        </Box>

                        {/* USER POLICY */}
                        <Box>
                            <Heading mb={4} fontSize={{ base: "xl", md: "2xl" }} color={ACCENT}>
                                User Policy
                            </Heading>

                            <VStack spacing={5} align="stretch">
                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Information We Collect
                                    </Heading>
                                    <Text color="whiteAlpha.900" lineHeight="1.8">
                                        We do not store any of your personal information.
                                    </Text>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        How We Use User Information
                                    </Heading>
                                    <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                        <ListItem>Provide and operate the Services</ListItem>
                                        <ListItem>Improve platform performance and usability</ListItem>
                                        <ListItem>Communicate service-related updates</ListItem>
                                    </List>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        User Rights
                                    </Heading>
                                    <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                        <ListItem>Access and review personal data</ListItem>
                                        <ListItem>Request correction of inaccurate data</ListItem>
                                        <ListItem>Request deletion where legally permitted</ListItem>
                                        <ListItem>Object to certain processing activities</ListItem>
                                    </List>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Cookies & Tracking
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        We use cookies and similar technologies to enhance functionality and improve user
                                        experience. Cookie preferences can be managed via your browser settings.
                                    </Text>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Children’s Privacy
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        NumBanco services are strictly available to users aged <strong>18 or older</strong>. We
                                        do not knowingly collect personal data from minors.
                                    </Text>
                                </Box>
                            </VStack>
                        </Box>

                        {/* BET POLICY */}
                        <Box>
                            <Heading mb={4} fontSize={{ base: "xl", md: "2xl" }} color={ACCENT}>
                                Bet Policy
                            </Heading>

                            <VStack spacing={5} align="stretch">
                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Betting Data & Transactions
                                    </Heading>
                                    <List spacing={2} pl={5} styleType="disc" color="whiteAlpha.900">
                                        <ListItem>Betting history and wager details</ListItem>
                                        <ListItem>Deposit and withdrawal records</ListItem>
                                        <ListItem>Reward and affiliation-related transactions</ListItem>
                                    </List>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Fairness & Transparency
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        All betting activity is processed transparently based on market data and platform
                                        rules. We do not manipulate outcomes or results.
                                    </Text>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Data Sharing & Legal Compliance
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        Betting-related data may be shared with payment providers, verification services, or
                                        regulatory authorities when required by law. We do not sell user data.
                                    </Text>
                                </Box>

                                <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                                    <Heading size="md" mb={3} color="white">
                                        Security Measures
                                    </Heading>
                                    <Text lineHeight="1.8">
                                        We apply encryption, access controls, and secure infrastructure to protect betting and
                                        transaction data from unauthorized access.
                                    </Text>
                                </Box>
                            </VStack>
                        </Box>

                        {/* CHANGES */}
                        <Box bg={sectionBg} border={sectionBorder} p={{ base: 4, md: 6 }} borderRadius="16px">
                            <Heading size="md" mb={3} color={ACCENT}>
                                Changes to This Policy
                            </Heading>
                            <Text lineHeight="1.8">
                                We may update this Privacy Policy periodically. Continued use of the Services after changes
                                indicates acceptance of the revised policy.
                            </Text>
                        </Box>
                    </VStack>
                </Card>
            </Container>
        </Flex>
    );
}
