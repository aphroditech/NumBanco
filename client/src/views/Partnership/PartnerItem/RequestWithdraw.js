import React, { useEffect, useState } from 'react';

import {
    Grid,
    GridItem,
    Stat,
    StatNumber,
    Text,
    Flex,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    Box,
    UnorderedList,
    ListItem,
    IconButton,
    useDisclosure
} from '@chakra-ui/react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import Card from 'components/Card/Card.js';
import CardHeader from 'components/Card/CardHeader.js';
import ClickButton from 'components/Input/ClickButton';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { partnershipDeposit } from 'action/PartnershipActions';
import { useAblyPartnerEarn } from 'hooks/useAblyPartnerEarn';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import { toast } from 'react-toastify';
import truncateToTwo from "variables/truncateToTwo";

export default function RequestWithdraw() {
    const user = useSelector((state) => state.user.userInfo);
    const dispatch = useDispatch();
    const history = useHistory();
    useAblyPartnerEarn(user?.userId, dispatch);
    const [loading, setLoading] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();

    useEffect(() => {
        if (user.partnerFlag === 2 || user.partnerFlag === 3) {
            setLoading(true);
        } else {
            setLoading(false);
        }
    }, [user]);

    async function handleWithdraw() {
        if (user.partnerEarn <= 0) {
            toast.warning("You have no earnings to convert.");
            return;
        }

        try {
            setLoading(true);
            const result = await partnershipDeposit(dispatch, history);
            // setLoading(false)
        } catch (err) {
            toast.error("Server error. Please try again later. Contact the support team.");
        } finally {
            setLoading(false);
        }

    }
    return (
        <Card >
            <CardHeader mb="20px" position={"relative"}>
                <Flex align="center" >
                    <HandshakeRoundedIcon
                        style={{
                            fontSize: "30px",
                            color: "#00D4FF",
                            marginRight: "8px",
                        }}
                    />

                    <Text
                        fontSize="lg"
                        color="#fff"
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                    >
                        AFFILIATION

                        {/* Small Help Icon */}
                        <IconButton
                            position={"absolute"}
                            icon={<HelpOutlineIcon />}
                            size="xs"
                            variant="ghost"
                            ml="6px"
                            minW="unset"
                            right="0"
                            h="20px"
                            color="#00D4FF"
                            _hover={{ bg: "rgba(0,212,255,0.15)" }}
                            onClick={onOpen}
                        />
                    </Text>

                    {user?.partnerLevel > 2 && (
                        <Text fontSize="sm" color="#fff" fontWeight="bold" ml="8px">
                            ( {user?.partnerLevel > 4 ? "Senior Regional Officer" : "Junior Regional Officer"} {user?.partnerLevel}%  )
                        </Text>
                    )}
                </Flex>
            </CardHeader>
            <Grid

                templateColumns='repeat(5, 1fr)'
                mb="24px"
                w={{ base: "100%" }}
            >
                <GridItem
                    colSpan={{ sm: '2' }}
                    w="100%"
                    ms='4px'
                    fontSize='sm'
                    fontWeight='normal'
                    textAlign='center'
                    pt="15px"
                    color='white'>
                    Current Earning :
                </GridItem>
                <GridItem colSpan={{ sm: '3' }}>
                    <Stat me='auto'
                        w="100%"
                        pt="15px"
                        color='white'>
                        <Flex placeContent="center">
                            <Text fontSize="lg" color="#00D4FF"
                                style={{
                                    marginLeft: "0px", marginRight: "5px",

                                }} fontWeight="bold" m="auto">
                                $
                            </Text>
                            <StatNumber fontSize='lg' color='#fff'>
                                {user.userId ? truncateToTwo(user.partnerEarn) : '0'}
                            </StatNumber>
                        </Flex>
                    </Stat>
                </GridItem>
            </Grid>

            <ClickButton
                onClick={handleWithdraw}
                label={loading || user.partnerFlag === 2 || user.partnerFlag === 3 ? "Processing..." : "Convert to Credit"}
                width="100%"
                disabled={loading || user.partnerFlag === 2 || user.partnerFlag === 3 || user.partnerEarn === 0}
            />
            <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
                <ModalOverlay bg="blackAlpha.700" />
                <ModalContent bg="#2a2d2e" border="1px solid rgba(0, 212, 255, 0.3)">
                    <ModalHeader
                        color="white"
                        display="flex"
                        alignItems="center"
                    >
                        <HandshakeRoundedIcon
                            style={{
                                fontSize: "26px",
                                color: "#00D4FF",
                                marginRight: "8px"
                            }}
                        />
                        Affiliate Program
                    </ModalHeader>

                    <ModalCloseButton color="#fff" _hover={{ color: '#00D4FF' }} />

                    <ModalBody py={4}>
                        <VStack align="start" spacing={4} color="gray.200" fontSize="sm">

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    💰 How Earnings Work
                                </Text>
                                <Text>
                                    Our affiliation program lets you earn 1–5% of your referrals’ deposits just by inviting them to the platform. There’s no cost, no extra work, and no impact on their experience.Simply share your referral link, and when someone signs up and deposits, you earn rewards automatically. The more you refer, the more you earn.Invite. Earn. Grow together..
                                </Text>
                            </Box>

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    🔄 Convert to Credit
                                </Text>
                                <Text>
                                    When you click <strong>Convert to Credit</strong>, your affiliate earnings
                                    will be transferred into your main wallet balance.
                                </Text>
                            </Box>

                            <Box>
                                <Text fontWeight="bold" color="#00D4FF" mb={2}>
                                    🏆 Partner Levels
                                </Text>
                                <UnorderedList pl={5}>
                                    <ListItem>Level increases based on referral performance.</ListItem>
                                    <ListItem>Higher levels may unlock better earning benefits.</ListItem>
                                    <ListItem>Regional Officers have extended privileges.</ListItem>
                                </UnorderedList>
                            </Box>

                            {/* <Text fontSize="xs" color="gray.400">
                                ⚠️ Earnings must be greater than $0 to convert.
                            </Text> */}

                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Card>
    );
}
