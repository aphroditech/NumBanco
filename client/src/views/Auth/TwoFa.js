import { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Box,
  Input,
  Text,
  VStack,
  Heading,
  Flex,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { Image } from "@chakra-ui/react";
import { verify2fa, resendEmail } from "action/AuthActions";
import ClickButton from "components/Input/ClickButton";
import logo from "assets/img/logo_Landing.png";

export default function TwoFactor({ setIsAuth }) {
    const history = useHistory();
    const dispatch = useDispatch();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!sessionStorage.getItem("2faUser")) {
            history.replace("/auth/landing");
        }
    }, [history]);

    const isValidCode = code.length === 6 && /^\d+$/.test(code);

    const handleVerify = () => {
        if (!isValidCode || loading) return;
        setLoading(true);
        verify2fa(code, history, dispatch, setIsAuth).finally(() => setLoading(false));
    };

    function sendEmailAgain() {
        const userAuthId = sessionStorage.getItem("2faUser");
        if (!userAuthId) return;
        setLoading(true);
        resendEmail(userAuthId).finally(() => setLoading(false));
    }

    return (
        <Flex
        minH="100vh"
        align="center"
        justify="center"
        bg="#323738"
        px={4}
        >
            <Box
                w="100%"
                maxW="420px"
                bg="#2a2d2e"
                backdropFilter="blur(22px)"
                borderRadius="24px"
                p="36px"
                boxShadow="0 30px 90px rgba(0,0,0,0.65)"
            >
                <VStack spacing={6} align="stretch">
                    {/* Logo */}
                    <Flex direction="column" align="center" mb="8px">
                        <Image src={logo} alt="NumBanco Logo" h="42px" mb="10px" />
                    </Flex>

                    {/* Title */}
                    <Heading fontSize="28px" color="white" textAlign="center">
                        Two-Factor Authentication
                    </Heading>

                    {/* Subtitle */}
                    <Text fontSize="14px" color="gray.400" textAlign="center">
                        Enter the 6-digit verification code sent to your email
                    </Text>

                    {/* Code Input */}
                    <FormControl>
                        <FormLabel color="#fff" fontSize="sm" fontWeight="normal" ms="4px">
                            Verification Code
                        </FormLabel>
                        <Input
                            placeholder="••••••"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            textAlign="center"
                            fontSize="xl"
                            letterSpacing="0.4em"
                            bg="#323738"
                            border="1px solid"
                            borderColor="rgba(255,255,255,0.12)"
                            borderRadius="20px"
                            color="white"
                            h="50px"
                            _placeholder={{ color: "gray.500" }}
                            _focus={{
                                borderColor: "rgba(0, 212, 255, 0.5)",
                                boxShadow: "0 0 0 1px rgba(0, 212, 255, 0.25)",
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        />
                    </FormControl>

                    {/* Verify Button */}
                    <ClickButton
                        label={loading ? "VERIFYING…" : "VERIFY CODE"}
                        onClick={handleVerify}
                        disabled={!isValidCode || loading}
                        mt="28px"
                    />

                    {/* Helper */}
                    <Text fontSize="xs" color="#fff" textAlign="center">
                        Didn't receive a code?
                        <Text as="span" color="#00d4ff" textDecoration="underline" fontWeight="bold" ms="2px" cursor="pointer" onClick={sendEmailAgain}>
                            Resend
                        </Text>
                    </Text>
                </VStack>
            </Box>
        </Flex>
    );
}
