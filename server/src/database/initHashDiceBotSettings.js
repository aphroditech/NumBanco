import HashDiceBotSettings from "../models/hashDice/HashDiceBotSettings.js";

export const initializeHashDiceBotSettings = async () => {
  const existing = await HashDiceBotSettings.findOne({}).lean();
  if (!existing) {
    await HashDiceBotSettings.create({
      winBotRate: 0.38,
      loseBotRate: 0.38,
      botRunIntervalMs: 3200,
    });
    console.log("✅ Hash Dice bot settings initialized");
  }
};
