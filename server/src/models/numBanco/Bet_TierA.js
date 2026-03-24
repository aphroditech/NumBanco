import mongoose from "mongoose";

const bet_TierAschema = new mongoose.Schema({
    betId: {
        type: Number,
    },
    betResult: {
        type: {
            betOne: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betTwo: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betThree: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betFour: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betFive: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betSix: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            },
            betSeven: {
                winNum: [{ type: Number }],
                winUsername: [{ type: String }],
                winUserId: [{ type: String }],
            }
        }
    },
    betDuration: {
        type: Number,
        default: 0
    },
    betRevenue: {
        type: Number,
    },
    sellTicketCnt: {
        type: Number,
    },
    betStartTime: {
        type: Number,
        default: Math.floor(Date.now()/1000)
    },
    betEndTime: {
        type: Number,
    }
}, { timestamps: true });

export default mongoose.model("Bet_TierA", bet_TierAschema);