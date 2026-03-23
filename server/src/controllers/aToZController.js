import User from "../models/User.js";
import AToZSetting from "../models/AToZSetting.js";
import AToZHistory from "../models/AToZHistory.js";
import AToZResult from "../models/AToZResult.js";

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

        const outcomeKey = getOutcomeKey(aToZSetting);
        const { result, multiplier } = generateResult(pickStr, outcomeKey, aToZSetting);

        const winAmount = betAmount * multiplier;

        user.balance -= betAmount;
        user.totalBet = (user.totalBet || 0) + betAmount;
        user.totalhistory.push({
            amount: -betAmount,
            date: new Date(),
            type: "A To Z",
        });
        await user.save({ optimisticConcurrency: false });

        console.log("outcomeKey", outcomeKey);

        return res.json({
            result,
            multiplier,
            isWin: multiplier > 0,
            winAmount,
            balance: user.balance,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
};


// get outcome key based on probability
function getOutcomeKey(aToZSetting) {
    if(!aToZSetting) return "NONE";

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

    const digits = "0123456789".split('');
    const user = userNumber.split('');

    function randomDigit(exclude = []) {
        const pool = digits.filter(d => !exclude.includes(d));
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function shuffle(arr) {
        return [...arr].sort(() => Math.random() - 0.5);
    }

    function detectCondition(user, result) {

        let ordered = 0;

        for (let i = 0; i < 3; i++) {
            if (user[i] === result[i]) ordered++;
        }

        let copy = [...user];
        let totalMatches = 0;

        for (let r of result) {
            let idx = copy.indexOf(r);
            if (idx !== -1) {
                totalMatches++;
                copy.splice(idx, 1);
            }
        }

        let unordered = totalMatches - ordered;

        if (ordered === 3) return "THREE_ORDERED";
        if (totalMatches === 3) return "THREE_UNORDERED";
        if (ordered === 2) return "TWO_ORDERED";
        if (unordered === 2) return "TWO_UNORDERED";
        if (ordered === 1) return "ONE_ORDERED";
        if (unordered === 1) return "ONE_UNORDERED";

        return "NONE";
    }

    let result;

    do {

        switch (condition) {

            case "THREE_ORDERED":
                result = userNumber;
                break;


            case "THREE_UNORDERED":

                do {
                    result = shuffle(user).join('');
                } while (result === userNumber);

                break;


            case "TWO_ORDERED":

                let indexes = shuffle([0,1,2]);
                let keep = indexes.slice(0,2);
                let change = indexes[2];

                let arr = [...user];
                arr[change] = randomDigit([user[change]]);

                result = arr.join('');
                break;


            case "TWO_UNORDERED":

                do {
                    let perm = shuffle(user);
                    result = perm.join('');
                }
                while (
                    detectCondition(user, result.split('')) !== "TWO_UNORDERED"
                );

                break;


            case "ONE_ORDERED":

                let matchIndex = Math.floor(Math.random()*3);

                let arr1 = [...user];

                for (let i=0;i<3;i++) {

                    if (i !== matchIndex) {

                        arr1[i] = randomDigit([
                            user[i],
                            ...user.filter((_,idx)=>idx!==i)
                        ]);

                    }

                }

                result = arr1.join('');
                break;


            case "ONE_UNORDERED":

                do {

                    let arr2 = [
                        randomDigit(user),
                        randomDigit(user),
                        randomDigit(user)
                    ];

                    let pickIndex = Math.floor(Math.random()*3);

                    let sourceIndex = Math.floor(Math.random()*3);

                    while (pickIndex === sourceIndex)
                        pickIndex = Math.floor(Math.random()*3);

                    arr2[pickIndex] = user[sourceIndex];

                    result = arr2.join('');

                }
                while (
                    detectCondition(user, result.split('')) !== "ONE_UNORDERED"
                );

                break;


            case "NONE":

                do {

                    result = [
                        randomDigit(user),
                        randomDigit(user),
                        randomDigit(user)
                    ].join('');

                }
                while (
                    detectCondition(user, result.split('')) !== "NONE"
                );

                break;

        }

    } while (
        detectCondition(user, result.split('')) !== condition
    );

    return {
        result,
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
                type: "Digit",
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
        return res.status(200).json({ message: "AToZ spin complete", balance: user.balance });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
}