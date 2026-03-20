import { Router } from "express";
import passport from "passport";
import { smash, restart, getCocoView } from "../controllers/cocoController.js";

const router = Router();

router.post("/smash", passport.authenticate("jwt", { session: false }), smash);
router.post("/restart", passport.authenticate("jwt", { session: false }), restart);
router.get("/getCocoView", passport.authenticate("jwt", { session: false }), getCocoView);

export default router;
