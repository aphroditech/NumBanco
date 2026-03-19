import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Td,
  Text,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { create } from "nouislider";
import React from "react";

import truncateToTwo from "variables/truncateToTwo";
import proring from "assets/badge/GOLDEN_CIRCLE.png"
import plusring from "assets/badge/BLUE_CIRCLE.png"

function PumpingHistoryRow(props) {
  const {
    No,
    target,
    result,
    bet,
    win,
    time,
    lastItem,
  } = props;
  return (
    <Tr>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    {No}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    {target}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    {bet}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    {result}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color={win === 0 ? "#E74C3C" : "#6DC64B"} fontWeight='normal'>
                    {Math.round(win*10000)/10000}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    {new Date(time).toLocaleString()}
                </Text>
            </Flex>
        </Td>
    </Tr>
  );
}

export default PumpingHistoryRow;
