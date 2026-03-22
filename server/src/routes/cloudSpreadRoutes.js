import { Router } from "express";
import passport from "passport";
import {
  cashOutCloudSpread,
  createCloudSpreadBet,
  getCloudSpreadState,
  getLiveCloudSpreadHistory,
  getMyCloudSpreadHistory,
} from "../controllers/cloudSpreadController.js";

const router = Router();

/** Each user gets their own round — state requires login (like Rubic / Pumping). */
router.get("/state", passport.authenticate("jwt", { session: false }), getCloudSpreadState);
router.get("/history/live", getLiveCloudSpreadHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyCloudSpreadHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createCloudSpreadBet);
router.post("/cashout", passport.authenticate("jwt", { session: false }), cashOutCloudSpread);

export default router;
