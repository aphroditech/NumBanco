const initialState = {
    userInfo: null,
    activeUsers: {
        tierAUsers: 0,
        tierBUsers: 0,
        tierCUsers: 0,
        rubicUsers: 0,
        pumpingUsers: 0,
        gravityUsers: 0,
        doubleUsers: 0,
        plinkoUsers: 0,
        cloudSpreadUsers: 0,
        doveUsers: 0,
        cocoUsers: 0,
        rocketUsers: 0,
        jackalUsers: 0,
        mineUsers: 0,
        fishingUsers: 0,
        alphaTreeUsers: 0,
        onlineUsers: 0,
        aToZUsers: 0,
        twistUsers: 0,
        climbUsers: 0,
        diamondUsers: 0,
        jokerCrashUsers: 0,
        cardGameUsers: 0,
        tarotUsers: 0,
        hashDiceUsers: 0,
        totalActiveUsers: 0
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
        case "MERGE_USER":
            return {
                ...state,
                userInfo: state.userInfo
                    ? {
                          ...state.userInfo,
                          ...(action.payload || {}),
                      }
                    : action.payload,
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
