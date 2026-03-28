import { Router } from "express";
import passport from "passport";
import {
  postPlinkoBet,
  getMyPlinkoHistory,
  getPlinkoLiveResults,
  getPlinkoRates,
  getPlinkoRatesConfig,
  putPlinkoRates,
  postPlinkoRatesReset,
  getPlinkoBotSettings,
  putPlinkoBotSettings,
} from "../controllers/plinkoController.js";

const router = Router();
const jwt = passport.authenticate("jwt", { session: false });

router.get("/rates", getPlinkoRates);
router.get("/rates/config", jwt, getPlinkoRatesConfig);
router.put("/rates", jwt, putPlinkoRates);
router.post("/rates/reset", jwt, postPlinkoRatesReset);
router.get("/bot-settings", jwt, getPlinkoBotSettings);
router.put("/bot-settings", jwt, putPlinkoBotSettings);
router.get("/results", getPlinkoLiveResults);
router.get("/history/me", jwt, getMyPlinkoHistory);
router.post("/bet", jwt, postPlinkoBet);

export default router;
