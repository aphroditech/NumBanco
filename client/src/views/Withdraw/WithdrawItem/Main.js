import {
    Flex,
    Text,
    Box,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import LineInput from 'components/Input/LineInput';
import ClickButton from 'components/Input/ClickButton';
import StyledSelect from 'components/select/StyledSelect';
import Dialog from "components/Dialog/Dialog";
import { withdraw, getprice } from 'action/WithdrawActions';
import ButterPop from 'butterpop';
import useAblyWithdrawStatus from 'hooks/useAblyWithdrawStatus';
import { getUserData } from "action/index";
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import { toast } from 'react-toastify';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';

function Main() {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const history = useHistory();
    const [selectedCoin, setSelectedCoin] = useState('TRON-USDT');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [fee, setFee] = useState(0);
    const [feeData, setFeeData] = useState(0);
    const [coin, setCoin] = useState('TRX');
    const [errors, setErrors] = useState({});
    const [pendingAddress, setPendingAddress] = useState(null);
    const [withdrawTimeout, setWithdrawTimeout] = useState(null);
    const [isCalculatingFee, setIsCalculatingFee] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
    const { withdrawStatus, setWithdrawStatus, txHash, setTxHash } = useAblyWithdrawStatus(null, user?.userId);

    const validate = () => {
        let tempErrors = {};

        if (!selectedCoin) {
            tempErrors.coin = 'Please select a coin';
        }

        if (!withdrawAddress || withdrawAddress.trim() === '') {
            tempErrors.address = 'Withdraw address is required';
        } else {
            // Enhanced address validation for each network
            const isValidAddress = validateAddressFormat(withdrawAddress, selectedCoin);
            if (!isValidAddress) {
                tempErrors.address = 'Withdraw address is incorrect';
                toast.error('Withdraw address is incorrect');
            }
        }

        if (!withdrawAmount || withdrawAmount.trim() === '') {
            tempErrors.amount = 'Withdraw amount is required';
        } else {
            const amount = parseFloat(withdrawAmount);
            if (isNaN(amount) || amount <= 0) {
                tempErrors.amount = 'Please enter a valid amount';
            } else if (user.balance && amount > user.balance) {
                tempErrors.amount = 'Insufficient balance';
            }
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const validateAddressFormat = (address, network) => {
        if (!address || address.length < 20) return false;

        // Basic validation patterns for different networks
        if (network === 'TRON-USDT') {
            // TRON addresses start with 'T' and are 34 characters
            return /^T[A-Za-z1-9]{33}$/.test(address);
        } else if (network === 'Ethereum-USDT' || network === 'BSC-USDT') {
            // ETH/BSC addresses start with '0x' and are 42 characters
            return /^0x[a-fA-F0-9]{40}$/.test(address);
        }

        return false;
    };

    const handleWithdraw = async () => {
        if (!validate()) {
            return;
        }

        if (user.partnerLevel === 1) {
            // TODO: Add validation for partner level 1
            // Require at least one successful deposit of $10 or more before allowing withdrawals
            // try {
            //     const deposits = user?.deposit || [];
            //     const successfulDeposits = deposits.filter(d => d.depFill === 'success');
            //     const totalDepositAmount = successfulDeposits.reduce((sum, d) => sum + Number(d.depAmount), 0);

            //     if (totalDepositAmount < 10) {
            //         toast.error('You have to deposit at least 10$');
            //         return;
            //     }
            // } catch (err) {
            //     console.warn('Error checking deposit history for withdrawal:', err);
            // }

            // Check user's balance before attempting withdraw
            try {
                const amount = parseFloat(withdrawAmount) + user.dailyWithdraw;
                const balance = Number(user?.balance || 0);
                if (isNaN(amount) || amount <= 0) {
                    toast.error('Please enter a valid withdraw amount');
                    return;
                }
                if (balance < amount) {
                    toast.error("You don't have enough money.");
                    return;
                }

                // if (user.membership === 0 && amount > 100) {
                //     toast.error("As a free member, you can only withdraw up to $100 in one day. Please upgrade your membership for higher withdrawal limits.");
                //     return;
                // }

                // if (user.membership === 1 && amount > 10000) {
                //     toast.error("As a plus member, you can only withdraw up to $10000 in one day. Please upgrade your membership for higher withdrawal limits.");
                //     return;
                // }

                const sum = user.totalBet - user.totalWithdraw;
                if (amount > sum) {
                    toast.error(`You can only withdraw ${sum}.`);
                    return;
                }

                console.log('User balance check passed for withdrawal.', user);
            } catch (err) {
                console.warn('Error checking user balance for withdrawal:', err);
            }
        }


        setWithdrawStatus('pending');

        try {
            const data = {
                wd_addr: withdrawAddress.trim(),
                wd_amt: parseFloat(withdrawAmount),
                wd_net: selectedCoin
            };

            // trigger withdraw request (server will return quickly)
            await withdraw(data, dispatch, history);

            // keep the UI disabled and wait for the webhook (CONFIRM_SUCCESS) that matches this address
            setPendingAddress(data.wd_addr);

        } catch (error) {
            // Show error using toastr/ButterPop
            const errorMessage = error?.response?.data?.message || error?.message || 'Withdrawal failed. Please try again.';
            toast.error(errorMessage);
            setWithdrawStatus('failed');
        }
    };

    const price = async () => {
        if (!validate()) {
            return;
        }
        setIsCalculatingFee(true);
        try {
            const data = {
                wd_addr: withdrawAddress.trim(),
                wd_amt: parseFloat(withdrawAmount),
                wd_net: selectedCoin,
            };

            // trigger withdraw request (server will return quickly)
            const feedata = await getprice(data, dispatch, history);
            setFee(feedata.data.fee);
            setFeeData(feedata.data.feedata);
            onOpen();

        } catch (error) {
            setWithdrawStatus('failed');
        } finally {
            setIsCalculatingFee(false);
        }
    }

    // useEffect(async() => {
    //     const data = {
    //         coin: selectedCoin,
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'address') {
            setWithdrawAddress(value);
            if (errors.address) {
                setErrors({ ...errors, address: '' });
            }
        } else if (name === 'amount') {
            setWithdrawAmount(value);
            if (errors.amount) {
                setErrors({ ...errors, amount: '' });
            }
        }
    };

    // Update coin state when selectedCoin changes
    useEffect(() => {
        if (selectedCoin === 'Ethereum-USDT') {
            setCoin('ETH');
        } else if (selectedCoin === 'TRON-USDT') {
            setCoin('TRX');
        } else if (selectedCoin === 'BSC-USDT') {
            setCoin('BNB');
        }
    }, [selectedCoin]);

    // Reset form when withdrawal is successful
    useEffect(() => {
        if (withdrawStatus === 'success') {
            console.log('✅ Withdrawal successful, resetting form...');
            setWithdrawAddress('');
            setWithdrawAmount('');
            setSelectedCoin('TRON-USDT');
            setErrors({});
            setPendingAddress(null);

        }
    }, [withdrawStatus]);

    function onConfirm() {
        handleWithdraw();
        onClose();
    }

    return (
        <Card>
            <CardHeader mb='20px' position="relative">
                <Flex direction='column' alignSelf='flex-start'>
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                        <CloudDownloadRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Withdraw
                    </Text>
                    <Box
                        as="button"
                        type="button"
                        aria-label="Withdraw help"
                        onClick={onHelpOpen}
                        position="absolute"
                        right="0"
                        top="0"
                        _hover={{ opacity: 0.8 }}
                    >
                        <HelpOutlineIcon style={{ fontSize: "20px", cursor: "pointer", color: "#00D4FF" }} />
                    </Box>
                </Flex>
            </CardHeader>
            <Flex
                alignItems='center'
                justifyContent='start'
                style={{ userSelect: "none" }}
                w={{ base: "100%" }}>
                <Flex
                    direction='column'
                    w='100%'
                    background='transparent'
                    mt={8}
                    mb={{ base: "60px", lg: "95px" }}>

                    {/* <Text color="#fff" fontSize="14px" mb={2} textAlign="right">
                        1 {selectedCoin.split('-')[0]} ≈ {coinPrice} USDT
                    </Text> */}

                    <StyledSelect
                        coin="Withdraw Coin:"
                        options={["TRON-USDT", "BSC-USDT", "Ethereum-USDT"]}
                        value={selectedCoin}
                        onChange={(e) => {
                            setSelectedCoin(e.target.value);
                            if (errors.coin) {
                                setErrors({ ...errors, coin: '' });
                            }
                        }}
                        isDisabled={withdrawStatus === 'pending'}
                    />

                    <LineInput
                        name="address"
                        label="Withdraw Address"
                        placeholder="Your withdraw address"
                        value={withdrawAddress}
                        onChange={handleInputChange}
                        error={errors.address}
                        isDisabled={withdrawStatus === 'pending'}
                    />

                    <LineInput
                        name="amount"
                        label="Withdraw Amounts"
                        placeholder="Your withdraw amounts"
                        type="number"
                        value={withdrawAmount}
                        onChange={handleInputChange}
                        error={errors.amount}
                        isDisabled={withdrawStatus === 'pending'}
                    />
                    {/* {(user.membership === 0 || user.membership === 1) && (
                        <Text color="gray.400" fontSize="14px" mb="20px" textAlign="center">
                            * You are not a Pro member, so you have to pay withdrawal fee.
                        </Text>
                    )} */}
                    <ClickButton
                        label={isCalculatingFee ? "Calculating Fee..." : "Withdraw"}
                        width="100%"
                        onClick={price}
                        disabled={withdrawStatus === 'pending' || isCalculatingFee}
                    />
                </Flex>
            </Flex>
            <Dialog
                title={"Withdraw Coin: " + selectedCoin}
                content={"Your Address: " + withdrawAddress}
                amountcontent={"Withdraw Amount: " + withdrawAmount + " USDT"}
                addcontent={"Fee : " + feeData + coin + "≈" + "$" + fee}
                yesButton="OK"
                noButton="CANCEL"
                isOpen={isOpen}
                onClose={onClose}
                onConfirm={onConfirm}
            />

            {/* Withdraw help modal */}
            <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="#00D4FF" pt={6}>
                        How to withdraw
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody pb={6}>
                        <Text color="gray.300" fontSize="sm" mb={3}>
                            *Follow these steps to withdraw USDT to your wallet:
                        </Text>
                        <Flex as="ol" direction="column" gap={2} color="whiteAlpha.900" fontSize="sm" pl={4} style={{ listStyle: 'decimal' }}>
                            <Text as="li">Select your preferred network (TRON-USDT, BSC-USDT, or Ethereum-USDT).</Text>
                            <Text as="li">Enter your external wallet address. Make sure it supports USDT on the selected network (TRON: T..., BSC/Ethereum: 0x...).</Text>
                            <Text as="li">Enter the amount you want to withdraw.</Text>
                            <Text as="li">Click &quot;Withdraw&quot; to see the fee summary, then confirm to complete the withdrawal.</Text>
                            <Text as="li">Your funds will be sent to the provided address after processing. Check your wallet for the transaction.</Text>
                        </Flex>
                        <Text color="gray.400" fontSize="xs" mt={4}>
                            *Non-Pro members may incur a withdrawal fee. If you have any issues, contact support from the freshdesk. 
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Card>
    );
}
export default Main;