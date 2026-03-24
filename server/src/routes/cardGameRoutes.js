import { Router } from "express";
import passport from "passport";
import { bet, getCardGameView } from "../controllers/cardGameController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.get("/getCardGameView", passport.authenticate('jwt',{session: false}), getCardGameView);

export default router;