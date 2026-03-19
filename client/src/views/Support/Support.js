import React, { useState, useMemo, useEffect } from "react";
import {
    Box,
    Heading,
    Text,
    VStack,
    HStack,
    Divider,
    Button,
    Stack,
    Flex,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
    Icon,
    useColorModeValue,
} from "@chakra-ui/react";
import { Search, Mail, Clock, ShieldCheck } from "lucide-react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import { SUPPORT_DATA } from "variables/SupportData";
import Loading from 'components/Loading/Loading';


export default function SupportPage() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [query, setQuery] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const filteredFaq = useMemo(() => {
        return SUPPORT_DATA.filter((f) =>
        f.question.toLowerCase().includes(query.toLowerCase())
        );
    }, [query]);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <Loading />;
    }


    return (
        <Box mt={{ base: 16, md: 20 }} px={{ base: 4, md: 10 }} color="white">
        {/* HEADER */}
            <VStack spacing={3} mb={10} textAlign="center">
                <Heading size="xl">Support Center</Heading>
                <Text opacity={0.7} maxW="600px">
                    Find quick answers, manage your account, or reach our support team anytime.
                </Text>
            </VStack>

            {/* SEARCH */}
            <Flex justify="center" mb={8}>
                <InputGroup maxW="500px">
                    <InputLeftElement>
                        <Icon as={Search} opacity={0.6} />
                    </InputLeftElement>
                    <Input
                        placeholder="Search for help…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        bg="whiteAlpha.100"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        _focus={{ borderColor: "cyan.400" }}
                    />
                </InputGroup>
            </Flex>

            {/* CONTENT */}
            <Stack direction={{ base: "column", lg: "row" }} spacing={8} align="stretch">
                {/* QUESTIONS */}
                <Card
                    p={6}
                    flex="1"
                    maxH="430px"
                    overflowY="auto"
                    sx={{
                        "&::-webkit-scrollbar": { width: "6px" },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555b5e",
                            borderRadius: "8px",
                        },
                    }}  
                >
                    <Box
                        position="sticky"
                        top="-24px"
                        zIndex="10"
                        bg="#2a2d2e"
                        mb="4"
                        pb="16px"
                        pt="10px"
                        mx="-24px"
                        px="24px"
                    >
                        <Text fontSize="lg" fontWeight="bold" color="#00D4FF">❓ Questions</Text>
                    </Box>

                    <VStack spacing={2} align="stretch" >
                        {filteredFaq.map((faq, index) => (
                        <Button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            justifyContent="space-between"
                            fontSize="sm"
                            bg={selectedIndex === index ? "#555b5e" : "whiteAlpha.50"}
                            color="white"
                            _hover={{ bg: "#555b5e" }}
                        >
                            <Text noOfLines={1}>{faq.question}</Text>
                            {/* <Badge variant="subtle">{faq.tag}</Badge> */}
                        </Button>
                        ))}
                    </VStack>
                </Card>

                {/* ANSWER */}
                <Card p={8} flex="2">
                    <Box
                        position="sticky"
                        top="-24px"
                        zIndex="10"
                        bg="#2a2d2e"
                        mb="4"
                        pb="16px"
                        pt="10px"
                        mx="-24px"
                        px="24px"
                    >
                        <Text fontSize="lg" fontWeight="bold" color="#00D4FF">💡 Answer</Text>
                    </Box>

                    <Heading size="md" mb={3}>
                        {filteredFaq[selectedIndex]?.question}
                    </Heading>
                    <Text opacity={0.9} fontSize="md" lineHeight="1.8">
                        {filteredFaq[selectedIndex]?.answer}
                    </Text>
                </Card>
            </Stack>

            <Divider my={12} />

            {/* FOOTER */}
            <Stack direction={{ base: "column", md: "row" }} spacing={6} justify="center" opacity={0.8}>
                <HStack><Icon as={ShieldCheck} /> <Text>24/7 Support</Text></HStack>
                <HStack><Icon as={Mail} /> <Text>support@numbanco.io</Text></HStack>
                <HStack><Icon as={Clock} /> <Text>Response within 10min</Text></HStack>
            </Stack>
        </Box>
    );
}
