import { Router } from "express";
import passport from "passport";
import {
  createGravityBet,
  getGravityState,
  getLiveGravityHistory,
  getMyGravityHistory,
} from "../controllers/gravityController.js";

const router = Router();

router.get("/state", getGravityState);
router.get("/history/live", getLiveGravityHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyGravityHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createGravityBet);

export default router;
