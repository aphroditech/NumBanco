import { Router } from "express";
import passport from "passport";
import { checkDoveWin, getPrefix, getDoveEarnings } from "../controllers/doveController.js";

const router = Router();
router.get('/getPrefix', passport.authenticate('jwt', { session: false }), getPrefix);
router.post('/checkDoveWin', passport.authenticate('jwt', { session: false }), checkDoveWin);
router.post('/getDoveEarnings', passport.authenticate('jwt', { session: false }), getDoveEarnings);

export default router;