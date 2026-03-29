import mongoose from 'mongoose';

const SnakesSettingsSchema = new mongoose.Schema({
    botWinningProbability: {
        type: Number,
        default: 0.5
    },
    botTriggerProbability: {
        type: Number,
        default: 0.4
    },
    step1: {
        type: [
            {
                sum: Number,
                probabililty: [
                    {
                        easy: Number,
                        medium: Number,
                        hard: Number,
                    }
                ]
            }
        ],
        default: [
            {
                sum: 7,
                probabililty: [
                    {
                        easy: 0.5,
                        medium: 0.3,
                        hard: 0.2,
                    }
                ]
            }
        ]
    },
    step2: {
        type: [
            {
                sum: Number,
                probabililty: [
                    {
                        easy: Number,
                        medium: Number,
                        hard: Number,
                    }
                ]
            }
        ],
        default: [
            {
                sum: 7,
                probabililty: [
                    {
                        easy: 0.5,
                        medium: 0.3,
                        hard: 0.2,
                    }
                ]
            }
        ]
    },
    step3: {
        type: [
            {
                sum: Number,
                probabililty: [
                    {
                        easy: Number,
                        medium: Number,
                        hard: Number,
                    }
                ]
            }
        ],
        default: [
            {
                sum: 7,
                probabililty: [
                    {
                        easy: 0.5,
                        medium: 0.3,
                        hard: 0.2,
                    }       
                ]
            }
        ]
    },
    step4: {
        type: [
            {
                sum: Number,
                probabililty: [
                    {
                        easy: Number,
                        medium: Number,
                        hard: Number,
                    }
                ]
            }
        ],
        default: [
            {
                sum: 7,
                probabililty: [
                    {
                        easy: 0.5,
                        medium: 0.3,
                        hard: 0.2,
                    }
                ]
            }
        ]
    },
    step5: {
        type: [
            {
                sum: Number,
                probabililty: [
                    {
                        easy: Number,
                        medium: Number,
                        hard: Number,
                    }
                ]
            }
        ],
        default: [
            {
                sum: 7,
                probabililty: [
                    {
                        easy: 0.5,
                        medium: 0.3,
                        hard: 0.2,
                    }
                ]
            }
        ]
    }
});

export default mongoose.model('SnakesSettings', SnakesSettingsSchema);