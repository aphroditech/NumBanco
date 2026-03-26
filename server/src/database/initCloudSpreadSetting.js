import CloudSpreadSettings, {
  DEFAULT_LIMIT_MODE_1_TO_2,
  DEFAULT_LIMIT_MODE_2_TO_1,
  DEFAULT_STEP_MULTIPLIER_PROFILES,
} from "../models/cloud/CloudSpreadSettings.js";

/**
 * On server startup:
 * - If no settings doc: create one (Mongoose applies all schema defaults).
 * - If a doc exists: do not insert a second row; only $set fields that are missing
 *   in MongoDB (older documents created before new schema paths were added).
 */
export const initCloudSpreadSetting = async () => {
  try {
    const existing = await CloudSpreadSettings.findOne().lean();
    if (!existing) {
      await CloudSpreadSettings.create({});
      console.log("✅ CloudSpreadSettings document created (schema defaults)");
      return;
    }

    const $set = {};
    if (existing.limitMode1To2 == null) {
      $set.limitMode1To2 = DEFAULT_LIMIT_MODE_1_TO_2;
    }
    if (existing.limitMode2To1 == null) {
      $set.limitMode2To1 = DEFAULT_LIMIT_MODE_2_TO_1;
    }
    const profiles = existing.stepMultiplierProfiles;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      $set.stepMultiplierProfiles = structuredClone(DEFAULT_STEP_MULTIPLIER_PROFILES);
    }

    if (Object.keys($set).length === 0) {
      console.log("✅ CloudSpreadSettings already exists — nothing to backfill");
      return;
    }

    await CloudSpreadSettings.updateOne({ _id: existing._id }, { $set });
    console.log("✅ CloudSpreadSettings backfilled missing fields:", Object.keys($set).join(", "));
  } catch (error) {
    console.error("❌ Error initializing CloudSpreadSettings:", error);
  }
};
