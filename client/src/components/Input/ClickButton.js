import { Button } from "@chakra-ui/react";
import React from "react";

function ClickButton(props) {
    const {
        label,
        width,
        onClick,
        mt,
        mb,
        disabled,
        to,
        ...rest
    } = props;

    return (
        <Button
            type="button"
            fontSize="14px"
            fontWeight="600"
            letterSpacing="0.3px"
            h="46px"
            w={width || "100%"}
            maxW="350px"
            mt={mt || "18px"}
            mb={mb || "18px"}
            alignSelf="center"

            color="#fff"
            bg="#00D4FF"
            borderRadius="20px"

            border="2px solid #00D4FF"
            boxShadow="
                inset 0 0 0 1px rgba(255,255,255,0.03),
                0 10px 30px rgba(0, 212, 255, 0.08)
            "

            _hover={{
                bg: "#00D4FF",
                borderColor: "#00D4FF",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0, 212, 255, 0.3)"
            }}

            _active={{
                transform: "translateY(0)"
            }}

            _disabled={{
                opacity: 0.45,
                cursor: "not-allowed",
                transform: "none",
                boxShadow: "none",
            }}

            transition="all 0.25s ease"
            disabled={disabled}
            onClick={onClick}
            {...rest}
        >
            {label}
        </Button>
    );
}

export default ClickButton;
