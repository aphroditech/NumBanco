const initialState = {
    miningHistory: [],
    rocketHistory: [],
    aToZHistory: [],
};
  
export const HistoryReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_MINING_HISTORY":
        return { ...state, miningHistory: action.payload };
        case "SET_ROCKET_HISTORY":
        return { ...state, rocketHistory: action.payload };
        case "SET_AToZ_HISTORY":
        return { ...state, aToZHistory: action.payload };
        default:
            return state;
    }
};