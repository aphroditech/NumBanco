import React from "react";
import { useState } from "react";
import { useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";

import { 
    Text,
    Flex,
} from "@chakra-ui/react";


import LineInput from 'components/Input/LineInput';
import ClickButton from 'components/Input/ClickButton';

import { profilePassword } from "action/ProfileActions";


function Password() {
    const textColor = "gray.400";
    
    const dispatch = useDispatch();
    const history = useHistory();

  	const [errorsPassword, setErrors] = useState({});

	const [password, setPassword] = useState({
		c_password: "",
		n_password: "",
		r_password: "",
	});

	const onChangePassword = (e) => {
		const { name, value } = e.target;
		setPassword((prev) => ({ ...prev, [name]: value }));
	};

	const validate = () => {
		let tempErrors = {};
	
		if (!password.c_password) tempErrors.c_password = "Current password is required";
		if (!password.n_password) tempErrors.n_password = "New password is required";
		if (!password.r_password) tempErrors.r_password = "Confirm password is required";
		if (password.n_password && password.n_password.length < 6)
		tempErrors.n_password = "Password must be at least 6 characters";
		if (password.n_password !== password.r_password)
		tempErrors.r_password = "Passwords do not match";
	
		setErrors(tempErrors);
	
		return Object.keys(tempErrors).length === 0;
	};


	function onClick () {
		if (validate()) {
			const payload = {
				c_password: password.c_password,
				n_password: password.n_password,
			};
			profilePassword(payload, history, dispatch);
		}
	}


    return (
        <Flex
            alignItems='center'
            justifyContent='start'
            style={{ userSelect: "none" }}
            mx={{ base: "auto", lg: "auto" }}
            ms={{ base: "auto", lg: "auto" }}
            w={{ base: "100%", md: "650px" }}
            px='50px'>
            <Flex
                direction='column'
                w='100%'
                background='transparent'
                mt={8}
                mb={{ base: "60px", lg: "95px" }}>
                <Text
                    fontSize='xl'
                    color={textColor}
                    fontWeight='bold'
                    textAlign='center'
                    mb='22px'>
                    Password
                </Text>
                <LineInput 
                name="c_password"
                label="Current Password"
                type="password"
                value={ password.c_password }
                onChange={onChangePassword}
                error={ errorsPassword.c_password }
                placeholder="Your current password"
                onKeyDown={(event) => {
                event.key === 'Enter' && onClick();
                }}/>
                <LineInput 
                name="n_password"
                label="New Password"
                type="password"
                value={ password.n_password }
                onChange={onChangePassword}
                error={ errorsPassword.n_password }
                placeholder="Your new password"
                onKeyDown={(event) => {
                event.key === 'Enter' && onClick();
                }}/>
                <LineInput 
                name="r_password"
                label="Confirm Password"
                type="password"
                value={ password.r_password }
                onChange={onChangePassword}
                error={ errorsPassword.r_password }
                placeholder="Confirm password"
                onKeyDown={(event) => {
                event.key === 'Enter' && onClick();
                }}/>
                <ClickButton 
                onClick={onClick}
                width="100%"
                label="SAVE"/>
            </Flex>
        </Flex>
    );
}

export default Password;