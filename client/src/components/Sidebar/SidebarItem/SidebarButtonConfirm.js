import React, { useEffect, useState } from "react";
import {
  Grid,
  Box,
  Button,
  Flex,
  Text,
  useDisclosure,
  keyframes
} from "@chakra-ui/react";

import DailyDialog from "components/Dialog/DailyDialog";
import DailyLoot from "views/Lottery/DailyLoot";
import Reward from "views/Lottery/Reward";
import { useSelector, useDispatch } from "react-redux";

import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

export default function SidebarButtonConfirm(prop) {
  const dispatch = useDispatch()
  const { value, key, onClick } = prop;
  const user = useSelector((state) => state.user.userInfo);
  const lootAvailable = useSelector(s => s.user.lootAvailable);
  let inactiveColor = "white";
  let glowColor="#4ade80";

  const exclamationPulse = keyframes`
  0% {
    
    opacity: 0.5;
  }
  50% {
    
    opacity: 1;
  }
  100% {
   
    opacity: 0.5;
  }
`;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const onConfirm = () => {
    onClose();
  };

  return (
    <Grid key={key}>
      <Button
        onClick={() => {
          onOpen();
          if (onClick) onClick();
        }}
        justifyContent="flex-start"
        alignItems="center"
        bg="#333738"
        mb={{ xl: "12px" }}
        mx={{ xl: "auto" }}
        py="12px"
        ps={{ sm: "10px", xl: "16px" }}
        borderRadius="15px"
       _hover="none"
        w="100%"
        _focus={{ boxShadow: "none" }}
      >
        <Flex align="center" w="100%">
          {value.icon && (
            <Box
              mr="12px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {value.icon}
            </Box>
          )}

          <Text color={inactiveColor} fontSize="sm">
            {value.name}
          </Text>

          {/* PUSHES DOT TO THE VERY END */}
          {((lootAvailable && value.name === "DAILY LOOT" ) || (value.name === "REWARD" && user?.refreshBet > 0)) && (
            <Box
                ml="auto"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="12px"
                h="12px"
              >
                <Text
                  fontSize="10px"
                  fontWeight="900"
                  color={glowColor}
                  lineHeight="1"
                  sx={{
                    animation: `${exclamationPulse} 1.6s ease-in-out infinite`,
                  }}
                >
                  <NotificationsActiveIcon style={{ fontSize:"12px" }} />
                </Text>
              </Box>


          )}
        </Flex>

      </Button>

      <DailyDialog
        content={value.component === "DailyLoot" ? <DailyLoot /> : <Reward />}
        bgColor={value.component === "DailyLoot" ? "transparent":"#2a2d2e"}
        isOpen={isOpen}
        top={value.component === "DailyLoot" ? "calc(50% - 300px)" : undefined}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Grid>
  );
}
