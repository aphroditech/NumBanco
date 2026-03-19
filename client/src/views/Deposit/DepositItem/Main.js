import {
    Flex,
    Grid,
    Text,
    Stat,
    StatLabel,
    StatNumber,
    SimpleGrid,
    HStack,
    Box,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import { QRCodeCanvas } from "qrcode.react";
import IconBox from 'components/Icons/IconBox';
import { WalletIcon, GlobeIcon } from 'components/Icons/Icons';
import Card from 'components/Card/Card.js';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import LineInput from 'components/Input/LineInput';
import ClickButton from 'components/Input/ClickButton';
import CardHeader from 'components/Card/CardHeader';
import CardBody from 'components/Card/CardBody';
import StyledSelect from 'components/select/StyledSelect';
import CopyBadge from 'components/CopyBadge/CopyBadge';
import useAblyDepositStatus from 'hooks/useAblyDepositStatus';
import { deposit, depositFail } from 'action/DelpositActions';
import { useHistory } from 'react-router-dom';
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilledRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

function Main() {
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#ED8936'; // Orange
            case 'success':
                return '#48BB78'; // Green
            case 'failed':
                return '#F56565'; // Red
            default:
                return '#fff'; // White
        }
    };

    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.userInfo) || {};
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
    const [selectedNetwork, setSelectedNetwork] = useState('TRON-USDT');
    const [walletAddresses, setWalletAddresses] = useState({});
    const [depositStart, setDepositStart] = useState(0);
    const [errors, setErrors] = useState({});
    const history = useHistory();
    const { depositStatus, setDepositStatus, txHash, setTxHash, confirms, setConfirms, depositAmount, setDepositAmount, depositTime, setDepositTime, depositText, setDepositText } = useAblyDepositStatus(user.userId);

    useEffect(() => {
        setWalletAddresses({
            eth: user.wallets?.eth?.address || '',
            bsc: user.wallets?.bsc?.address || '',
            tron: user.wallets?.tron?.address || ''
        });
        const pendingDeposit = user.deposit?.filter(dep => dep.depFill === 'pending')
            .sort((a, b) => new Date(b.createAt) - new Date(a.createAt))[0];

        console.log("pending data:", pendingDeposit);
        if (pendingDeposit) {
            console.log("Pending deposit found:", pendingDeposit);
            setDepositText("Waiting ...")
            setDepositStart(new Date(pendingDeposit.createAt).getTime());
            setDepositAmount(pendingDeposit.depAmount)
            setDepositStatus("pending");
            if (localStorage.getItem("confirms")) {
                setConfirms(localStorage.getItem("confirms"));
            }

            if (pendingDeposit.depNet === "ETH") setSelectedNetwork('Ethereum-USDT');
            if (pendingDeposit.depNet === "BSC") setSelectedNetwork('BSC-USDT');
            if (pendingDeposit.depNet === "TRON") setSelectedNetwork('TRON-USDT');
            if (pendingDeposit.depTxH) {
                setTxHash(pendingDeposit.depTxH);
            }

            let waiting = 15 * 1000 * 60 - (user.__v - depositStart);
            const interval = setInterval(() => {
                if (waiting <= 0 && !pendingDeposit.depTxH) {
                    depositFail(dispatch, history);
                    setDepositStatus('failed');
                    clearInterval(interval);
                    return;
                }
                setDepositTime(waiting <= 0 ? 0 : waiting -= 1000);
                if (localStorage.getItem("confirms")) {
                    setConfirms(localStorage.getItem("confirms"));
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [user, depositStart]);

    const getDepositAddress = () => {
        switch (selectedNetwork) {
            case 'Ethereum-USDT':
                return walletAddresses?.eth;
            case 'BSC-USDT':
                return walletAddresses?.bsc;
            case 'TRON-USDT':
                return walletAddresses?.tron;
            default:
                return '';
        }
    };

    const validate = () => {
        let tempErrors = {};
        if (!depositAmount || depositAmount <= 0) tempErrors.amount = "Deposit amount must be greater than 0";
        if (!getDepositAddress()) tempErrors.amount = "Deposit address is not available";
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleDeposit = async () => {
        if (!validate()) return;
        const data = {
            dep_addr: getDepositAddress(),
            dep_amt: depositAmount,
            dep_net: selectedNetwork == 'Ethereum-USDT' ? 'ETH-USDT' : selectedNetwork
        };
        setDepositStatus('pending');
        deposit(data, dispatch, history);
    };

    const handleCancel = async () => {
        await depositFail(dispatch, history);
        setDepositTime(0);
        setDepositStatus('failed');
        setDepositText("Deposit Failed")

        setTimeout(() => {
            setDepositText("Deposit Time");
            // setDepositStatus(null);
        }, 3000);
    }

    return (
        <Card>
            <Grid>
                <CardHeader mb='20px' position="relative">
                    <Flex direction='column' alignSelf='flex-start' alignItems="center" justifyContent="center">
                        <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px' display="flex" alignItems="center" justifyContent="center">
                            <CloudUploadRoundedIcon style={{ fontSize: "30px", color: "#00D4FF", marginRight: "8px" }} />Deposit
                        </Text>
                        <Box
                            as="button"
                            type="button"
                            aria-label="Deposit help"
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
                <SimpleGrid templateColumns={{ sm: '1fr', md: '1fr 1fr' }} spacing='24px' my='26px' >
                    <Card style={{ backgroundColor: "#323738" }}>
                        <CardBody>
                            <Flex flexDirection='row' align='center' justify='center' w='100%'>
                                <Stat me='auto'>
                                    <StatLabel fontSize='sm' color='gray.400' fontWeight='bold' pb='2px'>
                                        {depositText}
                                    </StatLabel>
                                    <Flex>
                                        <StatNumber
                                            fontSize='lg'
                                            color="#fff"
                                        >
                                            {depositTime > 0
                                                ? `${String(Math.floor(depositTime / 1000 / 60)).padStart(2, "0")}:${String(
                                                    Math.floor(depositTime / 1000) % 60
                                                ).padStart(2, "0")}`
                                                : "00:00"}
                                        </StatNumber>
                                    </Flex>
                                </Stat>
                                <AccessTimeFilledRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                            </Flex>
                        </CardBody>
                    </Card>
                    <Card minH='83px' style={{ backgroundColor: "#323738" }}>
                        <CardBody>
                            <Flex flexDirection='row' align='center' justify='center' w='100%'>
                                <Stat me='auto'>
                                    <StatLabel fontSize='sm' color='gray.400' fontWeight='bold' pb='2px'>
                                        Confirmation
                                    </StatLabel>
                                    <Flex>
                                        <StatNumber
                                            fontSize='lg'
                                            color={getStatusColor(depositStatus)}
                                        >
                                            {depositStatus || confirms}

                                            {(selectedNetwork == "TRON-USDT" && depositStatus === null) && <span style={{ marginLeft: "5px" }}>/20</span>}
                                            {(selectedNetwork == "BSC-USDT" && depositStatus === null) && <span style={{ marginLeft: "5px" }}>/3</span>}
                                            {(selectedNetwork == "Ethereum-USDT" && depositStatus === null) && <span style={{ marginLeft: "5px" }}>/12</span>}
                                        </StatNumber>
                                    </Flex>
                                </Stat>
                                <VerifiedUserRoundedIcon style={{ fontSize: "40px", color: "#00D4FF" }} />
                            </Flex>
                        </CardBody>
                    </Card>
                </SimpleGrid>
            </Grid>

            <Flex
                alignItems="center"
                justifyContent="start"
                style={{ userSelect: 'none' }}
                w="100%"
            >
                <Flex
                    direction="column"
                    w="100%"
                    background="transparent"
                    mt={8}
                    mb={{ base: '60px', lg: '60px' }}
                >
                    <StyledSelect
                        coin="Deposit Coin:"
                        readOnly={depositStatus === 'pending'}
                        options={['TRON-USDT', 'BSC-USDT', 'Ethereum-USDT']}
                        value={selectedNetwork}
                        onChange={(e) => setSelectedNetwork(e.target.value)}
                    />
                    <HStack align="end" spacing={2}>
                        <LineInput
                            label="Deposit Address"
                            value={getDepositAddress()}
                            readOnly={true}
                            style={{
                                backgroundColor: '#323738',
                                opacity: 1,
                                color: 'white'
                            }}
                            rightElement={
                                <CopyBadge address={getDepositAddress()} />
                            }
                        />
                    </HStack>

                    {txHash && (
                        <LineInput
                            label="Transaction Hash"
                            value={txHash}
                            readOnly={true}
                            rightElement={
                                <CopyBadge address={txHash} />
                            }
                        />
                    )}

                    <LineInput
                        name="d_amount"
                        label="Deposit Amount"
                        type="number"
                        readOnly={depositStatus === 'pending'}
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        error={errors.amount}
                        step="1"
                        onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') {
                                e.preventDefault();
                            }
                            e.key === 'Enter' && handleDeposit();
                        }}
                        placeholder="Enter deposit amount"
                    />

                    <div style={{ textAlign: "center", margin: "auto" }}>
                        <QRCodeCanvas
                            value={getDepositAddress()}
                            size={220}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="H"
                            includeMargin
                        />
                    </div>

                    <Flex direction="row" gap="12px" justify="center">
                        <ClickButton
                            label="Deposit"
                            width="30%"
                            onClick={handleDeposit}
                            disabled={depositStatus === 'pending'}
                            style={{
                                opacity: depositStatus === 'pending' ? 0.6 : 1,
                                cursor: depositStatus === 'pending' ? 'not-allowed' : 'pointer',
                            }}
                        />

                        <ClickButton
                            label="Cancel"
                            width="30%"
                            onClick={handleCancel}
                            disabled={txHash || depositStatus !== 'pending'}
                            style={{
                                opacity: depositStatus !== 'pending' ? 0.6 : 1,
                                cursor: depositStatus !== 'pending' ? 'not-allowed' : 'pointer',
                            }}
                        />
                    </Flex>
                </Flex>
            </Flex>

            {/* Deposit help modal */}
            <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader color="#00D4FF" pt={6}>
                        How to deposit
                    </ModalHeader>
                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />
                    <ModalBody pb={6}>
                        <Text color="gray.300" fontSize="sm" mb={3}>
                            *Follow these steps to deposit USDT to your account:
                        </Text>
                        <Flex as="ol" direction="column" gap={2} color="whiteAlpha.900" fontSize="sm" pl={4} style={{ listStyle: 'decimal' }}>
                            <Text as="li">Select your preferred network (TRON-USDT, BSC-USDT, or Ethereum-USDT).</Text>
                            <Text as="li">Copy your deposit address using the copy button, or scan the QR code.</Text>
                            <Text as="li">Send only USDT to this address on the selected network. Sending any other asset may result in loss.</Text>
                            <Text as="li">Enter the amount you are depositing and click &quot;Deposit&quot; to start the process.</Text>
                            <Text as="li">Wait for the required confirmations (TRON: 20, BSC: 3, Ethereum: 12). Your balance will update automatically.</Text>
                        </Flex>
                        <Text color="gray.400" fontSize="xs" mt={4}>
                            *If you have any issues, contact support from the freshdesk.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Card>
    );
}
export default Main;
