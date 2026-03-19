import mongoose from "mongoose";

const DailyTankSchema = new mongoose.Schema({
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
  history: {
    type: [
      {
        userId: {
          type: String,
          default: true
        },
        amount: {
          type: Number,
          default: 0
        },
        txhash: {
          type: String,
          required: true
        },
        toaddress: {
          type: String,
          required: true
        },
        net: {
          type: String,
          required: true
        },
        createAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  createAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('DailyTank', DailyTankSchema);