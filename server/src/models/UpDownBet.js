import mongoose from 'mongoose';

const upDownBetSchema = new mongoose.Schema({
    roundId: {
        type: Number,
        required: true,
        index: true,
        unique: true
    },
    user: {
        type: [
            {   
                avatar: String,
                userId: String,
                altas: String,
                amount: Number,
                direction: {
                    type: String,
                    enum: ['up', 'down'],
                    required: true
                },
                isUser: {
                    type: Number,
                    default: 1,
                }
            }
        ]
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'won', 'lost'],
        default: 'pending'
    },
    payout: {
        type: Number,
        default: 0
    },
    multiplier: {
        type: Number,
        default: 1
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for quick lookups by round and user
upDownBetSchema.index({ roundId: 1 });

export default mongoose.model('UpDownBet', upDownBetSchema);
