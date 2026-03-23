import mongoose from 'mongoose';

// AToZSetting schema
const aToZSettingSchema = new mongoose.Schema({
    botWiningProbability: {
        type: Number,
        required: true,
        default: 0.6
    },
    botTriggerProbability: {
        type: Number,
        required: true,
        default: 0.3
    },
    limitNormalToHard: {
        type: Number,
        default: 1.3
    },
    limitHardToNormal: {
        type: Number,
        default: 0.7
    },

    THREE_ORDERED: {
        key: {
            type: String,
            defualt: "THREE_ORDERED"
        },
        multiplier: {
            type: Number,
            default: 800
        },
        probability: {
            type: Number,
            default: 0
        }
    },
    THREE_UNORDERED: {
        key: {
            type: String,
            defualt: "THREE_UNORDERED"
        },
        multiplier: {
            type: Number,
            default: 150
        },
        probability: {
            type: Number,
            default: 0
        }
    },
    TWO_ORDERED: {
        key: {
            type: String,
            defualt: "TWO_ORDERED"
        },
        multiplier: {
            type: Number,
            default: 15
        },
        probability: {
            type: Number,
            default: 0.01
        }
    },
    TWO_UNORDERED: {
        key: {
            type: String,
            defualt: "TWO_UNORDERED"
        },
        multiplier: {
            type: Number,
            default: 7.2
        },
        probability: {
            type: Number,
            default: 0.04
        }
    },
    ONE_ORDERED: {
        key: {
            type: String,
            defualt: "ONE_ORDERED"
        },
        multiplier: {
            type: Number,
            default: 2.4
        },
        probability: {
            type: Number,
            default: 0.18
        }
    },
    ONE_UNORDERED: {
        key: {
            type: String,
            defualt: "ONE_UNORDERED"
        },
        multiplier: {
            type: Number,
            default: 1.2
        },
        probability: {
            type: Number,
            default: 0.32
        }
    },
    NONE: {
        key: {
            type: String,
            defualt: "NONE"
        },
        multiplier: {
            type: Number,
            default: 0
        },
        probability: {
            type: Number,
            default: 0.45
        }
    }
});

export default mongoose.model('AToZSetting', aToZSettingSchema);