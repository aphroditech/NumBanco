import { Button } from "@chakra-ui/react";

import React from "react";

function CancelButton(props) {
    const { label, width, onClick } = props;
    return (
        <Button
            variant='ghost'
            fontSize='12px'
            type='button'
            maxW='350px'
            alignSelf="center"
            h='45'
            mb='20px'
            mt='20px'
            w={width}
            onClick={onClick}>
            {label}
        </Button>
    );
}

export default CancelButton;