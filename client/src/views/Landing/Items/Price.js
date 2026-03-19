import React from "react";
import { useSelector } from "react-redux";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import {
    Box,
    SimpleGrid,
    Text,
    Container,
    Stat,
    StatLabel,
    StatNumber,
    Flex,
    Heading,
    VStack,
    Image
} from "@chakra-ui/react";
import logoDemo from "assets/img/logoDemo.png";

export default function Price() {
    const users = useSelector((state) => state.user.activeUsers);

    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.3
    });


    const items = [
        { label: "Total Users", value: 1732, suffix: "+" },
        { label: "Active Users", value: users?.onlineUsers, suffix: "+" },
        { label: "Enthusiastic Users", value: 539, suffix: "+" },
        { label: "Total Bet", value: 535877.8, prefix: "$", decimals: 1 }
    ];

    return (
        <Box as="section" bg="#000000" py={20} ref={ref}>
            <Container maxW="7xl">

                <VStack spacing={3} mb={12} textAlign="center">
                    <Flex>
                        <Image src={logoDemo} alt="Numbanco" style={{ width: "200px", height: "auto", marginRight: "0.7rem" }} />
                        <Heading fontSize={{ base: "2xl", md: "3xl" }} mt={2} color="white">
                            by the Numbers
                        </Heading>
                    </Flex>

                    <Text color="gray.400">
                        Trusted by a Growing Community
                    </Text>
                </VStack>

                <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8} cursor="pointer">
                    {items.map((item) => (
                        <Stat
                            key={item.label}
                            textAlign="center"
                            bg="#000"
                            p={10}
                            borderRadius="lg"
                            boxShadow="md"
                            border="1px solid transparent"
                            transition="all 0.3s ease"
                            _hover={{
                                transform: "translateY(-8px)",
                                border: "1px solid #00d4ff",
                                boxShadow: "0 7px 20px rgba(0, 212, 255, 0.8)"
                            }}
                        >
                            <StatNumber fontSize="4xl" fontWeight="bold" color="white" mb={2}>
                                {inView && (
                                    <CountUp
                                        end={item.value}
                                        duration={3}
                                        prefix={item.prefix || ""}
                                        suffix={item.suffix || ""}
                                        decimals={item.decimals || 0}
                                    />
                                )}
                            </StatNumber>

                            <StatLabel
                                fontSize="sm"
                                letterSpacing="wide"
                                color="gray.400"
                                textTransform="uppercase"
                            >
                                {item.label}
                            </StatLabel>
                        </Stat>
                    ))}
                </SimpleGrid>

            </Container>
        </Box >
    );
}