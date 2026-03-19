import { Router } from "express";
import { getPreBetData } from "../controllers/preBetController.js";
import passport from "passport";

const router = Router();

router.get("/preBetData", passport.authenticate('jwt',{session: false}), getPreBetData);

export default router;