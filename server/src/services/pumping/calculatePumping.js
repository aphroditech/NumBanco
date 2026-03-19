import PumpingPercentage from "../../models/PumpingPercentage.js";

export const calculatePumping = async (pumpingMode) => {

    const mode = pumpingMode === '0' ? "easy" : pumpingMode === '1' ? "normal" : "hard";
    const pumpingPercentage = await PumpingPercentage.find({});

    const ranges = pumpingPercentage.map(item => ({
        min: item.from,
        max: item.to,
        weight: item[mode]
    }));

    const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
  
    for (let range of ranges) {
        if (random < range.weight) {
            const value = Math.random() * (range.max - range.min) + range.min;
            return parseFloat(value.toFixed(2));
        }
        random -= range.weight;
    }
};