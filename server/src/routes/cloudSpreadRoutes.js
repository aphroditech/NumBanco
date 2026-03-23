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

/** Attach req.user when a valid JWT is sent; otherwise continue (for public state + myBetCount when logged in). */
function optionalJwt(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return next();
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
}

router.get("/state", optionalJwt, getCloudSpreadState);
router.get("/history/live", getLiveCloudSpreadHistory);
router.get("/history/me", passport.authenticate("jwt", { session: false }), getMyCloudSpreadHistory);
router.post("/bet", passport.authenticate("jwt", { session: false }), createCloudSpreadBet);
router.post("/cashout", passport.authenticate("jwt", { session: false }), cashOutCloudSpread);

export default router;
