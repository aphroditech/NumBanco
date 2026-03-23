import dotenv from "dotenv";
import https from "https";
import http from "http";
import fs from "fs";
import app from "./app.js";
import { createAblyClient } from "./config/ably.js";
import { connectDB } from "./config/db.js";
import { getUserStatusChannel } from "./services/ably.service.js";
import { startBetEngine } from "./services/bet/betEngine.service.js";
import { initMoralis } from "./config/moralis.js";
import { confirmDepositEngine } from "./services/deposit/confirmDeposit.service.js";
import { startCronJobs, ensureYesterdayWalletExists } from './utils/cronScheduler.js';
import { fundMergeEngine } from "./services/fundmerge/fundMergeEngine.service.js";
import { tronEngine } from "./services/deposit/tronEngine.service.js";
import { tankCheckEngine } from "./services/deposit/tankCheckEngine.service.js";
import { startPartnerDepositCron } from "./controllers/partnershipController.js";
import { getWithdrawWallet, startWithdrawApprovalCron } from "./controllers/withdrawController.js";
import { initializeDatabase } from "./database/index.js";
import { pumpingBot } from "./services/pumping/pumpingBot.service.js";
import { rubicBot } from "./services/Rubic/rubicBot.service.js";
import { startGravityGameLoop } from "./services/gravity/gravityGame.service.js";
import { startCloudSpreadGameLoop, setCloudSpreadAbly } from "./services/cloudSpread/cloudSpreadGame.service.js";
import { cloudSpreadBot } from "./services/cloudSpread/cloudSpreadBot.service.js";

import { fishingBot } from "./services/fishing/fishingBot.service.js";
import {miningBot} from "./services/mining/miningBotService.js";
import {rocketBot} from "./services/rocket/rocketBot.service.js";
import { cocoBot } from "./services/coco/cocoBot.service.js";
import { alphaTreeBot } from "./services/alphaTree/alphaTreeBot.service.js";
import { doveBot } from "./services/dove/doveBot.service.js";
dotenv.config();

const PORT = process.env.API_PORT || 5000;
const ably = createAblyClient();

app.locals.ably = ably;

connectDB().then(async () => {
    await initializeDatabase();

    // Cloud Spread game loop (per-user rounds). Live feed uses Ably after `setCloudSpreadAbly` on connect.
    startCloudSpreadGameLoop().catch((err) => {
        console.error("[cloud-spread] failed to start game loop:", err);
    });

    // Check and create yesterday's wallet if it doesn't exist
    try {
        await ensureYesterdayWalletExists();
    } catch (err) {
        console.warn('Failed to ensure yesterday\'s wallet exists:', err);
    }

    // Load SSL certificates
    // const sslOptions = {
    //     key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/key.pem'),
    //     cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/cert.pem')
    // };

    http.createServer(app).listen(PORT, () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
    });
    // https.createServer(sslOptions, app).listen(PORT, () => {
    //     console.log(`🚀 HTTPS Server running on port ${PORT}`);

    // });
    await initMoralis();

    ably.connection.once("connected", () => {
        console.log("✅ Ably connected");
        // confirmDepositEngine(ably);
        // tronEngine(ably);
        // startPartnerDepositCron(ably);
        // startWithdrawApprovalCron(ably);
        // getUserStatusChannel(ably);

        // pumpingBot(ably);
        // rubicBot(ably);
        // pumpingBot(ably);
        // miningBot(ably);
        // rocketBot(ably);
        // fishingBot(ably);
        startGravityGameLoop(ably);
        setCloudSpreadAbly(ably);
        cloudSpreadBot().catch((err) => {
            console.error("[cloud-spread] bot failed to start:", err);
        });
        // cocoBot(ably);
        // alphaTreeBot(ably);
        // doveBot(ably);
        // fundMergeEngine();
        // tankCheckEngine();
        // getWithdrawWallet();


        // startBetEngine(ably, 0);
        // startBetEngine(ably, 1);
        // startBetEngine(ably, 2);

        try {
            startCronJobs();
        } catch (err) {
            console.warn('Failed to start cron jobs:', err);
        }
    });
});