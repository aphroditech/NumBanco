import React from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";

import {
    Text,
    Flex,
    useDisclosure
} from "@chakra-ui/react";

import Dialog from "components/Dialog/Dialog";
import LineInput from 'components/Input/LineInput';
import ClickButton from 'components/Input/ClickButton';
import LabelSwitch from "components/Input/LabelSwitch";
import { profileInfo } from "action/ProfileActions";
import HelpIcon from '@mui/icons-material/Help';
import { toast } from "react-toastify";

function Info() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const textColor = "gray.400";

    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo);

    const [showEmail, setShowEmail] = user?.email ? useState(true) : useState(false);

    const [errorsInfo, setErrorsInfo] = useState({});

    const [info, setInfo] = useState({
        altas: user?.altas,
        email: user?.email,
    });

    const [dialogPassword, setDialogPassword] = useState("");
    const onDialogPasswordChange = (e) => {
        setDialogPassword(e.target.value);
    };
    const onChange = (e) => {
        const { name, value } = e.target;
        setInfo((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        let tempErrors = {};

        if (!info.altas) tempErrors.altas = "Altas Name is required";
        // if (!dialogPassword) tempErrors.password = "Password is required";

        if (showEmail) {
            if (!info.email) tempErrors.email = "Email is required";
            else if (!/\S+@\S+\.\S+/.test(info.email))
                tempErrors.email = "Email is invalid";
        }

        setErrorsInfo(tempErrors);

        return Object.keys(tempErrors).length === 0;
    };

    const handleSaveClick = () => {
        if (validate()) {
            const hasChanged =
                info.altas !== user.altas ||
                info.email !== user.email;

            if (!hasChanged) {
                toast.warning("No profile changes");
                return;
            }

            onOpen();
        }
    };



    function onConfirm() {
        if (validate()) {
            const payload = {
                altas: info.altas,
                password: dialogPassword,
            };

            if (showEmail && info.email) {
                payload.email = info.email
            } else payload.email = null;

            profileInfo(payload, history, dispatch);
        }
        onClose();
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
                mb={{ base: "30px" }}>
                
                <LineInput
                    length={18}
                    name="altas"
                    label="Altas Name"
                    type="text"
                    placeholder="Your altas name"
                    value={info.altas}
                    onChange={onChange}
                    error={errorsInfo.altas}
                    onKeyDown={(event) => {
                        event.key === 'Enter' && onConfirm();
                    }} />
                <LabelSwitch
                    label="Remember Email"
                    status={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                />
                {(showEmail) && (
                    <LineInput
                        name="email"
                        label="Email"
                        type="email"
                        placeholder="Your email"
                        value={info.email}
                        onChange={onChange}
                        error={errorsInfo.email}
                        onKeyDown={(event) => {
                            event.key === 'Enter' && onConfirm();
                        }}
                    />)}
                <ClickButton
                    label="SAVE"
                    onClick={handleSaveClick}
                    width="100%" />
                <Dialog
                    title={
                        <Flex alignItems="center" gap={2}>
                            <HelpIcon sx={{ fontSize: 22, color: "rgb(0, 212, 255)" }} />
                            <Text as="span">Change profile</Text>
                        </Flex>
                    }
                    content={"Do you want to change your profile?"}
                    yesButton="CHANGE"
                    noButton="CANCEL"
                    isOpen={isOpen}
                    onClose={onClose}
                    onConfirm={onConfirm}
                    onChange={onDialogPasswordChange}
                    value={dialogPassword}
                    showPasswordField={true}
                    label="Password"
                />
            </Flex>
        </Flex>
    );
}

export default Info;