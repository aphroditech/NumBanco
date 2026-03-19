const initialState = {
    history: [],
};
  
export const miningHistoryReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_MINING_HISTORY":
        return { ...state, history: action.payload };
        default:
            return state;
    }
};