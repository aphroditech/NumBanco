import mongoose from "mongoose";

const amountSchema = new mongoose.Schema({
  withdraw: {
    type: Number,
    default: 5000
  },
  partner: {
    type: Number,
    default: 100
  },
  reward: {
    type: Number,
    default: 100
  },
  defaultMembership: {
    type: {
      plus: {
        type: Number,
        default: 29
      },
      pro: {
        type: Number,
        default: 59
      }
    },
  },
  decreaseMembership: {
    type: {
      plus: {
        type: Number,
        default: 1
      },
      pro: {
        type: Number,
        default: 10
      }
    },
  },
  decreases: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("amount", amountSchema);