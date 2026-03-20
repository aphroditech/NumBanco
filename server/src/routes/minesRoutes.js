import { Router } from "express";
import passport from "passport";
import {
  getPrefix,
  getMinesResults,
  getActiveGame,
  startGame,
  reveal,
  cashOut,
} from "../controllers/minesController.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

router.get("/getPrefix", jwt, getPrefix);
router.get("/results", getMinesResults);
router.get("/active", jwt, getActiveGame);
router.post("/start", jwt, startGame);
router.post("/reveal", jwt, reveal);
router.post("/cash-out", jwt, cashOut);

export default router;
