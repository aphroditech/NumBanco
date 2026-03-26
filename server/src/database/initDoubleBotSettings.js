import DoubleBotSettings, { DOUBLE_BOT_DEFAULTS } from "../models/double/DoubleBotSettings.js";

export const initDoubleBotSettings = async () => {
  try {
    const existing = await DoubleBotSettings.findOne({ label: "default" }).lean();
    if (!existing) {
      await DoubleBotSettings.create(DOUBLE_BOT_DEFAULTS);
      console.log("✅ DoubleBotSettings default document created");
    } else {
      console.log("✅ DoubleBotSettings already exists");
    }
  } catch (error) {
    console.error("❌ Error initializing DoubleBotSettings:", error);
  }
};
