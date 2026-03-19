import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: Array,
    default: []
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "success",
  },
  type: {
    type: String,
    default: "user",
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);