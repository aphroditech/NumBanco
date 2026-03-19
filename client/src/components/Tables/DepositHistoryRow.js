/*!

=========================================================
* Vision UI Free Chakra - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-chakra
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-chakra/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import React from "react";
import { AiOutlineExclamation } from "react-icons/ai";
import {
    FaArrowDown,
    FaArrowUp
} from "react-icons/fa";

function DepositHistoryRow(props) {
    const { coin, amounts, date, result } = props;

    return (
        <Flex mb='24px' justifyContent='space-between'>
            <Flex alignItems='center'>
                <Box
                me='14px'
                borderRadius='50%'
                color={
                    result === "success"
                    ? "#01B574"
                    : result === "error"
                    ? "red.500"
                    : "gray.400"
                }
                border='1px solid'
                display='flex'
                alignItems='center'
                justifyContent='center'
                w='35px'
                h='35px'>
                    { result == "success" ? <Icon as={FaArrowUp} w='12px' h='12px' /> : "" }
                    { result == "pending" ? <Icon as={AiOutlineExclamation} w='12px' h='12px' /> : "" }
                    { result == "error" ? <Icon as={FaArrowUp} w='12px' h='12px' /> : "" }
                </Box>
                <Flex direction='column'>
                    <Text fontSize='sm' color='#fff' mb='4px'>
                        {coin}
                    </Text>
                    <Text fontSize={{ sm: "xs", md: "sm" }} color='gray.400'>
                        {new Date(date).toLocaleDateString()}, {new Date(date).toLocaleTimeString()}
                    </Text>
                </Flex>
            </Flex>
            <Box
                color={
                result === "success"
                    ? "#01B574"
                    : result === "error"
                    ? "red.500"
                    : "gray.400"
                }>
                <Text fontSize='sm'>{amounts}$</Text>
            </Box>
        </Flex>
    );
}

export default DepositHistoryRow;
