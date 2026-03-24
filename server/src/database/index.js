import { initializeAmount } from './initAmount.js';
import { initializeAdmin } from './initAdmin.js';
import { initializeRubicSettings } from './rubicSettings.js';
import { initializePumpingPercentages } from './pumpingPercentages.js';
import { initializePumpingLimits } from './pumpingLimits.js';
import { initializeRubicMode } from './rubicMode.js';
import { initializePumpingMultis } from './pumpingMultis.js';
import { initializeSetting } from './initSetting.js';
import { initDoveSetting } from './initDoveSetting.js';
import { initMiningSetting } from './initMiningSetting.js';
import { initRocketSetting } from './initRocket.js';
import { initializeFishingPercentages } from './fishingPercentages.js';
import { initializeFishingLimits } from './fishingLimits.js';
import { initializeCardGamePercentages } from './cardGamePercentages.js';
import { initializeCardGameLimits } from './cardGameLimits.js';
import { initializeJokerCrashLimits } from './jokerCrashLimits.js';
import { initializeJokerCrashIncreases } from './jokerCrashIncreases.js';
import { initializeJokerCrashCards } from './jokerCrashCards.js';
import { initializeJokerCrashPercentages } from './jokerCrashPercentages.js';

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
    await initAToZSetting();
    await initCloudSpreadSetting();
    await initializeFishingPercentages();
    await initializeFishingLimits();
    await initializeCardGamePercentages();
    await initializeCardGameLimits();
    await initializeJokerCrashLimits();
    await initializeJokerCrashIncreases();
    await initializeJokerCrashCards();
    await initializeJokerCrashPercentages();
    console.log('✅ Database initialization complete');
};
