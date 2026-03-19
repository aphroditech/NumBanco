import { Router } from "express";
import passport from "passport";
import { checkCanWin, resultGameMining, getMiningHistory, getMiningResult } from "../controllers/miningController.js";
const router = Router();

router.post("/checkCanWin", passport.authenticate('jwt', { session: false }), checkCanWin);
router.post("/resultGameMining", passport.authenticate('jwt', { session: false }), resultGameMining);
router.get("/getMiningHistory", passport.authenticate('jwt', { session: false }), getMiningHistory);
router.get("/getMiningResult", passport.authenticate('jwt', { session: false }), getMiningResult);

export default router;
