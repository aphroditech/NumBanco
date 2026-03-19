import React from "react";
import { Box, Text, Button } from "@chakra-ui/react";
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';

export default function CardNumbersItem(props) {
    const { index, onClick, disabled, flipped, number } = props;

    const handleClick = () => {
        if (!flipped && !disabled) {
        onClick(index); // Trigger the onClick function passed from parent
        }
    };

  return (
    <Box
        w="100px"
        // bg={flipped ? "#582cff" : "#582cff"}
        display="flex"
        justifyContent="center"
        alignItems="center"
        borderRadius="10px"
        placeSelf="center"
        boxShadow="0 4px 6px rgba(0,0,0,0.3)"
        cursor={disabled ? "not-allowed" : "pointer"}
        onClick={handleClick}
        transition="all 0.3s"
        opacity={disabled ? 0.5 : 1}  // Decrease opacity if disabled
    >
        {flipped ? (
            // <Text fontSize="30px" textAlign="center" height="100px" color="#f12345" lineHeight="50px" m="auto" paddingTop="25px">
            //   ${number}  
            //   {/* Display the number (e.g., 0.1, 0.2) */}
            // </Text>
            <Text color="white"
                style={{
                textShadow: "0 0 0px #00D4FF, 0 0 0px #00D4FF, 0 0 20px #00D4FF"
                }} fontWeight="bold" m="auto" width="auto" fontSize="35px" display="flex" alignItems="center" justifyContent="center" height="100px">
                ${number}
            </Text>
        ) : (
            <Button
                w="100%"
                height="100px"
                bg="transparent"
                isDisabled={disabled} // Disable button if card is disabled
                color="white"
                > 
                {/* <NeonAvatar size="70px" src={box} bg="transparent"></NeonAvatar>  Card index number */}
                <TokenRoundedIcon 
                    style={{ 
                        fontSize: "80px",
                        color: "white",
                        filter: "drop-shadow(0 0 20px #00D4FF)"
                }} />
            </Button>
        )}
    </Box>
  );
}