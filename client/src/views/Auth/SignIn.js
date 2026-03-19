import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory, NavLink } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Heading,
    FormControl,
    keyframes,
    Image,
} from "@chakra-ui/react";

import AuthInput from "components/Input/AuthInput";
import ClickButton from "components/Input/ClickButton";
import LabelSwitch from "components/Input/LabelSwitch";
import { login } from "action/AuthActions";

import logo from "assets/img/logo_Landing.png"; // <-- your logo here

/* 🔥 Animated Gradient Border */
const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

function SignIn({ setIsAuth }) {
    const dispatch = useDispatch();
    const history = useHistory();

    const remembered = JSON.parse(localStorage.getItem("rememberMe"));

    const [data, setData] = useState({
        userAuthId: remembered?.userAuthId || "",
        password: remembered?.password || "",
    });

    const [rememberMe, setRememberMe] = useState(!!remembered);
    const [errors, setErrors] = useState({});

    const onChange = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        let temp = {};
        if (!data.userAuthId) temp.userAuthId = "ID is required";
        if (!data.password) temp.password = "Password is required";
        setErrors(temp);
        return Object.keys(temp).length === 0;
    };

    const onClick = () => {
        if (!validate()) return;

        if (rememberMe) {
            localStorage.setItem("rememberMe", JSON.stringify(data));
        } else {
            localStorage.removeItem("rememberMe");
        }

        login(data, history, dispatch, setIsAuth);
    };

    return (
        <Flex
            minH="100vh"
            w="100%"
            align="center"
            justify="center"
            // bg="linear-gradient(135deg, #050B10 0%, #0A141D 40%, #060B11 100%)"
            bg="#323738"
            position="relative"
            overflow="hidden"
        >
            {/* Ambient glow */}
            {/* <Box
            position="absolute"
            w="700px"
            h="700px"
            bg="cyan.400"
            opacity="0.08"
            filter="blur(180px)"
            top="-250px"
            right="-250px"
        /> */}

            <Box w="100%" maxW="480px" textAlign="center" px="24px">
                {/* 🔥 Animated Gradient Border Wrapper */}
                <Box
                    p="2px"
                    borderRadius="26px"
                    // bgGradient="linear-gradient(
                    //     120deg,
                    // #00d4ff,
                    // #7a5cff,
                    // #00ffd5
                    // )"
                    bgSize="300% 300%"
                    animation={`${gradientAnimation} 6s ease infinite`}
                >
                    {/* Glass Card */}
                    <Box
                        bg="#2a2d2e"
                        backdropFilter="blur(22px)"
                        borderRadius="24px"
                        p="36px"
                        textAlign="center"
                        boxShadow="0 30px 90px rgba(0,0,0,0.65)"
                    >
                        {/* 🔹 Logo + Tagline */}
                        <Flex
                            direction="column"
                            align="center"
                            mb="28px"
                        >
                            <Image
                                src={logo}
                                alt="NumBanco Logo"
                                h="42px"
                                mb="10px"
                            />

                            {/* <Text
                            fontSize="13px"
                            letterSpacing="3px"
                            color="cyan.300"
                            fontWeight="600"
                        >
                            BET · WIN · EARN
                        </Text> */}
                        </Flex>

                        <Heading
                            fontSize="28px"
                            color="white"
                            textAlign="center"
                            mb="6px"
                        >
                            Welcome Back!
                        </Heading>

                        <Text
                            color="gray.400"
                            fontSize="14px"
                            textAlign="center"
                            mb="30px"
                        >
                            Sign in to continue to NumBanco!
                        </Text>

                        <FormControl textAlign="center">
                            <AuthInput
                                name="userAuthId"
                                label="User ID"
                                placeholder="Enter your ID"
                                value={data.userAuthId}
                                onChange={onChange}
                                error={errors.userAuthId}
                                onKeyDown={(e) => e.key === "Enter" && onClick()}
                                width="100%"
                            />

                            <AuthInput
                                name="password"
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={data.password}
                                onChange={onChange}
                                error={errors.password}
                                onKeyDown={(e) => e.key === "Enter" && onClick()}
                            />
                        </FormControl>

                        <Flex
                            justify="space-between"
                            align="center"
                            mt="10px"
                            w="100%"
                        >
                            <LabelSwitch
                                label="Remember me"
                                status={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <Text
                                as={NavLink}
                                to="/auth/forgot-password"
                                color="cyan.300"
                                fontWeight="600"
                                fontSize="14px"
                                cursor="pointer"
                                whiteSpace="nowrap"   // 🔥 prevents line break
                                _hover={{ textDecoration: "underline" }}
                            >
                                Forgot Password?
                            </Text>
                        </Flex>
                        <Flex justify="space-between" align="center" mt="10px">
                        </Flex>

                        <ClickButton
                            label="SIGN IN"
                            onClick={onClick}
                            mt="28px"
                        />

                        <Text
                            mt="24px"
                            fontSize="14px"
                            color="gray.400"
                            textAlign="center"
                        >
                            Don’t have an account?
                            <Text
                                as={NavLink}
                                to="/auth/signup"
                                ms="6px"
                                color="cyan.300"
                                fontWeight="600"
                                _hover={{ textDecoration: "underline" }}
                            >
                                Sign up
                            </Text>
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Flex>
    );
}

export default SignIn;
