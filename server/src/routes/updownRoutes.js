import { Router } from "express";
import { getCurrent, getHistory, getPreviousGraph, getLiveState, placeBet, getBetsByRound } from "../controllers/updownController.js";
import passport from "passport";

const router = Router();

router.get("/current", passport.authenticate('jwt',{session: false}), getCurrent);
router.get("/live-state", passport.authenticate('jwt',{session: false}), getLiveState);
router.get("/history", passport.authenticate('jwt',{session: false}), getHistory);
router.get("/previous-graph", passport.authenticate('jwt',{session: false}), getPreviousGraph);
router.post("/bet", passport.authenticate('jwt',{session: false}), placeBet);
router.get("/bets/:roundId", passport.authenticate('jwt',{session: false}), getBetsByRound);
// router.post("/round", saveRound);

export default router;
