const initialState = {
    multiplier: 0,
};
  
export const rocketReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_ROCKET_MULTIPLIER":
            return {
                ...state,
                index: action.payload,
            };
    
        default:
            return state;
    }
};    