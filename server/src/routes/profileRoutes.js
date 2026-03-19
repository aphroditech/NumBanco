import { Router } from "express";
import passport from "passport";
import { profileInfo, profileUserAvatar, profilePassword, setSecurity } from "../controllers/profileController.js";

const router = Router();

router.post("/profileInfo", passport.authenticate('jwt',{session: false}), profileInfo);
router.post("/profileUserAvatar", passport.authenticate('jwt',{session: false}), profileUserAvatar);
router.post("/profilePassword", passport.authenticate('jwt',{session: false}), profilePassword);
router.get("/setSecurity", passport.authenticate('jwt',{session: false}), setSecurity);


export default router;
