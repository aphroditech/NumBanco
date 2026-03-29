import mongoose from "mongoose";

/**
 * Real player rounds only (never bots). Collection name: `calendarplinko`.
 * `PlinkoResult` holds mixed bot + user rows for the public live ticker (API limit 13).
 */
const calendarPlinkoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    avatar: { type: String, default: "" },
    betAmount: { type: Number, default: 0 },
    multiplier: { type: Number, default: 0 },
    win: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    rows: { type: Number, default: 16 },
    slot: { type: Number, default: 0 },
    roundId: { type: Number, default: 0 },
    risk: { type: String, default: "regular" },
    hyperMode: { type: Boolean, default: false },
    pathSteps: { type: [Number], default: [] },
  },
  { timestamps: true, collection: "calendarplinko" }
);

calendarPlinkoSchema.index({ createdAt: -1 });
calendarPlinkoSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("CalendarPlinko", calendarPlinkoSchema);
