import express from "express";
import passport from "passport";
import { playTarot, getTarotLiveView } from "../controllers/tarotController.js";

const router = express.Router();

router.get("/live-view", passport.authenticate("jwt", { session: false }), getTarotLiveView);
router.post("/play", passport.authenticate("jwt", { session: false }), playTarot);

export default router;
