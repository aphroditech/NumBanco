import mongoose from 'mongoose';

const betTicketSchema = new mongoose.Schema({
    betId: {
        type: Number,
        require: true
    },
    level: {
        type: Number,
        require: true,
        default: 0
    },
    sellTicket: {
        type: Array,
        default: []
    },
    sellTicketCnt: {
        type: Number,
    },
    ticketHolder: {
        type: [
            {   
                avatar: String,
                userId: String,
                altas: String,
                ticketCnt: Number,
                ticket: Array,
                membership: Number,
                isUser: {
                    type: Number,
                    default: 1,
                }
            }
        ]
    },
    timing: {
        type: [
            {   
                userId: String,
                altas: String,
                ticketCnt: Number,
                ticket: Array,
                membership: Number,
                isUser: Number,
                time: Number,
            }
        ]
    }
}, { timestamps: true });

export default mongoose.model("BetTicket", betTicketSchema);