import { logic1 } from "./logic1.js";
import { logic2 } from "./logic2.js";

export const betLogic = async (betticketsHolder, level) => {
    // const results = await logic1(betticketsHolder, level);
    const results = await logic2(betticketsHolder, level);
    return results
};
