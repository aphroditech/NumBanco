import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { sendUserResponse } from "../utils/responses.js";

export const profileInfo = async (req, res) => {
    try {
        const { userAuthId } = req.user;
        const { altas, email, password } = req.body;
        
        const user = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                country: 0,
                pumpingMode: 0,
                fishingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );
        if(password!=="") {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch)
                return res.status(400).json({ message: "Password is incorrect" });
        }
        if (email) {
            const existsEmail = await User.find({ email: email.trim().toLowerCase() });
            if (existsEmail.length > 0) {
                return res.status(400).json({ message: "Email already exists" });
            }
        }
        user.altas = altas;
        user.email = email;

        await user.save();

        return sendUserResponse(res, "Your information updated successfully", user);
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Server error" });
    }
};

export const profileUserAvatar = async (req, res) => {
    try {
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                fishingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );
        user.avatar = req.body.avatar;
        
        await user.save();
        return sendUserResponse(res, "You change the avatar successfully.", user);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
};

export const profilePassword = async (req, res) => {
    const { c_password, n_password } = req.body;

    try {
        const { userAuthId } = req.user;
        const user = await User.findOne(
            { userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                country: 0,
                pumpingMode: 0,
                fishingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );

        const match = await bcrypt.compare(c_password, user.password);
        if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
        
        const hashedPassword = await bcrypt.hash(n_password, 10);
        user.password = hashedPassword;
        
        await user.save();

        return sendUserResponse(res, "You change your password successfully", user);
    } catch (err) {
        res.status(500).json({ message: 'Something went wrong', error: err.message });
    }
};


export const setSecurity = async (req, res) => {
    try {
        const user = await User.findOne(
            { userAuthId: req.user.userAuthId },
            {
                "wallets.eth.privateKey": 0,
                "wallets.bsc.privateKey": 0,
                "wallets.tron.privateKey": 0,
                password: 0,
                country: 0,
                pumpingMode: 0,
                fishingMode: 0,
                rubicMode: 0,
                partnerId: 0,
                partnerActivity: 0,
                lastClickDate: 0,
                canWithdraw: 0,
            }
        );
        user.twofactor = !user.twofactor
        await user.save();
        
        const message = user.twofactor ? "Successfully set up the twofa feature." : "Successfully removed the twofa feature."

        return sendUserResponse(res, message, user);
    } catch (err) {

    }
}
