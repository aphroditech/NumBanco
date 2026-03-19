import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import {
    Flex,
    Grid,
    Stat,
    StatLabel,
} from '@chakra-ui/react';

import ClickButton from 'components/Input/ClickButton';
import { toast } from "react-toastify"

export default function SharePartnerLink() {
    const user = useSelector((state) => state.user.userInfo);
    const textToCopy = user.altas && "https://NumBanco.io/auth/signup?affiliate=" + user.userId;

    const fallbackCopyText = (text) => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand("copy");
            toast.success("Copied successfully");
        } catch (err) {
            toast.error("Copy failed");
        }

        document.body.removeChild(textarea);
    };

    const handleCopyClick = async () => {
        if (!textToCopy) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textToCopy);
                toast.success("Copied successfully");
            } else {
                fallbackCopyText(textToCopy);
            }
        } catch (err) {
            fallbackCopyText(textToCopy);
        }
    };

    return (
        <Flex flexDirection='column' pt={{ base: '120px', md: '75px' }}>
            <Stat align="center">
                <StatLabel fontSize='sm' mt="30px" color='#fff' pb='2px'>
                    Affiliate Sharing Link : {user.userId ? textToCopy : "UUID"}
                </StatLabel>
            </Stat>
            <Flex justify="center" align="center" w="100%">
                <ClickButton
                    width="50%"
                    label="Share Affiliate Link"
                    onClick={handleCopyClick}
                />
            </Flex>
        </Flex>
    );
}


// 