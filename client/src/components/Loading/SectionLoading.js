import React from "react";
import { Spinner, Flex, Text, keyframes } from "@chakra-ui/react";

const fadeIn = keyframes`
    from { opacity: 0 }
    to { opacity: 1 }
`;

export default function SectionLoading() {
    return (
        <Flex
            justify="center"
            align="center"
            direction="column"
            w="100%"
            h="100%"
            zIndex="9999"
            sx={{ animation: `${fadeIn} 0.2s ease-in-out` }}
        >
            <Spinner
                size="xl"
                thickness="4px"
                speed="0.65s"
                color="white"
            />
            <Text mt="4" color="white" fontSize="lg" fontWeight="bold">
                Wait a moment...
            </Text>
        </Flex>
    );
}