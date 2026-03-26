import MinesGame from "../models/mines/MinesGame.js";
import MinesResult from "../models/mines/MinesResult.js";
import MinesHistory from "../models/mines/MinesHistory.js";
import MinesSetting from "../models/mines/MinesSetting.js";
import User from "../models/User.js";
import {
  getMultiplierForRevealed,
  getMinesCountForMode,
  getWinRateForMultiplier,
  refreshMinesMultiplierCache,
  getMinesWinRateCache,
  GRID_SIZE,
  MODES,
} from "../services/mines/minesGame.service.js";

const MIN_AMOUNT = 0.1;
const MAX_BET_AMOUNT = 20;

/** Get user id string for MinesGame (same as Dove-style: support _id and userId). */
function getUserId(req) {
  return req.user?.userId || req.user?._id?.toString() || null;
}

/** Build User model selector that matches whichever auth id is present. */
function getUserSelector(req) {
  if (req.user?.userId) return { userId: req.user.userId };
  if (req.user?._id) return { _id: req.user._id };
  return null;
}

function buildUserNotification(message, status = "success", from = "Mines", to = "") {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    notification: message,
    status,
    from,
    to,
    unread: true,
  };
}

async function pushUserNotification(userSelector, toUserId, message, status = "success") {
  if (!userSelector || !message) return;
  try {
    await User.updateOne(
      userSelector,
      { $push: { notification: buildUserNotification(message, status, "Mines", toUserId || "") } }
    );
  } catch (e) {
    console.warn("mines pushUserNotification failed:", e.message);
  }
}

/** Push one game result to MinesHistory (like Dove's DoveHistory). */
async function pushMinesHistory(userIdObj, entry) {
  let doc = await MinesHistory.findOne({ user: userIdObj }).lean();
  if (!doc) {
    await MinesHistory.create({ user: userIdObj, history: [entry] });
    return;
  }
  await MinesHistory.findOneAndUpdate(
    { user: userIdObj },
    { $push: { history: entry } }
  );
}

/** Also persist Mines history directly on User document (user.minesHistory). */
async function pushUserMinesHistory(userSelector, entry) {
  if (!userSelector || !entry) return;
  await User.updateOne(
    userSelector,
    { $push: { minesHistory: entry } }
  );
}

/** Resolve User._id for MinesHistory when auth token provides only userId. */
async function getUserObjectId(userSelector) {
  if (!userSelector) return null;
  const userDoc = await User.findOne(userSelector).select("_id").lean();
  return userDoc?._id || null;
}

/**
 * Update user.minesMode based on minesAmount, minesWinAmount and DB thresholds.
 * Mode 1 → 2 when minesWinAmount > minesAmount * minesMode1To2Threshold (user winning a lot).
 * Mode 2 → 1 when minesWinAmount <= minesAmount * minesMode2To1Threshold.
 */
async function updateMinesMode(userSelector) {
  if (!userSelector) return;
  const user = await User.findOne(userSelector).select("minesMode minesAmount minesWinAmount").lean();
  if (!user) return;
  const setting = await MinesSetting.findOne({}).select("minesMode1To2Threshold minesMode2To1Threshold").lean();
  const thresh1To2 = setting?.minesMode1To2Threshold ?? 1.2;
  const thresh2To1 = setting?.minesMode2To1Threshold ?? 0.7;
  const amount = Number(user.minesAmount) || 0;
  const winAmount = Number(user.minesWinAmount) || 0;
  const currentMode = user.minesMode === 2 ? 2 : 1;
  let newMode = currentMode;
  if (currentMode === 1 && winAmount > amount * thresh1To2) newMode = 2;
  else if (currentMode === 2 && winAmount <= amount * thresh2To1) newMode = 1;
  if (newMode !== currentMode) {
    await User.findOneAndUpdate(userSelector, { $set: { minesMode: newMode } });
  }
}

/**
 * GET /api/mines/getPrefix
 * Returns mines mode config (like Dove getPrefix).
 */
export const getPrefix = async (req, res) => {
  try {
    // Refresh multiplier cache from DB so any admin updates are used immediately
    await refreshMinesMultiplierCache();
    const minesSetting = await MinesSetting.findOne().lean();
    if (!minesSetting) {
      return res.json({
        easy: MODES.easy,
        normal: MODES.normal,
        hard: MODES.hard,
        ace: MODES.ace,
        minAmount: MIN_AMOUNT,
        maxAmount: MAX_BET_AMOUNT,
      });
    }
    return res.json({
      easy: MODES.easy,
      normal: MODES.normal,
      hard: MODES.hard,
      ace: MODES.ace,
      minAmount: MIN_AMOUNT,
      maxAmount: MAX_BET_AMOUNT,
      multiplierBands: minesSetting.multiplierBands,
      // Multipliers from DB (source of truth for game and UI)
      easyMultipliers: minesSetting.easyMultipliers ?? [],
      normalMultipliers: minesSetting.normalMultipliers ?? [],
      hardMultipliers: minesSetting.hardMultipliers ?? [],
      aceMultipliers: minesSetting.aceMultipliers ?? [],
    });
  } catch (err) {
    console.error("mines getPrefix error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/mines/results
 * Returns recent global Mines results for right-side live feed (DB-backed).
 */
export const getMinesResults = async (req, res) => {
  try {
    const results = await MinesResult.find({})
      .sort({ createAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("mines getMinesResults error:", err);
    return res.status(500).json({ success: false, message: "Failed to get mines results" });
  }
};

/**
 * GET /api/mines/active
 * Returns the user's current in-progress game (status === "playing") so the client can restore after refresh.
 */
export const getActiveGame = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const game = await MinesGame.findOne({ userId, status: "playing" })
      .select("gameId amount mode minesCount gridSize revealedIndices")
      .lean();

    if (!game) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        gameId: game.gameId,
        amount: game.amount,
        mode: game.mode,
        minesCount: game.minesCount,
        gridSize: game.gridSize,
        revealedIndices: game.revealedIndices || [],
      },
    });
  } catch (err) {
    console.error("mines getActiveGame error:", err);
    return res.status(500).json({ success: false, message: "Failed to get active game" });
  }
};

/**
 * POST /api/mines/start
 * Body: { amount, mode }
 * Deducts balance, creates game with server-generated mine indices, returns gameId.
 */
export const startGame = async (req, res) => {
  try {
    const userId = getUserId(req);
    const userSelector = getUserSelector(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { amount: rawAmount, mode } = req.body;
    const amount = Number(rawAmount);
    if (isNaN(amount) || amount < MIN_AMOUNT || amount > MAX_BET_AMOUNT) {
      return res.status(400).json({ success: false, message: `Bet must be between ${MIN_AMOUNT} and ${MAX_BET_AMOUNT}` });
    }
    const validModes = ["easy", "normal", "hard", "ace"];
    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({ success: false, message: "Invalid mode" });
    }

    const minesCount = getMinesCountForMode(mode);
    const user = await User.findOne(userSelector).select("balance").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // One active game per user: reject if already playing
    const existing = await MinesGame.findOne({ userId, status: "playing" }).lean();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Finish or cash out your current game first",
      });
    }

    await User.findOneAndUpdate(
      userSelector,
      {
        $inc: { balance: -amount, totalBet: amount, refreshBet: amount, lotterybet: amount, minesAmount: amount },
        $push: { totalhistory: { amount: -amount, date: new Date(), type: "mines" } },
      }
    );

    const game = await MinesGame.create({
      userId,
      amount,
      mode,
      minesCount,
      gridSize: GRID_SIZE,
      // Use multiplier/win-rate driven reveal logic (DB-configured bands).
      // When rate is 1 for the current band, blast will not happen.
      mineIndices: [],
      revealedIndices: [],
      status: "playing",
    });

    await pushUserNotification(userSelector, userId, `Mines started. Bet $${amount.toFixed(2)}.`, "success");

    return res.json({
      success: true,
      data: {
        gameId: game.gameId,
        amount: game.amount,
        mode: game.mode,
        minesCount: game.minesCount,
        gridSize: game.gridSize,
      },
    });
  } catch (err) {
    console.error("mines startGame error:", err);
    return res.status(500).json({ success: false, message: "Failed to start game" });
  }
};

/**
 * POST /api/mines/reveal
 * Body: { gameId, tileIndex }
 * Returns { isMine, multiplier?, gameOver } and updates game state.
 */
export const reveal = async (req, res) => {
  try {
    const userId = getUserId(req);
    const userSelector = getUserSelector(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { gameId, tileIndex } = req.body;
    if (gameId == null || tileIndex == null) {
      return res.status(400).json({ success: false, message: "Missing gameId or tileIndex" });
    }
    const index = Number(tileIndex);
    if (!Number.isInteger(index) || index < 0 || index >= GRID_SIZE) {
      return res.status(400).json({ success: false, message: "Invalid tileIndex" });
    }

    const game = await MinesGame.findOne({ gameId, userId }).lean();
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }
    if (game.status !== "playing") {
      return res.status(400).json({ success: false, message: "Game is not in progress" });
    }
    if (game.revealedIndices.includes(index)) {
      return res.status(400).json({ success: false, message: "Tile already revealed" });
    }

    let isMine;
    if (game.mineIndices?.length > 0) {
      isMine = game.mineIndices.includes(index);
    } else {
      const nextRevealedCount = (game.revealedIndices?.length || 0) + 1;
      const multiplier = getMultiplierForRevealed(GRID_SIZE, game.minesCount, nextRevealedCount);
      // Always refresh before reveal so DB winRateBands changes apply immediately.
      // Without this, stale in-memory cache can allow outcomes inconsistent with DB.
      await refreshMinesMultiplierCache();
      const cached = getMinesWinRateCache();
      const rateBands = cached?.winRateBands ?? undefined;
      const minesMode2RateFactor = cached?.minesMode2RateFactor ?? 0.7;

      let rate = getWinRateForMultiplier(multiplier, rateBands);
      const user = await User.findOne(userSelector).select("minesMode").lean();
      // Mode 2: apply factor only when multiplier > 1; multiplier 0–1 keeps 90% rate
      if (user?.minesMode === 2 && multiplier > 1) {
        rate *= minesMode2RateFactor;
      }
      isMine = Math.random() >= rate;
    }

    if (isMine) {
      await MinesGame.findOneAndUpdate(
        { gameId, userId },
        { status: "lost", profit: -game.amount, $push: { revealedIndices: index } }
      );

      // totalhistory already updated at start (-amount); no extra push on loss
      // Show full grid with minesCount bombs, always including the clicked tile.
      // Important: never place display bombs on tiles already revealed as safe,
      // otherwise the UI can incorrectly flip previous diamonds into bombs.
      const allIndices = Array.from({ length: GRID_SIZE }, (_, i) => i);
      const revealedSafeSet = new Set(game.revealedIndices || []);
      const otherIndices = allIndices.filter(
        (i) => i !== index && !revealedSafeSet.has(i)
      );
      const remaining = Math.max(game.minesCount - 1, 0);
      const count = Math.min(remaining, otherIndices.length);
      const shuffled = otherIndices.sort(() => Math.random() - 0.5);
      const mineIndicesToShow = [index, ...shuffled.slice(0, count)];

      // Fire-and-forget side effects to keep reveal response fast.
      (async () => {
        try {
          const userObjectId = await getUserObjectId(userSelector);
          if (userObjectId) {
            await pushMinesHistory(userObjectId, {
              betAmount: game.amount,
              profit: -game.amount,
              isWin: false,
              minesCount: game.minesCount,
              gridSize: game.gridSize || GRID_SIZE,
              createAt: new Date(),
            });
          }
          await pushUserMinesHistory(userSelector, {
            betAmount: game.amount,
            profit: -game.amount,
            isWin: false,
            minesCount: game.minesCount,
            gridSize: game.gridSize || GRID_SIZE,
            createAt: new Date(),
          });

          const userDoc = await User.findOne(userSelector).select("altas avatar").lean();
          await MinesResult.create({
            userName: userDoc?.altas || "User",
            avatar: userDoc?.avatar || null,
            isWin: false,
            betAmount: game.amount,
            winAmount: 0,
            multiplier: 0,
            createAt: new Date(),
          });

          const ably = req.app?.locals?.ably;
          if (ably) {
            try {
              const channel = ably.channels.get("minesResult");
              await channel.publish("MINES_RESULT", {
                userName: userDoc?.altas || "User",
                avatar: userDoc?.avatar || null,
                isWin: false,
                betAmount: game.amount,
                winAmount: 0,
                multiplier: 0,
              });
            } catch (ablyErr) {
              console.warn("Failed to publish mines loss to Ably:", ablyErr.message);
            }
          }

          await updateMinesMode(userSelector);
          await pushUserNotification(userSelector, userId, `You lost $${Number(game.amount).toFixed(2)} in Mines.`, "error");
        } catch (e) {
          // Side effects should not affect reveal response.
          console.warn("mines loss side-effects failed:", e?.message);
        }
      })();

      return res.json({
        success: true,
        data: {
          isMine: true,
          gameOver: true,
          mineIndices: mineIndicesToShow,
        },
      });
    }

    const newRevealed = [...(game.revealedIndices || []), index];
    const revealedCount = newRevealed.length;
    const safeTotal = GRID_SIZE - game.minesCount;
    const multiplier = getMultiplierForRevealed(GRID_SIZE, game.minesCount, revealedCount);
    const gameOver = revealedCount === safeTotal;

    if (gameOver) {
      const winAmount = game.amount * multiplier;
      await MinesGame.findOneAndUpdate(
        { gameId, userId },
        {
          revealedIndices: newRevealed,
          status: "won",
          multiplierAtCashOut: multiplier,
          profit: winAmount - game.amount,
        }
      );
      const profit = winAmount - game.amount;
      await User.findOneAndUpdate(
        userSelector,
        {
          $inc: { balance: winAmount, totalEarn: winAmount, minesWinAmount: winAmount },
          $push: { totalhistory: { amount: winAmount, date: new Date(), type: "mines" } },
        }
      );
      // Respond to the client immediately after balance credit.
      // Side effects (history, Ably, notifications, mode update) run in background.
      (async () => {
        try {
          const userObjectId = await getUserObjectId(userSelector);
          if (userObjectId) {
            await pushMinesHistory(userObjectId, {
              betAmount: game.amount,
              profit,
              isWin: true,
              minesCount: game.minesCount,
              gridSize: game.gridSize || GRID_SIZE,
              createAt: new Date(),
            });
          }
          await pushUserMinesHistory(userSelector, {
            betAmount: game.amount,
            profit,
            isWin: true,
            minesCount: game.minesCount,
            gridSize: game.gridSize || GRID_SIZE,
            createAt: new Date(),
          });

          const userDoc = await User.findOne(userSelector).select("altas avatar").lean();
          await MinesResult.create({
            userName: userDoc?.altas || "User",
            avatar: userDoc?.avatar || null,
            isWin: true,
            betAmount: game.amount,
            winAmount,
            multiplier,
            createAt: new Date(),
          });

          const ably = req.app?.locals?.ably;
          if (ably) {
            try {
              const channel = ably.channels.get("minesResult");
              await channel.publish("MINES_RESULT", {
                userName: userDoc?.altas || "User",
                avatar: userDoc?.avatar || null,
                isWin: true,
                betAmount: game.amount,
                winAmount,
                multiplier,
              });
            } catch (ablyErr) {
              console.warn("Failed to publish mines auto-win to Ably:", ablyErr.message);
            }
          }

          await updateMinesMode(userSelector);
          await pushUserNotification(userSelector, userId, `You won $${Number(winAmount).toFixed(2)} in Mines.`, "success");
        } catch (e) {
          console.warn("mines win side-effects failed:", e?.message);
        }
      })();
    } else {
      await MinesGame.findOneAndUpdate(
        { gameId, userId },
        { revealedIndices: newRevealed }
      );
    }

    return res.json({
      success: true,
      data: {
        isMine: false,
        multiplier,
        gameOver,
        revealedCount,
      },
    });
  } catch (err) {
    console.error("mines reveal error:", err);
    return res.status(500).json({ success: false, message: "Failed to reveal tile" });
  }
};

/**
 * POST /api/mines/cash-out
 * Body: { gameId }
 * Credits balance and records win in history.
 */
export const cashOut = async (req, res) => {
  try {
    const userId = getUserId(req);
    const userSelector = getUserSelector(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!userSelector) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ success: false, message: "Missing gameId" });
    }

    const game = await MinesGame.findOne({ gameId, userId }).lean();
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }
    if (game.status !== "playing") {
      return res.status(400).json({ success: false, message: "Game is not in progress" });
    }
    if (game.revealedIndices.length === 0) {
      return res.status(400).json({ success: false, message: "Reveal at least one tile before cashing out" });
    }

    const multiplier = getMultiplierForRevealed(
      GRID_SIZE,
      game.minesCount,
      game.revealedIndices.length
    );
    const winAmount = game.amount * multiplier;

    const profit = winAmount - game.amount;
    await MinesGame.findOneAndUpdate(
      { gameId, userId },
      { status: "won", multiplierAtCashOut: multiplier, profit }
    );
    await User.findOneAndUpdate(
      userSelector,
      {
        $inc: { balance: winAmount, totalEarn: winAmount, minesWinAmount: winAmount },
        $push: { totalhistory: { amount: winAmount, date: new Date(), type: "mines" } },
      }
    );

    const userObjectId = await getUserObjectId(userSelector);
    if (userObjectId) {
      await pushMinesHistory(userObjectId, {
        betAmount: game.amount,
        profit,
        isWin: true,
        minesCount: game.minesCount,
        gridSize: game.gridSize || GRID_SIZE,
        createAt: new Date(),
      });
    }
    await pushUserMinesHistory(userSelector, {
      betAmount: game.amount,
      profit,
      isWin: true,
      minesCount: game.minesCount,
      gridSize: game.gridSize || GRID_SIZE,
      createAt: new Date(),
    });

    // Store global mines result row
    const userDoc = await User.findOne(userSelector).select("altas avatar").lean();
    await MinesResult.create({
      userName: userDoc?.altas || "User",
      avatar: userDoc?.avatar || null,
      isWin: true,
      betAmount: game.amount,
      winAmount,
      multiplier,
      createAt: new Date(),
    });

    // Publish real-time cash-out win event to Ably
    const ably = req.app?.locals?.ably;
    if (ably) {
      try {
        const userDoc = await User.findOne(userSelector).select("altas avatar").lean();
        const channel = ably.channels.get("minesResult");
        await channel.publish("MINES_RESULT", {
          userName: userDoc?.altas || "User",
          avatar: userDoc?.avatar || null,
          isWin: true,
          betAmount: game.amount,
          winAmount,
          multiplier,
        });
      } catch (ablyErr) {
        console.warn("Failed to publish mines cash-out to Ably:", ablyErr.message);
      }
    }

    await updateMinesMode(userSelector);
    await pushUserNotification(userSelector, userId, `You won $${Number(winAmount).toFixed(2)} in Mines.`, "success");
    return res.json({
      success: true,
      data: { winAmount, multiplier, profit: winAmount - game.amount },
    });
  } catch (err) {
    console.error("mines cashOut error:", err);
    return res.status(500).json({ success: false, message: "Failed to cash out" });
  }
};
