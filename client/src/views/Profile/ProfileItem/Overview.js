import React, { useEffect, useRef, useState } from "react";
import { keyframes } from "@emotion/react";
import { useSelector } from "react-redux";
import {
  Avatar,
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  Tooltip,
  VStack,
  HStack,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

import Card from "components/Card/Card";
import ClickButton from "components/Input/ClickButton";
import { Separator } from "components/Separator/Separator";
import truncateToTwo from "variables/truncateToTwo";
import { FiCalendar, FiDollarSign, FiUser, FiTrendingUp, FiUsers } from "react-icons/fi";
// Images
import year1 from "assets/badge/period1.png";
import year2 from "assets/badge/period2.png";
import year3 from "assets/badge/period3.png";
import year4 from "assets/badge/period4.png";
import year5 from "assets/badge/period5.png";
import plusbadge from "assets/badge/plus.png";
import probadge from "assets/badge/pro.png";
import normal_partner from "assets/badge/normal-partner.png";
import regional_partner from "assets/badge/regional-partner.png";
import deposit_badge from "assets/badge/deposit.png";
import withdraw_badge from "assets/badge/withdraw.png";
import freemembership from "assets/badge/free_badge_complete.png";
import plusmembership from "assets/badge/plus_medal.png";
import promembership from "assets/badge/pro_medal.png";
import promedal from "assets/badge/pro_border_ring.png";
import plusmedal from "assets/badge/plus_border_ring.png";
const pfp1 = "./avatars/pfp1.png";
const altasMarquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;
function Overview() {
  const user = useSelector((state) => state.user?.userInfo);
  const [isAltasOverflow, setIsAltasOverflow] = useState(false);
  const altasContainerRef = useRef(null);
  const altasTextRef = useRef(null);

  const calculateYears = (start, end) => {
    if (!start) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let years = e.getFullYear() - s.getFullYear();
    if (
      e.getMonth() < s.getMonth() ||
      (e.getMonth() === s.getMonth() && e.getDate() < s.getDate())
    ) {
      years--;
    }
    return Math.max(0, years);
  };

  const period = calculateYears(user?.createdAt, Date.now());

  const renderBadge = (src, title, desc) => (
    <Tooltip
      placement="bottom"
      bg="#2f3131"
      label={
        <VStack align="start" spacing={1}>
          <Text fontWeight="bold" fontSize="sm">{title}</Text>
          <Text fontSize="xs" color="gray.300">{desc}</Text>
        </VStack>
      }
    >
      <Avatar src={src} loading="eager" w="26px" h="26px" bg="transparent" />
    </Tooltip>
  );

  const periodBadges = [
    { min: 0, max: 1, src: year1, title: "1 Year" },
    { min: 2, max: 2, src: year2, title: "2 Year" },
    { min: 3, max: 3, src: year3, title: "3 Year" },
    { min: 4, max: 4, src: year4, title: "4 Year" },
    { min: 5, max: Infinity, src: year5, title: "5+ Year" },
  ];

  const membershipBadges = {
    1: {
      src: plusbadge,
      title: "Plus Membership",
      desc:
        "Withdraw up to $10,000/day, 50 tickets per bet, 5 advance draws.",
    },
    2: {
      src: probadge,
      title: "Pro Membership",
      desc:
        "Unlimited withdrawals, no fee, 100 tickets per bet, 20 advance draws.",
    },
  };

  const membershipImages = {
    0: freemembership,
    1: plusmembership,
    2: promembership,
  };

  useEffect(() => {
    if (!altasContainerRef.current || !altasTextRef.current) return;
    const containerWidth = altasContainerRef.current.clientWidth;
    const textWidth = altasTextRef.current.scrollWidth;
    setIsAltasOverflow(textWidth > containerWidth);
  }, [user?.altas]);

  return (
    <Box display="flex" justifyContent="center">
      <Card w="100%" p="40px" borderRadius="24px" mt="80px">
        <Grid templateColumns={{ md: "1fr 1fr", xl: "1fr 1fr 1fr 1fr" }} gap="20px">
          <Flex justify="center" textAlign="center">
            <Box mr="10">
              <Box
                position="relative"
                display="inline-flex"
                mb="20px"
                w="200px"
                h="200px"
              >
                <Box
                  w="200px"
                  h="200px"
                  backgroundImage={`url(${user?.avatar || pfp1})`}
                  backgroundSize="cover"
                  backgroundRepeat="no-repeat"
                  borderRadius={user.membership === 0 ? "25px" : "40px"}
                />
                <Box
                  position="absolute"
                  top="-45px"
                  left="-42px"
                  w="285px"
                  h="285px"
                  backgroundImage={`url(${user?.membership === 1 ? plusmedal : user?.membership === 2 ? promedal : ''})`}
                  backgroundSize="contain"
                  backgroundRepeat="no-repeat"
                  backgroundPosition="center"
                  zIndex="3"
                />
              </Box>
              <Flex gap="10px" wrap="wrap" justify="center" mt="10px" zIndex={10000000} cursor="pointer">
                {periodBadges
                  .filter(b => period >= b.min && period <= b.max)
                  .map(b =>
                    renderBadge(
                      b.src,
                      b.title,
                      "This badge shows your betting period."
                    )
                  )
                  .map((badge, index) => (
                    <React.Fragment key={`period-badge-${index}`}>
                      {badge}
                    </React.Fragment>
                  ))}

                {membershipBadges[user?.membership] &&
                  renderBadge(
                    membershipBadges[user?.membership].src,
                    membershipBadges[user?.membership].title,
                    membershipBadges[user?.membership].desc
                  )}

                {user?.partnerLevel === 1 &&
                  renderBadge(
                    normal_partner,
                    "Normal Affiliation",
                    "Earn 1% from referred users deposits."
                  )}

                {user?.partnerLevel > 1 &&
                  renderBadge(
                    regional_partner,
                    "Regional Officer",
                    "Earn 2–5% from referred users deposits."
                  )}

                {user?.deposit?.length > 0 &&
                  renderBadge(
                    deposit_badge,
                    "Deposit",
                    "You have deposited funds."
                  )}

                {user?.withdraw?.length > 0 &&
                  renderBadge(
                    withdraw_badge,
                    "Withdraw",
                    "You have withdrawn funds."
                  )}
              </Flex>
            </Box>
            <Box minW="200px">
              <Box
                ref={altasContainerRef}
                maxW="260px"
                mx="auto"
                overflow="hidden"
                whiteSpace="nowrap"
                display="flex"
                justifyContent={isAltasOverflow ? "flex-start" : "center"}
              >
                <Box
                  display="inline-flex"
                  alignItems="center"
                  animation={
                    isAltasOverflow
                      ? `${altasMarquee} 10s linear infinite`
                      : "none"
                  }
                >
                  <Text
                    ref={altasTextRef}
                    fontSize="4xl"
                    marginRight="10px"
                    fontWeight="extrabold"
                    bgGradient="linear(to-r, #00c6ff, #0072ff, #00f2fe)"
                    bgClip="text"
                    display="inline-block"
                  >
                    {user?.altas || "This is profile page"}
                  </Text>
                  {isAltasOverflow && (
                    <Text
                      aria-hidden="true"
                      fontSize="4xl"
                      fontWeight="extrabold"
                      bgGradient="linear(to-r, #00c6ff, #0072ff, #00f2fe)"
                      bgClip="text"
                      display="inline-block"
                    >
                      {user?.altas || "This is profile page"}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box h="80px" display="flex" alignItems="center" justifyContent="center">
                {user.membership !== 0 ? (
                  <Box
                    backgroundImage={`url(${membershipImages[user?.membership]})`}
                    backgroundSize="contain"
                    backgroundRepeat="no-repeat"
                    backgroundPosition="center"
                    maxH="160px"
                    h={user?.membership === 0 ? "120px" : "160px"}
                    w="100%"
                    mt="60px"
                  />

                ): (
                  <Text
                    fontSize='xl'
                    color="gray.400"

                    fontWeight='bold'
                    textAlign='center'
                    mt='42px'
                  >
                    😞No Medal
                </Text>
                )}
              </Box>
            </Box>
          </Flex>
          <Box
            bg="rgba(255,255,255,0.05)"
            p="25px"
            borderRadius="16px"
            border="1px solid rgba(255,255,255,0.1)"
            backdropFilter="blur(10px)"
            transition="all 0.3s ease"
            _hover={{
              bg: "rgba(255,255,255,0.08)",
              transform: "translateY(-2px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            <VStack align="start" spacing={4}>
              <HStack>
                <Icon as={FiUser} color="#00c6ff" w={5} h={5} />
                <Text fontSize="lg" fontWeight="600" color="white">
                  Personal Info
                </Text>
              </HStack>
              <VStack align="start" spacing={3} w="100%">
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Auth Id</Text>
                  <Text fontSize="sm" color="white" fontWeight="500">{user?.userAuthId}</Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Medal</Text>
                  <Text fontSize="sm" color="white" fontWeight="500">{user?.membership === 0 ? "Free" : user?.membership === 1 ? "Plus" : "Pro"}</Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Email</Text>
                  <Text fontSize="sm" color="white" fontWeight="500">{user?.email ? user?.email.length > 20 ? user?.email.substring(0, 20) + "..." : user?.email : "------"}</Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">2FA</Text>
                  <Badge
                    colorScheme={user?.twofactor ? "green" : "red"}
                    variant="solid"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="6px"
                    maxH="26px"
                  >
                    {user?.twofactor ? "Enabled" : "Disabled"}
                  </Badge>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <HStack>
                    <Icon as={FiCalendar} color="gray.400" w={4} h={4} />
                    <Text fontSize="sm" color="gray.400">Since</Text>
                  </HStack>
                  <Text fontSize="sm" color="white" fontWeight="500">
                    {new Date(user?.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
              </VStack>
            </VStack>
          </Box>
          <Box
            bg="rgba(255,255,255,0.05)"
            p="25px"
            borderRadius="16px"
            border="1px solid rgba(255,255,255,0.1)"
            backdropFilter="blur(10px)"
            transition="all 0.3s ease"
            _hover={{
              bg: "rgba(255,255,255,0.08)",
              transform: "translateY(-2px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            <VStack align="start" spacing={4}>
              <HStack>
                <Icon as={FiTrendingUp} color="#00c6ff" w={5} h={5} />
                <Text fontSize="lg" fontWeight="600" color="white">
                  Account Stats
                </Text>
              </HStack>
              <VStack align="start" spacing={3} w="100%">
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Balance</Text>
                  <Text fontSize="sm" color="#00c6ff" fontWeight="600">
                    ${truncateToTwo(user?.balance)}
                  </Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Total Earning</Text>
                  <Text fontSize="sm" color="#17c653" fontWeight="600">
                    ${truncateToTwo(user?.totalEarn)}
                  </Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Total Bet</Text>
                  <Text fontSize="sm" color="white" fontWeight="500">
                    ${truncateToTwo(user?.totalBet)}
                  </Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Invited Users</Text>
                  <HStack>
                    <Icon as={FiUsers} color="#00c6ff" w={4} h={4} />
                    <Text fontSize="sm" color="white" fontWeight="500">
                      {user?.inviteUserCnt || 0}
                    </Text>
                  </HStack>
                </Flex>
              </VStack>
            </VStack>
          </Box>
          <Box
            bg="rgba(255,255,255,0.05)"
            p="25px"
            borderRadius="16px"
            border="1px solid rgba(255,255,255,0.1)"
            backdropFilter="blur(10px)"
            transition="all 0.3s ease"
            _hover={{
              bg: "rgba(255,255,255,0.08)",
              transform: "translateY(-2px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}
          >
            <VStack align="start" spacing={4}>
              <HStack>
                <Icon as={FiDollarSign} color="#00c6ff" w={5} h={5} />
                <Text fontSize="lg" fontWeight="600" color="white">
                  Transactions
                </Text>
              </HStack>
              <VStack align="start" spacing={3} w="100%">
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Can Withdraw</Text>
                  <Badge
                    colorScheme={user?.canWithdraw ? "green" : "red"}
                    variant="solid"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="6px"
                    maxH="26px"
                  >
                    {user?.canWithdraw ? "Enabled" : "Disabled"}
                  </Badge>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Total Deposit</Text>
                  <Text fontSize="sm" color="#17c653" fontWeight="600">
                    {truncateToTwo(user?.totalDeposit)}$
                  </Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Total Withdraw</Text>
                  <Text fontSize="sm" color="#f8285a" fontWeight="600">
                    {truncateToTwo(user?.totalWithdraw)}$
                  </Text>
                </Flex>
                <Flex justify="space-between" w="100%">
                  <Text fontSize="sm" color="gray.400">Partner Earn</Text>
                  <Text fontSize="sm" color="#FFD700" fontWeight="600">
                    {truncateToTwo(user?.partnerEarn)}$
                  </Text>
                </Flex>
              </VStack>
            </VStack>
          </Box>
        </Grid>
      </Card>
    </Box>
  );
}
export default Overview;
