import { Router } from "express";
import { partnershipDeposit } from "../controllers/partnershipController.js";
import passport from "passport";

const router = Router();

router.get("/partnerDeposit", passport.authenticate('jwt',{session: false}), partnershipDeposit);

export default router;
