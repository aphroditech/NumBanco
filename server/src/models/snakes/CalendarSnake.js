import mongoose from "mongoose";

const CalendarSnakeSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    isWin: {
        type: Boolean,
        required: true,
        default: false
    },
    betAmount: {
        type: Number,
        required: true
    },
    winAmount: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model('CalendarSnake', CalendarSnakeSchema);