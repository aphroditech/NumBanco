const initialState = {
    miningHistory: [],
    rocketHistory: [],
    aToZHistory: [],
    coinHistory: [],
    wheelHistory: [],
    snakesHistory: [],
    rangeHistory: [],
    rockHistory: [],
    /** Session-only: up to 3 most recent house reveals, newest first (cleared on refresh). */
    rockRecentHouses: [],
};

export const HistoryReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_MINING_HISTORY":
            return { ...state, miningHistory: action.payload };
        case "SET_ROCKET_HISTORY":
            return { ...state, rocketHistory: action.payload };
        case "SET_AToZ_HISTORY":
            return { ...state, aToZHistory: action.payload };
        case "SET_COIN_HISTORY":
            return { ...state, coinHistory: action.payload };
        case "SET_WHEEL_HISTORY":
            return { ...state, wheelHistory: action.payload };
        case "SET_SNAKES_HISTORY":
            return { ...state, snakesHistory: action.payload };
        case "SET_RANGE_HISTORY":
            return { ...state, rangeHistory: action.payload };
        case "SET_ROCK_HISTORY":
            return { ...state, rockHistory: action.payload };
        case "SET_ROCK_LAST_HOUSE": {
            const entry = action.payload;
            if (!entry || !entry.house) return state;
            const prev = Array.isArray(state.rockRecentHouses) ? state.rockRecentHouses : [];
            const next = [entry, ...prev].slice(0, 3);
            return { ...state, rockRecentHouses: next };
        }
        default:
            return state;
    }
};