import { Router } from "express";
import passport from "passport";
import {
  createDoubleBet,
  getDoubleState,
  getLiveDoubleHistory,
  getMyDoubleHistory,
} from "../controllers/doubleController.js";

const router = Router();

router.get("/state", getDoubleState);
router.get("/history/live", getLiveDoubleHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyDoubleHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createDoubleBet);

export default router;
