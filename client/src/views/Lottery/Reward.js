import React, { useEffect, useRef } from 'react';
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { betReward } from "action/LotteryActions";
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';


import {
    Box,
    Button,
    Text,
    Flex,
    useDisclosure,
    Grid
} from '@chakra-ui/react';

import Dialog from "components/Dialog/Dialog";
import CardHeader from 'components/Card/CardHeader.js';
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import ClickButton from 'components/Input/ClickButton';
import truncateToTwo from 'variables/truncateToTwo';

export default function Reward() {
    const dispatch = useDispatch();
    const history = useHistory();
    const { isOpen, onOpen, onClose } = useDisclosure()
    const user = useSelector((state) => state.user.userInfo);
    const [winEffect, setWinEffect] = useState({ visible: false, amount: 0 });
    const mountedRef = useRef(true);
    const hideTimeoutRef = useRef(null);

    // Calculate reward amount
    const rewardAmount = user.refreshBet ? user.refreshBet * 0.02 : 0;

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    function onConfirm() {
        const rewardAmount = user.refreshBet * 0.02;

        const payload = {
            reward: truncateToTwo(rewardAmount),
        };

        // snapshot the amount you are claiming (prevents "previous value" flash)
        setWinEffect({ visible: true, amount: truncateToTwo(rewardAmount) });

        // Hide fireworks after 3 seconds
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
                setWinEffect((prev) => ({ ...prev, visible: false }));
            }
        }, 3000);

        betReward(payload, history, dispatch);
        onClose();
    }

    return (
        <Box>
            <WinFireworksEffect
                isVisible={winEffect.visible}
                totalEarn={winEffect.amount}
                duration={1200}
            />


            <CardHeader alignItems="center" justifyContent="center" justifyItems="center">
                <CurrencyExchangeIcon
                    style={{
                        fontSize: "80px",
                        color: "white",
                        marginTop: "20px"
                    }} />
            </CardHeader>
            <Grid justifyContent="center" justifyItems="center" gap={6} alignItems="center" mt="10px">
                <Text color='#fff' fontSize='20px' textAlign='center' >
                    {
                        "Bet :  " + "$" + truncateToTwo(user.refreshBet)
                    }
                </Text>
                <Text color='#fff' fontSize='20px' textAlign='center'>
                    {
                        "Reward :  " + "$" + truncateToTwo(user.refreshBet * 0.02)
                    }
                </Text>
                <ClickButton
                    onClick={() => onConfirm()}
                    width="200px"
                    disabled={!user.refreshBet}
                    color="white"
                    fontSize="12px"
                    px="30px"
                    label={`Claim ${truncateToTwo(rewardAmount)} $ Reward`}
                    mt="0px"
                />
            </Grid>
        </Box>
    );
}
