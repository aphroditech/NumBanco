import { Router } from "express";
import {
    buyTickets,
    getSoldTickets,
    getBetId,
    getCurrentBetData,
    getBetHistory,
    getMyHistory,
    getMyBetIds,
    onlineUser,
    offlineUser,
    activeusers
} from "../controllers/betController.js";
import passport from "passport";

const router = Router();

router.post("/buyTickets", passport.authenticate('jwt', { session: false }), buyTickets);
router.post("/soldTickets", passport.authenticate('jwt', { session: false }), getSoldTickets);
router.get("/getBetId", passport.authenticate('jwt', { session: false }), getBetId);
router.get("/activeusers", passport.authenticate('jwt', { session: false }), activeusers);
router.post("/getBetHistory", passport.authenticate('jwt', { session: false }), getBetHistory);
router.post("/getMyHistory", passport.authenticate('jwt', { session: false }), getMyHistory);
router.post("/getcurrentdata", passport.authenticate('jwt', { session: false }), getCurrentBetData)
router.post("/getMyBetIds", passport.authenticate('jwt', { session: false }), getMyBetIds)

router.get("/onlineUser", passport.authenticate('jwt', { session: false }), onlineUser);
router.get("/offlineUser", passport.authenticate('jwt', { session: false }), offlineUser);

export default router;