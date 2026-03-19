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

import { Box, Button, Flex, Icon, Spacer, Text } from "@chakra-ui/react";

function EarningHistoryRow(props) {
  const { date, amounts } = props;

  return (
    <Flex mb='24px' alignItems='center'>
      <Flex direction='column'>
        <Text fontSize='sm' color='#fff' ml="40px">
          {new Date(date).toLocaleDateString()}, {new Date(date).toLocaleTimeString()}
        </Text>
      </Flex>
      <Spacer />
      <Box me='14px'>
        <Text fontSize='xs' color='gray.400' mr="40px">
          {amounts}$
        </Text>
      </Box>
    </Flex>
  );
}

export default EarningHistoryRow;
