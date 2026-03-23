import User from "../models/User.js";
import AToZSetting from "../models/digitsSlot/AToZSetting.js";
import AToZHistory from "../models/digitsSlot/AToZHistory.js";
import AToZResult from "../models/digitsSlot/AToZResult.js";
import CalendarDigit from "../models/digitsSlot/CalendarDigit.js";

export const bet = async (req, res) => {
    try {
        const { betAmount, number } = req.body;

        const user = await User.findById(req.user._id);
        const aToZSetting = await AToZSetting.findOne();
        if (!user) return res.status(404).json({ message: "User not found" });
        if (!aToZSetting) {
            return res.status(500).json({ message: "AToZ settings not configured" });
        }
        if (betAmount > user.balance) {
            return res.status(400).json({ message: "You don't have enough balance" });
        }

        const pickStr = String(Math.min(999, Math.max(0, Math.floor(Number(number))))).padStart(3, "0");

        const outcomeKey = getOutcomeKey(pickStr, aToZSetting, user.aToZAmount, user.aToZWinAmount);
        const { result, multiplier } = generateResult(pickStr, outcomeKey, aToZSetting);

        const winAmount = betAmount * multiplier;

        user.balance -= betAmount;
        user.aToZAmount += betAmount;
        user.refreshBet += betAmount;
        user.lotterybet += betAmount;
        user.totalBet = (user.totalBet || 0) + betAmount;
        user.totalhistory.push({
            amount: -betAmount,
            date: new Date(),
            type: "Digits",
        });
        await user.save({ optimisticConcurrency: false });

        console.log("outcomeKey", outcomeKey, "result", result);

        return res.json({
            result,
            multiplier,
            isWin: multiplier > 0,
            winAmount,
            balance: -betAmount,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
};


// get outcome key based on probability
function getOutcomeKey(pickStr, aToZSetting, aToZAmount, aToZWinAmount) {
    if(!aToZSetting) return "NONE";

    if(pickStr[0] === pickStr[1] && pickStr[1] === pickStr[2]) {
        return "NONE";
    }

    if(aToZAmount * 1.3 < aToZWinAmount) {
        return "NONE";
    }

    const probabilityTable = [
        { key: "THREE_ORDERED", probability: aToZSetting.THREE_ORDERED.probability },
        { key: "THREE_UNORDERED", probability: aToZSetting.THREE_UNORDERED.probability },
        { key: "TWO_ORDERED", probability: aToZSetting.TWO_ORDERED.probability },
        { key: "TWO_UNORDERED", probability: aToZSetting.TWO_UNORDERED.probability },
        { key: "ONE_ORDERED", probability: aToZSetting.ONE_ORDERED.probability },
        { key: "ONE_UNORDERED", probability: aToZSetting.ONE_UNORDERED.probability },
        { key: "NONE", probability: aToZSetting.NONE.probability }
    ];

    const totalWeight = probabilityTable.reduce(
        (sum, item) => sum + item.probability,
        0
    );

    let random = Math.random() * totalWeight;

    for (let item of probabilityTable) {

        if (random < item.probability) {
            return item.key;
        }

        random -= item.probability;
    }

    return "NONE"; // safety fallback
}


function generateResult(userNumber, condition, aToZSetting) {

    const MULTIPLIERS = {
        THREE_ORDERED: aToZSetting.THREE_ORDERED.multiplier,
        THREE_UNORDERED: aToZSetting.THREE_UNORDERED.multiplier,
        TWO_ORDERED: aToZSetting.TWO_ORDERED.multiplier,
        TWO_UNORDERED: aToZSetting.TWO_UNORDERED.multiplier,
        ONE_ORDERED: aToZSetting.ONE_ORDERED.multiplier,
        ONE_UNORDERED: aToZSetting.ONE_UNORDERED.multiplier,
        NONE: aToZSetting.NONE.multiplier
    };

    const user = userNumber.split('').map(Number);

    // Random digit not in exclude list
    function randExcept(excludeList) {
        let r;
        do {
            r = Math.floor(Math.random() * 10);
        } while (excludeList.includes(r));
        return r;
    }

    // Detect the exact matching condition
    function detect(user, result) {
        let ordered = 0;
        let total = 0;
        let copy = [...user];

        for (let i = 0; i < 3; i++) {
            if (user[i] === result[i]) ordered++;
        }

        for (let r of result) {
            let idx = copy.indexOf(r);
            if (idx !== -1) {
                total++;
                copy.splice(idx, 1);
            }
        }

        let unordered = total - ordered;

        if (ordered === 3) return "THREE_ORDERED";
        if (total === 3) return "THREE_UNORDERED";
        if (ordered === 2) return "TWO_ORDERED";
        if (unordered === 2) return "TWO_UNORDERED";
        if (ordered === 1) return "ONE_ORDERED";
        if (unordered === 1) return "ONE_UNORDERED";

        return "NONE";
    }

    let result;
    const MAX_ATTEMPTS = 5000;
    let attempts = 0;

    do {
        result = [...user];

        switch (condition) {

            case "THREE_ORDERED":
                break;

            case "THREE_UNORDERED":
                if (user[0] === user[1] && user[1] === user[2]) break; // e.g., 111
                result = [...user].sort(() => Math.random() - 0.5);
                break;

            case "TWO_ORDERED":
                let changeIndex = Math.floor(Math.random() * 3);
                result[changeIndex] = randExcept([user[changeIndex]]);
                break;

            case "TWO_UNORDERED":
                // Pick two digits from user to use in wrong positions
                const indices = [0, 1, 2];
                let pickIndices = [];
                while (pickIndices.length < 2) {
                    let r = indices[Math.floor(Math.random() * 3)];
                    if (!pickIndices.includes(r)) pickIndices.push(r);
                }

                // Assign picked digits to positions NOT their original index
                let availablePositions = indices.filter(i => !pickIndices.includes(i));
                result = [
                    randExcept(user),
                    randExcept(user),
                    randExcept(user)
                ];

                for (let i = 0; i < 2; i++) {
                    let posOptions = indices.filter(idx => idx !== pickIndices[i]);
                    result[posOptions[Math.floor(Math.random() * posOptions.length)]] = user[pickIndices[i]];
                }
                break;

            case "ONE_ORDERED":
                let keepIndex = Math.floor(Math.random() * 3);
                for (let i = 0; i < 3; i++) {
                    if (i !== keepIndex) result[i] = randExcept(user);
                }
                break;

            case "ONE_UNORDERED":
                // Pick one digit from user
                let sourceIndex = Math.floor(Math.random() * 3);
                let targetDigit = user[sourceIndex];

                // Pick a position NOT the original index
                let positions = [0, 1, 2].filter(i => i !== sourceIndex);
                let targetPos = positions[Math.floor(Math.random() * positions.length)];

                result = [
                    randExcept(user),
                    randExcept(user),
                    randExcept(user)
                ];
                result[targetPos] = targetDigit;
                break;

            case "NONE":
                result = [
                    randExcept(user),
                    randExcept(user),
                    randExcept(user)
                ];
                break;

            default:
                throw new Error("Invalid condition");
        }

        attempts++;

        if (attempts > MAX_ATTEMPTS) {
            throw new Error("Failed to generate a non-overlapping result after many attempts");
        }

    } while (detect(user, result) !== condition);

    return {
        result: result.join(''),
        multiplier: MULTIPLIERS[condition]
    };

}


export const spinComplete = async (req, res) => {
    try {
        const { isWin, multiplier, betAmount, pickNumber, result } = req.body;

        const user = await User.findById(req.user._id);
        if(!user) return res.status(404).json({ message: "User not found" });


        let winAmount = 0;
        if(isWin) {
            winAmount = betAmount * multiplier;
            user.balance += winAmount;
            user.totalEarn += winAmount;
            user.aToZWinAmount += winAmount;
            user.totalhistory.push({
                amount: winAmount,
                date: new Date(),
                type: "Digits",
            });
        }

        await user.save();

        const aToZHistory = await AToZHistory.findOne({ user: req.user._id });
        if(aToZHistory) {
            aToZHistory.history.push({
                isWin: isWin,
                betAmount: betAmount,
                pickNumber: String(Math.min(999, Math.max(0, Math.floor(Number(pickNumber))))).padStart(3, "0"),
                result: result,
                multiplier: multiplier,
                winAmount: winAmount,
                date: new Date()
            });
            await aToZHistory.save();
        } else {
            const newAToZHistory = new AToZHistory({
                user: req.user._id,
                history: [{
                    isWin: isWin,
                    betAmount: betAmount,
                    pickNumber: String(Math.min(999, Math.max(0, Math.floor(Number(pickNumber))))).padStart(3, "0"),
                    result: result,
                    multiplier: multiplier,
                    winAmount: winAmount,
                    date: new Date()
                }]
            });
            await newAToZHistory.save();
        }
        await CalendarDigit.create({
            userName: user.altas,
            isWin: isWin,
            betAmount: betAmount,
            winAmount: winAmount,
            date: new Date()
        });

        const aToZResult = {
            userName: user.altas,
            avatar: user.avatar,
            isWin: isWin,
            multiplier: multiplier,
            betAmount: betAmount,
            winAmount: winAmount,
            date: new Date()
        };
        await AToZResult.create(aToZResult);
        
        const ably = req.app.locals.ably;
        if(ably) {
            const channelName = "aToZResult";
            const channel = ably.channels.get(channelName);
            await channel.publish("A_TO_Z_RESULT", aToZResult);
        }
        const Histories = await AToZHistory.findOne({ user: req.user._id });
        return res.status(200).json({ message: "AToZ spin complete", balance: winAmount, history: Histories?.history || [] });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
}

export const getAToZResults = async (req, res) => {
    try {
        const aToZResults = await AToZResult.find().sort({ date: -1 }).limit(20);
        return res.status(200).json({ aToZResults: aToZResults || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
}

export const getAToZHistory = async (req, res) => {
    try {
        const aToZHistory = await AToZHistory.findOne({ user: req.user._id });
        return res.status(200).json({ aToZHistory: aToZHistory?.history || [] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
}