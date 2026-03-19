import RubicMode from "../models/RubicMode.js";

export const initializeRubicMode = async () => {
    try {
        const defaultRubicModes = [
            {
                type: "All",
                mode: 1
            },
            {
                type: "+User",
                mode: 1
            },
            {
                type: "-User",
                mode: 1
            },
            {
                type: "High User",
                mode: 1
            },
            {
                type: "Low User",
                mode: 1
            }
        ];

        let createdAny = false;

        for (const rubicMode of defaultRubicModes) {
            const existingRubicMode = await RubicMode.findOne({ type: rubicMode.type });
            if (!existingRubicMode) {
                await RubicMode.create(rubicMode);
                createdAny = true;
            }
        }

        if (createdAny) {
            console.log("✅ Default rubic modes created");
        } else {
            console.log("✅ Default rubic modes already exist");
        }
    } catch (error) {
        console.error("❌ Error initializing rubic mode:", error);
    }
};
