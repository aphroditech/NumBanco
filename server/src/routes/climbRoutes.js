import { Router } from "express";
import passport from "passport";
import { startGame, pickBox, cashOut, getState, getClimbView } from "../controllers/climbController.js";

const router = Router();

router.post("/start", passport.authenticate("jwt", { session: false }), startGame);
router.post("/pick", passport.authenticate("jwt", { session: false }), pickBox);
router.post("/cashout", passport.authenticate("jwt", { session: false }), cashOut);
router.get("/state", passport.authenticate("jwt", { session: false }), getState);
router.get("/getClimbView", passport.authenticate("jwt", { session: false }), getClimbView);

export default router;

