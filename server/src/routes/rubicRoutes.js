import { Router } from "express";
import { handleRubicBet, removeUserBalance, getUserRubicHistory } from "../controllers/rubicController.js";
import passport from "passport";

const router = Router();

router.post("/handleRubicBet", passport.authenticate('jwt',{session: false}), handleRubicBet);
router.post("/removeUserBalance", passport.authenticate('jwt',{session: false}), removeUserBalance);
router.get("/getUserRubicHistory", passport.authenticate('jwt',{session: false}), getUserRubicHistory);
export default router;
