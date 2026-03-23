import CloudSpreadSettings from "../models/CloudSpreadSettings.js";

export const initCloudSpreadSetting = async () => {
  try {
    const existing = await CloudSpreadSettings.findOne();
    if (!existing) {
      await CloudSpreadSettings.create({});
      console.log("✅ Default CloudSpreadSettings document created");
    } else {
      console.log("✅ CloudSpreadSettings document already exists");
    }
  } catch (error) {
    console.error("❌ Error initializing CloudSpreadSettings:", error);
  }
};
