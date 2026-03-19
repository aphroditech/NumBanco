import cron from "node-cron";
import User from "../../models/User.js";
import WatchDeposit from "../../models/WatchDeposit.js";
import { pollTronDeposits } from "../../webhooks/pollCronDeposits.js";
import { confirmTronDeposits } from "./tronConfirmation.service.js";
import Setting from "../../models/Setting.js";

export const tronEngine = (ably) => {
    let isRunningPollTron = false;
    let lastRunPollTron = 0;
    cron.schedule("* * * * * *", async () => {
        const setting = await Setting.find({});
        const X = setting[0]?.pollTron || 60;
        const now = Math.floor(Date.now() / 1000);

        if (isRunningPollTron) return;
        if (now - lastRunPollTron < X) return;

        isRunningPollTron = true;
        lastRunPollTron = now;

        try {
            const users = await User.find({});
            users.map(user => {
                const pendingDeposit = user.deposit
                    .filter(dep => dep.depFill === 'pending' && dep.depNet === "TRON")
                    .sort((a, b) => new Date(b.createAt) - new Date(a.createAt))[0];

                if(pendingDeposit) {
                    pollTronDeposits(ably, user);
                }
            })
        } catch (err) {
            console.error("Poll Tron error:", err);
        } finally {
            isRunningPollTron = false;
        }
    });
    let isRunningConfirmTron = false;
    let lastRunConfirmTron = 0;
    cron.schedule("* * * * * *", async () => {
        const setting = await Setting.find({});
        const X = setting[0]?.confirmationTron || 60;
        const now = Math.floor(Date.now() / 1000);

        if (isRunningConfirmTron) return;
        if (now - lastRunConfirmTron < X) return;

        isRunningConfirmTron = true;
        lastRunConfirmTron = now;

        try {
            const deposits = await WatchDeposit.find({chain : "TRON"});
            deposits.map(deposit => {
                confirmTronDeposits(ably, deposit)
            })
        } catch (err) {
            console.error("Confirm Tron error:", err);
        } finally {
            isRunningConfirmTron = false;
        }
    });
};