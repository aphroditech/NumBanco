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
    const [isLoading, setIsLoading] = useState(false);

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

    const onClick = async () => {
        if (!validate()) return;

        setIsLoading(true);
        if (rememberMe) {
            localStorage.setItem("rememberMe", JSON.stringify(data));
        } else {
            localStorage.removeItem("rememberMe");
        }

        const res = await login(data, history, dispatch, setIsAuth);
        if (res === "Success") {
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    };

    return (
        <Flex
            minH="100vh"
            w="100%"
            align="center"
            justify="center"
            bg="#323738"
            position="relative"
            overflow="hidden"
        >

            <Box w="100%" maxW="480px" textAlign="center" px="24px">
                {/* 🔥 Animated Gradient Border Wrapper */}
                <Box
                    p="2px"
                    borderRadius="26px"
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
                            isLoading={isLoading}
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
