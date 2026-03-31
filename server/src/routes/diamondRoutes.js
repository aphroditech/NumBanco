import express from "express";
import passport from "passport";
import { playDiamond, getDiamondLiveView, getDiamondSettings } from "../controllers/diamondController.js";

const router = express.Router();

router.get("/settings", getDiamondSettings);
router.get("/live-view", passport.authenticate("jwt", { session: false }), getDiamondLiveView);
router.post("/play", passport.authenticate("jwt", { session: false }), playDiamond);

export default router;
