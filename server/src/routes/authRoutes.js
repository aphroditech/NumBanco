import { Router } from "express";
import { register, login, me, getUserData, getWinners, getRealTimeWinners, verify2fa, logout, getActiveUsers, resendTwoFa, forgotPassword } from "../controllers/authController.js";
import passport from "passport";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", me);
router.post("/logout", passport.authenticate('jwt', { session: false }), logout);
router.get("/", passport.authenticate('jwt', { session: false }), getUserData);
router.get("/activeUsers", getActiveUsers);
router.get("/getWinners", passport.authenticate('jwt', { session: false }), getWinners);
router.get("/getRealTimeWinners", passport.authenticate('jwt', { session: false }), getRealTimeWinners);
router.post("/verify-2fa", verify2fa);
router.post("/resend-2fa", resendTwoFa);
router.post("/forgot-password", forgotPassword);
export default router;
