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

function TopBestWinnerRow(props) {
  const {
    No,
    logo,
    altas,
    membership,
    amounts,
    lastItem,
  } = props;
  return (
    <Tr>
        <Td
        textAlign="left"
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
            ps='0px'
            border={lastItem ? "none" : null}
            borderBottomColor='#56577A'>
            <Flex align='center' minWidth='100%' flexWrap='nowrap'>
                <Box position="relative" display="inline-block" ml="7px" me="5px" w="30px" h="30px">
                    <Box
                    w="30px"
                    h="30px"
                    borderRadius="full"
                    backgroundImage={`url(${logo})`}
                    backgroundSize="cover"
                    />
                    <Box
                    position="absolute"
                    top="-2.5px"
                    left="-3px"
                    w="37px"
                    h="37px"
                    backgroundImage={`url(${membership === 2 && proring || membership === 1 && plusring})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="center"
                    zIndex="6"
                    />
                </Box>
                <Flex direction='column'>
                    <Text
                    fontSize='sm'
                    color='#fff'
                    fontWeight='normal'>
                    {altas}
                    </Text>
                </Flex>
            </Flex>
        </Td>

        <Td
            textAlign="left"
            border={lastItem ? "none" : null}
            borderBottomColor='#56577A'
        >
            <Badge 
              variant="solid"
              colorScheme={
                membership === 0 
                  ? 'gray'
                  : membership === 1 
                  ? 'cyan' 
                  : 'yellow'
              }
            >
                {membership == 0 ? "Free" : (membership == 1 ? "Plus" : "Pro")}
            </Badge>
        </Td>

        <Td
        textAlign="left"
        border={lastItem ? "none" : null}
        borderBottomColor='#56577A'
        >
            <Flex direction='column'>
                <Text fontSize='sm' color='#fff' fontWeight='normal'>
                    ${truncateToTwo(amounts)}
                </Text>
            </Flex>
        </Td>
    </Tr>
  );
}

export default TopBestWinnerRow;
