import { Router } from "express";
import passport from "passport";
import { bet, getPumpingView } from "../controllers/pumpingController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.get("/getPumpingView", passport.authenticate('jwt',{session: false}), getPumpingView);

export default router;