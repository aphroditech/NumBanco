import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button, Flex, Text, keyframes, Badge, Box } from "@chakra-ui/react";
import IconBox from "components/Icons/IconBox";
import { useSelector } from "react-redux";

const glowColor = "#4ade80";

const neonPointGlow = keyframes`
  0% { box-shadow: 0 0 5px ${glowColor}80, 0 0 10px ${glowColor}60, 0 0 15px ${glowColor}40, 0 0 20px ${glowColor}20; }
  50% { box-shadow: 0 0 10px ${glowColor}80, 0 0 20px ${glowColor}60, 0 0 30px ${glowColor}40, 0 0 40px ${glowColor}20; }
  100% { box-shadow: 0 0 5px ${glowColor}80, 0 0 10px ${glowColor}60, 0 0 15px ${glowColor}40, 0 0 20px ${glowColor}20; }
`;

const sparklePulse = keyframes`
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0.6; transform: scale(1); }
`;

export default function SidebarButtonLink(prop) {
  let location = useLocation();
  const { value } = prop;
  const activeUsers = useSelector((state) => state.user.activeUsers);

  const activeRoute = (valueName) => location.pathname === valueName ? "active" : "";

  const activeBg = "linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(157, 0, 255, 0.08), rgba(0, 255, 157, 0.08))";
  const activeColor = "white";
  const inactiveColor = "white";

  return (
    <NavLink to={value.path ? value.layout + value.path : '#'}>
      {activeRoute(value.path ? value.layout + value.path : value.component) === "active" ? (
        <Button
          justifyContent="flex-start"
          alignItems="center"
          bg={activeBg}
          bgSize="400% 400%"
          mb={{ xl: "12px" }}
          mx={{ xl: "auto" }}
          ps={{ sm: "10px", xl: "16px" }}
          py="12px"
          borderRadius="15px"
          w="100%"
          _hover="none"
          _focus={{ boxShadow: "none" }}
          position="relative"
          overflow="hidden"
          sx={{
            border: '1px solid rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(5px)',
          }}
        >
          <Flex align="center" w="100%">
            {value.icon ? (
              <Box mr="12px" display="flex" alignItems="center" justifyContent="center">{value.icon}</Box>
            ) : (
              <IconBox bg="brand.200" h="16px" w="16px" mr="7px" ml="18px" />
            )}

            <Text color={activeColor} fontSize="sm">{value.name}</Text>

            {/* Neon dot & badge moved to far right */}
            {value.type === "tier" && activeUsers && (
              <Flex
                ml="auto"
                align="center"
                w="48px"
                justify="flex-end"
              >
                <Flex
                  align="center"
                  display="inline-flex"
                  lineHeight="1"
                >
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="50%"
                    bg={glowColor}
                    mr="1px"          // 👈 ATTACHES dot to number
                    sx={{
                      animation: `${neonPointGlow} 3s ease-in-out infinite, ${sparklePulse} 2s ease-in-out infinite`,
                      boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}60`,
                    }}
                  />

                  <Badge
                    p="0"
                    fontSize="9px"
                    fontWeight="bold"
                    color="cyan.300"
                    bg="transparent"
                    lineHeight="1"
                    minW="18px"
                    textAlign="left"
                  >
                    {activeUsers[`tier${value.level}Users`]}
                  </Badge>
                </Flex>
              </Flex>

            )}
          </Flex>
        </Button>
      ) : (
        <Button
          justifyContent="flex-start"
          alignItems="center"
          bg="#333738"
          mb={{ xl: "12px" }}
          mx={{ xl: "auto" }}
          ps={{ sm: "10px", xl: "16px" }}
          py="12px"
          borderRadius="15px"
          w="100%"
          _hover="none"
          _focus={{ boxShadow: "none" }}
        >
          <Flex align="center" w="100%">
            {value.icon ? (
              <Box mr="12px" display="flex" alignItems="center">{value.icon}</Box>
            ) : (
              <IconBox bg="brand.200" h="10px" w="10px" mr="10px" ml="21px" />
            )}

            <Text color={inactiveColor} fontSize="sm">{value.name}</Text>

            {/* Neon dot & badge far right */}
            {value.type === "tier" && activeUsers && (
              <Flex
                ml="auto"
                align="center"
                w="48px"
                justify="flex-end"
              >
                <Flex
                  align="center"
                  display="inline-flex"
                  lineHeight="1"
                >
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="50%"
                    bg={glowColor}
                    mr="3px"          // 👈 ATTACHES dot to number
                    sx={{
                      animation: `${neonPointGlow} 3s ease-in-out infinite, ${sparklePulse} 2s ease-in-out infinite`,
                      boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}60`,
                    }}
                  />

                  <Badge
                    p="0"
                    fontSize="9px"
                    fontWeight="bold"
                    color="cyan.300"
                    bg="transparent"
                    lineHeight="1"
                    minW="18px"
                    textAlign="left"
                  >
                    {activeUsers[`tier${value.level}Users`]}
                  </Badge>
                </Flex>
              </Flex>

            )}

          </Flex>
        </Button>
      )}
    </NavLink>
  );
}
