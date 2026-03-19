import mongoose from "mongoose";

const UpDownRoundCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  nextId: { type: Number, default: 1 },
});

export default mongoose.model("UpDownRoundCounter", UpDownRoundCounterSchema);
