const initialState = {
    miningHistory: [],
    rocketHistory: [],
    aToZHistory: [],
    coinHistory: [],
    wheelHistory: [],
    snakesHistory: [],
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
        default:
            return state;
    }
};