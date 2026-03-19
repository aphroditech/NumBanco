import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import React from "react";

function MembershipRow(props) {
  const { name, price } = props;

  return (
    <Flex mb='24px' justifyContent='space-between'>
      <Flex alignItems='center'>

        <Flex direction='column'>
          <Text fontSize='sm' color='#fff' mb='4px'>
            {name}
          </Text>
        </Flex>
      </Flex>
      <Box
        color={
          price[0] === "+"
            ? "#01B574"
            : price[0] === "-"
            ? "red.500"
            : "gray.400"
        }>
        <Text fontSize='sm'>{price}</Text>
      </Box>
    </Flex>
  );
}

export default MembershipRow;
