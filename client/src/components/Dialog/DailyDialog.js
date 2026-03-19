import React from "react";
import { 
    DarkMode,
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogBody,
} from "@chakra-ui/react";

function DailyDialog(props) {

    const {isOpen, onClose, bgImage, bgColor, content, top} = props;

    return (
        <AlertDialog bgImage={bgImage} isOpen={isOpen} onClose={onClose}>
            <DarkMode>
                <AlertDialogOverlay>
                    <AlertDialogContent
                        background={bgColor}
                        maxWidth="500px"
                        borderRadius="20px"
                        boxShadow="none"
                        margin="auto"
                        position="absolute"
                        top={top ? top : "calc(50% - 200px)"}
                        left="calc(50% - 250px)"
                        transform="translate(-50%, -50%)"
                        color="#fff"
                    >
                        <AlertDialogBody>
                            {content}
                        </AlertDialogBody>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </ DarkMode>
        </AlertDialog>
    );
}

export default DailyDialog;