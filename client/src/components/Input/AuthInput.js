import { Text, FormLabel, Input, FormControl } from "@chakra-ui/react";
import GradientBorder from "components/GradientBorder/GradientBorder";
import React from "react";

function AuthInput(props) {
  const { label, name, type, length, value,width, placeholder, onChange, onKeyDown, error } = props;
  const titleColor = "#fff";

  return (
    <FormControl mb="16px" textAlign="center">
        <FormLabel
            color={titleColor}
            ms='4px'
            fontSize='sm'
            fontWeight='normal'>
            {label}
        </FormLabel>
        <GradientBorder
            mb='0px'
            h='50px'
            w={{ base: "100%", lg: "fit-content" }}
            borderRadius='20px'>
            <Input
              maxLength={length ?? 100}
              bg={{ base: "#323738", }}
              border='transparent'
              borderRadius='20px'
              fontSize='sm'
              size='lg'
              w={{ base: "100%", md: "346px" }}
              width={width}
              maxW='100%'
              h='46px'
              color={titleColor}
              name={name}
              type={type}
              value={value ?? ""}
              onChange={onChange}
              placeholder={placeholder}
              onKeyDown={onKeyDown}
            />
        </GradientBorder>
        {error && (
          <Text pl="20px">
            <span style={{ color: "#ff9994ff", fontSize: "12px" }}>{error}</span>
          </Text>
        )}
    </FormControl>
  );
}

export default AuthInput;