import { Router } from "express";

import passport from "passport";
import { rangeBet, getRangeResults, getRangeHistory } from "../controllers/rangeController.js";

const router = Router();

router.post("/bet", passport.authenticate('jwt', { session: false }), rangeBet);
router.get("/results", passport.authenticate('jwt', { session: false }), getRangeResults);
router.get("/history", passport.authenticate('jwt', { session: false }), getRangeHistory);

export default router;