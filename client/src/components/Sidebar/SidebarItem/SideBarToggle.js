import React, { useState, useEffect } from "react";
import { Button, Flex, Text, Box } from "@chakra-ui/react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";


export default function SideBarToggle({ value, onClick, isExpanded = false }) {
  let inactiveColor = "white";
  const [animationStep, setAnimationStep] = useState(0); // 0: first arrow, 1: second arrow, 2: hidden

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 3);
    }, 400); // Change step every 400ms

    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      onClick={onClick}
      justifyContent="space-between"
      alignItems="center"
      bg="#333738"
      mb={{ xl: "12px" }}
      mx={{ xl: "auto" }}
      ps={{ sm: "10px", xl: "16px" }}
      py="12px"
      borderRadius="15px"
      w="100%"
      _hover={"none"}
      _focus={{ boxShadow: "none" }}
    >
      {/* Left side: icon + text */}
      <Flex align="center">
        <Box
          mr="12px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {value.icon}
        </Box>
        <Text color={inactiveColor} my="auto" fontSize="sm">
          {value.name}
        </Text>
      </Flex>

      {/* Right side: animated arrows or static arrow */}
      <Box
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="24px"
        h="24px"
      >
        {isExpanded ? (
          // Show single static arrow when expanded
          <KeyboardArrowDownIcon 
            sx={{ 
              fontSize: "20px",
              color: "#00d4ff",
              transform: "rotate(180deg)", // Point up when expanded
              transition: "transform 0.3s ease"
            }} 
          />
        ) : (
          // Show animated arrows when collapsed
          <>
            {/* First arrow */}
            <Box
              position="absolute"
              top="0px"
              color="#00d4ff"
              sx={{
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: animationStep === 0 ? "translateY(0) scale(1)" : 
                           animationStep === 1 ? "translateY(0) scale(1)" : 
                           "translateY(0) scale(0)",
                opacity: animationStep === 2 ? 0 : 1,
              }}
            >
              <KeyboardArrowDownIcon 
                sx={{ 
                  fontSize: "20px",
                }} 
              />
            </Box>
            
            {/* Second arrow */}
            <Box
              position="absolute"
              top="4px"
              color="#00d4ff"
              sx={{
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: animationStep === 1 ? "translateY(0) scale(1)" : 
                           animationStep === 2 ? "translateY(1px) scale(0.8)" : 
                           "translateY(0) scale(0)",
                opacity: animationStep === 0 ? 0 : (animationStep === 2 ? 0 : 1),
              }}
            >
              <KeyboardArrowDownIcon 
                sx={{ 
                  fontSize: "20px",
                }} 
              />
            </Box>
          </>
        )}
      </Box>

    </Button>
  );
}