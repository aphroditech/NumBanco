import { Router } from "express";
import passport from "passport";
import {
    startGame,
    pickLetter,
    cashOut,
    getState,
    getAlphaTreeView,
} from "../controllers/alphaTreeController.js";

const router = Router();

router.post(
    "/start",
    passport.authenticate("jwt", { session: false }),
    startGame
);
router.post(
    "/pick",
    passport.authenticate("jwt", { session: false }),
    pickLetter
);
router.post(
    "/cashout",
    passport.authenticate("jwt", { session: false }),
    cashOut
);
router.get(
    "/state",
    passport.authenticate("jwt", { session: false }),
    getState
);
router.get(
    "/getAlphaTreeView",
    passport.authenticate("jwt", { session: false }),
    getAlphaTreeView
);

export default router;
