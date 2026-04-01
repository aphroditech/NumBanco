import { Router } from "express";
import passport from "passport";
import {
  createTrenballBet,
  getTrenballState,
  getMyTrenballHistory,
  getTrenballLiveHistory,
} from "../controllers/trenballController.js";

const router = Router();

router.get("/state", getTrenballState);
router.get("/history/live", getTrenballLiveHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyTrenballHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createTrenballBet);

export default router;
