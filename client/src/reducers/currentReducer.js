import {
  CURRENT_BET_REQUEST,
  CURRENT_BET_SUCCESS,
  CURRENT_BET_FAIL,
} from "../action/BetActions";

const initialState = {
  loading: false,
  users: [],
  sellTicketCnt: 0,
};

export const currentReducer = (state = initialState, action) => {
  switch (action.type) {
    case CURRENT_BET_REQUEST:
      return { ...state, loading: true };

    case CURRENT_BET_SUCCESS:
      return {
        loading: false,
        users: action.payload.current,
        sellTicketCnt: action.payload.sellTicketCnt,
      };

    case CURRENT_BET_FAIL:
      return { ...state, loading: false };

    default:
      return state;
  }
};