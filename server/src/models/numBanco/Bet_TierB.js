import mongoose from "mongoose";

const bet_TierBschema = new mongoose.Schema({
    betId: {
        type: Number,
    },
    betResult: {
        type: {
            betOne: {
                winNum: [],
                winUsername: [],
                winUserId: [],
            },
            betTwo: {
                winNum: [],
                winUsername: [],
                winUserId: [],
            },
            betThree: {
                winNum: [],
                winUsername: [],
                winUserId: [],
            },
            betFour: {
                winNum: [],
                winUsername: [],
                winUserId: [],
            },
            betFive: {
                winNum: [],
                winUsername: [],
                winUserId: [],
            },
            betSix: {
                winNum: [],
                winUsername: [],
                winUserId: [],
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

export default mongoose.model("Bet_TierB", bet_TierBschema);