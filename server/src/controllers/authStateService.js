import SignIn_SignUp from "../models/SignIn_SignUp.js";

export const incrementAuthStat = async (isSignIn) => {
    const today = new Date();
    today.setHours(0,0,0,0); // normalize date (midnight)

    await SignIn_SignUp.findOneAndUpdate(
        { date: today, isSignIn },
        { $inc: { cnt: 1 } },
        { upsert: true, new: true }
    );
};