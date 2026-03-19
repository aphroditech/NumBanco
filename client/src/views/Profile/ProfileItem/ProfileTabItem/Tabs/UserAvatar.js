import React from 'react';
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import {
	Flex,
	Grid,
	Text,
    useDisclosure
} from '@chakra-ui/react';
import { userAvatarData } from "variables/UserAvatar";
import Dialog from "components/Dialog/Dialog";
import UserAvatarList from "components/Input/UserAvatarList"
import { profileUserAvatar } from "action/ProfileActions";
import HelpIcon from '@mui/icons-material/Help';

function UserAvatar() {
    const user = useSelector((state) => state.user.userInfo);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const dispatch = useDispatch();
    const history = useHistory();
    const { isOpen, onOpen, onClose } = useDisclosure();

    function onConfirm () {
        const payload = {
            avatar: selectedAvatar.userAvatar
        };
        profileUserAvatar(payload, history, dispatch);
        onClose();
    }
    
    return (
        <Flex
            alignItems='center'
            justifyContent='start'
            style={{ userSelect: "none" }}
            mx={{ base: "auto", lg: "auto" }}
            ms={{ base: "auto", lg: "auto" }}
            textAlign="center"
            px='50px'>
            <Flex
                direction='column'
                w='100%'
                background='transparent'
                mt={8}
                mb={{ base: "30px" }}>
                <Grid gridColumn="4fr" display="ruby" >
                {userAvatarData?.map((row, index) => {
                    return (
                        <UserAvatarList
                        key={index}
                        userAvatar={row.userAvatar}
                        membership={row.membership}
                        onClick={() => {setSelectedAvatar(row), onOpen()}}
                        />
                    );
                })}
                </Grid>
            </Flex>
            <Dialog
            title={
                <Flex alignItems="center" gap={2}>
                    <HelpIcon sx={{ fontSize: 22, color: "rgb(0, 212, 255)"}} />
                    <Text as="span">Change profile picture</Text>
                </Flex>
            }
            image={selectedAvatar?.userAvatar}
            membership={selectedAvatar?.membership}
            content={"Do you want to select this profile picture?"}
            yesButton="NOW"
            noButton="CANCEL"
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            disable={user?.membership < selectedAvatar?.membership}
            />
        </Flex>
    );
}
export default UserAvatar;