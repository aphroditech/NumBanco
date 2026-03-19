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

// chakra imports
import { Avatar, Flex, Text } from "@chakra-ui/react";
import React from "react";

export function ItemContent(props) {

  return (
    <>
      <Avatar
        ml="-40px"
        name={props.aName}
        src={props.aSrc}
        loading="eager"
        borderRadius='50%'
        me='16px'
        right='-45px'
      />
    </>
  );
}
