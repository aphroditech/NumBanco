import { Router } from "express";
import passport from "passport";
import { bet, pullStay, fishingCashOut, getFishingView } from "../controllers/fishingController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.post("/pullStay", passport.authenticate('jwt',{session: false}), pullStay);
router.get("/fishingCashOut", passport.authenticate('jwt',{session: false}), fishingCashOut);
router.get("/getFishingView", passport.authenticate('jwt',{session: false}), getFishingView);

export default router;