import { Router } from "express";
import passport from "passport";
import { bet, flipCoin, cryptoCrashCashOut, getCryptoCrashView } from "../controllers/cryptoCrashController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.post("/flipCoin", passport.authenticate('jwt',{session: false}), flipCoin);
router.get("/cryptoCrashCashOut", passport.authenticate('jwt',{session: false}), cryptoCrashCashOut);
router.get("/getCryptoCrashView", passport.authenticate('jwt',{session: false}), getCryptoCrashView);

export default router;