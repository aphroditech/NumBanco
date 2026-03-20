import { Result } from "ethers";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: () => uuidv4(), // auto-generate UUID
    unique: true,
  },

  userAuthId: {
    type: String,
    required: true
  },

  altas: {
    type: String,
    required: true
  },

  password: {
    type: String,
  },

  lotterybet: {
    type: Number,
    default: 0
  },

  showlottery: {
    type: Number,
    default: 0
  },

  email: {
    type: String,
    default: null
  },

  country: {
    type: String,
    default: null
  },

  withdraw: {
    type: [
      {
        wdAddr: String,
        wdAmount: Number,
        wdFill: String,
        wdNet: String,
        wdCoin: String,
        txhash: String,
        withdrawflag: {
          type: Number,
          default: 1
        },
        createAt: {  // Added createAt field
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },

  notification: {
    type: [
      {
        id: {
          type: Number,
          default: () => Date.now()
        },
        notification: {
          type: String,
          required: true
        },
        from: {
          type: String,
          default: ""
        },
        to: {
          type: String,
          default: ""
        },
        status: {
          type: String,
          default: "success"
        },
        unread: {
          type: Boolean,
          default: true
        }
      }
    ],
    default: []
  },

  deposit: {
    type: [
      {
        depAddr: String,
        depAmount: Number,
        depFill: {  // Changed from Boolean to String with enum values
          type: String,
          enum: ['pending', 'failed', 'success'],
          default: 'pending'
        },
        depTxH: String,
        depNet: String,
        depCoin: String,
        depStreamId: String,
        createAt: {  // Added createAt field
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },

  avatar: {
    type: String,
    default: "/avatars/pfp1.png"
  },

  active: {
    type: Number,
    default: 0
  },

  balance: {
    type: Number,
    default: 5
  },

  totalEarn: {
    type: Number,
    default: 0
  },

  totalBet: {
    type: Number,
    default: 0
  },

  refreshBet: {
    type: Number,
    default: 0
  },

  refreshEarn: {
    type: Number,
    default: 0
  },

  showEarn: {
    type: Number,
    default: 0
  },

  membership: {
    type: Number,
    default: 0
  },

  dailyWithdraw: {
    type: Number,
    default: 0
  },

  maxWithdraw: {
    type: Number,
    default: 100
  },

  canWithdraw: {
    type: Boolean,
    default: true
  },

  ticketCnt: {
    type: Number,
    default: 0
  },

  fee: {
    type: Boolean,
    default: false
  },

  preBetCnt: {
    type: Number,
    default: 0
  },

  totalDeposit: {
    type: Number,
    default: 0
  },

  totalWithdraw: {
    type: Number,
    default: 0
  },

  partnerId: {
    type: String,
    default: null
  },

  inviteUserCnt: {
    type: Number,
    default: 0
  },

  partnerActivity: {
    type: [
      {
        userId: String,
        altas: String,
        depositAmt: Number,
        partnerEarn: Number,
        date: {
          type: Date,
          default: Date.now()
        }
      }
    ]
  },

  partnerFlag: {
    type: Number,
    default: 1
  },

  partnerEarn: {
    type: Number,
    default: 0
  },

  partnerLevel: {
    type: Number,
    default: 1
  },

  partnerEarnHistory: {
    type: [
      {
        earnAmt: Number,
        date: {
          type: Date,
          default: Date.now()
        }
      }
    ],
  },

  dailylootflag: {
    type: Boolean,
    default: false
  },

  lastClickDate: {
    type: Date,
    default: new Date("January 01, 2025"),
  },

  totalhistory: {
    type: [
      {
        amount: {
          type: Number,
          default: 5
        },
        date: {
          type: Date,
          default: Date.now()
        },
        type: {
          type: String,
          default: "bet"
        }
      }
    ]
  },

  bethistory: {
    type: [
      {
        tier: {
          type: Number,
          required: true
        },
        betId: {
          type: Number,
          required: true
        },
        bet: {
          type: Number,
          required: true
        },
        win: {
          type: Number,
          default: 0
        },
        createAt: {
          type: Date,
          default: Date.now()
        },
      }
    ]
  },

  doveMode: {
    type: Number,
    default: 1 // normal mode by default
  },
  doveAmount: {
    type: Number,
    default: 0
  },
  doveWinAmount: {
    type: Number,
    default: 0
  },
  miningAmount: {
    type: Number,
    default: 0
  },
  miningWinAmount: {
    type: Number,
    default: 0
  },
  rocketAmount: {
    type: Number,
    default: 0
  },
  rocketWinAmount: {
    type: Number,
    default: 0
  },

  pumpingHistory: {
    type: [
      {
        target: {
          type: Number,
          required: true
        },
        amount: {
          type: Number,
          required: true
        },
        result: {
          type: Number,
          required: true,
        },
        win: {
          type: Number,
          required: true
        },
        active: {
          type: Boolean,
          default: false
        },
        createAt: {
          type: Date,
          default: Date.now()
        }
      }
    ],
    default: []
  },

  pumpingMode: {
    type: String,
    default: 1
  },

  pumpingHistory: {
    type: [
      {
        target: {
          type: Number,
          required: true
        },
        bet: {
          type: Number,
        },
        result: {
          type: Number,
          required: true,
        },
        win: {
          type: Number,
          required: true
        },
        totalBet: {
          type: Number,
          default: 0
        },
        totalWin: {
          type: Number,
          default: 0
        },
        pumpingBalance: {
          type: Number,
          default: 0
        },
        active: {
          type: Boolean,
          default: false
        },
        createAt: {
          type: Date,
          default: Date.now()
        }
      }
    ],
    default: []
  },

  rubicHistory: {
    type: [
      {
        target: {
          type: Number,
          required: true
        },
        betAmount: {
          type: Number,
          required: true
        },
        operation: {
          type: String,
          required: true,
          enum: ['<', '=', '>']
        },
        result: {
          type: Number,
          required: true
        },
        profit: {
          type: Number,
          default: 0
        },
        multiplier: {
          type: Number,
          default: 0
        },
        isWin: {
          type: Boolean,
          default: false
        },
        createAt: {
          type: Date,
          default: Date.now()
        }
      }
    ],
    default: []
  },

  updownHistory: {
    type: [
      {
        roundId: {
          type: Number,
          required: true
        },
        direction: {
          type: String,
          required: true,
          enum: ['up', 'down']
        },
        amount: {
          type: Number,
          required: true
        },
        result: {
          type: String,
          required: true
        },
        profit: {
          type: Number,
          default: 0
        },
        createAt: {
          type: Date,
          default: Date.now()
        }
      }
    ],
    default: []
  },

  rubicMode: {
    type: Number,
    default: 1 // 0: easy, 1: normal, 2: hard
  },

  twofactor: {
    type: Boolean,
    default: false
  },
  twofactorCode: { type: String },
  twofactorExpires: { type: Date },

  // Wallets for different networks
  wallets: {
    eth: {
      address: {
        type: String,
      },
      privateKey: {
        type: String,
      }
    },
    bsc: {
      address: {
        type: String,
      },
      privateKey: {
        type: String,
      }
    },
    tron: {
      address: {
        type: String,
      },
      privateKey: {
        type: String,
      }
    }
  },

}, { timestamps: true });

export default mongoose.model("User", userSchema);