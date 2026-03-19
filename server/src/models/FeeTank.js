import mongoose from "mongoose";

const FeeTankSchema = new mongoose.Schema({
  eth: {
    address: {
      type: String,
      required: true
    },
    privateKey: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    fee: {
      type: Number,
      default: 0
    }
  },
  bsc: {
    address: {
      type: String,
      required: true
    },
    privateKey: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    fee: {
      type: Number,
      default: 0
    }
  },
  tron: {
    address: {
      type: String,
      required: true
    },
    privateKey: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    fee: {
      type: Number,
      default: 0
    }
  },
  active: {
    type: Number,
    default: 0
  },
  createAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('FeeTank', FeeTankSchema);