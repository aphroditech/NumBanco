import { Router } from "express";
import passport from "passport";
import { bet, operator, jokerCrashCashOut, getJokerCrashView } from "../controllers/jokerCrashController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.post("/operator", passport.authenticate('jwt',{session: false}), operator);
router.get("/jokerCrashCashOut", passport.authenticate('jwt',{session: false}), jokerCrashCashOut);
router.get("/getJokerCrashView", passport.authenticate('jwt',{session: false}), getJokerCrashView);

export default router;