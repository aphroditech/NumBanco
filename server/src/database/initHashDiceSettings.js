import HashDiceSetting, {
  defaultHashWinRateBands,
} from "../models/hashDice/HashDiceSetting.js";

export const initializeHashDiceSettings = async () => {
  const existing = await HashDiceSetting.findOne({}).lean();
  if (!existing) {
    await HashDiceSetting.create({
      winRateBands: defaultHashWinRateBands,
      hashModeEnterProfitRatio: 1.2,
      hashModeExitLossRatio: 0.8,
      hashModeWinMultTight: 0.7,
      hashModeWinMultSoft: 0.8,
      hashMinLossEveryNBets: 5,
    });
    console.log("✅ Hash Dice settings initialized");
    return;
  }

  const updates = {};
  if (!existing.winRateBands?.length) {
    updates.winRateBands = defaultHashWinRateBands;
  }
  if (existing.hashModeEnterProfitRatio == null) {
    updates.hashModeEnterProfitRatio = 1.2;
  }
  if (existing.hashModeExitLossRatio == null) {
    updates.hashModeExitLossRatio = 0.8;
  }
  if (existing.hashModeWinMultTight == null) {
    updates.hashModeWinMultTight = 0.7;
  }
  if (existing.hashModeWinMultSoft == null) {
    updates.hashModeWinMultSoft = 0.8;
  }
  if (existing.hashMinLossEveryNBets == null) {
    updates.hashMinLossEveryNBets = 5;
  }
  if (Object.keys(updates).length > 0) {
    await HashDiceSetting.findOneAndUpdate({ _id: existing._id }, { $set: updates });
    console.log("✅ Hash Dice settings updated in database");
  }

  const doc = await HashDiceSetting.findOne({}).lean();
  const bands = doc?.winRateBands || [];
  const hasClosed510 = bands.some((x) => x?.min === 5 && x?.max === 10 && x?.closedUpper === true);
  const hasOpen10 = bands.some((x) => x?.openLower === true && Number(x?.min) === 10);
  if (!hasClosed510 || !hasOpen10) {
    await HashDiceSetting.findOneAndUpdate(
      { _id: doc._id },
      { $set: { winRateBands: defaultHashWinRateBands } }
    );
    console.log("✅ Hash Dice winRateBands migrated (5–10 closed, >10 open lower)");
  }
};
