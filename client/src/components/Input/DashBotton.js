import { Button } from "@chakra-ui/react";

import React from "react";

function DashBotton(props) {
    const { label, width, onClick, disabled, to } = props;
    return (
        <Button
            variant='simple'
            type='button'
            maxW='350px'
            alignSelf="center"
            fontSize={{ sm: 'md', lg: 'lg' }}
            color='#fff'
            fontWeight='bold'
            w={width}
            disabled={disabled}
            onClick={onClick}>
            {label}
        </Button>
    );
}

export default DashBotton;