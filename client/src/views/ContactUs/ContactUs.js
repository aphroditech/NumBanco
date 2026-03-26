import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Divider,
} from "@chakra-ui/react";
import TelegramIcon from "@mui/icons-material/Telegram";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CallIcon from "@mui/icons-material/Call";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import { useHistory, NavLink, useLocation } from "react-router-dom";


import backgroundImage from "assets/img/ContactUs/6.jpg"
import Loading from 'components/Loading/Loading';

// Site accent: #00D4FF (cyan)
const ACCENT = "#00D4FF";
const CARD_BG = "#2a2d2e";
const BODY_BG = "#323738";

// Icon wrapper - square bordered box (Chakra-style)
const IconBoxSquare = ({ children }) => (
  <Box
    w="40px"
    h="40px"
    minW="40px"
    borderRadius="4px"
    border="2px solid"
    borderColor={ACCENT}
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
  >
    {children}
  </Box>
);

// Icon wrapper - circular bordered box (Chakra-style)
const IconBoxCircle = ({ children }) => (
  <Box
    w="40px"
    h="40px"
    minW="40px"
    borderRadius="full"
    border="2px solid"
    borderColor={ACCENT}
    display="flex"
    alignItems="center"
    justifyContent="center"
    flexShrink={0}
  >
    {children}
  </Box>
);

// MUI icon style prop for accent color & size
const iconStyle = { fontSize: 22, color: ACCENT };

const LocationIcon = () => (
  <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="40px" h="40px">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill={ACCENT}
      />
    </svg>
  </Box>
);

const GlobeIcon = () => (
  <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center" w="40px" h="40px">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill={ACCENT}
      />
    </svg>
  </Box>
);

const contactItems = [
  {
    icon: (
      <IconBoxSquare>
        <MailRoundedIcon style={iconStyle} />
      </IconBoxSquare>
    ),
    title: "Email",
    text: "support@numexa.store",
  },
  {
    icon: (
      <IconBoxCircle>
        <CallIcon style={iconStyle} />
      </IconBoxCircle>
    ),
    title: "Phone Number",
    text: "+1 505 309 0771",
  },
  {
    icon: (
      <IconBoxCircle>
        <WhatsAppIcon style={iconStyle} />
      </IconBoxCircle>
    ),
    title: "WhatsApp",
    text: "+1 458 343 2384",
  },
  {
    icon: (
      <IconBoxCircle>
        <TelegramIcon style={iconStyle} />
      </IconBoxCircle>
    ),
    title: "Telegram",
    text: "@numexa_support",
  },
  {
    icon: (
      <IconBoxCircle>
        <LocationIcon style={iconStyle} />
      </IconBoxCircle>
    ),
    title: "Location",
    text: "United States",
  },
];

export default function ContactUs() {

  const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, loadingTime);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <Loading />;
    }
  return (
    <Flex
      w="90%"
      // mt="80px"
      pt="60px"
      borderRadius="30px"
      minH="calc(100vh - 220px)"
      overflow="hidden"
      position="relative"
      flexDirection={{ base: "column", lg: "row" }}
      bgImage={`url(${backgroundImage})`}
      bgSize="cover"
      bgPosition="center"
      bgRepeat="no-repeat"
      margin=" 80px auto 0"
    >
      {/* Global overlay for readability */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgGradient="linear(to-br, rgba(50,55,56,0.78) 0%, rgba(42,45,46,0.86) 55%, rgba(30,61,66,0.9) 100%)"
        zIndex={0}
      />

      {/* Left section */}
      <Box
        flex={{ base: "none", lg: "0 0 66.666%" }}
        w={{ base: "100%", lg: "66.666%" }}
        minH={{ base: "320px", lg: "auto" }}
        position="relative"
        overflow="hidden"
        zIndex={1}
      >
        {/* Decorative circles / arcs - cyan tint */}
        <Box
          position="absolute"
          bottom="-60px"
          left="-40px"
          w="280px"
          h="280px"
          borderRadius="full"
          bg="rgba(0, 212, 255, 0.12)"
        />
        <Box
          position="absolute"
          top="20%"
          left="15%"
          w="180px"
          h="180px"
          borderRadius="full"
          bg="rgba(0, 212, 255, 0.08)"
        />
        <Box
          position="absolute"
          bottom="10%"
          right="20%"
          w="120px"
          h="120px"
          borderRadius="full"
          bg="rgba(0, 212, 255, 0.1)"
        />

        {/* Content */}
        <Box position="relative" zIndex={1} p={{ base: "40px 24px", md: "60px 48px", lg: "80px 64px" }}>
          <Text
            as="h1"
            fontSize={{ base: "2.5rem", md: "3.5rem", lg: "4rem" }}
            fontWeight="bold"
            color="white"
            letterSpacing="-0.02em"
            lineHeight="1.1"
          >
            Contact Us
          </Text>
          <Text
            mt={2}
            fontSize={{ base: "1.1rem", md: "1.35rem" }}
            fontWeight="normal"
            color={ACCENT}
          >
            Get In Touch
          </Text>
          <HStack spacing="6px" mt={4}>
            <Box w="6px" h="6px" borderRadius="full" bg={ACCENT} opacity={0.9} />
            <Box w="6px" h="6px" borderRadius="full" bg={ACCENT} opacity={0.9} />
            <Box w="6px" h="6px" borderRadius="full" bg={ACCENT} opacity={0.9} />
          </HStack>
          <VStack align="start" spacing={1} mt={4}>
            <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.900">
            We'd love to hear from you!
            </Text>
            <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
            Whether you have questions, feedback, or need support, we’re here to help.
            </Text>
            <Text fontSize={{ base: "sm", md: "md" }} color="whiteAlpha.800">
            Before reaching out, check our <Text as={NavLink} to="/help/faq" textDecoration="underline" color={ACCENT} fontWeight="bold">FAQs</Text> or <Text as={NavLink} to="/help/support" textDecoration="underline" color={ACCENT} fontWeight="bold">Support</Text> pages to see if your question has already been answered.
            </Text>
          </VStack>
        </Box>

        {/* Bottom-left small decorative icon - site colors */}
        <Box
          position="absolute"
          bottom="24px"
          left="24px"
          w="48px"
          h="48px"
          zIndex={1}
          opacity={0.85}
        >
        </Box>
      </Box>

      {/* Right section */}
      <Box
        flex={{ base: "none", lg: "1" }}
        w={{ base: "100%", lg: "33.334%" }}
        minH={{ base: "auto", lg: "100%" }}
        position="relative"
        overflow="hidden"
        zIndex={1}
      >
        {/* Bottom-right decorative arc - cyan tint */}
        <Box
          position="absolute"
          bottom="-80px"
          right="-80px"
          w="220px"
          h="220px"
          borderRadius="full"
          border="80px solid rgba(0, 212, 255, 0.12)"
        />

        <VStack
          align="stretch"
          spacing={0}
          p={{ base: "32px 24px", md: "48px 40px", lg: "64px 48px" }}
          position="relative"
          zIndex={1}
        >
          {contactItems.map((item, index) => (
            <Box key={item.title}>
              <Flex align="flex-start" gap="16px" py={5}>
                {item.icon}
                <Box flex={1} minW={0}>
                  <Text fontSize="md" fontWeight="600" color="white" mb={1}>
                    {item.title}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    {item.text}
                  </Text>
                </Box>
              </Flex>
              {index < contactItems.length - 1 && (
                <Divider borderColor="gray.600" />
              )}
            </Box>
          ))}
        </VStack>
      </Box>
    </Flex>
  );
}
