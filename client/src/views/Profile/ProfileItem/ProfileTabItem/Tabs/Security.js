import React, { useEffect, useState } from "react";
import { Grid, Text } from "@chakra-ui/react";
import LabelSwitch from "components/Input/LabelSwitch";
import { useSelector, useDispatch } from "react-redux";

import { setSecurity } from "action/ProfileActions";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";

function Security() {
    const dispatch = useDispatch();
    const history = useHistory();
    const user = useSelector((state) => state.user.userInfo);

    const [enabled, setEnabled] = useState(false);

    // Keep UI in sync with Redux / backend
    useEffect(() => {
        setEnabled(!!user?.twofactor);
    }, [user?.twofactor]);

    const handleToggle = () => {
        // Trying to enable 2FA
        if (!enabled) {
            // ❌ No email → block toggle
            if (!user?.email) {
                toast.warning(
                    "Please add your email in Profile Info before enabling Two-Factor Authentication."
                );
                return; // 🔒 switch remains OFF
            }

            // ✅ Email exists → enable
            setSecurity(dispatch);
            return;
        }

        // Turning OFF
        setSecurity(dispatch);
    };

    return (
        <Grid placeContent="center" mt="50px">
            <LabelSwitch
                label="Enable Two-Factor Authentication"
                status={enabled}
                onChange={handleToggle}
            />
            <Text fontSize="sm" opacity={0.7} mt="15px" textAlign="center">
                *If you want to use this security feature, please turn it on first.
            </Text>
        </Grid>
    );
}

export default Security;
