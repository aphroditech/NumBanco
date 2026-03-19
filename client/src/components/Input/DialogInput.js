import { Input, Grid, GridItem, Text, Box, InputGroup, InputRightElement } from "@chakra-ui/react";
import GradientBorder from "components/GradientBorder/GradientBorder";
import React from "react";

function DialogInput(props) {
    const { 
        label, 
        name, 
        type, 
        value, 
        placeholder, 
        onChange, 
        length,
        onKeyDown, 
        error, 
        rightElement, 
        isDisabled,
        ...rest 
    } = props;
    const titleColor = "#fff";

    return (
        <Grid
        templateColumns='repeat(5, 1fr)'
        mb="24px"
        w={{ base: "100%"}}
        >
            <GridItem
            colSpan={{sm: '5', md: '5'}}>
                <GradientBorder
                    w="100%"
                    borderRadius='20px'>
                    <InputGroup>
                        <Input
                        maxLength={length ?? 200}
                        bg='#323738'
                        border='transparent'
                        borderRadius='20px'
                        fontSize='sm'
                        size='lg'
                        w='100%'
                        h='46px'
                        color={titleColor}
                        name={name}
                        type={type}
                        {...(onChange ? { value: value ?? "", onChange } : { defaultValue: value ?? "" })}
                        placeholder={placeholder}
                        onKeyDown={onKeyDown}
                        isDisabled={isDisabled}
                        {...rest}
                        />
                        {rightElement && (
                            <InputRightElement>
                                {rightElement}
                            </InputRightElement>
                        )}
                    </InputGroup>
                </GradientBorder>
            </GridItem>
            {error && (
                <GridItem colSpan={{sm: '5', md: '5'}}>
                    <Text pl={{sm: "20px"}}>
                    <span style={{ color: "#ff9994ff", fontSize: "12px"}}>{error}</span>
                    </Text>
                </GridItem>
            )}
        </Grid>
    );
}

export default DialogInput;