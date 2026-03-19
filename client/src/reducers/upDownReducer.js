import {
    UPDOWN_PLACE_BET_REQUEST,
    UPDOWN_PLACE_BET_SUCCESS,
    UPDOWN_PLACE_BET_FAIL,
    UPDOWN_ADD_BET,
    UPDOWN_CLEAR_BETS
} from "../action/UpDownActions";

const initialState = {
    loading: false,
    error: null,
    upBets: [],
    downBets: [],
    lastPlacedBet: null
};

export const upDownReducer = (state = initialState, action) => {
    switch (action.type) {
        case UPDOWN_PLACE_BET_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case UPDOWN_PLACE_BET_SUCCESS:
            return {
                ...state,
                loading: false,
                lastPlacedBet: action.payload,
                error: null
            };

        case UPDOWN_PLACE_BET_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload
            };

        case UPDOWN_ADD_BET:
            const bet = action.payload;
            if (bet.direction === "up") {
                // Avoid duplicates
                const existsUp = state.upBets.some(
                    (b) => b.userId === bet.userId && b.createdAt === bet.createdAt
                );
                return {
                    ...state,
                    upBets: existsUp ? state.upBets : [...state.upBets, bet]
                };
            } else if (bet.direction === "down") {
                // Avoid duplicates
                const existsDown = state.downBets.some(
                    (b) => b.userId === bet.userId && b.createdAt === bet.createdAt
                );
                return {
                    ...state,
                    downBets: existsDown ? state.downBets : [...state.downBets, bet]
                };
            }
            return state;

        case UPDOWN_CLEAR_BETS:
            return {
                ...state,
                upBets: [],
                downBets: [],
                lastPlacedBet: null
            };

        default:
            return state;
    }
};
