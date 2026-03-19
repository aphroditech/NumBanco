import cron from "node-cron";
import Setting from "../../models/Setting.js";
import { fundMerge } from "./fundMerge.service.js";


export const fundMergeEngine = async () => {
    
    let isRunning = false;
    let lastRun = 0;
    cron.schedule("* * * * * *", async () => {
        const setting = await Setting.find({});
        const X = setting[0]?.fundMerge || 60;
        const now = Math.floor(Date.now() / 1000);

        if (isRunning) return;
        if (now - lastRun < X) return;

        isRunning = true;
        lastRun = now;

        try {
            // console.log(`🚀 Running fund merge... ${X}s`);
            await fundMerge();
        } catch (err) {
            console.error("Fund merge error:", err);
        } finally {
            isRunning = false;
        }
    });
};
