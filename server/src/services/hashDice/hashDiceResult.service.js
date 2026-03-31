import HashDiceResult from "../../models/hashDice/HashDiceResult.js";

/** Max documents kept in `hashdiceresults` (newest only); matches live API / client feed size. */
export const HASH_DICE_RESULTS_STORE_CAP = 17;

/**
 * Delete older rows so the collection only retains the `maxKeep` most recent rounds (bots + real).
 */
export async function trimHashDiceResultsCollection(maxKeep = HASH_DICE_RESULTS_STORE_CAP) {
  const n = Math.max(1, Math.floor(Number(maxKeep)) || HASH_DICE_RESULTS_STORE_CAP);
  const keep = await HashDiceResult.find()
    .sort({ createdAt: -1 })
    .limit(n)
    .select("_id")
    .lean();
  if (keep.length === 0) return;
  const keepIds = keep.map((d) => d._id);
  await HashDiceResult.deleteMany({ _id: { $nin: keepIds } });
}
