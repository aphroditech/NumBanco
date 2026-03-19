import { Router } from "express";
import passport from "passport";
import { dailyloot, reward } from "../controllers/lotteryController.js";

const router = Router();

router.post('/dailyloot', passport.authenticate('jwt',{session: false}), dailyloot);
router.post('/reward',  passport.authenticate('jwt',{session: false}), reward)

export default router;