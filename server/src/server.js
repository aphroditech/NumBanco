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
import { startDoubleGameLoop } from "./services/double/doubleGame.service.js";
import { startCloudSpreadGameLoop, setCloudSpreadAbly } from "./services/cloudSpread/cloudSpreadGame.service.js";
import { cloudSpreadBot } from "./services/cloudSpread/cloudSpreadBot.service.js";
import { minesBot } from "./services/mines/minesBot.js";
import { plinkoBot } from "./services/plinko/plinkoBot.service.js";

import { fishingBot } from "./services/fishing/fishingBot.service.js";
import { miningBot } from "./services/mining/miningBotService.js";
import { rocketBot } from "./services/rocket/rocketBot.service.js";
import { aToZBot } from "./services/AtoZ/aToZBot.service.js";
import { cocoBot } from "./services/coco/cocoBot.service.js";
import { alphaTreeBot } from "./services/alphaTree/alphaTreeBot.service.js";
import { doveBot } from "./services/dove/doveBot.service.js";
import { cardGameBot } from "./services/cardGame/cardGameBot.service.js";
import { diceBot } from "./services/dice/diceBot.service.js";
import { jokerCrashBot } from "./services/jokerCrash/jokerCrashBot.service.js";
import { coinFlipBot } from "./services/coinFlip/coinFlipBot.service.js";
import { twistBot } from "./services/twist/twistBot.service.js";
import { kenoBot } from "./services/keno/kenoBot.service.js";
import { wheelBot } from "./services/wheel/wheelBot.service.js";
import { climbBot } from "./services/climb/climbBot.service.js";
import { threeNumbersBot } from "./services/threeNumbers/threeNumbersBot.service.js";

dotenv.config();

const PORT = process.env.API_PORT || 5000;

const ablyCore = createAblyClient("core");
const ablyFinance = createAblyClient("finance");
const ablyCrashGames = createAblyClient("crash-games");
const ablyDiceGames = createAblyClient("dice-games");
const ablyMiningGames = createAblyClient("mining-games");

app.locals.ablyCore = ablyCore;
/** Controllers use `req.app.locals.ably` for channel.publish (coin, bet, rocket, etc.). */
app.locals.ably = ablyCore;
/** Same Ably app/key: dice/table bots publish here; optional alias if a route must match that connection. */
app.locals.ablyDiceGames = ablyDiceGames;

connectDB()
    .then(async () => {
        try {
            await initializeDatabase();
        } catch (err) {
            console.error("❌ Database initialization failed:", err);
            process.exit(1);
        }

        // Cloud Spread game loop (per-user rounds). Live feed uses Ably after `setCloudSpreadAbly` on connect.
        // startCloudSpreadGameLoop().catch((err) => {
        //     console.error("[cloud-spread] failed to start game loop:", err);
        // });

        // Load SSL certificates
        // const sslOptions = {
        //     key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/key.pem'),
        //     cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/cert.pem')
        // };

        /** 0.0.0.0 avoids some Windows / IPv6 localhost mismatch issues vs binding to default. */
        http.createServer(app).listen(PORT, () => {
            console.log(`🚀 HTTP Server listening on ${PORT} port.`);
        });
        // https.createServer(sslOptions, app).listen(PORT, () => {
        //     console.log(`🚀 HTTPS Server running on port ${PORT}`);

        // });

        ablyCore.connection.once("connected", () => {

            console.log("✅ Core Ably connected");

            // climbBot(ablyCore);

            // getUserStatusChannel(ablyCore);
            // startBetEngine(ablyCore, 0);
            // startBetEngine(ablyCore, 1);
            // startBetEngine(ablyCore, 2);

        });
        ablyFinance.connection.once("connected", () => {

            console.log("💰 Finance Ably connected");

            // confirmDepositEngine(ablyFinance);
            tronEngine(ablyFinance);
            // startPartnerDepositCron(ablyFinance);
            // startWithdrawApprovalCron(ablyFinance);

        });

        /*
        ========================================
        CRASH / FAST LOOP GAMES
        ========================================
        */

        ablyCrashGames.connection.once("connected", () => {

            console.log("🎯 Crash Games Ably connected");

            // rocketBot(ablyCrashGames);
            // jokerCrashBot(ablyCrashGames);
            // pumpingBot(ablyCrashGames);
            // wheelBot(ablyCrashGames);
            /** Wheel live feed uses `wheelResult` / `WHEEL_RESULT` on core Ably (see `wheelController` / client hook). */
        });

        /*
        ========================================
        DICE / TABLE GAMES
        ========================================
        */

        ablyDiceGames.connection.once("connected", () => {
            console.log("🎲 Dice Games Ably connected");

            // rubicBot(ablyDiceGames);
            // coinFlipBot(ablyDiceGames);
            // cardGameBot(ablyDiceGames);
            // aToZBot(ablyDiceGames);
            // twistBot(ablyDiceGames);
            // kenoBot(ablyDiceGames);
            threeNumbersBot(ablyDiceGames);
        });

        /*
        ========================================
        MINING STYLE GAMES
        ========================================
        */

        ablyMiningGames.connection.once("connected", () => {

            console.log("⛏️ Mining Games Ably connected");

            // miningBot(ablyMiningGames);
            // fishingBot(ablyMiningGames);
            // cocoBot(ablyMiningGames);
            // alphaTreeBot(ablyMiningGames);
            // doveBot(ablyMiningGames);
            minesBot(ablyMiningGames);
            plinkoBot(ablyMiningGames).catch((e) => console.error("[plinkoBot] start:", e?.message || e));
            startGravityGameLoop(ablyMiningGames);
            setCloudSpreadAbly(ablyMiningGames);
            cloudSpreadBot().catch(console.error);
            startDoubleGameLoop(ablyMiningGames);

        });

        /*
    ========================================
    SYSTEM SERVICES
    ========================================
    */

        // fundMergeEngine();
        // tankCheckEngine();
        // getWithdrawWallet();

        // startCronJobs();

        try {
            await initMoralis();
        } catch (err) {
            console.warn("⚠️ Moralis failed to start (optional for many routes):", err?.message || err);
        }


        // Check and create yesterday's wallet if it doesn't exist
        try {
            await ensureYesterdayWalletExists();
        } catch (err) {
            console.warn('Failed to ensure yesterday\'s wallet exists:', err);
        }
    })
    .catch((err) => {
        console.error("❌ Failed to start server (MongoDB or startup error):", err?.message || err);
        console.error("Check MONGO_URI in .env and that MongoDB is running.");
        process.exit(1);
    });