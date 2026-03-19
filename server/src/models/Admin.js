import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  IP: {
    type: String,
    required: true
  },
  type : {
    type: String,
    default: "admin"
  }
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);