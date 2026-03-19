import mongoose from "mongoose";

const signInSignUpSchema = new mongoose.Schema({
  isSignIn: {
    type: Boolean, // true = login, false = signup
    required: true
  },
  cnt: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    required: true
  }
}, { timestamps: true });

signInSignUpSchema.index({ date: 1, isSignIn: 1 }, { unique: true });

export default mongoose.model("SignIn_SignUp", signInSignUpSchema);