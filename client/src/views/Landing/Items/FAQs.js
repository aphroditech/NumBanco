import React from "react";
import {
    Box,
    Text,
    Container,
    Heading,
    Accordion,
    Stack,
    Flex,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from "@chakra-ui/react";
import { faqs } from 'variables/Faq';

export default function FAQs() {
    return (
        <Box as="section" bg="#ffffff" aria-labelledby="faq-heading">
            <Container id="FAQs" maxW="6xl" py={24}>
                <Heading as="h2" id="faq-heading" mb={10} color="#0b1f3a">
                    FREQUENTLY ASKED QUESTIONS
                </Heading>

                <Accordion allowToggle>
                    {faqs.map((item, i) => (
                        <AccordionItem
                            key={i}
                            border="1px solid"
                            borderColor="#e6edf5"
                            mb={4}
                            bg="#ffffff"
                            borderRadius="xl"
                            overflow="hidden"
                            boxShadow="0 12px 24px rgba(15, 23, 42, 0.08)"
                        >
                            <h2>
                                <AccordionButton
                                    px={6}
                                    py={5}
                                    _hover={{ bg: "#f5f8fc" }}
                                >
                                    <Box flex="1" textAlign="left" fontWeight="semibold" color="#0b1f3a">
                                        {item.q}
                                    </Box>
                                    <AccordionIcon color="#00d4ff" />
                                </AccordionButton>
                            </h2>

                            <AccordionPanel px={6} pb={6} fontSize="sm" color="#3a4b61">
                                <Stack spacing={3}>
                                    {Array.isArray(item.a) ? (
                                        item.a.map((step, index) => (
                                            <Flex key={index} align="flex-start" gap={3}>
                                                <Text>{step}</Text>
                                            </Flex>
                                        ))
                                    ) : (
                                        <Text>{item.a}</Text>
                                    )}
                                </Stack>
                            </AccordionPanel>
                        </AccordionItem>
                    ))}
                </Accordion>
            </Container>
        </Box>
    );
}
