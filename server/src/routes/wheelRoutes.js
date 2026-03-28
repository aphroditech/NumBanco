import { Router } from "express";
import passport from "passport";
import { betWheel, completeWheelSpin, getWheelResult, getWheelHistory } from "../controllers/wheelController.js";

const router = Router();

router.post("/betWheel", passport.authenticate("jwt", { session: false }), betWheel);
router.post("/completeSpin", passport.authenticate("jwt", { session: false }), completeWheelSpin);
router.get("/getResult", passport.authenticate("jwt", { session: false }), getWheelResult);
router.get("/getWheelHistory", passport.authenticate("jwt", { session: false }), getWheelHistory);

export default router;