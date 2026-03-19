import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  Flex,
} from "@chakra-ui/react";
import ClickButton from "./Input/ClickButton";
import wolf404 from 'assets/img/wolf404.png';

export default function NotFound() {
    const history = useHistory();

    // const user = useState((state) => state.user.userInfo);

    return (
        <Flex
        minH="85vh"
        align="center"
        justify="center"
        px={6}
        >
            <Box
                textAlign="center"
                maxW="500px"
                w="100%"
                bg="#2a2d2e"
                p={10}
                borderRadius="2xl"
                boxShadow="2xl"
            >
                <Box
                h="250px"
                background={`url(${wolf404})`}
                backgroundSize="cover"
                backgroundPosition="center"
                >
                </Box>
                
                <Stack spacing={4}>

                <ClickButton
                    width="80%"
                    label="Go Back"
                    onClick={ () => { history.goBack() } }
                />
                
                </Stack>
            </Box>
        </Flex>
    );
}
