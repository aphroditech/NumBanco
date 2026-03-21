import User from "../models/User.js";

export const userActive = async () => {
    try {
        console.log("Fetching active users...");
        const users = await User.find({});

        const offlineUsers = users.filter(user => (user.active === 0)).length;
        const onlineUsers = users.filter(user => (user.active !== 0)).length + 1012;
        const otherPageUsers = users.filter(user => (user.active === 1)).length;
        const tierAUsers = users.filter(user => (user.active === 2)).length + 307;
        const tierBUsers = users.filter(user => (user.active === 3)).length + 228;
        const tierCUsers = users.filter(user => (user.active === 4)).length + 95;
        const rubicUsers = users.filter(user => (user.active === 5)).length + 150;
        const pumpingUsers = users.filter(user => (user.active === 6)).length + 270;
        const gravityUsers = users.filter(user => (user.active === 7)).length + 100;
        const doveUsers = users.filter(user => (user.active === 8)).length + 123;
        const cloudSpreadUsers = users.filter(user => (user.active === 9)).length + 96;
        const cocoUsers = users.filter(user => (user.active === 10)).length + 88;

        return {
            offlineUsers,
            onlineUsers,
            tierAUsers,
            tierBUsers,
            tierCUsers,
            rubicUsers,
            otherPageUsers,
            pumpingUsers,
            gravityUsers,
            doveUsers,
            cloudSpreadUsers,
            cocoUsers,
        }
    } catch (err) {
        console.log("Error fetching active users:", err);
        return;
    }
};