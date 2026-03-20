import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const MinesGameSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ["easy", "normal", "hard", "ace"],
    },
    minesCount: {
      type: Number,
      required: true,
    },
    gridSize: {
      type: Number,
      required: true,
      default: 25,
    },
    /** Pre-generated mine indices (legacy). When empty, reveal uses win-rate probability per tile. */
    mineIndices: { type: [Number], default: [] },
    revealedIndices: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ["playing", "lost", "won"],
      default: "playing",
    },
    multiplierAtCashOut: {
      type: Number,
      default: null,
    },
    profit: {
      type: Number,
      default: null,
    },
    gameId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MinesGame", MinesGameSchema);
