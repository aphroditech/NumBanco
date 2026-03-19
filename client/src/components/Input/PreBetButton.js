import { Button, Stat, StatLabel, StatNumber, StatHelpText, Flex, Box } from "@chakra-ui/react";

import React from "react";

import BakeryDiningRoundedIcon from '@mui/icons-material/BakeryDiningRounded';
import StyleRoundedIcon from '@mui/icons-material/StyleRounded';

function PreBetButton(props) {
    const { label, width, onClick, disabled, ticket } = props;
    return (
        <Button
            variant='brand'
            fontSize='20px'
            type='button'
            maxW='350px'
            alignSelf="center"
            h='65'
            pt="10px"
            pb="10px"
            w={width}
            bg="#00D4FF"
            disabled={disabled}
            onClick={onClick}
            _hover={{ bg: "white", color: "#00D4FF" }}>
            
            <Stat>
                <StatLabel display={label>1000? "inline-grid" : "flex"} textAlign="center" placeItems="center" fontSize='12px' color='inherit'>
                    <BakeryDiningRoundedIcon style={{ fontSize: "20px", color: "inherit", marginRight: "3px" }} />
                    {label}
                </StatLabel>
                <Flex placeSelf="center">
                    <StatNumber fontSize='10px' color='inherit' fontWeight='bold' pb='2px'>
                        {ticket}
                    </StatNumber>
                    <StatHelpText
                        alignSelf='flex-end'
                        justifySelf='flex-end'
                        m='0px'
                        color='inherit'
                        fontWeight='bold'
                        ps='3px'
                        pb="3px"
                        fontSize='10px'>
                        /
                    </StatHelpText>
                    <StatNumber fontSize='10px' color='inherit' fontWeight='bold' pb='2px'>
                        100
                    </StatNumber>
                </Flex>
            </Stat>
        </Button>
    );
}

export default PreBetButton;