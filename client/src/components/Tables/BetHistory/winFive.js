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

function WinFive({ logo, value, price }) {
  const [loaded, setLoaded] = useState(false);
  const user = useSelector((state) => state.user.userInfo);
  if (
    !value ||
    !Array.isArray(value.winUsername) ||
    !Array.isArray(value.winNum)
  ) {
    return null;
  }

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
      <Flex direction="column" h="100%" align="center" mt="-10px" mr="25px" ml="5px">
        <Box
          width="28px"
          height="28px"
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
      <Flex direction="column" justifyContent="flex-start" h="100%">
        <Grid display="ruby" fontSize="sm" color="gray.400">
          {value.winUsername.map((username, index) => (
            <Flex key={index} align="center" mr="12px" mb="6px">
              {/* Win number */}
              <Tooltip label="Winning Number" placement="top">
                <Text fontSize="sm" color="gray.400" mr="6px">
                  {value.winNum[index]}
                </Text>
              </Tooltip>

              {/* Username with tooltip */}
              <Tooltip label={username} placement="top">
                {username ? (
                  value.winUserId[index] == user.userId ? (
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
                      {username.length > 7
                        ? `${username.slice(0, 6)}...`
                        : username}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="#fff" fontWeight="400">
                      {username.length > 7
                        ? `${username.slice(0, 6)}...`
                        : username}
                    </Text>
                  )
                ) : (
                  <Text></Text>
                )}
              </Tooltip>
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
          </Text>: <Text></Text>
      }
    </Flex>
  );
}

export default WinFive;
