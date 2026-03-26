import MinesSetting, {
  defaultMultiplierBands,
  defaultEasyMultipliers,
  defaultNormalMultipliers,
  defaultHardMultipliers,
  defaultAceMultipliers,
  defaultWinRateBands,
} from "../models/mines/MinesSetting.js";

export const initializeMinesSettings = async () => {
  const existing = await MinesSetting.findOne({});
  if (!existing) {
    await MinesSetting.create({
      botWinProbability: 0.55,
      botTriggerProbability: 0.4,
      multiplierBands: defaultMultiplierBands,
      easyMultipliers: defaultEasyMultipliers,
      normalMultipliers: defaultNormalMultipliers,
      hardMultipliers: defaultHardMultipliers,
      aceMultipliers: defaultAceMultipliers,
      minesMode2RateFactor: 0.7,
      minesMode1To2Threshold: 1.2,
      minesMode2To1Threshold: 0.7,
      winRateBands: defaultWinRateBands,
    });
    console.log("✅ Mines settings initialized");
    return;
  }

  // Ensure multiplier arrays and mines mode fields exist on existing doc (migration)
  const updates = {};
  if (!existing.easyMultipliers?.length) updates.easyMultipliers = defaultEasyMultipliers;
  if (!existing.normalMultipliers?.length) updates.normalMultipliers = defaultNormalMultipliers;
  if (!existing.hardMultipliers?.length) updates.hardMultipliers = defaultHardMultipliers;
  if (!existing.aceMultipliers?.length) updates.aceMultipliers = defaultAceMultipliers;
  if (existing.minesMode2RateFactor == null) updates.minesMode2RateFactor = 0.7;
  if (existing.minesMode1To2Threshold == null) updates.minesMode1To2Threshold = 1.2;
  if (existing.minesMode2To1Threshold == null) updates.minesMode2To1Threshold = 0.7;
  if (!existing.winRateBands?.length) updates.winRateBands = defaultWinRateBands;
  if (Object.keys(updates).length > 0) {
    await MinesSetting.findOneAndUpdate({ _id: existing._id }, { $set: updates });
    console.log("✅ Mines settings/multipliers updated in database");
  }
};
