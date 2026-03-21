import cron from "node-cron";
import User from "../../models/User.js";
import DoveView from "../../models/DoveView.js";
import DoveSettings from "../../models/DoveSettings.js";

const VIEW_LIMIT = 22;
const MAX_LANES = 20;

function getMultiplier(step, a = 0.2, b = 0.05) {
    if (step <= 1) return 0.5;
    if (step <= 2) return 1;
    const s = step - 2;
    return 1 + a * s + b * s * s;
}

function getModeParams(settings, mode) {
    if (mode === "easy") return settings?.easy || { a: 0.08, b: 0.01 };
    if (mode === "med") return settings?.med || { a: 0.1, b: 0.02 };
    if (mode === "difficult") return settings?.hard || { a: 0.15, b: 0.03 };
    return settings?.ace || { a: 0.3, b: 1 };
}

function getExpectedValue(step, mode, settings, isWin) {
    const params = getModeParams(settings, mode);
    const a = Number(params?.a) || 0.2;
    const b = Number(params?.b) || 0.05;
    if (!isWin) {
        return getMultiplier(Math.max(0, step - 1), a, b);
    }
    const current = getMultiplier(step, a, b);
    const candidates = [];
    for (let s = step + 1; s <= MAX_LANES; s++) {
        const m = getMultiplier(s, a, b);
        if (m > current) candidates.push(m);
    }
    if (!candidates.length) return current;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

export const doveBot = async (ably) => {
    cron.schedule(
        "* * * * * *",
        async () => {
            if (Math.random() < 0.4) {
                const [randomBot] = await User.aggregate([
                    { $match: { partnerLevel: 0 } },
                    { $sample: { size: 1 } },
                    { $project: { _id: 1 } }
                ]);
                if (!randomBot) return;

                const doveSettings = await DoveSettings.findOne();
                const bet = 0.1 + Math.random() * 19.9;
                const step = Math.floor(Math.random() * 15) + 1;
                const modes = ["easy", "med", "difficult", "ace"];
                const mode = modes[Math.floor(Math.random() * modes.length)];
                const params = getModeParams(doveSettings, mode);
                const multiplier = getMultiplier(step, Number(params?.a) || 0.2, Number(params?.b) || 0.05);
                const isWin = Math.random() < 0.5;
                const win = isWin ? bet * multiplier : 0;
                const expectedValue = getExpectedValue(step, mode, doveSettings, isWin);

                const doveView = new DoveView({
                    userId: randomBot._id,
                    bet: Math.round(bet * 100) / 100,
                    multiplier: Math.round(multiplier * 100) / 100,
                    win: Math.round(win * 100) / 100,
                    expectedValue: Math.round(expectedValue * 100) / 100,
                    isUser: 0,
                });
                await doveView.save();

                const oldDocs = await DoveView.find({ isUser: 0 })
                    .sort({ createdAt: -1 })
                    .skip(VIEW_LIMIT)
                    .select("_id");
                if (oldDocs.length > 0) {
                    await DoveView.deleteMany({
                        _id: { $in: oldDocs.map((doc) => doc._id) }
                    });
                }

                if (ably) {
                    const doveViewUpdate = await DoveView.find()
                        .sort({ createdAt: -1 })
                        .limit(VIEW_LIMIT);
                    const updatedData = await Promise.all(
                        doveViewUpdate.map(async (item) => {
                            const user = await User.findOne(
                                { _id: item.userId },
                                { avatar: 1, altas: 1 }
                            );
                            const obj = item.toObject();
                            delete obj.isUser;
                            if (user) {
                                return {
                                    ...obj,
                                    avatar: user.avatar,
                                    altas: user.altas,
                                };
                            }
                            return { ...obj, avatar: null, altas: "Player" };
                        })
                    );
                    ably.channels.get("doveGame").publish("doveUpdate", { updatedData }).catch((err) => {
                        console.error("❌ [doveBot] Ably publish error:", err);
                    });
                }
            }
        },
        { scheduled: true }
    );
};
