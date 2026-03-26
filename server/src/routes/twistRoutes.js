import { Router } from "express";
import passport from "passport";
import { getTwistView, postTwistBet, postTwistCashOut } from "../controllers/twistController.js";

const router = Router();

router.get("/getTwistView", passport.authenticate("jwt", { session: false }), getTwistView);
router.post("/bet", passport.authenticate("jwt", { session: false }), postTwistBet);
router.post("/cashOut", passport.authenticate("jwt", { session: false }), postTwistCashOut);

export default router;

