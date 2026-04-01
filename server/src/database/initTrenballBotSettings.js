import TrenballBotSettings from "../models/trenball/TrenballBotSettings.js";

export const initTrenballBotSettings = async () => {
  try {
    const existing = await TrenballBotSettings.findOne();
    if (!existing) {
      await TrenballBotSettings.create({
        enabled: true,
        moonChancePercent: 10,
        instantCrashChancePercent: 2,
      });
      console.log("✅ Default TrenballBotSettings document created");
      return;
    }

    const $set = {};
    if (existing.enabled == null) $set.enabled = true;
    if (existing.moonChancePercent == null) $set.moonChancePercent = 10;
    if (existing.instantCrashChancePercent == null) $set.instantCrashChancePercent = 2;
    if (existing.crashBotsMin == null) $set.crashBotsMin = 1;
    if (existing.crashBotsMax == null) $set.crashBotsMax = 3;
    if (existing.redBotsMin == null) $set.redBotsMin = 3;
    if (existing.redBotsMax == null) $set.redBotsMax = 7;
    if (existing.greenBotsMin == null) $set.greenBotsMin = 3;
    if (existing.greenBotsMax == null) $set.greenBotsMax = 7;
    if (existing.moonBotsMin == null) $set.moonBotsMin = 0;
    if (existing.moonBotsMax == null) $set.moonBotsMax = 2;
    if (existing.crashBetMinAmount == null) $set.crashBetMinAmount = 0.1;
    if (existing.crashBetMaxAmount == null) $set.crashBetMaxAmount = 5;
    if (existing.redBetMinAmount == null) $set.redBetMinAmount = 0.1;
    if (existing.redBetMaxAmount == null) $set.redBetMaxAmount = 20;
    if (existing.greenBetMinAmount == null) $set.greenBetMinAmount = 0.1;
    if (existing.greenBetMaxAmount == null) $set.greenBetMaxAmount = 20;
    if (existing.moonBetMinAmount == null) $set.moonBetMinAmount = 0.1;
    if (existing.moonBetMaxAmount == null) $set.moonBetMaxAmount = 10;

    if (Object.keys($set).length > 0) {
      await TrenballBotSettings.updateOne({ _id: existing._id }, { $set });
      console.log("✅ TrenballBotSettings backfilled defaults");
    } else {
      console.log("✅ TrenballBotSettings document already exists");
    }
  } catch (error) {
    console.error("❌ Error initializing TrenballBotSettings:", error);
  }
};
