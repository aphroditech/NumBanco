import { Box, Button, Text } from "@chakra-ui/react";

export default function StampedButton({ onOpen, setSelectedPlan }) {
  return (
    <Box position="relative" w="100%" display="flex" justifyContent="center">
      {/* Stamp */}
      <Text
        fontSize="30px"
        fontWeight="bold"
        color="red.500"
        border="2px"
        borderColor="red.500"
        px="40px"
        py="10px"
        borderRadius="6px"
        textAlign="center"
        textTransform="uppercase"
        zIndex={2}
        pointerEvents="none"
      >
        You are on here
      </Text>
    </Box>
  );
}