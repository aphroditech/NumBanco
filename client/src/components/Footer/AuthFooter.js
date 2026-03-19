import React from "react";
import { Flex, Link, Text } from "@chakra-ui/react";

export default function AuthFooter(props) {
    return (
        <Flex
        flexDirection={{ base: "column" }}
        alignItems={{ base: "center" }}
        justifyContent="space-between"
        pb="20px"
        fontSize="sm"
        >
            <Text
                color="white"
                textAlign={{ base: "center" }}
                mb={{ base: "20px" }}
            >
            </Text>
        </Flex>
    );
}