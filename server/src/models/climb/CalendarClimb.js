import mongoose from "mongoose";

/** Same shape as `CalendarWheel` / `calendarwheels`; collection defaults to `calendarclimbs`. */
const CalendarClimbSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    isWin: {
        type: Boolean,
        required: true,
        default: false,
    },
    betAmount: {
        type: Number,
        required: true,
    },
    /** Climb grid mode: easy | normal | hard (wheel uses risk tiers as `level`). */
    level: {
        type: String,
        required: true,
    },
    winAmount: {
        type: Number,
        required: true,
        default: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("CalendarClimb", CalendarClimbSchema);
