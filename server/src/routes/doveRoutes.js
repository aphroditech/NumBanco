import { Router } from "express";
import passport from "passport";
import { checkDoveWin, getPrefix, getDoveEarnings, getDoveView, getMyDoveHistory, reportDoveFail } from "../controllers/doveController.js";

const router = Router();
router.get('/getPrefix', passport.authenticate('jwt', { session: false }), getPrefix);
router.get('/getDoveView', passport.authenticate('jwt', { session: false }), getDoveView);
router.get('/getMyDoveHistory', passport.authenticate('jwt', { session: false }), getMyDoveHistory);
router.post('/checkDoveWin', passport.authenticate('jwt', { session: false }), checkDoveWin);
router.post('/getDoveEarnings', passport.authenticate('jwt', { session: false }), getDoveEarnings);
router.post('/reportDoveFail', passport.authenticate('jwt', { session: false }), reportDoveFail);

export default router;