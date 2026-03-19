import { Router } from "express";
import passport from "passport";
import {
  addNotification,
  clearNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", passport.authenticate("jwt", { session: false }), getNotifications);
router.post("/", passport.authenticate("jwt", { session: false }), addNotification);
router.patch("/read-all", passport.authenticate("jwt", { session: false }), markAllNotificationsRead);
router.patch("/:id/read", passport.authenticate("jwt", { session: false }), markNotificationRead);
router.delete("/", passport.authenticate("jwt", { session: false }), clearNotifications);
router.delete("/:id", passport.authenticate("jwt", { session: false }), deleteNotification);

export default router;
