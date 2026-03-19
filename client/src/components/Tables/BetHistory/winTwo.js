import React from "react";
import {
  Flex,
  Text,
  Grid,
  Tooltip,
  Box,
  Image
} from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { useState } from "react";

function WinTwo({ logo, value, price }) {

  const [loaded, setLoaded] = useState(false);
  const user = useSelector((state) => state.user.userInfo);
  const newValue = Array.isArray(value) ? value : [];

  return (
    <Flex
      p="14px"
      pr="70px"
      borderRadius="16px"
      bg="rgba(255,255,255,0.03)"
      backdropFilter="blur(8px)"
      border="1px solid rgba(255,255,255,0.06)"
      transition="all 0.25s ease"
      _hover={{
        bg: "rgba(0,212,255,0.08)",
        transform: "translateY(-2px)",
        boxShadow: "0 8px 30px rgba(0,212,255,0.15)"
      }}
      mb="10px"
      position="relative"
    >
      {/* Avatar */}
      <Flex direction="column" h="100%" align="center" mr="10px" mt="-5px">
        <Box
          width="60px"
          height="60px"
          ml="-10px"
          position="relative"
        >
          <Image
            src={logo}
            alt="place"
            width="100%"
            height="100%"
            objectFit="contain"
            display={loaded ? "block" : "none"}
            onLoad={() => setLoaded(true)}
          />
        </Box>
      </Flex>

      {/* Winners */}
      <Flex direction="column" justifyContent="flex-start" h="100%" >
        <Grid display="ruby" fontSize="sm" color="gray.400" fontWeight="normal">
          {newValue.map((username, index) => (
            <Flex key={index} align="center" mr="12px" mb="6px">
              {/* Win Number */}
              <Tooltip label="Winning number" placement="top" >
                <Text fontSize="sm" color="gray.400" mr="6px">
                  {username.winNum}
                </Text>
              </Tooltip>

              {/* Username */}
              {username ? (
                username.userId == user?.userId ? (
                  <Text
                    fontSize="sm"
                    color="#fff"
                    fontWeight="700"
                    padding="6px"
                    bg="rgba(0,212,255,0.15)"
                    px="10px"
                    py="4px"
                    borderRadius="20px"
                  >
                    {username.username + "  "}
                    {!price && (
                      <Tooltip label={`${username.username} purchased ${username.ticketCnt} tickets`} placement="top">
                        {username?.ticketCnt ? ("(" + username?.ticketCnt + ")") : ""}
                      </Tooltip>
                    )}
                  </Text>
                ) : (
                  <Text fontSize="sm" color="#fff" fontWeight="400">

                    {username.username + "  "}
                    {!price && (
                      <Tooltip label={`${username.username} purchased ${username.ticketCnt} tickets`} placement="top">
                        {username.ticketCnt ? ("(" + username.ticketCnt + ")") : ""}
                      </Tooltip>
                    )}
                  </Text>
                )
              ) : (
                <Text></Text>
              )}
            </Flex>
          ))}
        </Grid>
      </Flex>
      {price ?
        <Text
          position="absolute"
          top="14px"
          right="20px"
          fontSize="20px"
          fontWeight="700"
          color="cyan.300"
        >
          {price}$
        </Text> : <Text></Text>
      }
    </Flex>
  );
}

export default WinTwo;