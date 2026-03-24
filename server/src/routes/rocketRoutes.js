import { Router } from "express";
import passport from "passport";
import { bet, shotResult, getRocketResults, getRocketHistory } from "../controllers/rocketController.js";
const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.post("/shotResult", passport.authenticate('jwt',{session: false}), shotResult);
router.get("/getRocketResults", passport.authenticate('jwt',{session: false}), getRocketResults);
router.get("/getRocketHistory", passport.authenticate('jwt',{session: false}), getRocketHistory);
export default router;