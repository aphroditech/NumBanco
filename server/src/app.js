import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import "./config/passport.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import lotteryRoutes from "./routes/lotteryRoutes.js";
import partnershipRoutes from "./routes/partnershipRoutes.js";
import betRoutes from "./routes/betRoutes.js";
import preBetRoutes from "./routes/preBetRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";
import withdrawRoutes from "./routes/withdrawRoutes.js";
import statsRouter from "./routes/stats.js";
import ablyRoutes from "./routes/ablyRoutes.js";
import rubicRoutes from "./routes/rubicRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import pumpingRoutes from "./routes/pumpingRoutes.js";
import doveRoutes from "./routes/doveRoutes.js";
import miningRoutes from "./routes/miningRoutes.js";
import rocketRoutes from "./routes/rocketRoutes.js";
import cocoRoutes from "./routes/cocoRoutes.js";
import fishingRoutes from "./routes/fishingRoutes.js";
import jokerCrashRoutes from "./routes/jokerCrashRoutes.js";
import minesRoutes from "./routes/minesRoutes.js";
import gravityRoutes from "./routes/gravityRoutes.js";
import doubleRoutes from "./routes/doubleRoutes.js";
import cardGameRoutes from "./routes/cardGameRoutes.js";
import cloudSpreadRoutes from "./routes/cloudSpreadRoutes.js";
import alphaTreeRoutes from "./routes/alphaTreeRoutes.js";
import moralisWebhook from "./webhooks/moralisWebhook.js";
import aToZRoutes from "./routes/aToZRoutes.js";
import twistRoutes from "./routes/twistRoutes.js";
import diceRoutes from "./routes/diceRoutes.js";
import coinRoutes from "./routes/coinRoutes.js";
import kenoRoutes from "./routes/kenoRoutes.js";
import wheelRoutes from "./routes/wheelRoutes.js";
import climbRoutes from "./routes/climbRoutes.js";
import plinkoRoutes from "./routes/plinkoRoutes.js";

dotenv.config();

/** Dev often uses localhost OR 127.0.0.1 — both must be allowed or the browser blocks API calls. */
const app = express();

const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const extraOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigins = [...new Set([...defaultCorsOrigins, ...extraOrigins])];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/partnership", partnershipRoutes);
app.use("/api/lottery", lotteryRoutes);
app.use("/api/bet", betRoutes);
app.use("/api/preBet", preBetRoutes);
app.use("/api/dove", doveRoutes);
app.use("/api/test", testRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/stats", statsRouter);
app.use("/api/ably", ablyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/pumping", pumpingRoutes);
app.use("/api/cardGame", cardGameRoutes);
app.use("/api/rubic", rubicRoutes);
app.use("/api/mining", miningRoutes);
app.use("/api/rocket", rocketRoutes);
app.use("/api/coco", cocoRoutes);
app.use("/api/fishing", fishingRoutes);
app.use("/api/mines", minesRoutes);
app.use("/api/gravity", gravityRoutes);
app.use("/api/double", doubleRoutes);
app.use("/api/jokerCrash", jokerCrashRoutes);
app.use("/api/cloud-spread", cloudSpreadRoutes);
app.use("/api/aToZ", aToZRoutes);
app.use("/api/dice", diceRoutes);
app.use("/api/alpha-tree", alphaTreeRoutes);
app.use("/api/twist", twistRoutes);
app.use("/api/coin", coinRoutes);
app.use("/api/plinko", plinkoRoutes);
app.use("/api/keno", kenoRoutes);
app.use("/api/wheel", wheelRoutes);
app.use("/api/climb", climbRoutes);
app.get("/api/graph-data", (req, res) => {
  res.json([
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 500 },
    { name: "Apr", value: 200 },
  ]);
});

app.post("/webhook/moralis", (req, res) => {
  moralisWebhook(req, res);
});

export default app;