import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useHistory, NavLink, useLocation } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Heading,
    FormControl,
    Checkbox,
    Link,
    Image,
    keyframes,
} from "@chakra-ui/react";

import AuthInput from "components/Input/AuthInput";
import ClickButton from "components/Input/ClickButton";
import LabelSwitch from "components/Input/LabelSwitch";
import { register } from "action/AuthActions";

import logo from "assets/img/logo_Landing.png";

/* 🔥 Animated gradient */
const gradientAnimation = keyframes`
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
`;

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function SignUp({ setIsAuth }) {
    const dispatch = useDispatch();
    const history = useHistory();
    const query = useQuery();
    const partner = query.get("affiliate");

    /* ===============================
       IP & Country Detection (FIXED)
    =============================== */

    const [countryCode, setCountryCode] = useState("");



    useEffect(() => {
        const fetchCountry = async () => {
            try {
                const response = await fetch("https://ipapi.co/json/");
    
                if (!response.ok) {
                    throw new Error("Country fetch failed");
                }
    
                const data = await response.json();
    
                if (data?.country_code) {
                    setCountryCode(data.country_code);
                }
    
            } catch (error) {
                console.warn("Failed to resolve country from IP", error);
            }
        };
    
        fetchCountry();
    }, []);

    /* ===============================
       Form State
    =============================== */

    const [data, setData] = useState({
        userAuthId: "",
        altas: "",
        password: "",
        c_password: "",
        email: "",
        partner,
    });

    const [showEmail, setShowEmail] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState({});

    const isAgreementError = !agreed && errors.agreed;

    const onChange = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onClick();
            }
        };

        window.addEventListener("keydown", handleEnter);
        return () => window.removeEventListener("keydown", handleEnter);
    }, [data, agreed, showEmail, countryCode]);

    /* ===============================
       Validation
    =============================== */

    const validate = () => {
        let temp = {};

        if (!data.userAuthId)
            temp.userAuthId = "ID is required";
        else if (data.userAuthId.length < 3)
            temp.userAuthId = "ID must be at least 3 characters";
        else if (data.userAuthId.includes(" "))
            temp.userAuthId = "ID must not contain spaces";

        if (!data.altas)
            temp.altas = "Altas name is required";
        else if (data.altas.length < 3)
            temp.altas = "Altas name must be at least 3 characters";

        if (!data.password)
            temp.password = "Password is required";
        else if (data.password.length < 6)
            temp.password = "Minimum 6 characters";

        if (data.password !== data.c_password)
            temp.c_password = "Passwords do not match";

        if (showEmail) {
            if (!data.email)
                temp.email = "Email is required";
            else if (!/\S+@\S+\.\S+/.test(data.email))
                temp.email = "Invalid email";
        }

        if (!agreed)
            temp.agreed = "You must agree first";

        setErrors(temp);
        return Object.keys(temp).length === 0;
    };

    /* ===============================
       Submit
    =============================== */

    const onClick = async () => {
        if (!validate()) return;

        const payload = {
            userAuthId: data.userAuthId,
            altas: data.altas,
            password: data.password,
            partnerId: data.partner,
            countryCode: countryCode, // ✅ Correct country
        };

        if (showEmail && data.email) {
            payload.email = data.email;
        }

        register(payload, history, dispatch, setIsAuth);
    };

    return (
        <Flex
            minH="100vh"
            py="20px"
            w="100%"
            align="center"
            justify="center"
            // bg="linear-gradient(135deg, #050B10 0%, #0A141D 40%, #060B11 100%)"
            bg="#323738"
            position="relative"
            overflow="hidden"
        >

            <Box w="100%" maxW="480px" px="24px">
                {/* Gradient Border */}
                <Box
                    p="2px"
                    borderRadius="26px"
                    // bgGradient="linear-gradient(120deg, #00d4ff, #7a5cff, #00ffd5)"
                    bgSize="300% 300%"
                    animation={`${gradientAnimation} 6s ease infinite`}
                >
                    {/* Glass Card */}
                    <Box
                        bg="#2a2d2e"
                        backdropFilter="blur(22px)"
                        borderRadius="24px"
                        p="36px"
                        boxShadow="0 30px 90px rgba(0,0,0,0.65)"
                    >
                        {/* Logo */}
                        <Flex direction="column" align="center" mb="26px">
                            <Image src={logo} alt="NumBanco Logo" h="42px" mb="10px" />
                        </Flex>

                        <Heading fontSize="28px" color="white" mb="6px" textAlign="center">
                            Create Account
                        </Heading>

                        <Text
                            color="gray.400"
                            fontSize="14px"
                            textAlign="center"
                            mb="30px"
                        >
                            Join NumBanco and start winning today
                        </Text>

                        <FormControl>
                            <AuthInput
                                name="userAuthId"
                                label="User ID"
                                placeholder="Your ID"
                                value={data.userAuthId}
                                onChange={onChange}
                                error={errors.userAuthId}
                            />

                            <AuthInput
                                name="altas"
                                label="Altas Name"
                                placeholder="Your altas name"
                                value={data.altas}
                                onChange={onChange}
                                error={errors.altas}
                            />

                            <AuthInput
                                name="password"
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={data.password}
                                onChange={onChange}
                                error={errors.password}
                            />

                            <AuthInput
                                name="c_password"
                                label="Confirm Password"
                                type="password"
                                placeholder="••••••••"
                                value={data.c_password}
                                onChange={onChange}
                                error={errors.c_password}
                            />

                            <LabelSwitch
                                label="Add Email (optional)"
                                status={showEmail}
                                onChange={(e) => setShowEmail(e.target.checked)}
                            />

                            {showEmail && (
                                <>
                                    <AuthInput
                                        name="email"
                                        label="Email"
                                        type="email"
                                        placeholder="you@email.com"
                                        value={data.email}
                                        onChange={onChange}
                                        error={errors.email}
                                    />
                                    <Text fontSize="12px" color="gray.500" mt="-12px" mb="16px">
                                        *You can build strong account security with your email.
                                    </Text>
                                    <Text fontSize="12px" color="gray.500" mt="-12px" mb="16px">
                                        *You can reset your password if you forgot with your email.
                                    </Text>
                                </>
                            )}  

                            <Checkbox
                                mt="16px"
                                isChecked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                colorScheme="cyan"
                            >
                                <Text fontSize="13px" color="gray.300">
                                    I agree to the{" "}
                                    <Link
                                        as={NavLink}
                                        target="_blank"
                                        to="/auth/user-agreement"
                                        color={isAgreementError ? "red.400" : "cyan.300"}
                                        textDecoration="underline"
                                        _hover={{ textDecoration: "underline", opacity: 0.8 }}
                                    >
                                        User Agreement
                                    </Link>{" "}
                                    and{" "}
                                    <Link
                                        as={NavLink}
                                        target="_blank"
                                        to="/auth/privacy-policy"
                                        color={isAgreementError ? "red.400" : "cyan.300"}
                                        textDecoration="underline"
                                        _hover={{ textDecoration: "underline", opacity: 0.8 }}
                                    >
                                        Privacy Policy
                                    </Link>
                                </Text>
                            </Checkbox>

                            <ClickButton
                                label="SIGN UP"
                                mt="28px"
                                onClick={onClick}
                            />
                        </FormControl>

                        <Text mt="22px" fontSize="14px" color="gray.400" textAlign="center">
                            Already have an account?
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
            </Box>
        </Flex>
    );
}

export default SignUp;
