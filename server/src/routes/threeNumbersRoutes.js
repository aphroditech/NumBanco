import { Router } from "express";
import passport from "passport";
import { bet, getThreeNumbersView } from "../controllers/threeNumbersController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt',{session: false}), bet);
router.get("/getThreeNumbersView", passport.authenticate('jwt',{session: false}), getThreeNumbersView);

export default router;