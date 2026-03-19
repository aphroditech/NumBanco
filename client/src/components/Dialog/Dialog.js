import React, { useState } from "react";
import { 
    DarkMode,
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter, 
    Box,
    Avatar,
    Input,
    Flex
} from "@chakra-ui/react";

import ClickButton from "components/Input/ClickButton";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import promedal from "assets/badge/GOLDEN_MEDAL.png";
import plusmedal from "assets/badge/BLUE_MEDAL.png";
import DialogInput from '../Input/DialogInput';

function Dialog(props) {
    const { 
        isOpen, onClose, onConfirm, title, status, content, 
        width, isFooter, bottom, top, yesButton, yesButtonWidth, 
        noButton, noButtonWidth, addcontent, amountcontent, image, membership, 
        disable, showPasswordField , value, onChange,
    } = props;

    const [passwordError, setPasswordError] = useState('');

    const handleConfirm = () => {
        if (showPasswordField) {
            if (!value) {
                setPasswordError('Password is required.');
                return;
            }

            if (value.length < 6) {
                setPasswordError('Password must be at least 6 characters.');
                return;
            }
        }

        setPasswordError('');
        onConfirm();
    };

    return (
        <AlertDialog isOpen={isOpen} onClose={onClose}>
            <DarkMode>
                <AlertDialogOverlay>
                    <AlertDialogContent
                        background="#2a2d2e"
                        maxWidth={width ? width : "500px"}
                        borderRadius="20px"
                        margin="auto"
                        position="absolute"
                        top={top ? top : '20%'}
                        transform="translate(-50%, -50%)"
                        color="#fff"
                    >
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            <Flex alignItems="center">
                                {status} {title}
                            </Flex>
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            {content}
                        </AlertDialogBody>
                        <AlertDialogBody>
                            {amountcontent}
                        </AlertDialogBody>
                        <AlertDialogBody>
                            {addcontent}
                        </AlertDialogBody>
                        
                        {/* Conditionally render password input field */}
                        {showPasswordField && (
                            <AlertDialogBody>
                                <DialogInput
                                    type="password"
                                    placeholder="Enter Your Password"
                                    value={value}
                                    onChange={onChange}
                                    size="lg"
                                    error={passwordError}
                                />
                            </AlertDialogBody>
                        )}

                        {image && (
                            <Box 
                                alignSelf="center"
                                position="relative" 
                                w='380px' 
                                h='380px' 
                                display="inline-block"
                                me="18px" 
                                mb="20px"
                            >
                                <Box
                                    position="absolute"
                                    top="-79px"
                                    left="-78px"
                                    w="530px"
                                    h="530px"
                                    backgroundImage={`url(${membership === 2 && promedal || membership === 1 && plusmedal})`}
                                    backgroundSize="contain"
                                    backgroundRepeat="no-repeat"
                                    backgroundPosition="center"
                                    zIndex="3"
                                />
                                
                                <Box
                                    w="380px"
                                    h="380px"
                                    backgroundImage={image}
                                    backgroundSize="cover"
                                    borderRadius='50px' 
                                    backgroundRepeat="no-repeat"
                                    backgroundPosition="center"
                                />
                            </Box>
                        )}
                        
                        {isFooter ? ("") : (
                            <AlertDialogFooter gap="20px" zIndex={10000} style={{justifyContent: "center"}}>
                                <ClickButton 
                                    onClick={handleConfirm} 
                                    width={yesButtonWidth ? yesButtonWidth : "130px"} 
                                    label={yesButton} 
                                    disabled={disable} 
                                />
                                <ClickButton 
                                    onClick={onClose} 
                                    label={noButton}
                                    width={noButtonWidth ? noButtonWidth : "130px"} 
                                />
                            </AlertDialogFooter>
                        )}
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </DarkMode>
        </AlertDialog>
    );
}

export default Dialog;