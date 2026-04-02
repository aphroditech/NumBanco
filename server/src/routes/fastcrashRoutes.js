import express from "express";
import passport from "passport";
import {
  createFastCrashBet,
  getFastCrashState,
  getMyFastCrashHistory,
  getFastCrashLiveHistory,
} from "../controllers/fastcrashController.js";

const router = express.Router();

router.get("/state", getFastCrashState);
router.get("/history/live", getFastCrashLiveHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyFastCrashHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createFastCrashBet);

export default router;
