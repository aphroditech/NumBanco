import {
  Flex,
  Td,
  Text,
  Tr,
} from "@chakra-ui/react";
import React from "react";

function DiceHistoryRow(props) {
  const {
    No,
    bet,
    dice,
    type,
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
                    {dice}
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
                    {type === 0 && "1~3"}
                    {type === 1 && "4~6"}
                    {type === 2 && "even"}
                    {type === 3 && "odd"}
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

export default DiceHistoryRow;
