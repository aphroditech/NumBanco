import { Router } from "express";
import passport from "passport";
import {
  getHashDiceConfig,
  getHashDiceLiveResults,
  getMyHashDiceState,
  getMyHashDiceHistory,
  postHashDiceBet,
} from "../controllers/hashDiceController.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

router.get("/config", getHashDiceConfig);
router.get("/results", getHashDiceLiveResults);
router.get("/me", jwt, getMyHashDiceState);
router.get("/history/me", jwt, getMyHashDiceHistory);
router.post("/bet", jwt, postHashDiceBet);

export default router;
