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
        gameType: {
          type: String,
          default: ""
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

  coinAmount: {
    type: Number,
    default: 0
  },
  coinWinAmount: {
    type: Number,
    default: 0
  },
  coinMode: {
    type: Number,
    default: 0, // 0=normal, 1=hard
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
  minesMode: {
    type: Number,
    default: 1 // normal mode by default
  },
  minesAmount: {
    type: Number,
    default: 0
  },
  minesWinAmount: {
    type: Number,
    default: 0
  },
  minesHistory: {
    type: [
      {
        betAmount: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        isWin: { type: Boolean, required: true },
        minesCount: { type: Number, default: 0 },
        gridSize: { type: Number, default: 25 },
        createAt: { type: Date, default: Date.now },
      }
    ],
    default: []
  },

  /** Hash Dice: cumulative stake and gross payout totals (same idea as minesAmount / minesWinAmount). */
  hashBetAmount: {
    type: Number,
    default: 0,
  },
  hashWinAmount: {
    type: Number,
    default: 0,
  },
  /** 0 = normal win-rate table; 1 = reduced rates (DB multipliers). */
  hashMode: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  /** Consecutive wins since last loss; used with hashMinLossEveryNBets to force a loss. */
  hashConsecutiveWins: {
    type: Number,
    default: 0,
    min: 0,
  },
  hashHistory: {
    type: [
      {
        betAmount: { type: Number, required: true },
        payout: { type: Number, required: true },
        side: { type: Number, required: true },
        roll: { type: Number, default: 0 },
        isWin: { type: Boolean, required: true },
        winAmount: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        hashMode: { type: Number, default: 0 },
        effectiveWinRate: { type: Number, default: 0 },
        forcedLoss: { type: Boolean, default: false },
        createAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  cocoMode: {
    type: Number,
    default: 0, // 0=easy, 1=normal, 2=hard
    min: 0,
    max: 2
  },
  cocoTotalProfit: {
    type: Number,
    default: 0
  },
  cocoTotalBet: {
    type: Number,
    default: 0
  },
  wheelAmount: {
    type: Number,
    default: 0
  },
  wheelWinAmount: {
    type: Number,
    default: 0
  },
  snakesAmount: {
    type: Number,
    default: 0
  },
  snakesWinAmount: {
    type: Number,
    default: 0
  },
  /** Twist multiplier ladder positions (persisted per user). */
  twistGreenMultIndex: {
    type: Number,
    default: 0,
  },
  twistOrangeMultIndex: {
    type: Number,
    default: 0,
  },
  twistPurpleMultIndex: {
    type: Number,
    default: 0,
  },
  /** Last Twist stake (used for cash-out win = lastBet × (purpleIdx + orangeIdx + greenIdx)). */
  twistLastBetAmount: {
    type: Number,
    default: 0,
  },
  /** Twist cash-out rows (same shape as alphaTreeHistory for shared UI). */
  twistHistory: {
    type: [
      {
        betAmount: { type: Number, required: true },
        totalMultiplier: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        busted: { type: Boolean, default: false },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },
  twistMode: {
    type: Number,
    default: 1, // 0=easy, 1=normal, 2=hard
    min: 0,
    max: 2
  },
  /** Ban-rate tier for Climb only (0 → low ban, 2 → high ban); not the round grid mode. */
  climbMode: {
    type: Number,
    default: 1,
    min: 0,
    max: 2
  },
  alphaTreeMode: {
    type: Number,
    default: 1, // 0=easy, 1=normal, 2=hard
    min: 0,
    max: 2
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
  rocketMode: {
    type: Number,
    default: 0 // 0: normal, 1: hard
  },
  rocketWinAmount: {
    type: Number,
    default: 0
  },
  cloudAmount: {
    type: Number,
    default: 0
  },
  cloudWinAmount: {
    type: Number,
    default: 0
  },
  cloudMode: {
    type: Number,
    default: 1 // 1: normal, 2: hard/controlled
  },
  aToZAmount: {
    type: Number,
    default: 0
  },
  aToZWinAmount: {
    type: Number,
    default: 0
  },
  aToZMode: {
    type: Number,
    default: 0 // 0: normal, 1: hard
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

  fishingMode: {
    type: String,
    default: 1
  },

  fishingHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        win: {
          type: Number,
          required: true
        },
        step: {
          type: Number,
          required: true,
        },
        multi: {
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
        fishingBalance: {
          type: Number,
          default: 0
        },
        info: {
          type: [
            {
              step: Number,
              strength: Number,
              multi: Number,
              status: Number,
            }
          ]
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

  cardGameMode: {
    type: String,
    default: 1
  },

  cardGameHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        arrow: {
          type: String,
          enum: ['<', '=', '>'],
        },
        left: {
          type: Number,
        },
        right: {
          type: Number,
        },
        win: {
          type: Number,
          default: 0
        },
        totalBet: {
          type: Number,
          default: 0
        },
        totalWin: {
          type: Number,
          default: 0
        },
        cardGameBalance: {
          type: Number,
          default: 0
        },
        createAt: {
          type: Date,
          default: Date.now()
        },
      }
    ],
    default: []
  },
  
  threeNumbersMode: {
    type: String,
    default: 1
  },

  threeNumbersHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        result: {
          type: String,
          required: true
        },
        multi: {
          type: Number,
          required: true
        },
        win: {
          type: Number,
          default: 0
        },
        totalBet: {
          type: Number,
          default: 0
        },
        totalWin: {
          type: Number,
          default: 0
        },
        threeNumbersBalance: {
          type: Number,
          default: 0
        },
        createAt: {
          type: Date,
          default: Date.now()
        },
      }
    ],
    default: []
  },

  jokerCrashMode: {
    type: String,
    default: 1
  },

  jokerCrashHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        win: {
          type: Number,
          required: true
        },
        step: {
          type: Number,
          required: true,
        },
        multi: {
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
        jokerCrashBalance: {
          type: Number,
          default: 0
        },
        info: {
          type: [
            {
              step: Number,
              card: Number,
              multi: Number,
              status: Number,
              operator: String,
              imulti: Number,
            }
          ]
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

  diceHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        dice: {
          type: Number,
          required: true
        },
        type: {
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
        diceBalance: {
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

  kenoMode: {
    type: String,
    default: 1
  },

  kenoHistory: {
    type: [
      {
        bet: {
          type: Number,
        },
        type: {
          type: Number,
          default: 0
        },
        numbersLength: {
          type: Number,
          default: 0
        },
        winLength: {
            type: Number,
            default: 0
        },
        win: {
          type: Number,
          default: 0
        },
        totalBet: {
          type: Number,
          default: 0
        },
        totalWin: {
          type: Number,
          default: 0
        },
        kenoBalance: {
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

  cocoHistory: {
    type: [
      {
        betAmount: {
          type: Number,
          required: true
        },
        /** Same as `multiplier` — roll / outcome for this smash (kept for clarity with RealView / exports). */
        result: {
          type: Number,
          default: 0
        },
        profit: {
          type: Number,
          default: 0
        },
        multiplier: {
          type: Number,
          default: 0
        },
        successCount: {
          type: Number,
          default: 0
        },
        totalSum: {
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

  alphaTreeHistory: {
    type: [
      {
        betAmount: { type: Number, required: true },
        totalMultiplier: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        busted: { type: Boolean, default: false },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },
  climbHistory: {
    type: [
      {
        betAmount: { type: Number, required: true },
        totalMultiplier: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        busted: { type: Boolean, default: false },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },

  diamondHistory: {
    type: [
      {
        betAmount: { type: Number, required: true },
        totalMultiplier: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        busted: { type: Boolean, default: false },
        keys: { type: [String], default: [] },
        tier: { type: String, default: "" },
        rateIndex: { type: Number, default: 0 },
        mode: {
          type: String,
          default: "normal",
        },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },

  /** Diamond lifetime aggregates used for automatic mode level. */
  diamondTotalBetAmount: {
    type: Number,
    default: 0,
  },
  diamondTotalProfit: {
    type: Number,
    default: 0,
  },
  /** revenue = diamondTotalProfit - diamondTotalBetAmount */
  diamondRevenue: {
    type: Number,
    default: 0,
  },
  /** 0: easy, 1: normal, 2: hard */
  diamondMode: {
    type: Number,
    default: 1,
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

  /** Double — one entry per real-user bet (mirrors DoubleHistory collection). */
  doubleHistory: {
    type: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId },
        roundId: { type: Number, required: true },
        userName: { type: String, default: "" },
        avatar: { type: String, default: "" },
        side: {
          type: String,
          required: true,
          enum: ["red", "black", "green"],
        },
        betAmount: { type: Number, required: true },
        winAmount: { type: Number, default: 0 },
        winningColor: {
          type: String,
          enum: ["red", "black", "green"],
        },
        winningSlot: { type: Number },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },

  /** Cloud Spread — round summaries (like rubicHistory / pumpingHistory). */
  cloudSpreadHistory: {
    type: [
      {
        roundId: {
          type: Number,
          required: true
        },
        totalBet: {
          type: Number,
          required: true
        },
        win: {
          type: Number,
          default: 0
        },
        crashStep: {
          type: Number,
          default: 0
        },
        finalClouds: {
          type: Number,
          default: 0
        },
        multProduct: {
          type: Number,
          default: 1
        },
        createAt: {
          type: Date,
          default: Date.now()
        }
      }
    ],
    default: []
  },

  /** Plinko — lifetime stake / gross payout (sum of bet×multiplier per round). */
  plinkoBetAmount: {
    type: Number,
    default: 0,
  },
  plinkoWinAmount: {
    type: Number,
    default: 0,
  },
  plinkoHistory: {
    type: [
      {
        roundId: { type: Number, required: true },
        betAmount: { type: Number, required: true },
        winAmount: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        multiplier: { type: Number, required: true },
        slot: { type: Number, required: true },
        rows: { type: Number, required: true },
        risk: { type: String, default: "regular" },
        pathSteps: { type: [Number], default: [] },
        hyperMode: { type: Boolean, default: false },
        createAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
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

userSchema.index({ userAuthId: 1 });
userSchema.index({ active: 1 });

export default mongoose.model("User", userSchema);