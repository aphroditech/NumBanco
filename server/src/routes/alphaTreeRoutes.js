import { Router } from "express";
import passport from "passport";
import {
    startGame,
    pickLetter,
    cashOut,
    getState,
    getAlphaTreeView,
    getSettings,
    putSettings,
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
router.get(
    "/settings",
    passport.authenticate("jwt", { session: false }),
    getSettings
);
router.put(
    "/settings",
    passport.authenticate("jwt", { session: false }),
    putSettings
);

export default router;
