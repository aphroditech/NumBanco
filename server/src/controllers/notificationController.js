import mongoose from "mongoose";
import User from "../models/User.js";

const buildNotification = (message, status) => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  notification: message,
  status: status || "success",
  createdAt: new Date(),
  unread: true
});

const findNotification = (user, idParam) => {
  const bySubdoc = user.notification.id(idParam);
  if (bySubdoc) return bySubdoc;

  const numericId = Number(idParam);
  if (!Number.isNaN(numericId)) {
    return user.notification.find((n) => n.id === numericId);
  }

  return null;
};

export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notification");
    return res.json({ notifications: user?.notification || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const addNotification = async (req, res) => {
  try {
    const { notification, status } = req.body;

    if (!notification) {
      return res.status(400).json({ message: "Notification message is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newNotification = buildNotification(notification, status);
    user.notification.push(newNotification);
    await user.save();

    return res.json({
      notification: newNotification,
      notifications: user.notification
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add notification" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const idParam = req.params.id;
    const numericId = Number(idParam);
    const isObjectId = mongoose.Types.ObjectId.isValid(idParam);

    const or = [];
    if (isObjectId) {
      or.push({ "notification._id": idParam });
    }
    if (!Number.isNaN(numericId)) {
      or.push({ "notification.id": numericId });
    }
    if (or.length === 0) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const updateResult = await User.updateOne(
      { _id: req.user._id, $or: or },
      { $set: { "notification.$.unread": false } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const user = await User.findById(req.user._id).select("notification");
    return res.json({ notifications: user?.notification || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.notification.forEach((item) => {
      item.unread = false;
    });
    await user.save();

    return res.json({ notifications: user.notification });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update notifications" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const idParam = req.params.id;
    const numericId = Number(idParam);
    const isObjectId = mongoose.Types.ObjectId.isValid(idParam);

    if (isObjectId) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { notification: { _id: idParam } } }
      );
    } else if (!Number.isNaN(numericId)) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { notification: { id: numericId } } }
      );
    } else {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const user = await User.findById(req.user._id).select("notification");
    return res.json({ notifications: user?.notification || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.notification = [];
    await user.save();

    return res.json({ notifications: [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to clear notifications" });
  }
};
