import { initializeAmount } from './initAmount.js';
import { initializeAdmin } from './initAdmin.js';
import { initializeRubicSettings } from './rubicSettings.js';
import { initializePumpingPercentages } from './PumpingPercentages.js';
import { initializePumpingLimits } from './pumpingLimits.js';
import { initializeRubicMode } from './rubicMode.js';
import { initializePumpingMultis } from './pumpingMultis.js';
import { initializeSetting } from './initSetting.js';
import { initDoveSetting } from './initDoveSetting.js';
import { initMiningSetting } from './initMiningSetting.js';
import { initRocketSetting } from './initRocket.js';
import { initializeFishingPercentages } from './FishingPercentages.js';
import { initializeFishingLimits } from './fishingLimits.js';
export const initializeDatabase = async () => {
    console.log('🔄 Initializing database...');

    // Initialize all database collections
    await initializeAmount();
    await initializeAdmin();
    await initializeRubicSettings();
    await initializeRubicMode();
    await initializePumpingPercentages();
    await initializePumpingLimits();
    await initializePumpingMultis();
    await initializeSetting();
    await initDoveSetting();
    await initMiningSetting();
    await initRocketSetting();
    await initializeFishingPercentages();
    await initializeFishingLimits();

    console.log('✅ Database initialization complete');
};
