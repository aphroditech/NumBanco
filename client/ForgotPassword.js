import React, { useState } from "react";
import { useHistory, NavLink } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Heading,
    FormControl,
    Image,
} from "@chakra-ui/react";

import AuthInput from "components/Input/AuthInput";
import ClickButton from "components/Input/ClickButton";

import { forgotPassword } from "action/AuthActions";

import logo from "assets/img/logo_Landing.png";

function ForgotPassword() {
    const history = useHistory();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    const validate = () => {
        if (!email) {
            setError("Email is required");
            return false;
        }
        setError("");
        return true;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        // 🔥 Replace with your backend API call

        forgotPassword(email, history);
    };

    return (
        <Flex
            minH="100vh"
            w="100%"
            align="center"
            justify="center"
            bg="#323738"
        >
            <Box w="100%" maxW="480px" px="24px">
                {/* Card */}
                <Box
                    bg="#2a2d2e"
                    borderRadius="24px"
                    p="36px"
                    boxShadow="0 30px 90px rgba(0,0,0,0.65)"
                    textAlign="center"
                >
                    {/* Logo */}
                    <Flex direction="column" align="center" mb="28px">
                        <Image
                            src={logo}
                            alt="NumBanco Logo"
                            h="42px"
                            mb="10px"
                        />
                    </Flex>

                    <Heading
                        fontSize="28px"
                        color="white"
                        mb="6px"
                    >
                        Forgot Password?
                    </Heading>

                    <Text
                        color="gray.400"
                        fontSize="14px"
                        mb="30px"
                    >
                        Enter your registered email and we’ll send you a reset link.
                    </Text>

                    <FormControl>
                        <AuthInput
                            name="email"
                            label="*Email Address"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={error}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        />
                    </FormControl>


                    <ClickButton
                        label="SEND"
                        onClick={handleSubmit}
                        mt="28px"
                        disabled={!email}
                    />

                    <Text
                        mt="24px"
                        fontSize="14px"
                        color="gray.400"
                    >
                        Remember your password?
                        <Text
                            as={NavLink}
                            to="/auth/signin"
                            ms="6px"
                            color="cyan.300"
                            fontWeight="600"
                            _hover={{ textDecoration: "underline" }}
                        >
                            Sign in
                        </Text>
                    </Text>
                </Box>
            </Box>
        </Flex>
    );
}

export default ForgotPassword;