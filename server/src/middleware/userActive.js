import User from "../models/User.js";

const ACTIVE_USERS_CACHE_TTL_MS = 2000;
let cachedActiveUsers = null;
let cacheExpiresAt = 0;
let pendingActiveUsersPromise = null;

export const userActive = async () => {
    try {
        const now = Date.now();
        if (cachedActiveUsers && now < cacheExpiresAt) {
            return cachedActiveUsers;
        }

        if (pendingActiveUsersPromise) {
            return pendingActiveUsersPromise;
        }

        pendingActiveUsersPromise = (async () => {
        const groupedUsers = await User.aggregate([
            { $group: { _id: "$active", count: { $sum: 1 } } }
        ]);

        const counts = Object.fromEntries(
            groupedUsers.map((item) => [Number(item._id), item.count])
        );
        const countByActive = (activeCode) => counts[activeCode] || 0;

        const offlineUsers = countByActive(0);
        const onlineUsers = groupedUsers
            .filter((item) => Number(item._id) !== 0)
            .reduce((sum, item) => sum + item.count, 0) + 1012;
        const otherPageUsers = countByActive(1);
        const tierAUsers = countByActive(2) + 307;
        const tierBUsers = countByActive(3) + 228;
        const tierCUsers = countByActive(4) + 95;
        const rubicUsers = countByActive(5) + 150;
        const pumpingUsers = countByActive(6) + 270;
        const gravityUsers = countByActive(7) + 100;
        const doubleUsers = countByActive(17) + 72;
        const plinkoUsers = countByActive(20) + 64;
        const doveUsers = countByActive(8) + 123;
        const cloudSpreadUsers = countByActive(9) + 96;
        const cocoUsers = countByActive(10) + 88;
        const rocketUsers = countByActive(11) + 150;
        const jackalUsers = countByActive(12) + 80;
        const mineUsers = countByActive(13) + 60;
        const fishingUsers = countByActive(14) + 90;
        const alphaTreeUsers = countByActive(15) + 60;
        const aToZUsers = countByActive(16) + 100;
        const twistUsers = countByActive(17) + 100;
        const jokerCrashUsers = countByActive(18) + 90;
        const cardGameUsers = countByActive(19) + 80;
        const climbUsers = countByActive(20) + 70;

        const hashDiceUsers = countByActive(21) + 52;
        const diamondUsers = countByActive(21) + 58;
        const tarotUsers = countByActive(22) + 50;
        const fastcrashUsers = countByActive(23) + 120;
        const coinUsers = countByActive(24) + 150;
        const trenballUsers = countByActive(25) + 98;
        const wheelUsers = countByActive(26) + 126;
        const rangeUsers = countByActive(27) + 89;
        const rockUsers = countByActive(28) + 84;
        const snakesUsers = countByActive(29) + 87;
        const totalActiveUsers =
            plinkoUsers +
            tierAUsers +
            tierBUsers +
            tierCUsers +
            rubicUsers +
            pumpingUsers +
            gravityUsers +
            doubleUsers +
            doveUsers +
            cloudSpreadUsers +
            cocoUsers +
            rocketUsers +
            jackalUsers +
            mineUsers +
            fishingUsers +
            alphaTreeUsers +
            aToZUsers +
            twistUsers +
            jokerCrashUsers +
            cardGameUsers +
            climbUsers +
            diamondUsers +
            hashDiceUsers +
            tarotUsers +
            fastcrashUsers +
            coinUsers +
            trenballUsers +
            wheelUsers +
            rangeUsers +
            rockUsers +
            snakesUsers;
        const result = {
            offlineUsers,
            onlineUsers,
            tierAUsers,
            tierBUsers,
            tierCUsers,
            rubicUsers,
            otherPageUsers,
            pumpingUsers,
            gravityUsers,
            doubleUsers,
            plinkoUsers,
            doveUsers,
            cloudSpreadUsers,
            cocoUsers,
            rocketUsers,
            jackalUsers,
            mineUsers,
            fishingUsers,
            alphaTreeUsers,
            aToZUsers,
            twistUsers,
            jokerCrashUsers,
            cardGameUsers,
            climbUsers,
            hashDiceUsers,
            diamondUsers,
            tarotUsers,
            fastcrashUsers,
            totalActiveUsers,
            otherPageUsers,
            coinUsers,
            trenballUsers,
            wheelUsers,
            rangeUsers,
            rockUsers,
            snakesUsers
        };

        cachedActiveUsers = result;
        cacheExpiresAt = Date.now() + ACTIVE_USERS_CACHE_TTL_MS;
        return result;
        })();

        const result = await pendingActiveUsersPromise;
        pendingActiveUsersPromise = null;
        return result;
    } catch (err) {
        pendingActiveUsersPromise = null;
        console.log("Error fetching active users:", err);
        return;
    }
};