const initialState = {
    userInfo: null,
    activeUsers: {
        tierAUsers: 0,
        tierBUsers: 0,
        tierCUsers: 0,
        rubicUsers: 0,
        pumpingUsers: 0,
        gravityUsers: 0,
        cloudSpreadUsers: 0,
        doveUsers: 0,
        cocoUsers: 0,
        onlineUsers: 0
    },
    lootAvailable: false,
    lootRemainingMs: 0
};

export const userReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SET_USER":
            return {
                ...state,
                userInfo: action.payload,
            };
        case "ACTIVE_USER":
            return {
                ...state,
                activeUsers: action.payload,
            };
        case "CLEAR_USER":
            return {
                ...state,
                userInfo: null,
            };
        case "SET_BALANCE":
            return {
                ...state,
                userInfo: state.userInfo ? {
                    ...state.userInfo,
                    balance: action.payload
                } : state.userInfo,
            };
        case "UPDATE_USER_BALANCE":
            // Update user balance (payload is the amount to add/subtract)
            return {
                ...state,
                userInfo: state.userInfo ? {
                    ...state.userInfo,
                    balance: (state.userInfo.balance || 0) + (action.payload || 0)
                } : state.userInfo,
            };
        case "SET_DAILY_LOOT_TIMER":
            return {
                ...state,
                lootAvailable: action.payload <= 0,
                lootRemainingMs: action.payload,
            };
        default:
        return state;
    }
};
