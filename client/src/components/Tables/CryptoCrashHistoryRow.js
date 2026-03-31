import {
  Flex,
  Td,
  Text,
  Tr,
} from "@chakra-ui/react";
import React from "react";

function CryptoCrashHistoryRow(props) {
  const {
    No,
    bet,
    multi,
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
                    {multi}
                </Text>
            </Flex>
        </Td>
        <Td
        textAlign="center"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color={Number(win) === 0 ? "#E74C3C" : "#6DC64B"} fontWeight='normal'>
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

export default CryptoCrashHistoryRow;
