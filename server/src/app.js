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
import updownRoutes from "./routes/updownRoutes.js";
import doveRoutes from "./routes/doveRoutes.js";
import miningRoutes from "./routes/miningRoutes.js";
import rocketRoutes from "./routes/rocketRoutes.js";
import cocoRoutes from "./routes/cocoRoutes.js";
import fishingRoutes from "./routes/fishingRoutes.js";
import moralisWebhook from "./webhooks/moralisWebhook.js";
dotenv.config();

const app = express();

app.use(cors({
  origin: [
    // "https://localhost:3000",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
app.use("/api/rubic", rubicRoutes);
app.use("/api/updown", updownRoutes);
app.use("/api/mining", miningRoutes);
app.use("/api/rocket", rocketRoutes);
app.use("/api/coco", cocoRoutes);
app.use("/api/fishing", fishingRoutes);
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